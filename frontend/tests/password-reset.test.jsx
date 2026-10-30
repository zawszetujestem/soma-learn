import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from '../src/App.jsx'

const REQUEST_URL = '/_allauth/browser/v1/auth/password/request'
const RESET_URL = '/_allauth/browser/v1/auth/password/reset'

function mockResponse(body, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body }
}

function pendingResetFlow() {
  return mockResponse({
    status: 401,
    data: { flows: [{ id: 'password_reset_by_code', is_pending: true }] },
    meta: { is_authenticated: false },
  }, 401)
}

function renderAt(path) {
  return <MemoryRouter initialEntries={[path]}><App /></MemoryRouter>
}

function renderReset() {
  return renderAt('/logowanie/reset-hasla')
}

function jsonBody(fetchMock, index) {
  return JSON.parse(fetchMock.mock.calls[index][1].body)
}

beforeEach(() => {
  document.cookie = 'csrftoken=test-csrf-token; path=/'
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  sessionStorage.clear()
  document.cookie = 'csrftoken=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
})

describe('password reset', () => {
  it('links to the reset flow from the login screen', async () => {
    render(renderAt('/logowanie'))

    expect(screen.getByRole('link', { name: /zresetuj hasło/i })).toHaveAttribute('href', '/logowanie/reset-hasla')
  })

  it('ends an active session before requesting a reset code', async () => {
    const activeSession = mockResponse({
      status: 200,
      data: { user: { id: 2, email: 'uczen@uczen.pl' } },
      meta: { is_authenticated: true },
    })
    const endedSession = mockResponse({ status: 401, meta: { is_authenticated: false } }, 401)
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(activeSession)
      .mockResolvedValueOnce(endedSession)
      .mockResolvedValueOnce(pendingResetFlow())
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    render(renderReset())

    await user.type(screen.getByLabelText(/^email$/i), 'mentor@mentor.pl')
    await user.click(screen.getByRole('button', { name: /wyślij kod/i }))

    expect(await screen.findByLabelText(/kod resetujący/i)).toBeInTheDocument()
    expect(fetchMock.mock.calls[1][0]).toBe('/_allauth/browser/v1/auth/session')
    expect(fetchMock.mock.calls[1][1].method).toBe('DELETE')
    expect(fetchMock.mock.calls[1][1].headers['X-CSRFToken']).toBe('test-csrf-token')
    expect(fetchMock.mock.calls[2][0]).toBe(REQUEST_URL)
    expect(sessionStorage.getItem('token')).toBeNull()
  })

  it('requests a reset code for the entered email with CSRF protection', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(pendingResetFlow())
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    render(renderReset())

    await user.type(screen.getByLabelText(/^email$/i), 'ala@example.test')
    await user.click(screen.getByRole('button', { name: /wyślij kod/i }))

    expect(await screen.findByLabelText(/kod resetujący/i)).toBeInTheDocument()
    expect(fetchMock.mock.calls[0][0]).toBe(REQUEST_URL)
    expect(fetchMock.mock.calls[0][1].headers).toEqual(expect.objectContaining({ 'X-CSRFToken': 'test-csrf-token' }))
    expect(jsonBody(fetchMock, 0)).toEqual({ email: 'ala@example.test' })
  })

  it('verifies the code and then asks for a new password', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(pendingResetFlow())
      .mockResolvedValueOnce(mockResponse({ status: 401, meta: { is_authenticated: false } }, 401))
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    render(renderReset())

    await user.type(screen.getByLabelText(/^email$/i), 'ala@example.test')
    await user.click(screen.getByRole('button', { name: /wyślij kod/i }))
    await user.type(await screen.findByLabelText(/kod resetujący/i), '123456')
    await user.click(screen.getByRole('button', { name: /potwierdź kod/i }))

    expect(await screen.findByLabelText(/^nowe hasło$/i)).toBeInTheDocument()
    const [verifyUrl, verifyOptions] = fetchMock.mock.calls[1]
    expect(verifyUrl).toBe(RESET_URL)
    expect(verifyOptions.method).toBe('GET')
    expect(verifyOptions.headers).toEqual(expect.objectContaining({ 'X-Password-Reset-Key': '123456' }))
  })

  it('shows an error for a wrong code and stays on the code step', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(pendingResetFlow())
      .mockResolvedValueOnce(mockResponse({ status: 400, errors: [{ param: 'key', code: 'invalid' }] }, 400))
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    render(renderReset())

    await user.type(screen.getByLabelText(/^email$/i), 'ala@example.test')
    await user.click(screen.getByRole('button', { name: /wyślij kod/i }))
    await user.type(await screen.findByLabelText(/kod resetujący/i), '000000')
    await user.click(screen.getByRole('button', { name: /potwierdź kod/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/kod jest nieprawidłowy lub wygasł/i)
    expect(screen.getByLabelText(/kod resetujący/i)).toBeInTheDocument()
  })

  it('sets the new password and shows a success screen', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(pendingResetFlow())
      .mockResolvedValueOnce(mockResponse({ status: 401, meta: { is_authenticated: false } }, 401))
      .mockResolvedValueOnce(mockResponse({ status: 401, meta: { is_authenticated: false } }, 401))
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    render(renderReset())

    await user.type(screen.getByLabelText(/^email$/i), 'ala@example.test')
    await user.click(screen.getByRole('button', { name: /wyślij kod/i }))
    await user.type(await screen.findByLabelText(/kod resetujący/i), '123456')
    await user.click(screen.getByRole('button', { name: /potwierdź kod/i }))
    await user.type(await screen.findByLabelText(/^nowe hasło$/i), 'Brand-New-Password-917!')
    await user.click(screen.getByRole('button', { name: /zmień hasło/i }))

    expect(await screen.findByRole('status')).toHaveTextContent(/hasło zostało zmienione/i)
    expect(jsonBody(fetchMock, 2)).toEqual({ key: '123456', password: 'Brand-New-Password-917!' })
    expect(screen.getByRole('link', { name: /przejdź do logowania/i })).toHaveAttribute('href', '/logowanie')
  })

  it('shows the password validator message when the new password is rejected', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(pendingResetFlow())
      .mockResolvedValueOnce(mockResponse({ status: 401, meta: { is_authenticated: false } }, 401))
      .mockResolvedValueOnce(mockResponse({
        status: 400,
        errors: [{ param: 'password', message: 'This password is too short.' }],
      }, 400))
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    render(renderReset())

    await user.type(screen.getByLabelText(/^email$/i), 'ala@example.test')
    await user.click(screen.getByRole('button', { name: /wyślij kod/i }))
    await user.type(await screen.findByLabelText(/kod resetujący/i), '123456')
    await user.click(screen.getByRole('button', { name: /potwierdź kod/i }))
    await user.type(await screen.findByLabelText(/^nowe hasło$/i), '123')
    await user.click(screen.getByRole('button', { name: /zmień hasło/i }))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('This password is too short.'))
    expect(screen.getByLabelText(/^nowe hasło$/i)).toBeInTheDocument()
  })
})
