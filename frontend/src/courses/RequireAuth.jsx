import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { clearToken, coursesApi, getToken } from './api.js'
import { ErrorMessage, LoadingMessage } from './StateViews.jsx'

const CurrentUserContext = createContext(null)

export function useCurrentUser() {
  return useContext(CurrentUserContext)
}

export function isStudent(user) {
  return Boolean(user?.roles?.includes('student'))
}

export function isManager(user) {
  return Boolean(user?.roles?.some((role) => role === 'mentor' || role === 'admin'))
}

export function useLoader(load, deps) {
  const [state, setState] = useState({ status: 'loading', data: null, error: null })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    setState((previous) => ({ ...previous, status: 'loading', error: null }))
    load().then(
      (data) => { if (active) setState({ status: 'ready', data, error: null }) },
      (error) => { if (active) setState({ status: 'error', data: null, error }) },
    )
    return () => { active = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, ...deps])

  const reload = useCallback(() => setAttempt((value) => value + 1), [])
  const setData = useCallback(
    (updater) => setState((previous) => ({
      ...previous,
      data: typeof updater === 'function' ? updater(previous.data) : updater,
    })),
    [],
  )

  return { ...state, reload, setData }
}

function AuthenticatedGate() {
  const session = useLoader(
    () => coursesApi.currentUser().catch((error) => {
      if (error.kind === 'auth') clearToken()
      throw error
    }),
    [],
  )

  if (session.status === 'loading') return <LoadingMessage>Sprawdzamy sesję…</LoadingMessage>
  if (session.status === 'error') {
    if (session.error.kind === 'auth') return <Navigate to="/logowanie" replace />
    return (
      <main className="courses-page page-width">
        <ErrorMessage onRetry={session.reload}>
          Nie udało się sprawdzić sesji. {session.error.message}
        </ErrorMessage>
      </main>
    )
  }

  return (
    <CurrentUserContext.Provider value={session.data}>
      <Outlet />
    </CurrentUserContext.Provider>
  )
}

export function RequireAuth() {
  if (!getToken()) return <Navigate to="/logowanie" replace />
  return <AuthenticatedGate />
}

export function RequireManager() {
  const user = useCurrentUser()
  if (!isManager(user)) {
    return (
      <main className="courses-page page-width">
        <p className="courses-status">Ta sekcja jest dostępna dla mentorów.</p>
      </main>
    )
  }
  return <Outlet />
}
