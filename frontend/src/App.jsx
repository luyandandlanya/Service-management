import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import LoginPage from './pages/auth/LoginPage'
import DashboardPage from './pages/DashboardPage'
import SitesPage from './pages/sites/SitesPage'
import ContractDetailPage from './pages/contracts/ContractDetailPage'
import AttendancePage from './pages/attendance/AttendancePage'
import StockPage from './pages/stock/StockPage'
import IssuesPage from './pages/issues/IssuesPage'
import AssetsPage from './pages/assets/AssetsPage'
import SalaryPage from './pages/salary/SalaryPage'
import TrackerPage from './pages/tracker/TrackerPage'
import TrackedItemDetailPage from './pages/tracker/TrackedItemDetailPage'

function RequireAuth({ children }) {
  const { session, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading…</div>
  if (!session) return <Navigate to="/login" replace />
  return children
}

function RequireOwner({ children }) {
  const { profile, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading…</div>
  if (profile?.role !== 'owner') return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
  const { session } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<DashboardPage />} />
        <Route path="sites" element={<RequireOwner><SitesPage /></RequireOwner>} />
        <Route path="contracts/:id" element={<ContractDetailPage />} />
        <Route path="contracts/:id/attendance" element={<AttendancePage />} />
        <Route path="contracts/:id/stock" element={<StockPage />} />
        <Route path="contracts/:id/issues" element={<IssuesPage />} />
        <Route path="contracts/:id/assets" element={<AssetsPage />} />
        <Route path="salary" element={<RequireOwner><SalaryPage /></RequireOwner>} />
        <Route path="tracker" element={<RequireOwner><TrackerPage /></RequireOwner>} />
        <Route path="tracker/:id" element={<RequireOwner><TrackedItemDetailPage /></RequireOwner>} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
