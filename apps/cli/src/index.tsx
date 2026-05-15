#!/usr/bin/env node
// Property007 CLI — entrypoint
// Sprint Q4

import React from "react"
import { render } from "ink"
import { Command } from "commander"
import { loadConfig } from "./lib/config.js"
import Dashboard from "./screens/Dashboard.js"
import Login from "./screens/Login.js"
import Chat from "./screens/Chat.js"

const program = new Command()
program
  .name("property007")
  .description("Property007 CLI · TUI for tasks, recipes, inbox, chat")
  .version("0.1.0")

// Default: full dashboard TUI
program.action(() => startDashboard())

program.command("login")
  .description("Configurar URL Supabase + anon key (grava ~/.property007/config.json)")
  .action(() => {
    const { unmount } = render(<Login onDone={() => { unmount(); process.exit(0) }} />)
  })

program.command("tasks")
  .description("Abre só a vista de tasks")
  .action(() => startDashboard("tasks"))

program.command("recipes")
  .description("Lista recipes activas")
  .action(() => startDashboard("recipes"))

program.command("inbox")
  .description("Lista inbox items activos")
  .action(() => startDashboard("inbox"))

program.command("chat [agent]")
  .description("Chat directo com agent (default: auto)")
  .action((agent) => {
    const cfg = loadConfig()
    if (!cfg) { console.error("Sem config. Corre: property007 login"); process.exit(1) }
    const { unmount } = render(<Chat initialAgent={agent || "auto"} />)
    process.on("SIGINT", () => { unmount(); process.exit(0) })
  })

program.command("run <recipe-slug>")
  .description("Executa uma recipe (TODO: implementar recipe-run edge fn)")
  .action((slug) => {
    console.log(`TODO: invocar recipe ${slug}`)
    process.exit(0)
  })

function startDashboard(initialTab: any = "tasks") {
  const cfg = loadConfig()
  if (!cfg) {
    console.log("Sem config. Corre primeiro: property007 login")
    process.exit(1)
  }
  const { unmount } = render(<Dashboard initialTab={initialTab} onQuit={() => { unmount(); process.exit(0) }} />)
  process.on("SIGINT", () => { unmount(); process.exit(0) })
}

program.parse()
