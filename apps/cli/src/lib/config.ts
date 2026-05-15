// config.ts — lê config de ~/.property007/config.json + env
// Sprint Q4

import fs from "fs"
import path from "path"
import os from "os"

const CONFIG_PATH = path.join(os.homedir(), ".property007", "config.json")

export interface Config {
  supabase_url: string
  anon_key: string
  service_role_key?: string  // opcional, só para admin
  active_employee_id?: string
}

export function loadConfig(): Config | null {
  // 1. Env vars (overrides file)
  const env = {
    supabase_url: process.env.PROPERTY007_SUPABASE_URL || process.env.SUPABASE_URL || "",
    anon_key: process.env.PROPERTY007_ANON_KEY || process.env.SUPABASE_ANON_KEY || "",
    service_role_key: process.env.PROPERTY007_SERVICE_ROLE_KEY || "",
  }
  if (env.supabase_url && env.anon_key) {
    return {
      supabase_url: env.supabase_url,
      anon_key: env.anon_key,
      service_role_key: env.service_role_key,
    }
  }

  // 2. File
  if (!fs.existsSync(CONFIG_PATH)) return null
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8")
    return JSON.parse(raw) as Config
  } catch {
    return null
  }
}

export function saveConfig(config: Config): void {
  const dir = path.dirname(CONFIG_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8")
}

export function getConfigPath(): string {
  return CONFIG_PATH
}
