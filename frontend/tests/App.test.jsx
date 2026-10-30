import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from '../src/App.jsx'

const REGISTER_URL = '/api/auth/register/'
const LOGIN_URL = '/_allauth/browser/v1/auth/login'
const CODE_CONFIRM_URL = '/_allauth/browser/v1/auth/code/confirm'
const CODE_REQUEST_URL = '/_allauth/browser/v1/auth/code/request'
const EMAIL_VERIFY_URL = '/_allauth/browser/v1/auth/email/verify'
const LEGACY_EMAIL_VERIFY_URL = '/api/auth/verify-email/'
const PROVIDER_REDIRECT_URL = '/_allauth/browser/v1/auth/provider/redirect'
const PROVIDER_SIGNUP_URL = '/_allauth/browser/v1/auth/provider/signup'
const TOKEN_EXCHANGE_URL = '/api/auth/token/exchange/'
const GOOGLE_CALLBACK_PATH = '/logowanie/google/callback'

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

function mockResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }
}

// Mirrors the allauth Headless envelope: {status, data, meta} or {status, errors}.
function headlessResponse({ status = 200, data, meta, errors } = {}) {
  const body = { status }
  if (data !== undefined) body.data = data
  if (meta !== undefined) body.meta = meta
  if (errors !== undefined) body.errors = errors
  return mockResponse(body, status)
}

function pendingLoginByCode() {
  return headlessResponse({
    status: 401,
    data: {
      flows: [
        { id: 'login' },
        { id: 'login_by_code', is_pending: true },
      ],
    },
    meta: { is_authenticated: false },
  })
}

function authenticatedSession() {
  return headlessResponse({
    status: 200,
    data: {
      user: { id: 7, email: 'ala@example.test', has_usable_password: true },
      methods: [{ method: 'password', email: 'ala@example.test' }, { method: 'code' }],
    },
    meta: { is_authenticated: true },
  })
}

function tokenExchange(token = 'drf-token-789') {
  return mockResponse({ token, user: { id: 7, email: 'ala@example.test', roles: ['student'] } })
}

function storedValues(storage) {
  return Array.from({ length: storage.length }, (_, index) => storage.getItem(storage.key(index)))
}

function calledUrls(fetchMock) {
  return fetchMock.mock.calls.map(([url]) => url)
}

function expectSecurePost(fetchMock, callIndex) {
  const [, options] = fetchMock.mock.calls[callIndex]
  expect(options.method).toBe('POST')
  expect(options.credentials).toBe('include')
  expect(options.headers).toEqual(expect.objectContaining({ 'X-CSRFToken': 'test-csrf-token' }))
}

function expectJsonBody(fetchMock, callIndex) {
  const [, options] = fetchMock.mock.calls[callIndex]
  expect(options.headers).toEqual(expect.objectContaining({ 'Content-Type': 'application/json' }))
  return JSON.parse(options.body)
}

async function fillRegistration(user, { firstName = 'Ala', lastName = 'Kowalska', email = 'ala@example.test' } = {}) {
  await user.type(screen.getByLabelText(/imię/i), firstName)
  await user.type(screen.getByLabelText(/nazwisko/i), lastName)
  await user.type(screen.getByLabelText(/email/i), email)
  await user.type(screen.getByLabelText(/hasło/i), 'Long-Unique-Password-482!')
}

function registrationSubmitButton() {
  return screen.getByRole('button', { name: /utwórz konto|zarejestruj/i })
}

async function submitLogin(user, email = 'ala@example.test', password = 'example-password') {
  await user.type(screen.getByLabelText(/email/i), email)
  await user.type(screen.getByLabelText(/hasło/i), password)
  await user.click(loginSubmitButton())
}

function loginSubmitButton() {
  return screen.getByRole('button', { name: /^zaloguj( się)?$/i })
}

function codeInputMatcher() {
  return /kod (weryfikacyjny|jednorazowy|z e-?maila)/i
}

function codeSubmitButtonMatcher() {
  return /potwierdź kod|zweryfikuj|kontynuuj/i
}

beforeEach(() => {
  document.cookie = 'csrftoken=test-csrf-token; path=/'
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  sessionStorage.clear()
  localStorage.clear()
  document.cookie = 'csrftoken=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
})

