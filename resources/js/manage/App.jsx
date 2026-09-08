import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './lib/auth'
import Layout from './components/Layout'
import Login from './pages/Login'
import Inventory from './pages/Inventory'
import Orders from './pages/Orders'

const qc = new QueryClient()

function RequireFarmer({ children }) {
  const { user, token } = useAuth()
  if (!token || !user) return <Navigate to="/login" replace />
  if (user.role !== 'farmer' && user.role !== 'admin') {
    return <div className="min-h-screen flex items-center justify-center p-6"><div className="bg-white border border-[#E8C6C6] rounded-xl p-6 text-[#B0413E] text-center">AniManage is for farmers<br/>Signed in as {user.role}. Use lito@anilink.test / password123.</div></div>
  }
  return children
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <BrowserRouter basename="/manage">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<RequireFarmer><Layout><Inventory /></Layout></RequireFarmer>} />
            <Route path="/orders" element={<RequireFarmer><Layout><Orders /></Layout></RequireFarmer>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
