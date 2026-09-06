import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

import { register } from "../api";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password1, setPassword1] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await register(email, password1, password2);
      window.location.href = "/courses/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wystąpił błąd.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>Utwórz konto</h1>
        <p style={{ color: "var(--muted)", fontSize: "0.92rem" }}>
          Załóż konto, aby rozpocząć naukę z mentorem.
        </p>
        {error && <div className="error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password1">Hasło</label>
            <input
              id="password1"
              type="password"
              autoComplete="new-password"
              value={password1}
              onChange={(e) => setPassword1(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password2">Powtórz hasło</label>
            <input
              id="password2"
              type="password"
              autoComplete="new-password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              required
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={busy} style={{ width: "100%" }}>
            {busy ? "Rejestracja…" : "Zarejestruj"}
          </button>
        </form>
        <p className="alt">
          Masz już konto? <Link to="/login">Zaloguj się</Link>.
        </p>
      </div>
    </div>
  );
}