describe('SOMA Learn public pages', () => {
  it('presents the public homepage for eighth-grade students and their families', () => {
    renderAt('/')

    expect(screen.getByRole('heading', { name: /soma learn/i })).toBeInTheDocument()
    expect(screen.getByText(/ósmej klasy|klas ósmych/i)).toBeInTheDocument()
  })

  it('explains each part of the SOMA learning rhythm', () => {
    renderAt('/')

    for (const concept of ['Vision', 'Path', 'Backlog', 'Cycle', 'Daily Focus', 'Reflection']) {
      expect(screen.getByText(concept, { exact: false })).toBeInTheDocument()
    }
  })

  it('shows how parents support learning without managing or punishing', () => {
    renderAt('/')

    expect(screen.getByRole('heading', { name: /blisko, ale bez/i })).toBeInTheDocument()
    expect(screen.getByText(/rozmawiaj o tym, co pomaga/i)).toBeInTheDocument()
    expect(screen.getByText(/bez kar/i)).toBeInTheDocument()
  })

  it('describes mentor invitations only as a planned possibility', () => {
    renderAt('/')

    expect(screen.getByRole('heading', { name: /wspieraj proces/i })).toBeInTheDocument()
    expect(screen.getByText(/planowana jest możliwość/i)).toBeInTheDocument()
  })

  it('provides navigation to courses and the visual login mockup', () => {
    renderAt('/')

    expect(screen.getByRole('navigation', { name: /główna/i })).toHaveAccessibleName()
    expect(screen.getByRole('link', { name: 'Kursy' })).toHaveAttribute('href', '/kursy')
    expect(screen.getByRole('link', { name: /logowanie/i })).toHaveAttribute('href', '/logowanie')
  })

  it('redirects the courses route to login when the user is not signed in', async () => {
    sessionStorage.clear()
    vi.stubGlobal('fetch', vi.fn())

    renderAt('/kursy')

    expect(await screen.findByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /kursy pojawią się wkrótce/i })).not.toBeInTheDocument()
  })

  it('offers accessible email and password controls for login', () => {
    renderAt('/logowanie')

    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/hasło/i)).toBeInTheDocument()
  })

  it('offers student and mentor roles with a mentor-only required specialization and no age or consent controls', () => {
    renderAt('/rejestracja')

    expect(screen.getByRole('heading', { name: /rejestracja/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /uczeń|student/i })).toBeChecked()
    expect(screen.getByRole('radio', { name: /mentor/i })).not.toBeChecked()
    expect(screen.queryByLabelText(/wiek|zgoda|consent/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: /zgod|consent|regulamin/i })).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/specjalizacja/i)?.required ?? false).toBe(false)

    fireEvent.click(screen.getByRole('radio', { name: /mentor/i }))
    expect(screen.getByLabelText(/specjalizacja/i)).toBeRequired()

    fireEvent.click(screen.getByRole('radio', { name: /uczeń|student/i }))
    expect(screen.queryByLabelText(/specjalizacja/i)?.required ?? false).toBe(false)
  })

  it('submits student registration to the custom endpoint and shows pending email verification without a session token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse({
      email: 'ala@example.test',
      first_name: 'Ala',
      last_name: 'Kowalska',
      roles: ['student'],
      is_email_confirmed: false,
    }, 201))
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    renderAt('/rejestracja')

    await fillRegistration(user)
    await user.click(registrationSubmitButton())

    expect(await screen.findByRole('status')).toHaveTextContent(/sprawdź.*e-?mail|potwierd.*e-?mail|weryfikacj/i)
    expect(calledUrls(fetchMock)).toEqual([REGISTER_URL])
    expectSecurePost(fetchMock, 0)
    const body = expectJsonBody(fetchMock, 0)
    expect(body).toEqual(expect.objectContaining({
      first_name: 'Ala',
      last_name: 'Kowalska',
      email: 'ala@example.test',
      password: 'Long-Unique-Password-482!',
      role: 'student',
    }))
    expect(body).not.toHaveProperty('age')
    expect(body).not.toHaveProperty('consent')
    expect(sessionStorage.length).toBe(0)
    expect(localStorage.length).toBe(0)
  })

  it('submits a mentor registration with the required specialization', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse({
      email: 'jan@example.test',
      roles: ['mentor'],
      specialization: 'Matematyka',
      is_email_confirmed: false,
    }, 201))
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    renderAt('/rejestracja')

    await user.click(screen.getByRole('radio', { name: /mentor/i }))
    await fillRegistration(user, { firstName: 'Jan', lastName: 'Nowak', email: 'jan@example.test' })
    await user.type(screen.getByLabelText(/specjalizacja/i), 'Matematyka')
    await user.click(registrationSubmitButton())

    expect(await screen.findByRole('status')).toHaveTextContent(/sprawdź.*e-?mail|potwierd.*e-?mail|weryfikacj/i)
    expect(calledUrls(fetchMock)).toEqual([REGISTER_URL])
    expectSecurePost(fetchMock, 0)
    const body = expectJsonBody(fetchMock, 0)
    expect(body).toEqual(expect.objectContaining({ role: 'mentor', specialization: 'Matematyka' }))
    expect(body).not.toHaveProperty('age')
    expect(body).not.toHaveProperty('consent')
  })

  it('does not submit a mentor registration without a specialization', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    renderAt('/rejestracja')

    await user.click(screen.getByRole('radio', { name: /mentor/i }))
    await fillRegistration(user, { firstName: 'Jan', lastName: 'Nowak', email: 'jan@example.test' })
    await user.click(registrationSubmitButton())

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([
    ['duplicate email', 400, { email: ['user with this email address already exists.'] }, /e-?mail.*(istnieje|zajęty|używany)|konto.*istnieje/i],
    ['weak password', 400, { password: ['This password is too common.'] }, /hasło/i],
    ['server error', 500, { detail: 'Server error.' }, /błąd.*serwera|spróbuj ponownie/i],
  ])('shows a useful registration message for %s', async (_caseName, status, body, message) => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse(body, status))
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    renderAt('/rejestracja')

    await fillRegistration(user)
    await user.click(registrationSubmitButton())

    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expectSecurePost(fetchMock, 0)
    expect(screen.queryByText(/sprawdź.*e-?mail/i)).not.toBeInTheDocument()
    expect(sessionStorage.length).toBe(0)
  })

  it('shows a network error when registration cannot reach the API', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('offline'))
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    renderAt('/rejestracja')

    await fillRegistration(user)
    await user.click(registrationSubmitButton())

    expect(await screen.findByRole('alert')).toHaveTextContent(/połączen|sieci|spróbuj ponownie/i)
    expectSecurePost(fetchMock, 0)
  })

  it('does not verify an email on GET of the confirmation route until the explicit button is clicked', () => {
    const fetchMock = vi.fn().mockResolvedValue(headlessResponse({ status: 200, data: {}, meta: { is_authenticated: false } }))
    vi.stubGlobal('fetch', fetchMock)
    renderAt('/potwierdzenie-email/verify-key-123')

    expect(screen.getByRole('button', { name: /potwierdź e-?mail|potwierdź adres/i })).toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([, options]) => options?.method === 'POST')).toBe(false)
  })

  it('handles legacy uid/token confirmation links only after an explicit click', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse({ detail: 'Email został potwierdzony.' }))
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    renderAt('/potwierdzenie-email?uid=legacy-uid&token=legacy-token')

    expect(screen.getByRole('button', { name: /potwierdź e-?mail|potwierdź adres/i })).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: /potwierdź e-?mail|potwierdź adres/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      LEGACY_EMAIL_VERIFY_URL,
      expect.objectContaining({ method: 'POST' }),
    ))
    expect(expectJsonBody(fetchMock, 0)).toEqual({ uid: 'legacy-uid', token: 'legacy-token' })
    expect(await screen.findByRole('link', { name: /zaloguj/i })).toHaveAttribute('href', '/logowanie')
  })

  it.each([
    ['an authenticated', headlessResponse({ status: 200, data: { user: { id: 7 } }, meta: { is_authenticated: true } })],
    ['an unauthenticated (no login on confirmation)', headlessResponse({ status: 401, data: { flows: [{ id: 'login' }] }, meta: { is_authenticated: false } })],
  ])('posts the key to allauth on click and links to login after %s success response', async (_caseName, response) => {
    const fetchMock = vi.fn().mockResolvedValue(response)
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    renderAt('/potwierdzenie-email/verify-key-123')

    await user.click(screen.getByRole('button', { name: /potwierdź e-?mail|potwierdź adres/i }))

    expect(await screen.findByRole('link', { name: /zaloguj/i })).toHaveAttribute('href', '/logowanie')
    expect(calledUrls(fetchMock)).toEqual([EMAIL_VERIFY_URL])
    expectSecurePost(fetchMock, 0)
    expect(expectJsonBody(fetchMock, 0)).toEqual({ key: 'verify-key-123' })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(sessionStorage.length).toBe(0)
  })

  it('explains an invalid or expired email verification key', async () => {
    const fetchMock = vi.fn().mockResolvedValue(headlessResponse({
      status: 400,
      errors: [{ message: 'Invalid or expired key.', code: 'invalid_or_expired_key', param: 'key' }],
    }))
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    renderAt('/potwierdzenie-email/expired-key')

    await user.click(screen.getByRole('button', { name: /potwierdź e-?mail|potwierdź adres/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/nieprawidłow|niepoprawn|wygasł|nieaktualn/i)
    expectSecurePost(fetchMock, 0)
    expect(screen.queryByRole('link', { name: /^zaloguj/i })).toBeNull()
  })

  it('shows a network error when email verification cannot reach the API', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('offline'))
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    renderAt('/potwierdzenie-email/verify-key-123')

    await user.click(screen.getByRole('button', { name: /potwierdź e-?mail|potwierdź adres/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/połączen|sieci|spróbuj ponownie/i)
    expectSecurePost(fetchMock, 0)
  })

  it('requires a password and offers no passwordless login by email or button', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    renderAt('/logowanie')

    expect(screen.getByLabelText(/hasło/i)).toBeRequired()
    expect(screen.getByLabelText(/hasło/i)).toHaveAttribute('type', 'password')
    expect(screen.queryByRole('button', { name: /bez hasła|wyślij kod|kod.*e-?mail|link.*e-?mail|magic/i })).toBeNull()
    expect(screen.queryByRole('link', { name: /bez hasła|wyślij kod|kod.*e-?mail|link.*e-?mail|magic/i })).toBeNull()
    expect(screen.queryByLabelText(codeInputMatcher())).toBeNull()

    await user.type(screen.getByLabelText(/email/i), 'ala@example.test')
    await user.click(loginSubmitButton())

    expect(fetchMock).not.toHaveBeenCalled()
    expect(calledUrls(fetchMock)).not.toContain(CODE_REQUEST_URL)
  })

  it('posts email and password to allauth login and asks for the pending login_by_code without storing a token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(pendingLoginByCode())
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    renderAt('/logowanie')

    await submitLogin(user)

    expect(await screen.findByLabelText(codeInputMatcher())).toBeInTheDocument()
    expect(calledUrls(fetchMock)).toEqual([LOGIN_URL])
    expectSecurePost(fetchMock, 0)
    expect(expectJsonBody(fetchMock, 0)).toEqual({
      email: 'ala@example.test',
      password: 'example-password',
    })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(sessionStorage.length).toBe(0)
    expect(localStorage.length).toBe(0)
  })

  it('confirms the code, exchanges the authenticated session, and only then stores the DRF token in sessionStorage', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(pendingLoginByCode())
      .mockResolvedValueOnce(authenticatedSession())
      .mockResolvedValueOnce(tokenExchange('drf-token-789'))
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    renderAt('/logowanie')

    await submitLogin(user)
    await user.type(await screen.findByLabelText(codeInputMatcher()), 'ABC123')
    expect(sessionStorage.length).toBe(0)
    await user.click(screen.getByRole('button', { name: codeSubmitButtonMatcher() }))

    await waitFor(() => expect(storedValues(sessionStorage)).toContain('drf-token-789'))
    expect(calledUrls(fetchMock)).toEqual([LOGIN_URL, CODE_CONFIRM_URL, TOKEN_EXCHANGE_URL])
    expectSecurePost(fetchMock, 0)
    expectSecurePost(fetchMock, 1)
    expectSecurePost(fetchMock, 2)
    expect(expectJsonBody(fetchMock, 1)).toEqual({ code: 'ABC123' })
    expect(localStorage.length).toBe(0)
    expect(storedValues(sessionStorage)).not.toContain('example-password')
  })

  it('shows an incorrect code error and does not exchange or store a token', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(pendingLoginByCode())
      .mockResolvedValueOnce(headlessResponse({
        status: 400,
        errors: [{ message: 'Incorrect code.', code: 'incorrect_code', param: 'code' }],
      }))
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    renderAt('/logowanie')

    await submitLogin(user)
    await user.type(await screen.findByLabelText(codeInputMatcher()), '000000')
    await user.click(screen.getByRole('button', { name: codeSubmitButtonMatcher() }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/kod.*(nieprawidłow|niepoprawn|błędn)|(nieprawidłow|niepoprawn|błędn).*kod/i)
    expect(calledUrls(fetchMock)).toEqual([LOGIN_URL, CODE_CONFIRM_URL])
    expect(sessionStorage.length).toBe(0)
  })

  it('does not store a token when the session exchange fails after code confirmation', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(pendingLoginByCode())
      .mockResolvedValueOnce(authenticatedSession())
      .mockResolvedValueOnce(mockResponse({ detail: 'Authentication credentials were not provided.' }, 401))
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    renderAt('/logowanie')

    await submitLogin(user)
    await user.type(await screen.findByLabelText(codeInputMatcher()), 'ABC123')
    await user.click(screen.getByRole('button', { name: codeSubmitButtonMatcher() }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/nie udało|spróbuj ponownie|zaloguj.*ponownie/i)
    expect(calledUrls(fetchMock)).toEqual([LOGIN_URL, CODE_CONFIRM_URL, TOKEN_EXCHANGE_URL])
    expect(sessionStorage.length).toBe(0)
  })

  it('rejects wrong credentials without creating a registration', async () => {
    const fetchMock = vi.fn().mockResolvedValue(headlessResponse({
      status: 400,
      errors: [{
        message: 'The email address and/or password you specified are not correct.',
        code: 'email_password_mismatch',
        param: 'password',
      }],
    }))
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    renderAt('/logowanie')

    await submitLogin(user, 'unknown@example.test')

    expect(await screen.findByRole('alert')).toHaveTextContent(/nieprawidłow|niepoprawn|błędn/i)
    expect(calledUrls(fetchMock)).toEqual([LOGIN_URL])
    expectSecurePost(fetchMock, 0)
    expect(screen.queryByLabelText(codeInputMatcher())).toBeNull()
    expect(sessionStorage.length).toBe(0)
  })

  it('asks an unverified account to confirm its email instead of continuing login', async () => {
    const fetchMock = vi.fn().mockResolvedValue(headlessResponse({
      status: 401,
      data: { flows: [{ id: 'login' }, { id: 'verify_email', is_pending: true }] },
      meta: { is_authenticated: false },
    }))
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    renderAt('/logowanie')

    await submitLogin(user)

    expect(await screen.findByRole('alert')).toHaveTextContent(/potwierdź.*e-?mail|e-?mail.*niepotwierdzon/i)
    expect(calledUrls(fetchMock)).toEqual([LOGIN_URL])
    expect(screen.queryByLabelText(codeInputMatcher())).toBeNull()
    expect(sessionStorage.length).toBe(0)
  })

  it('shows a network error when login cannot reach the API', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('offline'))
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    renderAt('/logowanie')

    await submitLogin(user)

    expect(await screen.findByRole('alert')).toHaveTextContent(/połączen|sieci|spróbuj ponownie/i)
    expectSecurePost(fetchMock, 0)
  })

  it('renders Google sign-in as a native form-encoded POST to the allauth provider redirect for login only', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    renderAt('/logowanie')

    const googleForm = screen.getByRole('button', { name: /google/i }).closest('form')
    expect(googleForm).not.toBeNull()
    expect(googleForm.getAttribute('method')).toMatch(/^post$/i)
    expect(googleForm).toHaveAttribute('action', PROVIDER_REDIRECT_URL)
    expect(googleForm.enctype).toBe('application/x-www-form-urlencoded')

    const field = (name) => googleForm.elements.namedItem(name)
    expect(field('provider')).toHaveValue('google')
    expect(field('process')).toHaveValue('login')
    expect(field('callback_url').value).toMatch(/^(https?:\/\/[^/]+)?\/logowanie\/google\/callback$/)
    expect(field('csrfmiddlewaretoken')).toHaveValue('test-csrf-token')
    for (const name of ['provider', 'process', 'callback_url', 'csrfmiddlewaretoken']) {
      expect(field(name)).toHaveAttribute('type', 'hidden')
    }
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('exchanges the Django browser session on the Google callback and stores the DRF token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(tokenExchange('google-drf-token'))
    vi.stubGlobal('fetch', fetchMock)
    renderAt(GOOGLE_CALLBACK_PATH)

    await waitFor(() => expect(storedValues(sessionStorage)).toContain('google-drf-token'))
    expect(calledUrls(fetchMock)).toEqual([TOKEN_EXCHANGE_URL])
    expectSecurePost(fetchMock, 0)
    expect(localStorage.length).toBe(0)
  })

  it('ignores any code or token in the Google callback URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue(tokenExchange('google-drf-token'))
    vi.stubGlobal('fetch', fetchMock)
    renderAt(`${GOOGLE_CALLBACK_PATH}?token=url-token&code=url-code`)

    await waitFor(() => expect(storedValues(sessionStorage)).toContain('google-drf-token'))
    expect(calledUrls(fetchMock)).toEqual([TOKEN_EXCHANGE_URL])
    expect(storedValues(sessionStorage)).not.toContain('url-token')
    expect(String(fetchMock.mock.calls[0][1].body ?? '')).not.toMatch(/url-token|url-code/)
  })

  it('shows the allauth error from the Google callback without exchanging a session', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    renderAt(`${GOOGLE_CALLBACK_PATH}?error=cancelled&error_process=login`)

    expect(await screen.findByRole('alert')).toHaveTextContent(/google|logowani.*(nie powiodło|przerwan|anulowan)/i)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(sessionStorage.length).toBe(0)
    expect(screen.getByRole('link', { name: /logowani|spróbuj ponownie/i })).toHaveAttribute('href', '/logowanie')
  })

  it('does not auto-register an unknown Google account when no authenticated session exists', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse({ detail: 'Authentication credentials were not provided.' }, 401))
    vi.stubGlobal('fetch', fetchMock)
    renderAt(GOOGLE_CALLBACK_PATH)

    expect(await screen.findByRole('alert')).toHaveTextContent(/konto|zarejestr|nie udało/i)
    expect(calledUrls(fetchMock)).toEqual([TOKEN_EXCHANGE_URL])
    expect(calledUrls(fetchMock)).not.toContain(PROVIDER_SIGNUP_URL)
    expect(calledUrls(fetchMock)).not.toContain(REGISTER_URL)
    expect(screen.queryByLabelText(/imię|nazwisko/i)).toBeNull()
    expect(sessionStorage.length).toBe(0)
  })

  it('keeps the brand and navigation links in a predictable keyboard order', async () => {
    const user = userEvent.setup()
    renderAt('/')

    await user.tab()
    expect(document.activeElement).toHaveAccessibleName('SOMA Learn, strona główna')
    await user.tab()
    expect(document.activeElement).toHaveAccessibleName('Jak działa SOMA')
  })

  it('defines a responsive layout breakpoint for narrow viewports', () => {
    const styles = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8')

    expect(styles).toMatch(/@media\s*\(max-width:\s*\d+px\)/)
    expect(styles).toMatch(/min-height:\s*100svh/)
  })
})
describe('login code resend', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('keeps the original code expiry after a resend', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(pendingLoginByCode())
      .mockResolvedValueOnce(mockResponse({}, 200))
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderAt('/logowanie')

    await submitLogin(user)
    await screen.findByLabelText(codeInputMatcher())
    expect(screen.getByText(/10:00/)).toBeInTheDocument()

    vi.advanceTimersByTime(61000)
    await user.click(await screen.findByRole('button', { name: /wyślij kod ponownie/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(await screen.findByText(/8:59/)).toBeInTheDocument()
    expect(screen.queryByText(/10:00/)).not.toBeInTheDocument()
  })

  it('disables resend and explains the limit when the server refuses a resend', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(pendingLoginByCode())
      .mockResolvedValueOnce(mockResponse({ status: 409 }, 409))
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderAt('/logowanie')

    await submitLogin(user)
    await screen.findByLabelText(codeInputMatcher())
    vi.advanceTimersByTime(61000)
    await user.click(await screen.findByRole('button', { name: /wyślij kod ponownie/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/limit ponownych wysłań/i)
    expect(screen.getByRole('button', { name: /wyślij kod ponownie/i })).toBeDisabled()
  })
})

describe('login code expiry', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('disables resend and asks to restart login once the code has expired', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const fetchMock = vi.fn().mockResolvedValueOnce(pendingLoginByCode())
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderAt('/logowanie')

    await submitLogin(user)
    await screen.findByLabelText(codeInputMatcher())
    vi.advanceTimersByTime(601000)

    expect(await screen.findByText(/kod wygasł/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /wyślij kod ponownie/i })).toBeDisabled()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
