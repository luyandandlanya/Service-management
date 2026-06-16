import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Layout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const isOwner = profile?.role === 'owner'

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-slate-800 text-white px-4 py-3 flex items-center justify-between">
        <span className="font-semibold text-lg">Service Management</span>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-slate-300">{profile?.full_name || profile?.role}</span>
          <button onClick={handleSignOut} className="text-slate-400 hover:text-white transition">Sign out</button>
        </div>
      </header>

      <nav className="bg-slate-700 text-white flex gap-1 px-4 py-2 text-sm flex-wrap">
        <NavLink to="/" end className={({ isActive }) => navCls(isActive)}>Dashboard</NavLink>
        {isOwner && <NavLink to="/sites" className={({ isActive }) => navCls(isActive)}>Sites</NavLink>}
        {isOwner && <NavLink to="/salary" className={({ isActive }) => navCls(isActive)}>Salaries</NavLink>}
        {isOwner && <NavLink to="/tracker" className={({ isActive }) => navCls(isActive)}>Tracker</NavLink>}
      </nav>

      <main className="flex-1 p-4 max-w-6xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  )
}

function navCls(isActive) {
  return `px-3 py-1 rounded transition ${isActive ? 'bg-slate-500 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-600'}`
}
