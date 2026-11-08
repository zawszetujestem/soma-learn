import { afterEach, describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MENTOR, STUDENT, fail, mockApi, ok, renderApp, resetTestEnv, sessionAs } from './helpers.jsx'

afterEach(() => {
  resetTestEnv()
  document.cookie = 'csrftoken=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
})

const MINE = [
  { id: 11, course: 2, course_title: 'SQL dla analityków', student: STUDENT.id, mentor: null, status: 'active', closed_at: null, progress: 50, active_cycle: { id: 5, started_at: '2026-02-01T10:00:00Z', ended_at: null } },
  { id: 12, course: 1, course_title: 'Python od podstaw', student: STUDENT.id, mentor: MENTOR.id, status: 'active', closed_at: null, progress: 0, active_cycle: null },
  { id: 9, course: 3, course_title: 'Algebra', student: STUDENT.id, mentor: null, status: 'closed', closed_at: '2026-01-05T10:00:00Z', progress: 30 },
  { id: 20, course: 7, course_title: 'Kurs prowadzony jako mentor', student: 21, mentor: STUDENT.id, status: 'active', closed_at: null, progress: 0 },
]

describe('panel Moja nauka (/nauka)', () => {
  it('pokazuje własne aktywne kursy i historię, każdy z linkiem do tablicy instancji', async () => {
    const { calls } = mockApi({ ...sessionAs(STUDENT), 'GET /api/instances/mine/': ok(MINE) })
    renderApp('/nauka')

    expect(await screen.findByRole('heading', { level: 1, name: 'Moja nauka' })).toBeInTheDocument()
    const active = await screen.findByRole('region', { name: 'Aktywne kursy' })
    expect(within(active).getByRole('link', { name: 'Otwórz tablicę: SQL dla analityków' })).toHaveAttribute('href', '/kursy/instancje/11')
    expect(within(active).getByRole('link', { name: 'Otwórz tablicę: Python od podstaw' })).toHaveAttribute('href', '/kursy/instancje/12')
    expect(within(active).getByText('50%')).toBeInTheDocument()
    expect(within(active).getByText(/cykl w toku/i)).toBeInTheDocument()
    const history = screen.getByRole('region', { name: 'Zakończone kursy' })
    expect(within(history).getByRole('link', { name: 'Zobacz historię: Algebra' })).toHaveAttribute('href', '/kursy/instancje/9')
    expect(within(history).queryByText('SQL dla analityków')).toBeNull()
    expect(screen.queryByText('Kurs prowadzony jako mentor')).toBeNull()
    expect(calls.some((call) => call.path === '/api/instances/')).toBe(false)
  })

  it('pokazuje ładowanie, a potem pusty stan z linkiem do katalogu', async () => {
    let finish
    mockApi({
      ...sessionAs(STUDENT),
      'GET /api/instances/mine/': () => new Promise((resolve) => { finish = () => resolve(ok([])) }),
    })
    renderApp('/nauka')

    expect(await screen.findByText(/ładowanie twojej nauki/i)).toBeInTheDocument()
    finish()
    expect(await screen.findByText(/nie uczysz się jeszcze żadnego kursu/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Przejdź do katalogu kursów' })).toHaveAttribute('href', '/kursy')
    expect(screen.getByText(/nie masz jeszcze zakończonych kursów/i)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('pokazuje błąd z komunikatem serwera i pozwala ponowić', async () => {
    let attempts = 0
    mockApi({
      ...sessionAs(STUDENT),
      'GET /api/instances/mine/': () => {
        attempts += 1
        return attempts === 1 ? fail(503, { message: 'Serwis chwilowo niedostępny.' }) : ok(MINE.slice(0, 1))
      },
    })
    const user = userEvent.setup()
    renderApp('/nauka')

    expect(await screen.findByRole('alert')).toHaveTextContent('Serwis chwilowo niedostępny.')
    await user.click(screen.getByRole('button', { name: /spróbuj ponownie/i }))
    expect(await screen.findByRole('link', { name: 'Otwórz tablicę: SQL dla analityków' })).toBeInTheDocument()
  })

  it('wymaga zalogowania', async () => {
    document.cookie = 'csrftoken=test-csrf-token; path=/'
    const { calls } = mockApi({ 'GET /_allauth/browser/v1/auth/session': fail(401, { meta: { is_authenticated: false } }) })
    renderApp('/nauka', { token: null })

    expect(await screen.findByLabelText(/^email$/i)).toBeInTheDocument()
    expect(calls.some((call) => call.path === '/api/instances/mine/')).toBe(false)
  })
})

describe('nawigacja do Mojej nauki', () => {
  it('nagłówek aplikacji pokazuje zalogowanym link Moja nauka między Kursami a wylogowaniem', async () => {
    mockApi({ ...sessionAs(STUDENT), 'GET /api/courses/': ok([]), 'GET /api/instances/': ok([]) })
    renderApp('/kursy')

    const nav = screen.getByRole('navigation', { name: 'Główna nawigacja' })
    const links = within(nav).getAllByRole('link')
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/#metoda', '/kursy', '/nauka'])
    expect(within(nav).getByRole('link', { name: 'Moja nauka' })).toBeInTheDocument()
    expect(await screen.findByText(/brak kursów/i)).toBeInTheDocument()
  })

  it('nagłówek strony głównej pokazuje zalogowanym link Moja nauka', () => {
    mockApi({})
    renderApp('/')
    const nav = screen.getByRole('navigation', { name: 'Główna nawigacja' })
    expect(within(nav).getByRole('link', { name: 'Moja nauka' })).toHaveAttribute('href', '/nauka')
  })

  it('gość nie widzi linku Moja nauka', () => {
    mockApi({})
    renderApp('/', { token: null })
    expect(screen.queryByRole('link', { name: 'Moja nauka' })).toBeNull()
  })

  it('katalog ucznia prowadzi do Mojej nauki', async () => {
    mockApi({ ...sessionAs(STUDENT), 'GET /api/courses/': ok([]), 'GET /api/instances/': ok([]) })
    renderApp('/kursy')
    const main = await screen.findByRole('main')
    expect(await within(main).findByRole('link', { name: 'Moja nauka' })).toHaveAttribute('href', '/nauka')
  })

  it('po zakończonym logowaniu przez Google proponuje przejście do Mojej nauki', async () => {
    document.cookie = 'csrftoken=test-csrf-token; path=/'
    mockApi({ 'POST /api/auth/token/exchange/': ok({ token: 'token-new', user: { id: 1 } }) })
    renderApp('/logowanie/google/callback', { token: null })

    expect(await screen.findByRole('link', { name: 'Przejdź do mojej nauki' })).toHaveAttribute('href', '/nauka')
    expect(screen.getByRole('link', { name: 'Przejdź do kursów' })).toHaveAttribute('href', '/kursy')
  })

  it('po zakończonym logowaniu hasłem proponuje przejście do Mojej nauki', async () => {
    document.cookie = 'csrftoken=test-csrf-token; path=/'
    mockApi({
      'POST /_allauth/browser/v1/auth/login': ok({ meta: { is_authenticated: true } }),
      'POST /api/auth/token/exchange/': ok({ token: 'token-new', user: { id: 1 } }),
    })
    const user = userEvent.setup()
    renderApp('/logowanie', { token: null })

    await user.type(await screen.findByLabelText(/^email$/i), 'uczen@example.test')
    await user.type(screen.getByLabelText(/^hasło$/i), 'haslo-123')
    await user.click(screen.getByRole('button', { name: /^zaloguj się$/i }))

    expect(await screen.findByRole('link', { name: 'Przejdź do mojej nauki' })).toHaveAttribute('href', '/nauka')
  })
})