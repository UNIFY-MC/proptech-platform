// supabase.ts — cliente Supabase singleton para o CLI
// Sprint Q4

import { createClient, SupabaseClient } from "@supabase/supabase-js"
import { loadConfig } from "./config.js"

let cachedClient: SupabaseClient | null = null

export function getSupabase(): SupabaseClient | null {
  if (cachedClient) return cachedClient
  const cfg = loadConfig()
  if (!cfg) return null
  cachedClient = createClient(cfg.supabase_url, cfg.anon_key)
  return cachedClient
}

export function getSupabaseAdmin(): SupabaseClient | null {
  const cfg = loadConfig()
  if (!cfg?.service_role_key) return null
  return createClient(cfg.supabase_url, cfg.service_role_key)
}
