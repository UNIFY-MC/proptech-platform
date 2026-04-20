const colorMap = {
  azul: 'bg-blue-50 border-blue-200 text-blue-700',
  verde: 'bg-green-50 border-green-200 text-green-700',
  amarelo: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  vermelho: 'bg-red-50 border-red-200 text-red-700',
  cinza: 'bg-gray-50 border-gray-200 text-gray-700',
}

export default function KpiCard({ titulo, valor, unidade, cor = 'azul' }) {
  const colorClasses = colorMap[cor] ?? colorMap.azul

  return (
    <div className={`rounded-2xl border p-6 flex flex-col gap-2 ${colorClasses}`}>
      <span className="text-sm font-medium uppercase tracking-wide opacity-70">{titulo}</span>
      <div className="flex items-end gap-1">
        <span className="text-4xl font-bold leading-none">{valor}</span>
        {unidade && (
          <span className="text-base font-medium mb-1 opacity-60">{unidade}</span>
        )}
      </div>
    </div>
  )
}
