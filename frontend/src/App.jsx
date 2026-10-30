import { useState } from 'react'
import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { GoogleCallbackPage, LoginPage, PasswordResetPage, RegistrationPage, VerificationPage } from './AuthPages.jsx'
import { logout, logoutUnconfirmedError } from './authApi.js'
import CoursesPage from './courses/CoursesPage.jsx'
import CourseDetailPage from './courses/CourseDetailPage.jsx'
import CourseEditorPage from './courses/CourseEditorPage.jsx'
import { getToken } from './courses/api.js'
import InstancePage from './courses/InstancePage.jsx'
import JoinByTokenPage from './courses/JoinByTokenPage.jsx'
import MentorCourseDetailPage from './courses/MentorCourseDetailPage.jsx'
import MyCoursesPage from './courses/MyCoursesPage.jsx'
import { RequireAuth, RequireManager } from './courses/RequireAuth.jsx'

const learningSteps = [
  {
    number: '01',
    name: 'Vision',
    description: 'Kierunek, który odpowiada na pytanie: po co chcę się tego nauczyć?',
  },
  {
    number: '02',
    name: 'Path',
    description: 'Ścieżka rozbita na etapy, tematy i kompetencje.',
  },
  {
    number: '03',
    name: 'Backlog',
    description: 'Lista zagadnień i zadań, z której wybierasz kolejny krok.',
  },
  {
    number: '04',
    name: 'Cycle',
    description: 'Krótki, realistyczny plan pracy, na przykład na tydzień.',
  },
  {
    number: '05',
    name: 'Daily Focus',
    description: 'Mała aktywność na dziś: jedno zadanie, krótka powtórka albo 10 minut.',
  },
  {
    number: '06',
    name: 'Reflection',
    description: 'Chwila na sprawdzenie, co pomaga i co warto zmienić w kolejnym cyklu.',
  },
]

function GuestOnly({ children }) {
  return getToken() ? <Navigate to="/kursy" replace /> : children
}

