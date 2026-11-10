import { BrowserRouter, Outlet, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthProvider'
import { LoginPage } from './auth/LoginPage'
import { SongListPage } from './songs/SongListPage'
import { SongEditorPage } from './songs/SongEditorPage'

function AppShell() {
  const { user, signOut } = useAuth()

  return (
    <div className="min-h-dvh text-slate-100">
      <header className="glass sticky top-0 z-30 flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h1 className="font-serif text-3xl leading-none italic text-slate-100">hush</h1>
        <div className="flex items-center gap-3 text-sm text-slate-400">
          <span>{user?.email}</span>
          <button
            type="button"
            onClick={() => signOut()}
            className="rounded-full border border-white/12 bg-white/5 px-3 py-1.5 text-slate-300 transition hover:bg-white/10 hover:text-slate-100"
          >
            Sign out
          </button>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  )
}

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-slate-400">
        Loading…
      </div>
    )
  }

  if (!user) return <LoginPage />

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<SongListPage />} />
          <Route path="/songs/:id" element={<SongEditorPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}

export default App
