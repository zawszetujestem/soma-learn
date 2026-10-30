import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from '../src/App.jsx'

const LOGIN_URL = '/_allauth/browser/v1/auth/login'
const CODE_CONFIRM_URL = '/_allauth/browser/v1/auth/code/confirm'
const TOKEN_EXCHANGE_URL = '/api/auth/token/exchange/'
const SESSION_URL = '/_allauth/browser/v1/auth/session'
const PROVIDER_REDIRECT_URL = '/_allauth/browser/v1/auth/provider/redirect'

function renderAt(path) {
  return render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>)
}

function jsonResponse(body, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body }
}

function pendingLoginByCode() {
  return jsonResponse({
    status: 401,
    data: { flows: [{ id: 'login' }, { id: 'login_by_code', is_pending: true }] },
    meta: { is_authenticated: false },
  }, 401)
}

function authenticated() {
  return jsonResponse({ status: 200, data: { user: { id: 7 } }, meta: { is_authenticated: true } })
}

function tokenExchange(token = 'drf-token') {
  return jsonResponse({ token, user: { id: 7, email: 'ala@example.test' } })
}

function exchangeFailure() {
  return jsonResponse({ detail: 'Authentication credentials were not provided.' }, 401)
}

function loggedOut() {
  return jsonResponse({ status: 401, data: { flows: [] }, meta: { is_authenticated: false } }, 401)
}

const urls = (fetchMock) => fetchMock.mock.calls.map(([url]) => url)
const bodyOf = (fetchMock, index) => JSON.parse(fetchMock.mock.calls[index][1].body)
const trustCheckbox = () => screen.getByRole('checkbox', { name: /zapamiętaj mnie w tej przeglądarce/i })
const codeInput = () => screen.findByLabelText(/kod weryfikacyjny/i)
const confirmButton = () => screen.getByRole('button', { name: /potwierdź kod/i })

async function submitPassword(user) {
  await user.type(screen.getByLabelText(/^email$/i), 'ala@example.test')
  await user.type(screen.getByLabelText(/^hasło$/i), 'example-password')
  await user.click(screen.getByRole('button', { name: /^zaloguj się$/i }))
}

function expectSecurePost(fetchMock, index) {
  const [, options] = fetchMock.mock.calls[index]
  expect(options.method).toBe('POST')
  expect(options.credentials).toBe('include')
  expect(options.headers).toEqual(expect.objectContaining({
    'Content-Type': 'application/json',
    'X-CSRFToken': 'test-csrf-token',
  }))
}

function expectNoTrustInBrowserStorage() {
  expect(localStorage.length).toBe(0)
  expect(Object.keys(sessionStorage).filter((key) => key !== 'token')).toEqual([])
  expect(document.cookie).not.toMatch(/trust|remember/i)
}

beforeEach(() => {
  document.cookie = 'csrftoken=test-csrf-token; path=/'
  sessionStorage.clear()
  localStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  sessionStorage.clear()
  localStorage.clear()
  document.cookie = 'csrftoken=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
})

