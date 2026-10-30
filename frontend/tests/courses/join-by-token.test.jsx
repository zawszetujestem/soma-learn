import { afterEach, describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  COURSE_OPEN, INSTANCE_OWN, STUDENT, created, currentPath, fail, mockApi, ok, renderApp, resetTestEnv, sessionAs,
} from './helpers.jsx'

afterEach(resetTestEnv)

const TOKEN = 'tok-123'
const JOIN_URL = `POST /api/courses/join/${TOKEN}/`

describe('dołączanie przez link zaproszenia (/kursy/dolacz/:token)', () => {
  it('przekierowuje niezalogowanego użytkownika na /logowanie bez wysyłania dołączenia', async () => {
    const { calls } = mockApi({})

    renderApp(`/kursy/dolacz/${TOKEN}`, { token: null })

    expect(await screen.findByLabelText(/email/i)).toBeInTheDocument()
    await waitFor(() => expect(currentPath()).toBe('/logowanie'))
    expect(calls.some((call) => call.path.startsWith('/api/courses/join/'))).toBe(false)
  })

  it('pokazuje stan ładowania, a po sukcesie przechodzi do instancji ucznia', async () => {
    let finish
    const { calls } = mockApi({
      ...sessionAs(STUDENT),
      [JOIN_URL]: () => new Promise((resolve) => {
        finish = () => resolve(created({ ...INSTANCE_OWN, id: 12 }))
      }),
      'GET /api/instances/12/': ok({ ...INSTANCE_OWN, id: 12 }),
      'GET /api/courses/2/': ok(COURSE_OPEN),
    })

    renderApp(`/kursy/dolacz/${TOKEN}`)

    expect(await screen.findByText(/dołączamy do kursu/i)).toBeInTheDocument()
    // Komunikat ładowania może pojawić się, zanim mock POST zostanie wywołany.
    await waitFor(() => expect(finish).toBeTypeOf('function'))
    finish()

    await waitFor(() => expect(currentPath()).toBe('/kursy/instancje/12'))
    expect(calls.filter((call) => call.method === 'POST')).toHaveLength(1)
    expect(calls.find((call) => call.method === 'POST').headers.Authorization).toBe('Token token-abc')
  })

  it('przechodzi do istniejącej instancji także przy odpowiedzi 200', async () => {
    mockApi({
      ...sessionAs(STUDENT),
      [JOIN_URL]: ok({ ...INSTANCE_OWN, id: 11 }),
      'GET /api/instances/11/': ok(INSTANCE_OWN),
      'GET /api/courses/2/': ok(COURSE_OPEN),
    })

    renderApp(`/kursy/dolacz/${TOKEN}`)

    await waitFor(() => expect(currentPath()).toBe('/kursy/instancje/11'))
  })

  it('pokazuje komunikat dla zajętego miejsca (409 slot_taken) i link do listy kursów', async () => {
    mockApi({
      ...sessionAs(STUDENT),
      [JOIN_URL]: fail(409, { code: 'slot_taken', detail: 'Masz już aktywną instancję innego kursu.' }),
    })

    renderApp(`/kursy/dolacz/${TOKEN}`)

    expect(await screen.findByRole('alert')).toHaveTextContent(/masz już aktywny kurs/i)
    expect(screen.getByRole('link', { name: /wróć do kursów/i })).toHaveAttribute('href', '/kursy')
    expect(currentPath()).toBe(`/kursy/dolacz/${TOKEN}`)
  })

  it('pokazuje komunikat o nieaktualnym zaproszeniu dla 404 not_found', async () => {
    mockApi({
      ...sessionAs(STUDENT),
      [JOIN_URL]: fail(404, { code: 'not_found', detail: 'Nie znaleziono.' }),
    })

    renderApp(`/kursy/dolacz/${TOKEN}`)

    expect(await screen.findByRole('alert')).toHaveTextContent('Zaproszenie jest nieaktualne lub nieprawidłowe')
    expect(screen.getByRole('link', { name: /wróć do kursów/i })).toHaveAttribute('href', '/kursy')
  })

  it('pozwala ponowić próbę po błędzie serwera', async () => {
    let attempts = 0
    mockApi({
      ...sessionAs(STUDENT),
      [JOIN_URL]: () => {
        attempts += 1
        return attempts === 1 ? fail(500, {}) : created({ ...INSTANCE_OWN, id: 12 })
      },
      'GET /api/instances/12/': ok({ ...INSTANCE_OWN, id: 12 }),
      'GET /api/courses/2/': ok(COURSE_OPEN),
    })
    const user = userEvent.setup()

    renderApp(`/kursy/dolacz/${TOKEN}`)

    expect(await screen.findByRole('alert')).toHaveTextContent(/błąd serwera/i)
    await user.click(screen.getByRole('button', { name: /spróbuj ponownie/i }))
    await waitFor(() => expect(currentPath()).toBe('/kursy/instancje/12'))
  })
})
