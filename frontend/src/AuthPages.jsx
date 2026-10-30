import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { connectionError, csrfToken, deleteJson, ensureCsrf, exchangeToken, getJson, postJson, responseError } from './authApi.js'
import { clearToken } from './courses/api.js'

function AuthLayout({ title, children }) {
  return (
    <main className="login-page page-width">
      <div className="login-intro">
        <p className="eyebrow">Twoja przestrzeń do nauki</p>
        <h1>Tu zacznie się<br /><span>Twój kolejny krok.</span></h1>
        <p>Małe kroki, własne tempo. Wróć do swojej ścieżki albo dołącz do SOMA Learn.</p>
        <Link className="text-link" to="/">Wróć do strony głównej <span aria-hidden="true">↗</span></Link>
      </div>
      <section className="login-panel" aria-labelledby="auth-title">
        <p className="eyebrow">SOMA Learn</p>
        <h2 id="auth-title">{title}</h2>
        {children}
      </section>
    </main>
  )
}

function useCsrf() {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    ensureCsrf().then(() => { if (active) setReady(true) })
      .catch(() => { if (active) setError(connectionError) })
    return () => { active = false }
  }, [])
  return { ready, error }
}

export function RegistrationPage() {
  const [role, setRole] = useState('student')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [complete, setComplete] = useState(false)
  const csrf = useCsrf()

  async function submit(event) {
    event.preventDefault()
    if (busy) return
    const form = new FormData(event.currentTarget)
    const body = Object.fromEntries(form)
    if (role !== 'mentor') delete body.specialization
    setBusy(true)
    setError('')
    try {
      const { response, payload } = await postJson('/api/auth/register/', body)
      if (response.status === 201) setComplete(true)
      else setError(responseError(response, payload))
    } catch {
      setError(connectionError)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout title="Rejestracja">
      {complete ? <p className="auth-status" role="status">Sprawdź email i potwierdź swój adres, aby dokończyć rejestrację.</p> : (
        <form onSubmit={submit} aria-busy={busy}>
          <fieldset className="role-picker" disabled={busy}>
            <legend>Dołączam jako</legend>
            <label><input type="radio" name="role" value="student" checked={role === 'student'} onChange={() => setRole('student')} /> Uczeń</label>
            <label><input type="radio" name="role" value="mentor" checked={role === 'mentor'} onChange={() => setRole('mentor')} /> Mentor</label>
          </fieldset>
          <label htmlFor="register-first-name">Imię</label>
          <input id="register-first-name" name="first_name" autoComplete="given-name" required disabled={busy} />
          <label htmlFor="register-last-name">Nazwisko</label>
          <input id="register-last-name" name="last_name" autoComplete="family-name" required disabled={busy} />
          <label htmlFor="register-email">Email</label>
          <input id="register-email" name="email" type="email" autoComplete="email" required disabled={busy} />
          <label htmlFor="register-password">Hasło</label>
          <input id="register-password" name="password" type="password" autoComplete="new-password" required disabled={busy} />
          {role === 'mentor' && <>
            <label htmlFor="register-specialization">Specjalizacja</label>
            <input id="register-specialization" name="specialization" required disabled={busy} />
          </>}
          <button className="button button-primary" type="submit" disabled={busy}>{busy ? 'Tworzenie konta…' : 'Utwórz konto'}</button>
        </form>
      )}
      {(error || csrf.error) && <p className="auth-error" role="alert">{error || csrf.error}</p>}
      <p className="auth-links"><Link className="text-link" to="/logowanie">Przejdź do logowania</Link></p>
    </AuthLayout>
  )
}

export function VerificationPage() {
  const { key } = useParams()
  const [searchParams] = useSearchParams()
  const uid = searchParams.get('uid')
  const legacyToken = searchParams.get('token')
  const [busy, setBusy] = useState(false)
  const [complete, setComplete] = useState(false)
  const [error, setError] = useState('')
  const csrf = useCsrf()

  useEffect(() => {
    if (!key && uid && legacyToken) {
      window.history.replaceState({}, '', '/potwierdzenie-email')
    }
  }, [key, uid, legacyToken])

  async function verify() {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const url = key ? '/_allauth/browser/v1/auth/email/verify' : '/api/auth/verify-email/'
      const body = key ? { key } : { uid, token: legacyToken }
      const { response, payload } = await postJson(url, body)
      if ([200, 401].includes(response.status) && !payload.errors?.length) setComplete(true)
      else setError(responseError(response, payload))
    } catch {
      setError(connectionError)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout title="Potwierdzenie emaila">
      {complete ? <>
        <p className="auth-status" role="status">Adres email został potwierdzony.</p>
        <Link className="text-link" to="/logowanie">Zaloguj się</Link>
      </> : <>
        <p>Potwierdź swój adres email, aby móc korzystać z konta.</p>
        <button className="button button-primary" type="button" disabled={busy} onClick={verify}>
          {busy ? 'Potwierdzanie…' : 'Potwierdź email'}
        </button>
      </>}
      {(error || csrf.error) && <p className="auth-error" role="alert">{error || csrf.error}</p>}
    </AuthLayout>
  )
}

export function PasswordResetPage() {
  const [stage, setStage] = useState('email')
  const [email, setEmail] = useState('')
  const [resetKey, setResetKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const csrf = useCsrf()

  function resetError(response, payload) {
    if (response.status === 409) return 'Sesja resetowania hasła wygasła. Rozpocznij ponownie.'
    if (response.status === 400 && payload.errors?.some((error) => error.param === 'key')) {
      return 'Kod jest nieprawidłowy lub wygasł.'
    }
    const passwordError = payload.errors?.find((error) => error.param === 'password')
    if (passwordError) return `Hasło: ${passwordError.message}`
    return responseError(response, payload)
  }

  async function endActiveSession() {
    await deleteJson('/_allauth/browser/v1/auth/session')
    clearToken()
  }

  async function requestCode(address) {
    const send = () => postJson('/_allauth/browser/v1/auth/password/request', { email: address })
    let { response, payload } = await send()
    if (payload.meta?.is_authenticated === true) {
      await endActiveSession()
      const retry = await send()
      response = retry.response
      payload = retry.payload
    }
    if (response.status === 401 && payload.data?.flows?.some((flow) => flow.id === 'password_reset_by_code' && flow.is_pending)) {
      setEmail(address)
      setStage('code')
      setNotice('Jeśli konto z tym adresem istnieje, wysłaliśmy na nie kod resetujący.')
    } else {
      setError(responseError(response, payload))
    }
  }

  async function verifyCode(key) {
    const { response, payload } = await getJson('/_allauth/browser/v1/auth/password/reset', { 'X-Password-Reset-Key': key })
    if ([200, 401].includes(response.status) && !payload.errors?.length) {
      setResetKey(key)
      setNotice('')
      setStage('password')
    } else {
      setError(resetError(response, payload))
    }
  }

  async function resetPassword(password) {
    const { response, payload } = await postJson('/_allauth/browser/v1/auth/password/reset', { key: resetKey, password })
    if ([200, 401].includes(response.status) && !payload.errors?.length) setStage('done')
    else setError(resetError(response, payload))
  }

  async function submit(event) {
    event.preventDefault()
    if (busy) return
    const form = new FormData(event.currentTarget)
    setBusy(true)
    setError('')
    try {
      if (stage === 'email') await requestCode(String(form.get('email')).trim())
      else if (stage === 'code') await verifyCode(String(form.get('code')).trim())
      else if (stage === 'password') await resetPassword(String(form.get('password')))
    } catch {
      setError(connectionError)
    } finally {
      setBusy(false)
    }
  }

  async function resend() {
    if (busy) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await requestCode(email)
    } catch {
      setError(connectionError)
    } finally {
      setBusy(false)
    }
  }

  const title = {
    email: 'Resetowanie hasła',
    code: 'Sprawdź swoją skrzynkę',
    password: 'Ustaw nowe hasło',
    done: 'Hasło zmienione',
  }[stage]

  return (
    <AuthLayout title={title}>
      {stage === 'done' ? <>
        <p className="auth-status" role="status">Hasło zostało zmienione. Zaloguj się nowym hasłem.</p>
        <Link className="text-link" to="/logowanie">Przejdź do logowania</Link>
      </> : <form key={stage} onSubmit={submit} aria-busy={busy}>
        {stage === 'email' && <>
          <p>Podaj adres email powiązany z kontem. Wyślemy na niego kod resetujący.</p>
          <label htmlFor="reset-email">Email</label>
          <input id="reset-email" name="email" type="email" autoComplete="email" required disabled={busy} />
          <button className="button button-primary" type="submit" disabled={busy}>{busy ? 'Wysyłanie…' : 'Wyślij kod'}</button>
        </>}
        {stage === 'code' && <>
          <label htmlFor="reset-code">Kod resetujący</label>
          <input id="reset-code" name="code" autoComplete="one-time-code" autoFocus required disabled={busy} />
          <button className="button button-primary" type="submit" disabled={busy}>{busy ? 'Weryfikowanie…' : 'Potwierdź kod'}</button>
          <button className="button button-secondary" type="button" onClick={resend} disabled={busy}>Wyślij kod ponownie</button>
        </>}
        {stage === 'password' && <>
          <label htmlFor="reset-password">Nowe hasło</label>
          <input id="reset-password" name="password" type="password" autoComplete="new-password" required disabled={busy} />
          <button className="button button-primary" type="submit" disabled={busy}>{busy ? 'Zapisywanie…' : 'Zmień hasło'}</button>
        </>}
      </form>}
      {(error || csrf.error) && <p className="auth-error" role="alert">{error || csrf.error}</p>}
      {notice && <p className="auth-status" role="status">{notice}</p>}
      {stage !== 'done' && <p className="auth-links"><Link className="text-link" to="/logowanie">Wróć do logowania</Link></p>}
    </AuthLayout>
  )
}

const frontendBase = import.meta.env.FRONTEND_BASE_URL || window.location.origin
const googleCallback = new URL('/logowanie/google/callback', frontendBase).href

export function LoginPage() {
  const [stage, setStage] = useState('password')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [code, setCode] = useState('')
  const [receivedAt, setReceivedAt] = useState(0)
  const [resendAt, setResendAt] = useState(0)
  const [resendLocked, setResendLocked] = useState(false)
  const [now, setNow] = useState(Date.now())
  const csrf = useCsrf()
  const remaining = Math.max(0, Math.ceil((receivedAt + 600000 - now) / 1000))
  const cooldown = Math.max(0, Math.ceil((resendAt - now) / 1000))

  useEffect(() => {
    if (stage !== 'code') return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [stage])

  function codeReceived() {
    const time = Date.now()
    setResendLocked(false)
    setReceivedAt(time)
    setResendAt(time + 60000)
    setNow(time)
    setCode('')
    setNotice('Kod został wysłany na Twój email.')
    setStage('code')
  }

  async function finishLogin() {
    setStage('exchange')
    await exchangeToken()
    setStage('complete')
    setNotice('Jesteś zalogowany. Witaj w SOMA Learn!')
  }

  async function submit(event) {
    event.preventDefault()
    if (busy) return
    const form = new FormData(event.currentTarget)
    setBusy(true)
    setError('')
    try {
      if (stage === 'exchange') {
        await finishLogin()
      } else if (stage === 'password') {
        const { response, payload } = await postJson('/_allauth/browser/v1/auth/login', {
          email: form.get('email'), password: form.get('password'),
        })
        const pending = (id) => payload.data?.flows?.some((flow) => flow.id === id && flow.is_pending)
        if (response.status === 401 && payload.meta?.is_authenticated === false && pending('login_by_code')) {
          codeReceived()
        } else if (response.status === 409 && payload.meta?.is_authenticated === true) {
          await finishLogin()
        } else if (pending('verify_email')) {
          setError('Potwierdź email przed logowaniem. Sprawdź wiadomość z linkiem aktywacyjnym.')
        } else {
          setError(responseError(response, payload))
        }
      } else {
        const { response, payload } = await postJson('/_allauth/browser/v1/auth/code/confirm', { code: code.trim() })
        if (response.ok && payload.meta?.is_authenticated === true) {
          setCode('')
          await finishLogin()
        } else {
          setError(responseError(response, payload))
        }
      }
    } catch (failure) {
      setError(stage === 'code' || stage === 'exchange'
        ? failure.message === 'Failed to fetch' ? connectionError : 'Nie udało się dokończyć logowania. Spróbuj ponownie.'
        : connectionError)
    } finally {
      setBusy(false)
    }
  }

  async function resend() {
    if (busy || resendLocked || !remaining || Date.now() < resendAt) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const { response, payload } = await postJson('/api/auth/login/resend/')
      if (response.ok) {
        // Allauth keeps the original code validity window on resend, so receivedAt is not reset.
        const time = Date.now()
        setResendAt(time + 60000)
        setNow(time)
        setCode('')
        setNotice('Nowy kod został wysłany na Twój email.')
      } else if (response.status === 409) {
        setResendLocked(true)
        setError('Limit ponownych wysłań kodu został osiągnięty. Zaloguj się ponownie.')
      } else {
        setError(responseError(response, payload))
        if (response.status === 429) setResendAt(Date.now() + 60000)
      }
    } catch {
      setError(connectionError)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout title={stage === 'code' ? 'Sprawdź swoją skrzynkę' : stage === 'complete' ? 'Witaj ponownie' : 'Zaloguj się'}>
      {stage !== 'complete' && <form key={stage} onSubmit={submit} aria-busy={busy}>
        {stage === 'password' ? <>
          <label htmlFor="login-email">Email</label>
          <input id="login-email" name="email" type="email" autoComplete="email" required disabled={busy} />
          <label htmlFor="login-password">Hasło</label>
          <input id="login-password" name="password" type="password" autoComplete="current-password" required disabled={busy} />
          <button className="button button-primary" type="submit" disabled={busy}>{busy ? 'Logowanie…' : 'Zaloguj się'}</button>
        </> : stage === 'code' ? <>
          <label htmlFor="login-code">Kod weryfikacyjny</label>
          <input id="login-code" name="code" autoComplete="one-time-code" autoFocus required value={code} onChange={(event) => setCode(event.target.value)} disabled={busy || !remaining} aria-describedby="code-expiration" />
          <p className="login-notice" id="code-expiration">{remaining ? `Kod ważny jeszcze około ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}` : 'Kod wygasł. Rozpocznij logowanie ponownie.'}</p>
          <button className="button button-primary" type="submit" disabled={busy || !remaining}>{busy ? 'Weryfikowanie…' : 'Potwierdź kod'}</button>
          <button className="button button-secondary" type="button" onClick={resend} disabled={busy || resendLocked || !remaining || cooldown > 0}>
            {cooldown ? `Wyślij ponownie za ${cooldown} s` : 'Wyślij kod ponownie'}
          </button>
        </> : <button className="button button-primary" type="submit" disabled={busy}>{busy ? 'Kończenie logowania…' : 'Spróbuj ponownie'}</button>}
      </form>}
      {(error || csrf.error) && <p className="auth-error" role="alert">{error || csrf.error}</p>}
      {notice && <p className="auth-status" role="status">{notice}</p>}
      {stage === 'code' && <button className="auth-reset" type="button" disabled={busy} onClick={() => {
        setStage('password')
        setCode('')
        setError('')
        setNotice('')
      }}>Wróć do logowania</button>}
      {stage === 'password' && <>
        <div className="auth-divider" aria-hidden="true">lub</div>
        <form action="/_allauth/browser/v1/auth/provider/redirect" method="post" encType="application/x-www-form-urlencoded">
          <input type="hidden" name="provider" value="google" />
          <input type="hidden" name="process" value="login" />
          <input type="hidden" name="callback_url" value={googleCallback} />
          <input type="hidden" name="csrfmiddlewaretoken" value={csrfToken()} />
          <button className="button button-secondary" type="submit" disabled={!csrf.ready || busy}>Zaloguj przez Google</button>
        </form>
        <p className="auth-links">Nie masz konta? <Link className="text-link" to="/rejestracja">Zarejestruj się</Link></p>
        <p className="auth-links">Nie pamiętasz hasła? <Link className="text-link" to="/logowanie/reset-hasla">Zresetuj hasło</Link></p>
      </>}
      {stage === 'complete' && <Link className="text-link" to="/kursy">Przejdź do kursów</Link>}
    </AuthLayout>
  )
}

export function GoogleCallbackPage() {
  const { search } = useLocation()
  const params = new URLSearchParams(search)
  const failed = params.has('error') || params.has('error_process')
  const [state, setState] = useState({ busy: !failed, error: '' })
  const exchange = useRef(null)

  useEffect(() => {
    if (failed) return
    let active = true
    if (!exchange.current) exchange.current = exchangeToken()
    exchange.current.then(() => {
      if (active) setState({ busy: false, error: '' })
    }).catch(() => {
      if (active) setState({ busy: false, error: 'Nie udało się zalogować przez Google. Konto musi istnieć i mieć potwierdzony email.' })
    })
    return () => { active = false }
  }, [failed])

  return (
    <AuthLayout title="Logowanie przez Google">
      {failed || state.error ? <p className="auth-error" role="alert">{state.error || 'Logowanie przez Google zostało przerwane lub nie powiodło się. Spróbuj ponownie.'}</p>
        : <p className="auth-status" role="status">{state.busy ? 'Kończenie logowania…' : 'Jesteś zalogowany. Witaj w SOMA Learn!'}</p>}
      {failed || state.error ? <Link className="text-link" to="/logowanie">Wróć do formularza</Link>
        : !state.busy && <Link className="text-link" to="/kursy">Przejdź do kursów</Link>}
    </AuthLayout>
  )
}