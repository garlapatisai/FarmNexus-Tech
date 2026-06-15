import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { RoleRoute } from './components/RoleRoute'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { FarmerDashboard } from './pages/farmer/FarmerDashboard'
import { FarmerListings } from './pages/farmer/FarmerListings'
import { FarmerListingFormPage } from './pages/farmer/FarmerListingFormPage'
import { FarmerListingNew } from './pages/farmer/FarmerListingNew'
import { FarmerOrders } from './pages/farmer/FarmerOrders'
import { FarmerChat } from './pages/farmer/FarmerChat'
import { BuyerHome } from './pages/buyer/BuyerHome'
import { BuyerListingDetail } from './pages/buyer/BuyerListingDetail'
import { BuyerCart } from './pages/buyer/BuyerCart'
import { BuyerOrders } from './pages/buyer/BuyerOrders'
import { BuyerChat } from './pages/buyer/BuyerChat'
import { BuyerSavedItems } from './pages/buyer/BuyerSavedItems'
import { FarmerAnalytics } from './pages/farmer/FarmerAnalytics'
import { AdminLoginPage } from './pages/admin/AdminLoginPage'
import { AdminDashboard } from './pages/admin/AdminDashboard'
import { AdminUsers } from './pages/admin/AdminUsers'
import { AdminOrders } from './pages/admin/AdminOrders'

function FarmerShell({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <RoleRoute role="farmer">{children}</RoleRoute>
    </ProtectedRoute>
  )
}

function BuyerShell({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <RoleRoute role="buyer">{children}</RoleRoute>
    </ProtectedRoute>
  )
}

function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <RoleRoute role="admin">{children}</RoleRoute>
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />

          <Route
            path="/farmer/dashboard"
            element={
              <FarmerShell>
                <FarmerDashboard />
              </FarmerShell>
            }
          />
          <Route
            path="/farmer/analytics"
            element={
              <FarmerShell>
                <FarmerAnalytics />
              </FarmerShell>
            }
          />
          <Route
            path="/farmer/listings"
            element={
              <FarmerShell>
                <FarmerListings />
              </FarmerShell>
            }
          />
          <Route
            path="/farmer/listings/new"
            element={
              <FarmerShell>
                <FarmerListingNew />
              </FarmerShell>
            }
          />
          <Route
            path="/farmer/listings/:id/edit"
            element={
              <FarmerShell>
                <FarmerListingFormPage />
              </FarmerShell>
            }
          />
          <Route
            path="/farmer/orders"
            element={
              <FarmerShell>
                <FarmerOrders />
              </FarmerShell>
            }
          />
          <Route
            path="/farmer/chat"
            element={
              <FarmerShell>
                <FarmerChat />
              </FarmerShell>
            }
          />

          <Route
            path="/buyer/home"
            element={
              <BuyerShell>
                <BuyerHome />
              </BuyerShell>
            }
          />
          <Route
            path="/buyer/listing/:id"
            element={
              <BuyerShell>
                <BuyerListingDetail />
              </BuyerShell>
            }
          />
          <Route
            path="/buyer/cart"
            element={
              <BuyerShell>
                <BuyerCart />
              </BuyerShell>
            }
          />
          <Route
            path="/buyer/orders"
            element={
              <BuyerShell>
                <BuyerOrders />
              </BuyerShell>
            }
          />
          <Route
            path="/buyer/chat"
            element={
              <BuyerShell>
                <BuyerChat />
              </BuyerShell>
            }
          />
          <Route
            path="/buyer/saved"
            element={
              <BuyerShell>
                <BuyerSavedItems />
              </BuyerShell>
            }
          />

          <Route
            path="/admin"
            element={
              <AdminShell>
                <AdminDashboard />
              </AdminShell>
            }
          />
          <Route
            path="/admin/users"
            element={
              <AdminShell>
                <AdminUsers />
              </AdminShell>
            }
          />
          <Route
            path="/admin/orders"
            element={
              <AdminShell>
                <AdminOrders />
              </AdminShell>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
