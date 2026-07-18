import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const ownerLinks = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/sites', label: 'Sites' },
  { to: '/contracts-mgmt', label: 'Contracts' },
  { to: '/supervisors', label: 'Supervisors' },
  { to: '/salary', label: 'Salaries' },
  { to: '/reports', label: 'Reports' },
  { to: '/tracker', label: 'Tracker' },
  { to: '/admin', label: 'Admin / Setup' },
]

const supervisorLinks = [
  { to: '/', label: 'My Contracts', end: true },
  { to: '/admin', label: 'My Profile' },
]

export default function Layout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const isOwner = profile?.role === 'owner'
  const links = isOwner ? ownerLinks : supervisorLinks
  const [menuOpen, setMenuOpen] = useState(false)

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between shadow">
        <div className="flex items-center gap-3">
          <span className="font-bold text-lg tracking-tight">Service Mgmt</span>
          {profile?.role && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isOwner ? 'bg-amber-500 text-amber-950' : 'bg-slate-600 text-slate-200'}`}>
              {profile.role}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-400 hidden sm:inline">{profile?.full_name || '—'}</span>
          <button onClick={handleSignOut} className="text-slate-400 hover:text-white transition text-sm">Sign out</button>
          {/* Hamburger — mobile only */}
          <button
            className="md:hidden flex flex-col gap-1 p-1"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <span className={`block w-5 h-0.5 bg-white transition-transform ${menuOpen ? 'translate-y-1.5 rotate-45' : ''}`} />
            <span className={`block w-5 h-0.5 bg-white transition-opacity ${menuOpen ? 'opacity-0' : ''}`} />
            <span className={`block w-5 h-0.5 bg-white transition-transform ${menuOpen ? '-translate-y-1.5 -rotate-45' : ''}`} />
          </button>
        </div>
      </header>

      {/* Desktop nav — hidden on mobile */}
      <nav className="hidden md:flex bg-slate-800 text-white gap-0.5 px-3 py-1.5 text-sm shadow-sm">
        {links.map(l => (
          <NavLink key={l.to} to={l.to} end={l.end}
            className={({ isActive }) =>
              `px-3 py-1.5 rounded transition ${isActive ? 'bg-slate-600 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-700'}`
            }>
            {l.label}
          </NavLink>
        ))}
      </nav>

      {/* Mobile nav — full-width dropdown */}
      {menuOpen && (
        <nav className="md:hidden bg-slate-800 text-white flex flex-col shadow-lg">
          {links.map(l => (
            <NavLink key={l.to} to={l.to} end={l.end}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `px-5 py-3 text-sm border-b border-slate-700 transition ${isActive ? 'bg-slate-600 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`
              }>
              {l.label}
            </NavLink>
          ))}
        </nav>
      )}

      <main className="flex-1 p-4 max-w-6xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  )
}
