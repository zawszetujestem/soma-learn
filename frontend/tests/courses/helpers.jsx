import { render, screen } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { vi } from 'vitest'
import App from '../../src/App.jsx'

export const STUDENT = { id: 1, first_name: 'Ala', last_name: 'Kowalska', email: 'ala@example.test', roles: ['student'] }
export const MENTOR = { id: 2, first_name: 'Maria', last_name: 'Mentor', email: 'maria@example.test', roles: ['mentor'] }
export const ADMIN = { id: 3, first_name: 'Ada', last_name: 'Admin', email: 'ada@example.test', roles: ['admin'] }

export function ok(body) {
  return { status: 200, body }
}

export function created(body) {
  return { status: 201, body }
}

export function fail(status, body) {
  return { status, body }
}

// Mocks fetch. Keys are "METHOD /path" (path without query string).
// A handler is a response object, or a function (sync or async) returning one.
export function mockApi(handlers) {
  const calls = []
  const fetchMock = vi.fn(async (url, options = {}) => {
    const method = (options.method || 'GET').toUpperCase()
    const path = new URL(url, 'http://localhost').pathname
    calls.push({
      method,
      path,
      body: options.body instanceof FormData ? options.body : options.body ? JSON.parse(options.body) : undefined,
      headers: options.headers || {},
    })
    const key = `${method} ${path}`
    const handler = handlers[key]
    if (!handler) throw new Error(`Unexpected request ${key}`)
    const result = typeof handler === 'function' ? await handler(options) : handler
    const { status = 200, body = {}, headers = {} } = result
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
      headers: new Headers(headers),
      blob: async () => body,
    }
  })
  vi.stubGlobal('fetch', fetchMock)
  return { fetchMock, calls }
}

export function sessionAs(user) {
  return { 'GET /api/auth/me/': ok(user) }
}

function LocationProbe() {
  const location = useLocation()
  return <span data-testid="location" hidden>{location.pathname}</span>
}

export function renderApp(path, { token = 'token-abc' } = {}) {
  if (token) sessionStorage.setItem('token', token)
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
      <LocationProbe />
    </MemoryRouter>,
  )
}

export function currentPath() {
  return screen.getByTestId('location').textContent
}

export function resetTestEnv() {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  sessionStorage.clear()
  localStorage.clear()
}

export const COURSE_PUBLIC = {
  id: 1,
  owner: 2,
  title: 'Python od podstaw',
  description: 'Pierwsze kroki w Pythonie.',
  visibility: 'public',
  approval_status: 'approved',
  is_active: true,
  tasks: [
    { id: 1, title: 'Pętle', hours: '2.50', position: 1 },
    { id: 2, title: 'Funkcje', hours: '3.00', position: 2 },
  ],
  created_at: '2026-01-01T10:00:00Z',
  updated_at: '2026-01-01T10:00:00Z',
}

export const COURSE_OPEN = {
  ...COURSE_PUBLIC,
  id: 2,
  title: 'SQL dla analityków',
  tasks: [{ id: 3, title: 'Select', hours: '1.00', position: 1 }],
}

export const INSTANCE_OWN = {
  id: 11,
  course: 2,
  student: 1,
  mentor: null,
  status: 'active',
  closed_at: null,
  created_at: '2026-01-02T10:00:00Z',
  progress: 50.0,
  tasks: [
    { id: 3, title: 'Select', hours: '1.00', status: 'done', position: 1 },
    { id: 4, title: 'Join', hours: '2.00', status: 'todo', position: 2 },
  ],
}
