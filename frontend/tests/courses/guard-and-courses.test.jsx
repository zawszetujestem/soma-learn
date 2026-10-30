import { afterEach, describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  COURSE_OPEN, COURSE_PUBLIC, INSTANCE_OWN, STUDENT, MENTOR, currentPath, fail, mockApi, ok, renderApp, resetTestEnv,
  sessionAs, created,
} from './helpers.jsx'

afterEach(resetTestEnv)

describe('dostęp do kursów (AC-13)', () => {
  it('przekierowuje niezalogowanego użytkownika na /logowanie bez zapytań o kursy', async () => {
    const { calls } = mockApi({})

    renderApp('/kursy', { token: null })

    expect(await screen.findByLabelText(/email/i)).toBeInTheDocument()
    // Strona logowania sama sprawdza sesję allauth; kursy nie mogą wysłać żadnego żądania do /api/.
    expect(calls.filter((call) => call.path.startsWith('/api/'))).toEqual([])
    expect(screen.queryByRole('heading', { name: 'Kursy' })).not.toBeInTheDocument()
  })

  it('wysyła nagłówek Authorization: Token dla zalogowanego użytkownika', async () => {
    const { calls } = mockApi({
      ...sessionAs(STUDENT),
      'GET /api/courses/': ok([]),
      'GET /api/instances/': ok([]),
    })

    renderApp('/kursy')

    await screen.findByText(/brak kursów/i)
    const courseCall = calls.find((call) => call.path === '/api/courses/')
    expect(courseCall.headers.Authorization).toBe('Token token-abc')
  })

  it('usuwa token i przekierowuje na /logowanie, gdy sesja wygasła (401)', async () => {
    mockApi({ 'GET /api/auth/me/': fail(401, { detail: 'Invalid token.' }) })

    renderApp('/kursy/moje')

    await waitFor(() => expect(currentPath()).toBe('/logowanie'))
    expect(sessionStorage.getItem('token')).toBeNull()
  })

  it('pokazuje błąd i ponowienie, gdy sprawdzenie sesji kończy się błędem 5xx', async () => {
    let attempts = 0
    mockApi({
      'GET /api/auth/me/': () => {
        attempts += 1
        return attempts === 1 ? fail(500, {}) : ok(STUDENT)
      },
      'GET /api/courses/': ok([]),
      'GET /api/instances/': ok([]),
    })
    const user = userEvent.setup()

    renderApp('/kursy')

    expect(await screen.findByRole('alert')).toHaveTextContent(/nie udało się/i)
    await user.click(screen.getByRole('button', { name: /spróbuj ponownie/i }))
    expect(await screen.findByText(/brak kursów/i)).toBeInTheDocument()
  })

  it('pokazuje komunikat dla roli mentora na stronie zarządzania kursami dla studenta', async () => {
    const { calls } = mockApi({ ...sessionAs(STUDENT) })

    renderApp('/kursy/moje')

    expect(await screen.findByText(/dostępna dla mentorów/i)).toBeInTheDocument()
    expect(calls.some((call) => call.path === '/api/courses/mine/')).toBe(false)
  })
})

describe('lista kursów dla ucznia (AC-52)', () => {
  it('pokazuje stan ładowania, dopóki kursy się nie wczytają', async () => {
    let finish
    mockApi({
      ...sessionAs(STUDENT),
      'GET /api/courses/': () => new Promise((resolve) => { finish = () => resolve(ok([])) }),
      'GET /api/instances/': ok([]),
    })

    renderApp('/kursy')

    expect(await screen.findByText(/ładowanie kursów/i)).toBeInTheDocument()
    finish()
    expect(await screen.findByText(/brak kursów/i)).toBeInTheDocument()
  })

  it('pokazuje pusty stan osobno od błędu', async () => {
    mockApi({
      ...sessionAs(STUDENT),
      'GET /api/courses/': ok([]),
      'GET /api/instances/': ok([]),
    })

    renderApp('/kursy')

    expect(await screen.findByText(/brak kursów/i)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('pokazuje publiczne zatwierdzone kursy z linkiem do szczegółów', async () => {
    mockApi({
      ...sessionAs(STUDENT),
      'GET /api/courses/': ok([COURSE_PUBLIC, COURSE_OPEN]),
      'GET /api/instances/': ok([]),
    })

    renderApp('/kursy')

    expect(await screen.findByRole('heading', { name: COURSE_PUBLIC.title })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /zobacz kurs.*python od podstaw/i })).toHaveAttribute('href', '/kursy/1')
    expect(screen.getByRole('heading', { name: COURSE_OPEN.title })).toBeInTheDocument()
  })

  it('pokazuje błąd 5xx osobno od pustego stanu i pozwala ponowić', async () => {
    let attempts = 0
    mockApi({
      ...sessionAs(STUDENT),
      'GET /api/courses/': () => {
        attempts += 1
        return attempts === 1 ? fail(503, {}) : ok([COURSE_PUBLIC])
      },
      'GET /api/instances/': ok([]),
    })
    const user = userEvent.setup()

    renderApp('/kursy')

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/nie udało się wczytać kursów/i)
    expect(screen.queryByText(/brak kursów/i)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /spróbuj ponownie/i }))
    expect(await screen.findByRole('heading', { name: COURSE_PUBLIC.title })).toBeInTheDocument()
  })
})

