import { useEffect } from 'react'

const NAV_ITEMS = [
  { icon: '★', label: 'Rating', path: null },
  { icon: '🔧', label: 'Serviços ativos', path: null },
  { icon: '📅', label: 'Os meus serviços', path: 'calendar' },
  { icon: '💳', label: 'Pagamentos', path: null },
  { icon: '👤', label: 'Perfil', path: null },
  { icon: '📊', label: 'Estatísticas', path: null },
  { icon: '🔨', label: 'Tarefas', path: null },
  { icon: '🌐', label: 'Idioma', path: null },
  { icon: '🕐', label: 'A tua disponibilidade', path: null },
  { icon: 'ℹ️', label: 'Ajuda', path: null },
]

export default function Drawer({ open, onClose, user, onNavigate, onLogout }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Drawer panel */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-white z-50 flex flex-col shadow-2xl
          transform transition-transform duration-300 ease-in-out
          ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Profile */}
        <div className="flex flex-col items-center pt-12 pb-6 px-6 border-b border-gray-100">
          <div className="w-20 h-20 rounded-full bg-teal-600 flex items-center justify-center text-white text-2xl font-bold mb-3 overflow-hidden">
            {user?.avatar_url
              ? <img src={user.avatar_url} alt="avatar" className="w-full h-full object-cover" />
              : (user?.nome?.[0] ?? 'P')}
          </div>
          <p className="font-semibold text-gray-900 text-base">{user?.nome ?? 'Prestador'}</p>
          <p className="text-sm text-gray-400 mt-0.5">{user?.codigo ?? '—'}</p>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-2">
          {NAV_ITEMS.map(({ icon, label, path }) => (
            <button
              key={label}
              onClick={() => { onNavigate?.(path); onClose() }}
              className="w-full flex items-center gap-4 px-6 py-3.5 text-left text-gray-700
                hover:bg-gray-50 active:bg-gray-100 transition-colors text-sm"
            >
              <span className="text-lg w-6 text-center">{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="border-t border-gray-100 p-2">
          <button
            onClick={() => { onLogout?.(); onClose() }}
            className="w-full flex items-center gap-4 px-6 py-3.5 text-left text-red-500
              hover:bg-red-50 transition-colors text-sm rounded-lg"
          >
            <span className="text-lg w-6 text-center">↩</span>
            <span>Sair</span>
          </button>
        </div>
      </aside>
    </>
  )
}
