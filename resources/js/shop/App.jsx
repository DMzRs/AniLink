import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './lib/auth.jsx'
import { CartProvider } from './lib/cart'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from '../shared/ForgotPassword'
import Browse from './pages/Browse'
import ProductDetail from './pages/ProductDetail'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import Orders from './pages/Orders'
import Notifications from './pages/Notifications'

const qc = new QueryClient()

function RequireBuyer({ children }) {
  const { user, token, isBuyer } = useAuth()
  const location = useLocation()
  if (!token || !user) return <Navigate to="/login" replace state={{ from: location }} />
  if (!isBuyer) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center p-6">
        <div className="bg-white border border-[#E8C6C6] rounded-xl p-6 text-[#B0413E] text-center text-sm">
          AniMarket shopping is for buyer accounts.<br />
          Signed in as {user.role} — use the mobile app or <a className="underline" href="/manage">AniManage</a>.
        </div>
      </div>
    )
  }
  return children
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <CartProvider>
          <BrowserRouter basename="/shop">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword loginPath="/login" />} />
              <Route path="/" element={<Layout><Browse /></Layout>} />
              <Route path="/products/:id" element={<Layout><ProductDetail /></Layout>} />
              <Route path="/cart" element={<Layout><Cart /></Layout>} />
              <Route path="/checkout" element={<RequireBuyer><Layout><Checkout /></Layout></RequireBuyer>} />
              <Route path="/orders" element={<RequireBuyer><Layout><Orders /></Layout></RequireBuyer>} />
              <Route path="/notifications" element={<RequireBuyer><Layout><Notifications /></Layout></RequireBuyer>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