function SiteHeader() {
  useLocation()
  const navigate = useNavigate()
  const loggedIn = Boolean(getToken())
  const [logoutState, setLogoutState] = useState({ busy: false, failed: false, confirmed: false })

  async function handleLogout() {
    if (logoutState.busy) return
    // The retry button is shown only after the local token has already been cleared.
    const retry = !loggedIn
    setLogoutState({ busy: true, failed: retry, confirmed: false })
    try {
      await logout()
      setLogoutState({ busy: false, failed: false, confirmed: retry })
    } catch {
      setLogoutState({ busy: false, failed: true, confirmed: false })
    }
    if (!retry) navigate('/')
  }

  return (
    <>
    <header className="site-header">
      <Link className="wordmark" to="/" aria-label="SOMA Learn, strona główna">
        <svg className="wordmark-symbol" viewBox="0 0 40 40" aria-hidden="true">
          <path d="M20 3.5 36.5 20 20 36.5 3.5 20 20 3.5Z" />
          <circle cx="20" cy="20" r="5.5" />
          <path d="M20 8.5v6M31.5 20h-6M20 31.5v-6M8.5 20h6" />
        </svg>
        <span>SOMA <span className="wordmark-light">Learn</span></span>
      </Link>
      <nav className="main-nav" aria-label="Główna nawigacja">
        <a className="nav-anchor" href="/#soma">Jak działa SOMA</a>
        <NavLink className={({ isActive }) => `nav-anchor${isActive ? ' is-active' : ''}`} to="/kursy">
          Kursy
        </NavLink>
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

function SomaGraphic() {
  return (
    <div className="cycle-graphic-wrap">
      <svg
        className="cycle-graphic"
        viewBox="0 0 560 520"
        role="img"
        aria-labelledby="cycle-title cycle-description"
      >
        <title id="cycle-title">SOMA: nauka w sześciu krokach</title>
        <desc id="cycle-description">
          Sześć etapów tworzy powtarzalny cykl. W centrum jest jeden mały krok, a po refleksji plan można dopasować.
        </desc>
        <circle className="cycle-orbit" cx="280" cy="260" r="179" />
        <path className="cycle-trail" d="M280 80c99 0 180 81 180 180s-81 180-180 180S100 359 100 260 181 80 280 80Z" />
        <path className="cycle-arrow" d="m427 119 23 5-8 22" />
        <circle className="cycle-center" cx="280" cy="260" r="111" />
        <path className="cycle-center-line" d="M238 283c17 18 67 18 84 0" />
        <text className="cycle-center-kicker" x="280" y="235" textAnchor="middle">SOMA</text>
        <text className="cycle-center-copy" x="280" y="262" textAnchor="middle">własny rytm</text>
        <text className="cycle-center-copy" x="280" y="281" textAnchor="middle">małych kroków</text>
        <g className="cycle-node node-one"><circle cx="280" cy="80" r="19" /><text x="280" y="85" textAnchor="middle">01</text></g>
        <g className="cycle-node node-two"><circle cx="436" cy="170" r="19" /><text x="436" y="175" textAnchor="middle">02</text></g>
        <g className="cycle-node node-three"><circle cx="436" cy="350" r="19" /><text x="436" y="355" textAnchor="middle">03</text></g>
        <g className="cycle-node node-four"><circle cx="280" cy="440" r="19" /><text x="280" y="445" textAnchor="middle">04</text></g>
        <g className="cycle-node node-five"><circle cx="124" cy="350" r="19" /><text x="124" y="355" textAnchor="middle">05</text></g>
        <g className="cycle-node node-six"><circle cx="124" cy="170" r="19" /><text x="124" y="175" textAnchor="middle">06</text></g>
        <circle className="cycle-spark spark-one" cx="90" cy="100" r="6" />
        <circle className="cycle-spark spark-two" cx="474" cy="276" r="8" />
        <path className="cycle-spark spark-three" d="m191 54 7 12h-14l7-12Z" />
      </svg>
      <p className="graphic-caption"><span aria-hidden="true">↻</span> Jeden cykl. Potem kolejny.</p>
    </div>
  )
}

function HomePage() {
  return (
    <main>
      <section className="hero page-width" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow"><span className="eyebrow-dot" /> Nauka, która ma swój rytm</p>
          <h1 id="hero-title">SOMA <span>Learn</span></h1>
          <p className="hero-lede">Wielkie cele zaczynają się od małego kroku.</p>
          <p className="hero-description">
            Spokojniejszy sposób na naukę dla uczniów klas ósmych. Planuj po kawałku,
            wracaj do tego, co ważne, i dopasowuj plan do swoich możliwości.
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href="#soma">Poznaj rytm SOMA <span aria-hidden="true">↓</span></a>
            <Link className="text-link" to="/kursy">Zobacz kursy <span aria-hidden="true">↗</span></Link>
          </div>
          <p className="hero-note"><span aria-hidden="true">✳</span> Bez wyścigu. Z miejscem na odpoczynek i zmianę planu.</p>
        </div>
        <SomaGraphic />
        <a className="scroll-cue" href="#soma" aria-label="Przewiń do opisu metody SOMA">
          <span aria-hidden="true">↓</span> Zobacz, jak to działa
        </a>
      </section>

      <section className="method-section" id="soma" aria-labelledby="method-title">
        <div className="page-width method-inner">
          <div className="section-heading">
            <p className="eyebrow">Prosty plan, elastyczny rytm</p>
            <h2 id="method-title">SOMA porządkuje naukę.<br /><span>Nie dokłada presji.</span></h2>
            <p>Duży temat dzielisz na mniejsze części. Robisz tyle, ile jest dziś realne, a potem sprawdzasz, czego potrzebujesz dalej.</p>
          </div>
          <ol className="steps-grid">
            {learningSteps.map((step) => (
              <li className="step-item" key={step.name}>
                <span className="step-number">{step.number}</span>
                <h3>{step.name}</h3>
                <p>{step.description}</p>
              </li>
            ))}
          </ol>
          <p className="method-note"><span aria-hidden="true">↗</span> Jeśli plan nie działa, zmieniasz plan. Nie rezygnujesz z siebie.</p>
        </div>
      </section>

      <section className="people-section page-width" aria-label="SOMA dla ucznia, rodzica i mentora">
        <article className="people-panel student-panel">
          <p className="eyebrow">Dla ucznia</p>
          <h2>Twój cel.<br />Twój następny krok.</h2>
          <p>Nie musisz ogarniać wszystkiego naraz. Wybierasz jeden wykonalny krok, uczysz się w swoim tempie i widzisz, dokąd prowadzi Twoja ścieżka.</p>
          <span className="panel-mark" aria-hidden="true">01 / 03</span>
        </article>
        <article className="people-panel parent-panel">
          <p className="eyebrow">Dla rodzica</p>
          <h2>Blisko, ale bez<br />przejmowania sterów.</h2>
          <p>Rozmawiaj o tym, co pomaga i wspieraj w dopasowaniu planu. Bez kar i rozliczania z każdego dnia — ważniejszy jest kierunek niż pojedynczy potknięty dzień.</p>
          <span className="panel-mark" aria-hidden="true">02 / 03</span>
        </article>
        <article className="people-panel mentor-panel">
          <p className="eyebrow">Dla mentora</p>
          <h2>Wspieraj proces,<br />nie kontroluj wyniku.</h2>
          <p>Mentor pomaga planować, dopasowywać ścieżkę i zauważać postęp. Planowana jest możliwość korzystania z kursu i zapraszania uczniów; ta funkcja nie jest jeszcze dostępna.</p>
          <span className="panel-mark" aria-hidden="true">03 / 03</span>
        </article>
      </section>

      <section className="closing-section" aria-labelledby="closing-title">
        <div className="page-width closing-inner">
          <div>
            <p className="eyebrow">Na początek wystarczy jeden krok</p>
            <h2 id="closing-title">Daj nauce trochę<br />więcej oddechu.</h2>
          </div>
          <Link className="button button-light" to="/kursy">Kursy pojawią się wkrótce <span aria-hidden="true">↗</span></Link>
        </div>
      </section>
    </main>
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
  return (
    <div className="app-shell">
      <SiteHeader />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route element={<RequireAuth />}>
          <Route path="/kursy" element={<CoursesPage />} />
          <Route path="/kursy/instancje/:id" element={<InstancePage />} />
          <Route path="/kursy/dolacz/:token" element={<JoinByTokenPage />} />
          <Route path="/kursy/moje" element={<RequireManager />}>
            <Route index element={<MyCoursesPage />} />
            <Route path="nowy" element={<CourseEditorPage />} />
            <Route path=":id" element={<MentorCourseDetailPage />} />
          </Route>
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
      <footer className="site-footer">
        <Link className="wordmark footer-wordmark" to="/">SOMA <span className="wordmark-light">Learn</span></Link>
        <span>Małe kroki. Własny rytm.</span>
        <a href="/#soma">O podejściu SOMA <span aria-hidden="true">↗</span></a>
      </footer>
    </div>
  )
}