import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import KnowledgeBases from './pages/KnowledgeBases'
import Documents from './pages/Documents'
import Chat from './pages/Chat'
import Summarize from './pages/Summarize'
import Compare from './pages/Compare'
import Settings from './pages/Settings'
import NotFound from './pages/NotFound'
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './layouts/AppLayout'

function Protected({ children }) {
  return (
    <ProtectedRoute>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Authenticated */}
      <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
      <Route path="/knowledge-bases" element={<Protected><KnowledgeBases /></Protected>} />
      <Route path="/documents" element={<Protected><Documents /></Protected>} />
      <Route path="/chat" element={<Protected><Chat /></Protected>} />
      <Route path="/summarize" element={<Protected><Summarize /></Protected>} />
      <Route path="/compare" element={<Protected><Compare /></Protected>} />
      <Route path="/settings" element={<Protected><Settings /></Protected>} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