describe('dołączanie do kursu (AC-30)', () => {
  it('blokuje dołączenie i pokazuje link do instancji, gdy uczeń ma już aktywny kurs', async () => {
    mockApi({
      ...sessionAs(STUDENT),
      'GET /api/courses/': ok([COURSE_PUBLIC, COURSE_OPEN]),
      'GET /api/instances/': ok([INSTANCE_OWN]),
    })

    renderApp('/kursy')

    await screen.findByRole('heading', { name: COURSE_PUBLIC.title })
    expect(screen.getByText(/masz już aktywny kurs/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /przejdź do swojej instancji/i })).toHaveAttribute('href', '/kursy/instancje/11')
    screen.getAllByRole('button', { name: /dołącz/i }).forEach((button) => expect(button).toBeDisabled())
  })

  it('po dołączeniu przechodzi do instancji ucznia', async () => {
    mockApi({
      ...sessionAs(STUDENT),
      'GET /api/courses/': ok([COURSE_OPEN]),
      'GET /api/instances/': ok([]),
      'POST /api/courses/2/join/': created({ ...INSTANCE_OWN, id: 12 }),
      'GET /api/instances/12/': ok({ ...INSTANCE_OWN, id: 12 }),
      'GET /api/courses/2/': ok(COURSE_OPEN),
    })
    const user = userEvent.setup()

    renderApp('/kursy')

    await user.click(await screen.findByRole('button', { name: /dołącz/i }))

    await waitFor(() => expect(currentPath()).toBe('/kursy/instancje/12'))
  })

  it('pokazuje komunikat, gdy serwer odrzuci dołączenie z powodu zajętego miejsca (409 slot_taken)', async () => {
    mockApi({
      ...sessionAs(STUDENT),
      'GET /api/courses/': ok([COURSE_OPEN]),
      'GET /api/instances/': ok([]),
      'POST /api/courses/2/join/': fail(409, { code: 'slot_taken', detail: 'Masz już aktywny kurs.' }),
    })
    const user = userEvent.setup()

    renderApp('/kursy')

    await user.click(await screen.findByRole('button', { name: /dołącz/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/masz już aktywny kurs/i)
    expect(screen.getByRole('button', { name: /dołącz/i })).toBeDisabled()
  })

  it('pokazuje komunikat błędu serwera przy dołączaniu (5xx)', async () => {
    mockApi({
      ...sessionAs(STUDENT),
      'GET /api/courses/': ok([COURSE_OPEN]),
      'GET /api/instances/': ok([]),
      'POST /api/courses/2/join/': fail(500, {}),
    })
    const user = userEvent.setup()

    renderApp('/kursy')

    await user.click(await screen.findByRole('button', { name: /dołącz/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/błąd serwera/i)
  })

  it('nie pokazuje przycisku dołączania mentorowi', async () => {
    mockApi({
      ...sessionAs(MENTOR),
      'GET /api/courses/': ok([COURSE_OPEN]),
      'GET /api/instances/': ok([]),
    })

    renderApp('/kursy')

    await screen.findByRole('heading', { name: COURSE_OPEN.title })
    expect(screen.queryByRole('button', { name: /dołącz/i })).not.toBeInTheDocument()
  })
})
