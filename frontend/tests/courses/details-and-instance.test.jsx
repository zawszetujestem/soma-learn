import { afterEach, describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  COURSE_OPEN, COURSE_PUBLIC, INSTANCE_OWN, MENTOR, STUDENT, fail, mockApi, ok, renderApp, resetTestEnv, sessionAs,
} from './helpers.jsx'

afterEach(resetTestEnv)

describe('szczegóły kursu', () => {
  it('pokazuje opis, zadania z godzinami i przycisk dołączenia', async () => {
    mockApi({
      ...sessionAs(STUDENT),
      'GET /api/courses/1/': ok(COURSE_PUBLIC),
      'GET /api/instances/': ok([]),
    })

    renderApp('/kursy/1')

    expect(await screen.findByRole('heading', { name: COURSE_PUBLIC.title })).toBeInTheDocument()
    expect(screen.getByText(/pierwsze kroki w pythonie/i)).toBeInTheDocument()
    expect(screen.getByText('Pętle')).toBeInTheDocument()
    expect(screen.getByText('2,5 h')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /dołącz/i })).toBeEnabled()
  })

  it('pokazuje czytelny komunikat dla nieistniejącego kursu (404)', async () => {
    mockApi({
      ...sessionAs(STUDENT),
      'GET /api/courses/99/': fail(404, { code: 'not_found', detail: 'Nie znaleziono.' }),
      'GET /api/instances/': ok([]),
    })

    renderApp('/kursy/99')

    expect(await screen.findByText(/nie znaleziono kursu/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /wróć do listy kursów/i })).toHaveAttribute('href', '/kursy')
  })

  it('pokazuje ładowanie zanim przyjdą dane kursu', async () => {
    let finish
    mockApi({
      ...sessionAs(STUDENT),
      'GET /api/courses/2/': () => new Promise((resolve) => { finish = () => resolve(ok(COURSE_OPEN)) }),
      'GET /api/instances/': ok([]),
    })

    renderApp('/kursy/2')

    expect(await screen.findByText(/ładowanie kursu/i)).toBeInTheDocument()
    finish()
    expect(await screen.findByRole('heading', { name: COURSE_OPEN.title })).toBeInTheDocument()
  })
})

describe('instancja ucznia (AC-49)', () => {
  it('uczeń prowadzący samodzielnie może zmienić status zadania', async () => {
    const { calls } = mockApi({
      ...sessionAs(STUDENT),
      'GET /api/instances/11/': ok(INSTANCE_OWN),
      'GET /api/instances/11/content/': ok({id: 2, number: 1, title: COURSE_OPEN.title, nodes: []}),
      'PATCH /api/instances/11/tasks/4/': ok({ id: 4, title: 'Join', hours: '2.00', status: 'in_progress', position: 2 }),
    })
    const user = userEvent.setup()

    renderApp('/kursy/instancje/11')

    expect(await screen.findByRole('heading', { name: COURSE_OPEN.title })).toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText(/zmień status: join/i), 'in_progress')

    await waitFor(() => expect(calls.some((call) => call.method === 'PATCH')).toBe(true))
    expect(calls.find((call) => call.method === 'PATCH').body).toEqual({ status: 'in_progress' })
  })

  it('w instancji prowadzonej przez mentora statusy są tylko do odczytu', async () => {
    mockApi({
      ...sessionAs(STUDENT),
      'GET /api/instances/11/': ok({ ...INSTANCE_OWN, mentor: MENTOR.id }),
      'GET /api/instances/11/content/': ok({id: 2, number: 1, title: COURSE_OPEN.title, nodes: []}),
    })

    renderApp('/kursy/instancje/11')

    expect(await screen.findByText(/mentor prowadzi tę instancję/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/zmień status: join/i)).toBeDisabled()
    expect(screen.queryByRole('button', { name: /zamknij instancję/i })).not.toBeInTheDocument()
  })

  it('zamknięta instancja jest tylko do odczytu i pozwala ją wznowić', async () => {
    mockApi({
      ...sessionAs(STUDENT),
      'GET /api/instances/11/': ok({ ...INSTANCE_OWN, status: 'closed', closed_at: '2026-01-05T10:00:00Z' }),
      'GET /api/instances/11/content/': ok({id: 2, number: 1, title: COURSE_OPEN.title, nodes: []}),
    })

    renderApp('/kursy/instancje/11')

    expect(await screen.findByText(/tylko do odczytu/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/zmień status: join/i)).toBeDisabled()
    expect(screen.getByRole('button', { name: /wznów instancję/i })).toBeEnabled()
  })

  it('pokazuje komunikat, gdy instancja jest zamknięta w trakcie edycji (409)', async () => {
    mockApi({
      ...sessionAs(STUDENT),
      'GET /api/instances/11/': ok(INSTANCE_OWN),
      'GET /api/instances/11/content/': ok({id: 2, number: 1, title: COURSE_OPEN.title, nodes: []}),
      'PATCH /api/instances/11/tasks/4/': fail(409, { code: 'instance_closed', detail: 'Instancja jest zamknięta.' }),
    })
    const user = userEvent.setup()

    renderApp('/kursy/instancje/11')

    await user.selectOptions(await screen.findByLabelText(/zmień status: join/i), 'done')

    expect(await screen.findByRole('alert')).toHaveTextContent(/instancja jest zamknięta/i)
  })

  it('pokazuje pusty stan i błąd dla nieistniejącej instancji', async () => {
    mockApi({
      ...sessionAs(STUDENT),
      'GET /api/instances/77/': fail(404, { code: 'not_found', detail: 'Nie znaleziono.' }),
    })

    renderApp('/kursy/instancje/77')

    expect(await screen.findByText(/nie znaleziono instancji/i)).toBeInTheDocument()
  })

  it('pokazuje błąd 5xx przy wczytywaniu instancji', async () => {
    mockApi({
      ...sessionAs(STUDENT),
      'GET /api/instances/11/': fail(500, {}),
    })

    renderApp('/kursy/instancje/11')

    expect(await screen.findByRole('alert')).toHaveTextContent(/błąd serwera/i)
  })
})
