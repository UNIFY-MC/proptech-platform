/* gcal-sync v1 — Google Calendar sync via ICS feed (read-only)
 *
 * POST { source_id? }  → sync 1 source específico
 * POST {}              → sync todos os sources active
 *
 * Pipeline:
 *  1. Fetch ICS URL → parse VEVENT entries
 *  2. UPSERT calendar_events com external_id = VEVENT UID
 *  3. Atualiza source.last_sync_at + event_count
 *
 * Suporta:
 *  - ICS público (Google Calendar URL pública)
 *  - ICS privado com URL secret
 *  - (Futuro) OAuth bidirectional via Google Calendar API
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || ""
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""

const cors = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization,x-client-info,apikey,content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
}

// Parser ICS minimal (suporta VEVENT com SUMMARY, DESCRIPTION, LOCATION, DTSTART, DTEND, UID)
function parseICS(icsText: string): any[] {
  const events: any[] = []
  // Normaliza line continuations (RFC 5545: linhas > 75 chars são partidas com \r\n + space)
  const lines = icsText.replace(/\r\n[ \t]/g, "").split(/\r?\n/)

  let current: any = null
  for (const line of lines) {
    if (line.startsWith("BEGIN:VEVENT")) {
      current = {}
    } else if (line.startsWith("END:VEVENT")) {
      if (current && current.summary && current.dtstart) events.push(current)
      current = null
    } else if (current) {
      const colonIdx = line.indexOf(":")
      if (colonIdx < 0) continue
      const keyRaw = line.slice(0, colonIdx)
      const value = line.slice(colonIdx + 1)
      const key = keyRaw.split(";")[0].toUpperCase()
      const isAllDay = keyRaw.includes("VALUE=DATE")

      const unescape = (s: string) => s.replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\n/gi, "\n").replace(/\\\\/g, "\\")

      switch (key) {
        case "UID":         current.uid = value; break
        case "SUMMARY":     current.summary = unescape(value); break
        case "DESCRIPTION": current.description = unescape(value); break
        case "LOCATION":    current.location = unescape(value); break
        case "DTSTART":     current.dtstart = parseICSDate(value, isAllDay); current.all_day = isAllDay; break
        case "DTEND":       current.dtend = parseICSDate(value, isAllDay); break
      }
    }
  }
  return events
}

function parseICSDate(value: string, isAllDay: boolean): string {
  // Format: 20260520T140000Z (UTC), 20260520T140000 (floating), 20260520 (date)
  const cleaned = value.replace(/[^0-9T]/g, "")
  if (cleaned.length === 8) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}T00:00:00Z`
  }
  if (cleaned.length >= 15) {
    const d = `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}`
    const t = `${cleaned.slice(9, 11)}:${cleaned.slice(11, 13)}:${cleaned.slice(13, 15)}`
    return `${d}T${t}Z`
  }
  return new Date().toISOString()
}

async function syncSource(sb: any, source: any): Promise<{ inserted: number, updated: number, total: number, error?: string }> {
  if (source.source_type !== "ics" || !source.ics_url) {
    return { inserted: 0, updated: 0, total: 0, error: "Only ICS sync supported in v1" }
  }
  try {
    const res = await fetch(source.ics_url)
    if (!res.ok) throw new Error(`fetch_failed_${res.status}`)
    const ics = await res.text()
    const events = parseICS(ics)

    let inserted = 0, updated = 0
    for (const ev of events) {
      // Skip events > 6 meses no passado
      if (ev.dtstart && new Date(ev.dtstart).getTime() < Date.now() - 180 * 86400_000) continue

      const { error } = await sb.schema("system").from("calendar_events").upsert({
        source:        "ics",
        external_id:   ev.uid,
        calendar_id:   source.gcal_calendar_id || source.name,
        title:         ev.summary,
        description:   ev.description || null,
        location:      ev.location || null,
        start_at:      ev.dtstart,
        end_at:        ev.dtend || ev.dtstart,
        all_day:       ev.all_day || false,
        vertical:      source.vertical,
        raw_payload:   ev,
      }, { onConflict: "source,calendar_id,external_id", ignoreDuplicates: false }).select()

      if (!error) inserted++
    }

    await sb.schema("system").from("calendar_sources").update({
      last_sync_at: new Date().toISOString(),
      event_count:  events.length,
    }).eq("id", source.id)

    return { inserted, updated, total: events.length }
  } catch (e) {
    return { inserted: 0, updated: 0, total: 0, error: String(e) }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  if (req.method !== "POST")    return new Response("method_not_allowed", { status: 405, headers: cors })

  try {
    const body = await req.json().catch(() => ({}))
    const sb = createClient(SUPABASE_URL, SERVICE_KEY)

    let sources: any[]
    if (body.source_id) {
      const { data } = await sb.schema("system").from("calendar_sources").select("*").eq("id", body.source_id).single()
      sources = data ? [data] : []
    } else {
      const { data } = await sb.schema("system").from("calendar_sources").select("*").eq("active", true)
      sources = data || []
    }

    const results = []
    for (const s of sources) {
      const r = await syncSource(sb, s)
      results.push({ source_id: s.id, name: s.name, ...r })
    }

    return new Response(JSON.stringify({ ok: true, synced: results.length, results }), {
      headers: { ...cors, "Content-Type": "application/json" },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    })
  }
})
