import { Megaphone } from 'lucide-react';

export default function StudioPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 12, color: 'var(--dim)' }}>
      <Megaphone size={32} color="var(--orange)" />
      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--muted)' }}>Ad Studio</div>
      <div style={{ fontSize: 12, color: 'var(--dim)', textAlign: 'center', maxWidth: 300 }}>
        Discovery → Gerar anúncio → Publicar em Meta.<br />
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10 }}>Sprint B4 · Semana 4</span>
      </div>
    </div>
  );
}
