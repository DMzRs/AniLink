import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './lib/auth'
import Layout from './components/Layout'
import Login from './pages/Login'
import Analytics from './pages/Analytics'
import Verifications from './pages/Verifications'
import Listings from './pages/Listings'
import Users from './pages/Users'

const qc = new QueryClient()

function RequireAdmin({ children }) {
  const { user, token } = useAuth()
  if (!token || !user) return <Navigate to="/login" replace />
  if (user.role !== 'admin') return <div className="min-h-screen flex items-center justify-center p-6 text-center"><div className="bg-white border border-[#E8C6C6] rounded-xl p-6 text-[#B0413E]">Admin only — signed in as {user.role}.<br/>Use admin@anilink.test / password123.</div></div>
  return children
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <BrowserRouter basename="/admin">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<RequireAdmin><Layout><Analytics /></Layout></RequireAdmin>} />
            <Route path="/verifications" element={<RequireAdmin><Layout><Verifications /></Layout></RequireAdmin>} />
            <Route path="/listings" element={<RequireAdmin><Layout><Listings /></Layout></RequireAdmin>} />
            <Route path="/users" element={<RequireAdmin><Layout><Users /></Layout></RequireAdmin>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