describe('trusted browser opt-in at the OTP step', () => {
  it('is offered only on the OTP step, unchecked by default, with a clear 24h description', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(pendingLoginByCode()))
    const user = userEvent.setup()
    renderAt('/logowanie')

    expect(screen.queryByRole('checkbox')).toBeNull()
    await submitPassword(user)
    await codeInput()

    const checkbox = trustCheckbox()
    expect(checkbox).toHaveAccessibleName('Zapamiętaj mnie w tej przeglądarce')
    expect(checkbox).not.toBeChecked()
    expect(checkbox).toHaveAccessibleDescription(/24 godzin/i)
    expect(checkbox).toHaveAccessibleDescription(/od potwierdzenia/i)
    expect(checkbox).toHaveAccessibleDescription(/hasło.*wymagane/i)
    expect(checkbox).toHaveAccessibleDescription(/nie przedłuża/i)
    expect(checkbox).toHaveAccessibleDescription(/współdzielon/i)
  })

  it('sends remember_browser false by default with credentials and CSRF', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(pendingLoginByCode())
      .mockResolvedValueOnce(authenticated())
      .mockResolvedValueOnce(tokenExchange())
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    renderAt('/logowanie')

    await submitPassword(user)
    await user.type(await codeInput(), 'ABC123')
    await user.click(confirmButton())

    await waitFor(() => expect(sessionStorage.getItem('token')).toBe('drf-token'))
    expect(urls(fetchMock)).toEqual([LOGIN_URL, CODE_CONFIRM_URL, TOKEN_EXCHANGE_URL])
    expectSecurePost(fetchMock, 1)
    expect(bodyOf(fetchMock, 1)).toEqual({ code: 'ABC123', remember_browser: false })
    expect(bodyOf(fetchMock, 0)).not.toHaveProperty('remember_browser')
    expectNoTrustInBrowserStorage()
  })

  it('sends remember_browser true only with the OTP confirmation when opted in', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(pendingLoginByCode())
      .mockResolvedValueOnce(authenticated())
      .mockResolvedValueOnce(tokenExchange())
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    renderAt('/logowanie')

    await submitPassword(user)
    await user.type(await codeInput(), 'ABC123')
    await user.click(trustCheckbox())
    expect(trustCheckbox()).toBeChecked()
    await user.click(confirmButton())

    await waitFor(() => expect(sessionStorage.getItem('token')).toBe('drf-token'))
    expectSecurePost(fetchMock, 1)
    expect(bodyOf(fetchMock, 1)).toEqual({ code: 'ABC123', remember_browser: true })
    expect(String(fetchMock.mock.calls[2][1].body ?? '')).not.toMatch(/remember/)
    expectNoTrustInBrowserStorage()
  })

  it('resets the opt-in after going back and starting a new login', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(pendingLoginByCode())
      .mockResolvedValueOnce(pendingLoginByCode())
      .mockResolvedValueOnce(authenticated())
      .mockResolvedValueOnce(tokenExchange())
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    renderAt('/logowanie')

    await submitPassword(user)
    await codeInput()
    await user.click(trustCheckbox())
    await user.click(screen.getByRole('button', { name: /wróć do logowania/i }))
    expect(screen.queryByRole('checkbox')).toBeNull()

    await submitPassword(user)
    await user.type(await codeInput(), 'XYZ789')
    expect(trustCheckbox()).not.toBeChecked()
    await user.click(confirmButton())

    await waitFor(() => expect(sessionStorage.getItem('token')).toBe('drf-token'))
    expect(bodyOf(fetchMock, 2)).toEqual({ code: 'XYZ789', remember_browser: false })
  })

  it('disables the opt-in while confirming and ignores a double submit', async () => {
    let resolveConfirm
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(pendingLoginByCode())
      .mockReturnValueOnce(new Promise((resolve) => { resolveConfirm = resolve }))
      .mockResolvedValueOnce(tokenExchange())
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    renderAt('/logowanie')

    await submitPassword(user)
    await user.type(await codeInput(), 'ABC123')
    await user.click(trustCheckbox())
    const form = confirmButton().closest('form')
    fireEvent.submit(form)
    fireEvent.submit(form)

    expect(trustCheckbox()).toBeDisabled()
    expect(screen.getByRole('button', { name: /weryfikowanie/i })).toBeDisabled()
    resolveConfirm(authenticated())

    await waitFor(() => expect(sessionStorage.getItem('token')).toBe('drf-token'))
    expect(urls(fetchMock).filter((url) => url === CODE_CONFIRM_URL)).toHaveLength(1)
  })

  it('retries only the token exchange after OTP succeeded, never re-sending the code', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(pendingLoginByCode())
      .mockResolvedValueOnce(authenticated())
      .mockResolvedValueOnce(exchangeFailure())
      .mockResolvedValueOnce(tokenExchange('retry-token'))
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    renderAt('/logowanie')

    await submitPassword(user)
    await user.type(await codeInput(), 'ABC123')
    await user.click(trustCheckbox())
    await user.click(confirmButton())

    expect(await screen.findByRole('alert')).toHaveTextContent(/nie udało się dokończyć logowania/i)
    expect(sessionStorage.getItem('token')).toBeNull()
    await user.click(screen.getByRole('button', { name: /spróbuj ponownie/i }))

    await waitFor(() => expect(sessionStorage.getItem('token')).toBe('retry-token'))
    expect(urls(fetchMock)).toEqual([LOGIN_URL, CODE_CONFIRM_URL, TOKEN_EXCHANGE_URL, TOKEN_EXCHANGE_URL])
  })
})

