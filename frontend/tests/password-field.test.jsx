import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from '../src/App.jsx'

function renderAt(path) {
  return render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>)
}

function jsonResponse(body, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body }
}

beforeEach(() => {
  document.cookie = 'csrftoken=test-csrf-token; path=/'
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  document.cookie = 'csrftoken=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
})

describe('browser password manager support', () => {
  it('marks login fields for saved-credential autofill', () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, 401)))
    renderAt('/logowanie')

    expect(screen.getByLabelText(/^email$/i)).toHaveAttribute('autocomplete', 'username')
    expect(screen.getByLabelText(/^hasło$/i)).toHaveAttribute('autocomplete', 'current-password')
    expect(screen.getByLabelText(/^hasło$/i)).toHaveAttribute('name', 'password')
  })

  it('marks registration fields so the browser can save a new password', () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, 401)))
    renderAt('/rejestracja')

    expect(screen.getByLabelText(/^email$/i)).toHaveAttribute('autocomplete', 'username')
    expect(screen.getByLabelText(/^hasło$/i)).toHaveAttribute('autocomplete', 'new-password')
  })
})

describe('show/hide password toggle', () => {
  it('reveals and hides the login password without losing its value', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, 401)))
    const user = userEvent.setup()
    renderAt('/logowanie')
    const password = screen.getByLabelText(/^hasło$/i)
    const toggle = screen.getByRole('button', { name: /^pokaż$/i })

    expect(password).toHaveAttribute('type', 'password')
    expect(toggle).toHaveAttribute('type', 'button')
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    expect(toggle).toHaveAttribute('aria-controls', password.id)

    await user.type(password, 'Secret-123')
    await user.click(toggle)
    expect(password).toHaveAttribute('type', 'text')
    expect(password).toHaveValue('Secret-123')
    expect(screen.getByRole('button', { name: /^ukryj$/i })).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: /^ukryj$/i }))
    expect(password).toHaveAttribute('type', 'password')
    expect(password).toHaveValue('Secret-123')
  })

  it('does not submit the form when toggled', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}, 401))
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    renderAt('/logowanie')
    await screen.findByLabelText(/^hasło$/i)
    const callsBefore = fetchMock.mock.calls.length

    await user.click(screen.getByRole('button', { name: /^pokaż$/i }))

    expect(fetchMock.mock.calls.filter(([url]) => url.includes('/auth/login'))).toHaveLength(0)
    expect(fetchMock.mock.calls.length).toBe(callsBefore)
  })

  it('masks the password again on submit so password managers can save it', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, 401)))
    const user = userEvent.setup()
    renderAt('/logowanie')
    const password = screen.getByLabelText(/^hasło$/i)
    await user.click(screen.getByRole('button', { name: /^pokaż$/i }))
    expect(password).toHaveAttribute('type', 'text')

    fireEvent.submit(password.closest('form'))

    expect(password).toHaveAttribute('type', 'password')
  })

  it('is available on the registration password field', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, 401)))
    const user = userEvent.setup()
    renderAt('/rejestracja')
    const password = screen.getByLabelText(/^hasło$/i)

    await user.click(screen.getByRole('button', { name: /^pokaż$/i }))

    expect(password).toHaveAttribute('type', 'text')
  })
})
