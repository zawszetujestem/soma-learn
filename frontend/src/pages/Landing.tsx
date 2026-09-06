import { Link } from "react-router-dom";

function HeroArt() {
  return (
    <svg viewBox="0 0 460 340" role="img" aria-label="Uczeń i mentor współpracują przy nauce">
      <defs>
        <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3458d6" />
          <stop offset="100%" stopColor="#14b8a6" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="460" height="340" rx="20" fill="url(#g1)" opacity="0.08" />
      <circle cx="130" cy="120" r="34" fill="#eef2ff" stroke="#3458d6" strokeWidth="4" />
      <circle cx="330" cy="120" r="34" fill="#ecfdf5" stroke="#14b8a6" strokeWidth="4" />
      <path d="M90 200 C120 165 190 165 210 185" fill="none" stroke="#3458d6" strokeWidth="5" strokeLinecap="round" />
      <path d="M370 200 C340 165 270 165 250 185" fill="none" stroke="#14b8a6" strokeWidth="5" strokeLinecap="round" />
      <rect x="205" y="185" width="50" height="70" rx="10" fill="#ffffff" stroke="#3458d6" strokeWidth="4" />
      <rect x="215" y="200" width="30" height="8" rx="4" fill="#14b8a6" />
      <rect x="215" y="216" width="30" height="8" rx="4" fill="#14b8a6" opacity="0.6" />
      <rect x="215" y="232" width="30" height="8" rx="4" fill="#14b8a6" opacity="0.3" />
      <path d="M230 185 L230 265 M225 265 L235 265" stroke="#3458d6" strokeWidth="4" strokeLinecap="round" />
      <circle cx="60" cy="70" r="5" fill="#3458d6" opacity="0.5" />
      <circle cx="410" cy="60" r="5" fill="#14b8a6" opacity="0.5" />
      <circle cx="400" cy="300" r="6" fill="#3458d6" opacity="0.4" />
    </svg>
  );
}

function Feature({
  icon,
  tone,
  title,
  children,
}: {
  icon: string;
  tone: "blue" | "teal" | "amber";
  title: string;
  children: string;
}) {
  return (
    <div className="feature">
      <div className={`icon ${tone}`} aria-hidden="true">
        {icon}
      </div>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}

export default function Landing() {
  return (
    <>
      <section className="hero">
        <div className="hero-inner">
          <div>
            <h1>Nauka, która ma plan i mentora</h1>
            <p className="lead">
              SOMA łączy samodzielną pracę ucznia z planowaniem i weryfikacją prowadzoną
              przez mentora. Zamiast kolejnej listy zadań — jasny rytm: wybierz zakres,
              pracuj, potwierdź postęp.
            </p>
            <div className="hero-actions">
              <Link className="btn btn-primary" to="/login">
                Zaloguj się
              </Link>
              <Link className="btn btn-accent" to="/register">
                Utwórz konto
              </Link>
            </div>
          </div>
          <div className="hero-art">
            <HeroArt />
          </div>
        </div>
      </section>

      <section className="features">
        <h2>Jak działa SOMA</h2>
        <div className="feature-grid">
          <Feature icon="🎯" tone="blue" title="Planowanie cyklu">
            Mentor i uczeń wspólnie ustalają cel i wybierają zadania bieżącego cyklu —
            bez przytłaczania całym materiałem naraz.
          </Feature>
          <Feature icon="📚" tone="teal" title="Praca ucznia">
            Uczeń widzi tylko bieżący zakres: teksty, obrazy, linki i zadania. Dalszy
            backlog pozostaje zablokowany.
          </Feature>
          <Feature icon="✅" tone="amber" title="Weryfikacja mentora">
            Zadanie ukończone dopiero po zatwierdzeniu przez mentora. Odrzucone wraca do
            poprawek, zatwierdzone otwiera kolejny krok.
          </Feature>
        </div>
      </section>
    </>
  );
}
