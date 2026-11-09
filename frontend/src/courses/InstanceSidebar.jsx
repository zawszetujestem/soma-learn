import { Link, useLocation } from 'react-router-dom'
import { HomeLogo } from '../home/HomePage.jsx'

// Route-local navigation: share the App-owned logout state, not a second flow.
export default function InstanceSidebar({ logoutFlow }) {
  const { pathname } = useLocation()
  const { logoutState, handleLogout } = logoutFlow
  return (
    <aside className="instance-sidebar" aria-label="Nawigacja kursu">
      <HomeLogo />
      <nav aria-label="Nawigacja kursu">
        <Link to="/"><span aria-hidden="true">⌂</span>Start</Link>
        <Link to="/kursy"><span aria-hidden="true">▦</span>Kursy</Link>
        <Link to={pathname} aria-current="page"><span aria-hidden="true">▤</span>Mój kurs</Link>
        <Link to="/nauka"><span aria-hidden="true">↗</span>Moja nauka</Link>
      </nav>
      <button className="button button-secondary instance-logout" type="button"
        onClick={handleLogout} disabled={logoutState.busy}>
        {logoutState.busy ? 'Wylogowywanie…' : 'Wyloguj'}
      </button>
    </aside>
  )
}
