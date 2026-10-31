import { startTransition, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { logout } from './authApi.js'
import { getToken } from './courses/api.js'

// Owned by App so a logout redirect can switch headers without losing retry state.
export default function useLogoutFlow() {
  const navigate = useNavigate()
  const loggedIn = Boolean(getToken())
  const [logoutState, setLogoutState] = useState({ busy: false, failed: false, confirmed: false })
  const inFlight = useRef(false)

  async function handleLogout() {
    if (inFlight.current) return
    inFlight.current = true
    const retry = !loggedIn
    setLogoutState({ busy: true, failed: retry, confirmed: false })
    let nextState
    try {
      await logout()
      nextState = { busy: false, failed: false, confirmed: retry }
    } catch {
      nextState = { busy: false, failed: true, confirmed: false }
    } finally {
      inFlight.current = false
    }
    // React Router schedules navigation as a transition. Keep the completed
    // state in that transition too: otherwise a protected route can briefly
    // render with the cleared token and redirect to login before home commits.
    startTransition(() => {
      if (!retry) navigate('/')
      setLogoutState(nextState)
    })
  }

  return { loggedIn, logoutState, handleLogout }
}
