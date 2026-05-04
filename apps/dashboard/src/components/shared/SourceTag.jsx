// SourceTag — indicador de fonte de dados por secção
// Mostra o ficheiro source e estado live/missing de cada bloco de dados

export function SourceTag({ source, status, error }) {
  const isMissing = status === 'missing' || status === 'error'
  return (
    <div
      style={{
        fontSize: '0.65rem',
        fontFamily: 'monospace',
        color: isMissing ? 'var(--danger)' : 'var(--text-dim)',
        borderTop: '1px dashed var(--border)',
        marginTop: 12,
        paddingTop: 6,
        opacity: isMissing ? 1 : 0.65,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        flexWrap: 'wrap'
      }}
      title={error || `Fonte: ${source}`}
    >
      <span>{isMissing ? '⚠' : '📄'}</span>
      {isMissing
        ? <span style={{ color: 'var(--danger)' }}>fonte em falta: {source}</span>
        : <span>{source}</span>
      }
    </div>
  )
}
