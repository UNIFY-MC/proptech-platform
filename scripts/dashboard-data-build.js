// scripts/dashboard-data-build.js
// Gera docs/dashboard/data.json a partir dos ficheiros de estado dos agentes.
// Corre localmente em Windows na maquina do Mario.
// CommonJS — sem dependencias externas alem de fs e path.

'use strict';

const fs = require('fs');
const path = require('path');

// --- Paths absolutos (hardcoded, correm localmente) ---
const STATE_DIR      = 'C:\\Users\\mario\\dev\\proptech-state';
const AGENTS_DIR     = path.join(STATE_DIR, 'agents');
const ACTIVITY_FILE  = path.join(STATE_DIR, 'recent-activity.md');
const TRIGGERS_FILE  = path.join(STATE_DIR, 'triggers.md');
const OPPS_FILE      = path.join(STATE_DIR, 'opportunities.md');
const SPRINT_FILE    = 'C:\\Users\\mario\\dev\\proptech-v5-1b3\\.claude\\current\\current-sprint-state.md';
const VERTICALS_FILE = 'C:\\Users\\mario\\dev\\proptech-v5-1b3\\.claude\\strategy\\verticals-state.md';

const OUTPUT_FILE = path.join(
  __dirname, '..', 'docs', 'dashboard', 'data.json'
);

// --- Helpers ---
function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (_) {
    return null;
  }
}

function readLines(filePath) {
  const content = readFile(filePath);
  if (!content) return [];
  return content.split(/\r?\n/);
}

// --- 1. Recent activity: ultimas 10 linhas que comecam por "[" ---
function parseRecentActivity() {
  try {
    const lines = readLines(ACTIVITY_FILE);
    const entries = lines
      .filter(l => l.trim().startsWith('['))
      .slice(0, 10);
    return entries;
  } catch (_) {
    return [];
  }
}

// --- 2. Triggers activos: linhas entre "## Activos" e proxima "## " ---
function parseActiveTriggers() {
  try {
    const lines = readLines(TRIGGERS_FILE);
    let inActivos = false;
    const result = [];
    for (const line of lines) {
      if (line.trim() === '## Activos') { inActivos = true; continue; }
      if (inActivos && line.trim().startsWith('## ')) break;
      if (inActivos) {
        const t = line.trim();
        if (t && t !== '_(nenhum)_') result.push(t);
      }
    }
    return result;
  } catch (_) {
    return [];
  }
}

// --- 3. Top oportunidades: linhas que comecam por "[P1]" ou "[P2]" ---
function parseTopOpportunities() {
  try {
    const lines = readLines(OPPS_FILE);
    return lines
      .map(l => l.trim())
      .filter(l => l.startsWith('[P1]') || l.startsWith('[P2]'));
  } catch (_) {
    return [];
  }
}

// --- 4. Agentes: para cada .md em agents/ extrai Last run / Last task / Next suggested ---
function parseAgents() {
  try {
    const files = fs.readdirSync(AGENTS_DIR).filter(f => f.endsWith('.md'));
    return files.map(filename => {
      const name = filename.replace('.md', '');
      try {
        const lines = readLines(path.join(AGENTS_DIR, filename));
        let lastRun = '';
        let lastTask = '';
        let nextSuggested = '';
        for (const line of lines) {
          if (line.startsWith('Last run:')) {
            lastRun = line.replace('Last run:', '').trim();
          } else if (line.startsWith('Last task:')) {
            lastTask = line.replace('Last task:', '').trim();
          } else if (line.startsWith('Next suggested:')) {
            nextSuggested = line.replace('Next suggested:', '').trim();
          }
        }
        return { name, lastRun, lastTask, nextSuggested };
      } catch (_) {
        return { name, lastRun: '', lastTask: '', nextSuggested: '' };
      }
    });
  } catch (_) {
    return [];
  }
}

// --- 5. Sprint actual: linha da tabela com "ACTIVO" ---
function parseCurrentSprint() {
  try {
    const lines = readLines(SPRINT_FILE);
    const line = lines.find(l => l.includes('ACTIVO'));
    if (!line) return '';
    // Extrai o texto das celulas da tabela markdown (| ... | ... |)
    const cols = line.split('|').map(c => c.trim()).filter(Boolean);
    return cols.join(' — ');
  } catch (_) {
    return '';
  }
}

// --- 6. Verticais: para cada secção "## VN — " extrai id, name, status ---
function parseVerticals() {
  try {
    const lines = readLines(VERTICALS_FILE);
    const verticals = [];
    let current = null;

    for (const line of lines) {
      // Detecta cabecalho de vertical: "## V1 — Core Hub (Horizontal)"
      const headerMatch = line.match(/^##\s+(V\d+)\s+[—–-]+\s+(.+)/);
      if (headerMatch) {
        if (current) verticals.push(current);
        const namePart = headerMatch[2].trim();
        // Remove sufixo entre parentesis: "(Horizontal)" ou "(Vertical)"
        const cleanName = namePart.replace(/\s*\([^)]+\)$/, '').trim();
        current = { id: headerMatch[1], name: cleanName, status: '' };
        continue;
      }
      // Detecta linha de estado dentro da seccao actual
      if (current && line.trim().startsWith('**Estado:**')) {
        const statusMatch = line.match(/\*\*Estado:\*\*\s*(.+)/);
        if (statusMatch) {
          current.status = statusMatch[1].trim();
        }
      }
    }
    if (current) verticals.push(current);
    return verticals;
  } catch (_) {
    return [];
  }
}

// --- Main ---
function build() {
  const data = {
    generated: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    recentActivity:    parseRecentActivity(),
    activeTriggers:    parseActiveTriggers(),
    topOpportunities:  parseTopOpportunities(),
    agents:            parseAgents(),
    currentSprint:     parseCurrentSprint(),
    verticals:         parseVerticals(),
  };

  const outDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2), 'utf8');
  console.log('[dashboard-data-build] OK →', OUTPUT_FILE);
  console.log('  recentActivity:   ', data.recentActivity.length, 'entries');
  console.log('  activeTriggers:   ', data.activeTriggers.length, 'entries');
  console.log('  topOpportunities: ', data.topOpportunities.length, 'entries');
  console.log('  agents:           ', data.agents.length, 'entries');
  console.log('  currentSprint:    ', data.currentSprint || '(vazio)');
  console.log('  verticals:        ', data.verticals.length, 'entries');
}

build();
