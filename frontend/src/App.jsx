import { Link, Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { GoogleCallbackPage, LoginPage, PasswordResetPage, RegistrationPage, VerificationPage } from './AuthPages.jsx'
import { logoutUnconfirmedError } from './authApi.js'
import CoursesPage from './courses/CoursesPage.jsx'
import CourseDetailPage from './courses/CourseDetailPage.jsx'
import CourseEditorPage from './courses/CourseEditorPage.jsx'
import VersionEditorPage from './courses/VersionEditorPage.jsx'
import VersionPreviewPage, { CourseModerationPage } from './courses/VersionPreviewPage.jsx'
import { getToken } from './courses/api.js'
import InstancePage from './courses/InstancePage.jsx'
import JoinByTokenPage from './courses/JoinByTokenPage.jsx'
import LearningDashboardPage from './courses/LearningDashboardPage.jsx'
import MentorCourseDetailPage from './courses/MentorCourseDetailPage.jsx'
import MyCoursesPage from './courses/MyCoursesPage.jsx'
import { RequireAuth, RequireManager } from './courses/RequireAuth.jsx'
import SomaHomePage, { HomeLogo } from './home/HomePage.jsx'
import useLogoutFlow from './useLogoutFlow.js'
import InstanceSidebar from './courses/InstanceSidebar.jsx'
import './courses/instance-page.css'

function GuestOnly({ children }) {
  return getToken() ? <Navigate to="/kursy" replace /> : children
}

function SiteHeader({ logoutFlow }) {
  const { loggedIn, logoutState, handleLogout } = logoutFlow
  return (
    <>
    <header className="site-header">
      <HomeLogo />
      <nav className="main-nav" aria-label="Główna nawigacja">
        <Link className="nav-anchor" to="/#metoda">Jak działa SOMA</Link>
        <NavLink className={({ isActive }) => `nav-anchor${isActive ? ' is-active' : ''}`} to="/kursy">
          Kursy
        </NavLink>
        {loggedIn && (
          <NavLink className={({ isActive }) => `nav-anchor${isActive ? ' is-active' : ''}`} to="/nauka">
            Moja nauka
          </NavLink>
        )}
        {loggedIn ? (
          <button className="nav-login nav-logout" type="button" onClick={handleLogout} disabled={logoutState.busy}>
            {logoutState.busy ? 'Wylogowywanie…' : 'Wyloguj'}
          </button>
        ) : (
          <NavLink className={({ isActive }) => `nav-login${isActive ? ' is-active' : ''}`} to="/logowanie">
            Logowanie <span aria-hidden="true">↗</span>
          </NavLink>
        )}
      </nav>
    </header>
    {!loggedIn && logoutState.failed && (
      <div className="logout-notice page-width">
        <p className="auth-error" role="alert">{logoutUnconfirmedError}</p>
        <button className="button button-secondary" type="button" onClick={handleLogout} disabled={logoutState.busy}>
          {logoutState.busy ? 'Wylogowywanie…' : 'Ponów wylogowanie'}
        </button>
      </div>
    )}
    {!loggedIn && logoutState.confirmed && (
      <p className="auth-status logout-notice page-width" role="status">Wylogowanie zostało potwierdzone.</p>
    )}
    </>
  )
}

function NotFoundPage() {
  return (
    <main className="simple-page page-width">
      <p className="eyebrow">Zmieniamy kierunek</p>
      <h1>Tej strony tu nie ma.</h1>
      <Link className="text-link" to="/">Wróć na stronę główną <span aria-hidden="true">↗</span></Link>
    </main>
  )
}

export default function App() {
  const { pathname } = useLocation()
  const logoutFlow = useLogoutFlow()
  // Match only the instance detail route, never neighbouring/prefixed routes.
  const instanceShell = logoutFlow.loggedIn && /^\/kursy\/instancje\/[^/]+\/?$/.test(pathname)

  if (pathname === '/') return <SomaHomePage logoutFlow={logoutFlow} />

  return (
    <div className={`app-shell${instanceShell ? ' instance-shell' : ''}`}>
      {instanceShell
        ? <InstanceSidebar logoutFlow={logoutFlow} />
        : <SiteHeader logoutFlow={logoutFlow} />}
      <Routes>
        <Route element={<RequireAuth />}>
          <Route path="/kursy" element={<CoursesPage />} />
          <Route path="/nauka" element={<LearningDashboardPage />} />
          <Route path="/kursy/instancje/:id" element={<InstancePage />} />
          <Route path="/kursy/dolacz/:token" element={<JoinByTokenPage />} />
          <Route path="/kursy/moje" element={<RequireManager />}>
            <Route index element={<MyCoursesPage />} />
            <Route path="nowy" element={<CourseEditorPage />} />
            <Route path=":id" element={<MentorCourseDetailPage />} />
            <Route path=":id/wersje/:versionId/edytuj" element={<VersionEditorPage />} />
          </Route>
          <Route element={<RequireManager />}><Route path="/kursy/podglad/:id/wersje/:versionId" element={<VersionPreviewPage />} /><Route path="/course-moderation/" element={<CourseModerationPage />} /></Route>
          <Route path="/kursy/:id" element={<CourseDetailPage />} />
        </Route>
        <Route path="/logowanie" element={<GuestOnly><LoginPage /></GuestOnly>} />
        <Route path="/logowanie/reset-hasla" element={<GuestOnly><PasswordResetPage /></GuestOnly>} />
        <Route path="/logowanie/google/callback" element={<GoogleCallbackPage />} />
        <Route path="/rejestracja" element={<RegistrationPage />} />
        <Route path="/potwierdzenie-email" element={<VerificationPage />} />
        <Route path="/potwierdzenie-email/:key" element={<VerificationPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      {!instanceShell && <footer className="site-footer">
        <HomeLogo />
        <span>Małe kroki. Świadomy kierunek.</span>
        <a href="/#metoda">O podejściu SOMA <span aria-hidden="true">↗</span></a>
      </footer>}
    </div>
  )
}