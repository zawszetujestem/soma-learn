import { Link } from 'react-router-dom'
import { logoutUnconfirmedError } from '../authApi.js'
import './fonts.css'
import './home.css'

export function HomeLogo() {
  return (
    <Link className="sl-logo" to="/" aria-label="SOMA Learn, strona główna">
      <svg viewBox="0 0 240 52" width="240" height="52" aria-hidden="true" focusable="false">
        <text className="sl-logo-soma" x="0" y="39" fill="#2936C8">soma.</text>
        <text className="sl-logo-learn" x="136" y="39" fill="#20243A">learn</text>
      </svg>
    </Link>
  )
}

function HomeHeader({ loggedIn, logoutState, handleLogout }) {
  return (
    <>
      <header className="sl-header sl-container sl-tile">
        <HomeLogo />
        <nav className="sl-nav" aria-label="Główna nawigacja">
          <Link to="/kursy">Kursy</Link>
          <a href="#metoda">Jak działa SOMA?</a>
          <a href="#o-nas">O nas</a>
          {loggedIn ? (
            <button type="button" className="sl-button sl-button-outline" onClick={handleLogout} disabled={logoutState.busy}>
              {logoutState.busy ? 'Wylogowywanie…' : 'Wyloguj'}
            </button>
          ) : <Link className="sl-login" to="/logowanie">Zaloguj się</Link>}
          <Link className="sl-button sl-button-primary" to={loggedIn ? '/kursy' : '/rejestracja'}>Zacznij naukę</Link>
        </nav>
      </header>
      {!loggedIn && logoutState.failed && (
        <div className="sl-notice sl-container">
          <p role="alert">{logoutUnconfirmedError}</p>
          <button type="button" className="sl-button sl-button-outline" onClick={handleLogout} disabled={logoutState.busy}>
            {logoutState.busy ? 'Wylogowywanie…' : 'Ponów wylogowanie'}
          </button>
        </div>
      )}
      {!loggedIn && logoutState.confirmed && (
        <p className="sl-notice sl-container" role="status">Wylogowanie zostało potwierdzone.</p>
      )}
    </>
  )
}

const methodSteps = [
  ['Cel', 'Wybierz kierunek i zastanów się, dlaczego jest dla Ciebie ważny. Określ, po czym poznasz, że umiesz więcej.'],
  ['Plan', 'Podziel materiał na etapy. Na krótki cykl, na przykład tydzień, wybierz kilka zadań mieszczących się w Twoim czasie.'],
  ['Mały krok', 'Zacznij od jednego konkretnego zadania z jasnym rezultatem. Dopasuj jego zakres do czasu i energii, które masz dziś.'],
  ['Postęp', 'Sprawdź, co potrafisz samodzielnie, a do czego warto wrócić. Ukończone zadanie to nie zawsze opanowana umiejętność.'],
]

const courseExamples = [
  { subject: 'Matematyka', title: 'Procenty bez zgadywania', scope: 'Procent liczby, obniżki i zadania tekstowe.', level: 'Klasa 8 · od podstaw', accent: 'lime' },
  { subject: 'Język polski', title: 'Argument, który ma sens', scope: 'Teza, argument i przykład w krótkiej wypowiedzi.', level: 'Klasa 8 · ćwiczenie umiejętności', accent: 'coral' },
  { subject: 'Język angielski', title: 'Krótka wiadomość po angielsku', scope: 'Opis wydarzenia i spójne łączenie zdań.', level: 'Klasa 8 · powtórka podstaw', accent: 'blue' },
]

