import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from '../src/App.jsx'

const SESSION_URL = '/_allauth/browser/v1/auth/session'

function jsonResponse(body, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body }
}

function apiFetch(url) {
  if (url === '/api/auth/me/') {
    return jsonResponse({ id: 1, email: 'uczen@uczen.pl', roles: ['student'] })
  }
  if (url === '/api/courses/') return jsonResponse([])
  if (url === SESSION_URL) return jsonResponse({ meta: { is_authenticated: false } }, 401)
  return jsonResponse({}, 404)
}

function renderAt(path) {
  return render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>)
}

beforeEach(() => {
  document.cookie = 'csrftoken=test-csrf-token; path=/'
  sessionStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  sessionStorage.clear()
  document.cookie = 'csrftoken=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
})

describe('session-aware navigation', () => {
  it('offers login when no token is stored', () => {
    vi.stubGlobal('fetch', vi.fn())
    renderAt('/')

    expect(screen.getByRole('link', { name: /logowanie/i })).toHaveAttribute('href', '/logowanie')
    expect(screen.queryByRole('button', { name: /wyloguj/i })).toBeNull()
  })

  it('shows logout instead of login when a token is stored', () => {
    sessionStorage.setItem('token', 'student-token')
    vi.stubGlobal('fetch', vi.fn(async (url) => apiFetch(url)))
    renderAt('/')

    expect(screen.getByRole('button', { name: /wyloguj/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /logowanie/i })).toBeNull()
  })

  it('redirects a logged-in user away from the login screen', async () => {
    sessionStorage.setItem('token', 'student-token')
    const fetchMock = vi.fn(async (url) => apiFetch(url))
    vi.stubGlobal('fetch', fetchMock)
    renderAt('/logowanie')

    await waitFor(() => expect(fetchMock.mock.calls.map((call) => call[0])).toContain('/api/courses/'))
    expect(screen.queryByRole('button', { name: /^zaloguj się$/i })).toBeNull()
  })

  it('redirects a logged-in user away from the password reset screen', async () => {
    sessionStorage.setItem('token', 'student-token')
    const fetchMock = vi.fn(async (url) => apiFetch(url))
    vi.stubGlobal('fetch', fetchMock)
    renderAt('/logowanie/reset-hasla')

    await waitFor(() => expect(fetchMock.mock.calls.map((call) => call[0])).toContain('/api/courses/'))
    expect(screen.queryByRole('button', { name: /wyślij kod/i })).toBeNull()
  })

  it('recovers a server session when login reports a conflict in a new tab', async () => {
    let exchanged = false
    const fetchMock = vi.fn(async (url, options = {}) => {
      if (url === '/_allauth/browser/v1/auth/login') {
        return jsonResponse({ meta: { is_authenticated: true } }, 409)
      }
      if (url === '/api/auth/token/exchange/') {
        exchanged = true
        return jsonResponse({ token: 'token-restored', user: { id: 1, email: 'uczen@uczen.pl' } })
      }
      return apiFetch(url)
    })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    renderAt('/logowanie')
    await user.type(await screen.findByLabelText(/^email$/i), 'uczen@uczen.pl')
    await user.type(screen.getByLabelText(/^hasło$/i), 'haslo-123')
    await user.click(screen.getByRole('button', { name: /^zaloguj się$/i }))
    await waitFor(() => expect(exchanged).toBe(true))
    expect(sessionStorage.getItem('token')).toBe('token-restored')
    expect(screen.queryByText(/sesja logowania uległa zmianie/i)).not.toBeInTheDocument()
  })

  it('logs out: ends the session, clears the token and returns to login link', async () => {
    sessionStorage.setItem('token', 'student-token')
    const fetchMock = vi.fn(async (url, options) => {
      if (url === SESSION_URL && options?.method === 'DELETE') return jsonResponse({}, 401)
      return apiFetch(url)
    })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    renderAt('/kursy')

    await user.click(await screen.findByRole('button', { name: /wyloguj/i }))

    await waitFor(() => expect(screen.getByRole('link', { name: /logowanie/i })).toBeInTheDocument())
    const deleteCall = fetchMock.mock.calls.find((call) => call[0] === SESSION_URL && call[1]?.method === 'DELETE')
    expect(deleteCall[1].headers['X-CSRFToken']).toBe('test-csrf-token')
    expect(sessionStorage.getItem('token')).toBeNull()
  })
})
