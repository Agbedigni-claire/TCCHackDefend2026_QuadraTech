import { BrowserRouter, Outlet, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import SessionWarning from './components/SessionWarning'
import Login from './pages/Login'
import Register from './pages/Register'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Carte from './pages/Carte'
import Terrains from './pages/Terrains'
import TerrainDetail from './pages/TerrainDetail'
import Proprietaires from './pages/Proprietaires'
import Transactions from './pages/Transactions'
import Litiges from './pages/Litiges'
import Blockchain from './pages/Blockchain'
import Alertes from './pages/Alertes'
import VerifierDocument from './pages/VerifierDocument'
import ProfilUtilisateur from './pages/ProfilUtilisateur'
import AdminPanel from './pages/AdminPanel'

function AppLayout() {
  return (
    <>
      <Navbar />
      <SessionWarning />
      <main className="main-content">
        <Outlet />
      </main>
    </>
  )
}

function RootPage() {
  const { user } = useAuth()
  return user ? <Dashboard /> : <Home />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route element={<AppLayout />}>
            <Route index element={<RootPage />} />
            <Route path="/terrains"     element={<Terrains />} />
            <Route path="/terrains/:id" element={<TerrainDetail />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard"          element={<Dashboard />} />
              <Route path="/carte"              element={<Carte />} />
              <Route path="/proprietaires"      element={<Proprietaires />} />
              <Route path="/transactions"       element={<Transactions />} />
              <Route path="/litiges"            element={<Litiges />} />
              <Route path="/blockchain"         element={<Blockchain />} />
              <Route path="/alertes"            element={<Alertes />} />
              <Route path="/verifier-document"  element={<VerifierDocument />} />
              <Route path="/profil"             element={<ProfilUtilisateur />} />
              <Route path="/gestion-utilisateurs" element={<AdminPanel />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
