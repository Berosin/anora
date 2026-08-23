import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Layers,
  FileText,
  MessagesSquare,
  Sparkles,
  GitCompareArrows,
  Settings,
  LogOut,
} from 'lucide-react'
import Logo from '../components/Logo'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/knowledge-bases', label: 'Knowledge bases', icon: Layers },
  { to: '/documents', label: 'Documents', icon: FileText },
  { to: '/chat', label: 'Chat', icon: MessagesSquare },
  { to: '/summarize', label: 'Summarize', icon: Sparkles },
  { to: '/compare', label: 'Compare', icon: GitCompareArrows },
]

export default function AppLayout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const initials = (user?.name || 'A')
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="min-h-screen bg-ink text-text flex">
      <aside className="w-64 shrink-0 border-r border-hairline flex flex-col justify-between py-6 px-4">
        <div>
          <div className="px-2 mb-8">
            <Logo />
          </div>
          <nav className="space-y-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-surface-raised text-text'
                      : 'text-muted hover:text-text hover:bg-surface'
                  }`
                }
              >
                <Icon size={17} strokeWidth={1.75} />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="border-t border-hairline pt-4 px-2">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-8 w-8 rounded-full bg-surface-raised border border-hairline flex items-center justify-center font-mono text-xs text-signal">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="text-sm text-text truncate">{user?.name || 'Account'}</div>
              <div className="text-xs text-faint truncate">{user?.email}</div>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <NavLink
              to="/settings"
              className="flex items-center gap-3 px-1 py-1.5 rounded-lg text-sm text-muted hover:text-text transition-colors"
            >
              <Settings size={16} strokeWidth={1.75} />
              Settings
            </NavLink>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-1 py-1.5 rounded-lg text-sm text-muted hover:text-failed transition-colors text-left"
            >
              <LogOut size={16} strokeWidth={1.75} />
              Log out
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0">{children}</main>
    </div>
  )
}
