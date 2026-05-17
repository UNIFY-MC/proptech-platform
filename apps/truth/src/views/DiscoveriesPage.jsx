import { Lightbulb } from 'lucide-react';

export default function DiscoveriesPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 12, color: 'var(--dim)' }}>
      <Lightbulb size={32} color="var(--blue)" />
      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--muted)' }}>Discoveries</div>
      <div style={{ fontSize: 12, color: 'var(--dim)', textAlign: 'center', maxWidth: 300 }}>
        Lista paginada e filtrável de todas as discoveries.<br />
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10 }}>Sprint B3 · Semana 3</span>
      </div>
    </div>
  );
}