describe('login with an already trusted browser', () => {
  it('exchanges the session straight after a 200 authenticated login without asking for OTP', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(authenticated())
      .mockResolvedValueOnce(tokenExchange('trusted-token'))
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    renderAt('/logowanie')

    await submitPassword(user)

    expect(await screen.findByRole('status')).toHaveTextContent(/jesteś zalogowany/i)
    expect(sessionStorage.getItem('token')).toBe('trusted-token')
    expect(urls(fetchMock)).toEqual([LOGIN_URL, TOKEN_EXCHANGE_URL])
    expectSecurePost(fetchMock, 0)
    expect(bodyOf(fetchMock, 0)).toEqual({ email: 'ala@example.test', password: 'example-password' })
    expect(screen.queryByLabelText(/kod weryfikacyjny/i)).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
    expectNoTrustInBrowserStorage()
  })

  it.each([
    ['an empty payload', {}],
    ['an unauthenticated meta', { status: 200, meta: { is_authenticated: false } }],
    ['errors in the payload', { status: 200, errors: [{ code: 'unknown' }] }],
  ])('does not treat a 200 login with %s as success', async (_name, body) => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(body, 200))
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    renderAt('/logowanie')

    await submitPassword(user)

    expect(await screen.findByRole('alert')).toHaveTextContent(/nie udało się/i)
    expect(urls(fetchMock)).toEqual([LOGIN_URL])
    expect(sessionStorage.getItem('token')).toBeNull()
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('lets the user retry a failed exchange after a trusted login without re-entering credentials or OTP', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(authenticated())
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(tokenExchange('second-try'))
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    renderAt('/logowanie')

    await submitPassword(user)
    expect(await screen.findByRole('alert')).toHaveTextContent(/połączenia/i)
    await user.click(screen.getByRole('button', { name: /spróbuj ponownie/i }))

    await waitFor(() => expect(sessionStorage.getItem('token')).toBe('second-try'))
    expect(urls(fetchMock)).toEqual([LOGIN_URL, TOKEN_EXCHANGE_URL, TOKEN_EXCHANGE_URL])
  })

  it('keeps recovering an active session on 409 without OTP', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ meta: { is_authenticated: true } }, 409))
      .mockResolvedValueOnce(tokenExchange('restored'))
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    renderAt('/logowanie')

    await submitPassword(user)

    await waitFor(() => expect(sessionStorage.getItem('token')).toBe('restored'))
    expect(urls(fetchMock)).toEqual([LOGIN_URL, TOKEN_EXCHANGE_URL])
  })

  it('leaves the Google sign-in form unchanged and without a trust field', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    renderAt('/logowanie')

    const form = screen.getByRole('button', { name: /google/i }).closest('form')
    expect(form).toHaveAttribute('action', PROVIDER_REDIRECT_URL)
    expect(Array.from(form.elements).map((element) => element.name).filter(Boolean))
      .toEqual(['provider', 'process', 'callback_url', 'csrfmiddlewaretoken'])
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('logout reliability', () => {
  function logoutFetch(...deleteResults) {
    const queue = [...deleteResults]
    return vi.fn(async (url, options = {}) => {
      if (url === SESSION_URL && options.method === 'DELETE') {
        const next = queue.shift()
        if (next instanceof Error) throw next
        return next
      }
      return jsonResponse({}, 404)
    })
  }

  const deleteCalls = (fetchMock) => fetchMock.mock.calls.filter(([url, options]) => url === SESSION_URL && options?.method === 'DELETE')

  it('treats DELETE 401 with is_authenticated false as a confirmed logout', async () => {
    sessionStorage.setItem('token', 'student-token')
    const fetchMock = logoutFetch(loggedOut())
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    renderAt('/')

    await user.click(screen.getByRole('button', { name: /wyloguj/i }))

    expect(await screen.findByRole('link', { name: /logowanie/i })).toBeInTheDocument()
    expect(sessionStorage.getItem('token')).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
    const [, options] = deleteCalls(fetchMock)[0]
    expect(options.credentials).toBe('include')
    expect(options.headers['X-CSRFToken']).toBe('test-csrf-token')
  })

  it.each([
    ['403', () => jsonResponse({ status: 403 }, 403)],
    ['500', () => jsonResponse({}, 500)],
    ['a network error', () => new TypeError('Failed to fetch')],
    ['401 still authenticated', () => jsonResponse({ meta: { is_authenticated: true } }, 401)],
    ['401 without meta', () => jsonResponse({}, 401)],
  ])('clears the local token but reports an unconfirmed trust revocation on %s, and allows a retry', async (_name, failure) => {
    sessionStorage.setItem('token', 'student-token')
    const fetchMock = logoutFetch(failure(), loggedOut())
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    renderAt('/')

    await user.click(screen.getByRole('button', { name: /wyloguj/i }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/nie udało się potwierdzić wylogowania/i)
    expect(alert).toHaveTextContent(/zaufanie tej przeglądarki/i)
    expect(sessionStorage.getItem('token')).toBeNull()
    expect(screen.getByRole('link', { name: /logowanie/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /ponów wylogowanie/i }))

    expect(await screen.findByRole('status')).toHaveTextContent(/wylogowanie zostało potwierdzone/i)
    expect(screen.queryByRole('alert')).toBeNull()
    expect(deleteCalls(fetchMock)).toHaveLength(2)
  })

  it('keeps the warning when the retry also fails', async () => {
    sessionStorage.setItem('token', 'student-token')
    const fetchMock = logoutFetch(jsonResponse({}, 500), new TypeError('Failed to fetch'))
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    renderAt('/')

    await user.click(screen.getByRole('button', { name: /wyloguj/i }))
    await screen.findByRole('alert')
    await user.click(screen.getByRole('button', { name: /ponów wylogowanie/i }))

    await waitFor(() => expect(deleteCalls(fetchMock)).toHaveLength(2))
    expect(await screen.findByRole('alert')).toHaveTextContent(/nie udało się potwierdzić wylogowania/i)
    expect(screen.getByRole('button', { name: /ponów wylogowanie/i })).toBeEnabled()
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('sends a single DELETE when logout is clicked twice', async () => {
    sessionStorage.setItem('token', 'student-token')
    let resolveDelete
    const fetchMock = vi.fn(() => new Promise((resolve) => { resolveDelete = resolve }))
    vi.stubGlobal('fetch', fetchMock)
    renderAt('/')

    const button = screen.getByRole('button', { name: /wyloguj/i })
    fireEvent.click(button)
    fireEvent.click(button)
    expect(button).toBeDisabled()
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    resolveDelete(loggedOut())

    expect(await screen.findByRole('link', { name: /logowanie/i })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