export default function HomePage({ logoutFlow }) {
  return (
    <div className="sl-home">
      <a className="sl-skip" href="#tresc">Przejdź do treści</a>
      <HomeHeader {...logoutFlow} />
      <main id="tresc" tabIndex={-1}>
        <section className="sl-hero sl-container sl-tile" id="start" aria-labelledby="sl-hero-title">
          <div className="sl-hero-copy">
            <p className="sl-eyebrow">Duży cel. Osiągalne kroki.</p>
            <h1 id="sl-hero-title">Ogarnij egzamin. Krok po kroku.</h1>
            <p className="sl-lede">Przygotowanie do egzaminu ósmoklasisty z jasnym kierunkiem i miejscem na własne tempo. Poznaj podejście SOMA: mniej chaosu, więcej świadomej nauki.</p>
            <div className="sl-actions">
              <Link className="sl-button sl-button-primary" to="/kursy">Odkryj kursy</Link>
              <a className="sl-text-link" href="#metoda">Poznaj metodę <span aria-hidden="true">↓</span></a>
            </div>
            <p className="sl-small">Katalog wymaga logowania. Bez wyścigu i bez presji idealnego planu.</p>
          </div>
          <div className="sl-hero-art" aria-hidden="true">
            <span className="sl-art-label">CEL <span>→</span> PLAN <span>→</span> MAŁY KROK <span>→</span> REFLEKSJA</span>
            <svg className="sl-path-art" viewBox="0 0 900 250" preserveAspectRatio="none">
              <path className="sl-progress-path" d="M56 185 C150 185 178 82 300 82 S466 170 570 160 S720 70 840 70" fill="none" stroke="#2936C8" strokeWidth="12" strokeLinecap="round" strokeDasharray="2 24" />
              <circle className="sl-progress-stop sl-progress-stop-coral" cx="70" cy="185" r="42" />
              <circle className="sl-progress-stop sl-progress-stop-lime" cx="325" cy="82" r="48" />
              <circle className="sl-progress-stop sl-progress-stop-lavender" cx="590" cy="158" r="38" />
              <circle className="sl-progress-stop sl-progress-stop-blue" cx="835" cy="70" r="48" />
              <path className="sl-progress-check" d="m813 70 16 17 31-37" fill="none" stroke="#fff" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p>Nie wszystko naraz. Jeden krok dalej.</p>
          </div>
        </section>

        <section className="sl-section sl-container" id="sciezki" aria-labelledby="sl-paths-title">
          <p className="sl-eyebrow">Twoja ścieżka</p>
          <h2 id="sl-paths-title">Wybierz swój kierunek</h2>
          <div className="sl-path-grid">
            <article className="sl-path sl-tile sl-path-current" aria-labelledby="sl-eighth-title">
              <p className="sl-small">Pierwszy etap SOMA Learn</p>
              <h3 id="sl-eighth-title">Egzamin ósmoklasisty</h3>
              <p>Matematyka, język polski i język angielski. Od podstaw do samodzielnego rozwiązywania zadań — w małych, zrozumiałych krokach.</p>
              <Link className="sl-text-link" to="/kursy">Przejdź do katalogu <span aria-hidden="true">↗</span></Link>
            </article>
            <article className="sl-path sl-tile sl-path-matura" aria-labelledby="sl-matura-title">
              <span className="sl-badge">Planowana</span>
              <h3 id="sl-matura-title">Matura</h3>
              <p>Kolejny kierunek rozwoju SOMA Learn. Ścieżka maturalna nie jest jeszcze dostępna; nie prowadzimy tu zapisów ani sprzedaży.</p>
            </article>
          </div>
        </section>

        <section className="sl-method sl-section sl-tile" id="metoda" aria-labelledby="sl-method-title">
          <div className="sl-container">
            <p className="sl-eyebrow">Prosty proces, nie sztywny harmonogram</p>
            <h2 id="sl-method-title">Jak działa SOMA?</h2>
            <p className="sl-section-intro">Cel → Plan → Mały krok → Postęp. Potem chwila refleksji i decyzja, co zmienić w następnym cyklu.</p>
            <ol className="sl-method-grid">
              {methodSteps.map(([title, description], index) => (
                <li className="sl-step sl-tile" key={title}>
                  <span className="sl-step-number" aria-hidden="true">0{index + 1}</span>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </li>
              ))}
            </ol>
            <div className="sl-reflection sl-tile">
              <strong>Refleksja i adaptacja</strong>
              <p>Co już umiem? Co było trudne? Co pomogło? Na tej podstawie dostosuj plan: zmniejsz zakres, wróć do podstaw lub wybierz następny krok. Postęp to rozwój umiejętności, nie liczba kliknięć.</p>
            </div>
          </div>
        </section>

        <section className="sl-section sl-container sl-tile" id="przyklady" aria-labelledby="sl-examples-title">
          <p className="sl-eyebrow">Przykładowe kursy</p>
          <h2 id="sl-examples-title">Małe kroki, konkretne tematy</h2>
          <p className="sl-section-intro">Poniższe karty są wyłącznie przykładami zakresu i poziomu nauki. Nie stanowią oferty ani informacji o dostępności kursów. Aktualny katalog znajdziesz po zalogowaniu.</p>
          <div className="sl-example-grid">
            {courseExamples.map((course, index) => (
              <article className={`sl-example sl-tile sl-accent-${course.accent}`} key={course.subject} aria-labelledby={`sl-example-${index}`}>
                <div className="sl-example-top"><span className="sl-badge">Przykład</span><span aria-hidden="true">0{index + 1}</span></div>
                <p className="sl-small">{course.subject}</p>
                <h3 id={`sl-example-${index}`}>{course.title}</h3>
                <dl>
                  <dt>Zakres</dt><dd>{course.scope}</dd>
                  <dt>Poziom</dt><dd>{course.level}</dd>
                </dl>
              </article>
            ))}
          </div>
        </section>

        <section className="sl-lesson sl-section sl-container sl-tile" id="lekcja" aria-labelledby="sl-lesson-title">
          <div>
            <p className="sl-eyebrow">Tak może wyglądać mały krok</p>
            <h2 id="sl-lesson-title">Statyczny podgląd przykładowej lekcji</h2>
            <p>To ilustracja sposobu nauki, nie działająca lekcja ani panel ucznia. Nie pokazuje Twoich danych i nie zapisuje postępów.</p>
          </div>
          <article className="sl-lesson-card sl-tile" aria-labelledby="sl-lesson-example-title">
            <span className="sl-badge">Przykład · Matematyka · Klasa 8</span>
            <h3 id="sl-lesson-example-title">Jak obliczyć 20% liczby?</h3>
            <dl>
              <dt>Krok</dt><dd>Zamień 20% na ułamek i oblicz 20% z 60. Następnie sprawdź sposób rozwiązania.</dd>
              <dt>Czas</dt><dd>Około 10 minut</dd>
              <dt>Rezultat</dt><dd>Potrafisz wyjaśnić, dlaczego 20% z 60 to 12, i zastosować tę metodę do innej liczby.</dd>
            </dl>
            <div className="sl-lesson-reflection"><strong>Na koniec: refleksja</strong><p>Co było jasne? Do którego kroku warto wrócić przed następnym zadaniem?</p></div>
          </article>
        </section>

        <section className="sl-about sl-section sl-tile" id="o-nas" aria-labelledby="sl-about-title">
          <div className="sl-container sl-about-inner">
            <div><p className="sl-eyebrow">Podejście SOMA Learn</p><h2 id="sl-about-title">O nas</h2></div>
            <div>
              <p>SOMA Learn stosuje podejście SOMA — Self-Organized Micro Agile — do nauki szkolnej. Łączy świadomy cel, małe działania i krótkie cykle z refleksją oraz dostosowaniem planu.</p>
              <p>Chcemy wspierać samodzielność: pomagać rozumieć materiał i wybierać realistyczny następny krok, zamiast rozliczać z aktywności. Przerwa nie przekreśla postępu. Odpoczynek i powrót do podstaw są częścią nauki, a nie powodem do kary.</p>
              <p>SOMA to framework rozwoju; SOMA Learn jest jego edukacyjnym zastosowaniem. Metoda porządkuje proces, ale nie gwarantuje wyniku egzaminu.</p>
            </div>
          </div>
        </section>

        <section className="sl-closing sl-section sl-container sl-tile" id="zacznij" aria-labelledby="sl-closing-title">
          <p className="sl-eyebrow">Zacznij od kierunku</p>
          <h2 id="sl-closing-title">Nie musisz ogarniać wszystkiego dziś.</h2>
          <p>Poznaj kursy i wybierz swój pierwszy krok. Do katalogu potrzebujesz konta.</p>
          <div className="sl-actions">
            <Link className="sl-button sl-button-primary" to="/kursy">Zobacz kursy</Link>
            {!logoutFlow.loggedIn && <Link className="sl-button sl-button-outline" to="/rejestracja">Utwórz konto</Link>}
          </div>
        </section>
      </main>
      <footer className="sl-footer sl-container sl-tile">
        <HomeLogo />
        <p>Małe kroki. Świadomy kierunek.</p>
        <a className="sl-text-link" href="#o-nas">O podejściu SOMA</a>
      </footer>
    </div>
  )
}
