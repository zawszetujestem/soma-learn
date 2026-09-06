import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

import { me, logout, type User } from "../api";

export default function Shell({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    me().then(setUser).catch(() => setUser(null));
  }, []);

  async function handleLogout() {
    await logout();
    setUser(null);
    window.location.href = "/";
  }

  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar-inner">
          <Link to="/" className="brand">
            <span className="dot" /> SOMA
          </Link>
          <nav className="nav">
            {user ? (
              <>
                <span className="who">{user.email}</span>
                {user.is_mentor && <span className="badge mentor">Mentor</span>}
                {user.is_student && <span className="badge">Uczeń</span>}
                <a className="btn btn-ghost" href="/courses/">
                  Kursy
                </a>
                <button className="btn btn-ghost" onClick={handleLogout} type="button">
                  Wyloguj się
                </button>
              </>
            ) : (
              <>
                <Link className="btn btn-ghost" to="/login">
                  Zaloguj się
                </Link>
                <Link className="btn btn-primary" to="/register">
                  Zarejestruj się
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {children}

      <footer>
        SOMA Learn — wspólne planowanie i weryfikacja postępów ucznia przez mentora.
      </footer>
    </div>
  );
}
