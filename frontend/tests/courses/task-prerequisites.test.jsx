import { afterEach, describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { COURSE_PUBLIC, MENTOR, created, fail, mockApi, ok, renderApp, resetTestEnv, sessionAs } from './helpers.jsx'

afterEach(resetTestEnv)

const TASKS = [
  { id: 1, title: 'Pętle', hours: '2.50', position: 1, prerequisite_ids: [] },
  { id: 2, title: 'Funkcje', hours: '3.00', position: 2, prerequisite_ids: [1] },
  { id: 3, title: 'Klasy', hours: '1.00', position: 3, prerequisite_ids: [] },
]
const COURSE = { ...COURSE_PUBLIC, id: 5, title: 'Analiza danych', owner: MENTOR.id, visibility: 'public', tasks: TASKS }

function setup(handlers = {}, courses = [COURSE]) {
  let index = 0
  return mockApi({
    ...sessionAs(MENTOR),
    'GET /api/courses/mine/5/': () => ok(courses[Math.min(index++, courses.length - 1)]),
    'GET /api/courses/mine/5/students-count/': ok({ count: 0 }),
    'GET /api/instances/': ok([]),
    ...handlers,
  })
}

const editor = (title) => screen.getByRole('group', { name: `Wymagania zadania: ${title}` })

describe('jawne wymagania między zadaniami kursu', () => {
  it('pokazuje wymagania każdego zadania i pozwala wybrać tylko inne zadania tego kursu', async () => {
    setup()
    renderApp('/kursy/moje/5')

    await screen.findByRole('heading', { name: COURSE.title })
    const item = screen.getByRole('button', { name: 'Usuń zadanie: Funkcje' }).closest('li')
    expect(within(item).getByText(/wymaga: pętle/i)).toBeInTheDocument()
    const group = editor('Funkcje')
    expect(within(group).getByRole('checkbox', { name: 'Pętle' })).toBeChecked()
    expect(within(group).getByRole('checkbox', { name: 'Klasy' })).not.toBeChecked()
    expect(within(group).queryByRole('checkbox', { name: 'Funkcje' })).toBeNull()
  })

  it('zapisuje wymagania przez PATCH z prerequisite_ids i odświeża kurs', async () => {
    const UPDATED = { ...COURSE, tasks: TASKS.map((t) => (t.id === 3 ? { ...t, prerequisite_ids: [1, 2] } : t)) }
    const { calls } = setup({ 'PATCH /api/courses/5/tasks/3/': ok({ ...TASKS[2], prerequisite_ids: [1, 2] }) }, [COURSE, UPDATED])
    const user = userEvent.setup()
    renderApp('/kursy/moje/5')

    await screen.findByRole('heading', { name: COURSE.title })
    await user.click(within(editor('Klasy')).getByRole('checkbox', { name: 'Pętle' }))
    await user.click(within(editor('Klasy')).getByRole('checkbox', { name: 'Funkcje' }))
    await user.click(screen.getByRole('button', { name: 'Zapisz wymagania: Klasy' }))

    await waitFor(() => expect(calls.some((call) => call.method === 'PATCH')).toBe(true))
    expect(calls.find((call) => call.method === 'PATCH').body).toEqual({ prerequisite_ids: [1, 2] })
    const item = screen.getByRole('button', { name: 'Usuń zadanie: Klasy' }).closest('li')
    expect(await within(item).findByText(/wymaga: pętle, funkcje/i)).toBeInTheDocument()
  })

  it('usunięcie wszystkich wymagań wysyła pustą listę', async () => {
    const { calls } = setup({ 'PATCH /api/courses/5/tasks/2/': ok({ ...TASKS[1], prerequisite_ids: [] }) })
    const user = userEvent.setup()
    renderApp('/kursy/moje/5')

    await screen.findByRole('heading', { name: COURSE.title })
    await user.click(within(editor('Funkcje')).getByRole('checkbox', { name: 'Pętle' }))
    await user.click(screen.getByRole('button', { name: 'Zapisz wymagania: Funkcje' }))

    await waitFor(() => expect(calls.find((call) => call.method === 'PATCH')?.body).toEqual({ prerequisite_ids: [] }))
  })

  it('pokazuje komunikat serwera o cyklu zależności bez zastępowania go ogólnym tekstem', async () => {
    setup({
      'PATCH /api/courses/5/tasks/1/': fail(400, {
        code: 'prerequisite_cycle',
        message: 'Wymagania tworzą cykl: Pętle → Funkcje → Pętle.',
        detail: 'cycle', prerequisite_ids: ['cycle'],
      }),
    })
    const user = userEvent.setup()
    renderApp('/kursy/moje/5')

    await screen.findByRole('heading', { name: COURSE.title })
    await user.click(within(editor('Pętle')).getByRole('checkbox', { name: 'Funkcje' }))
    await user.click(screen.getByRole('button', { name: 'Zapisz wymagania: Pętle' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Wymagania tworzą cykl: Pętle → Funkcje → Pętle.')
    expect(within(editor('Pętle')).getByRole('checkbox', { name: 'Funkcje' })).toBeChecked()
  })

  it('nowe zadanie może od razu dostać wymagania', async () => {
    const { calls } = setup({ 'POST /api/courses/5/tasks/': created({ id: 9, title: 'Joiny', hours: '1.50', position: 4, prerequisite_ids: [3] }) })
    const user = userEvent.setup()
    renderApp('/kursy/moje/5')

    await user.type(await screen.findByLabelText(/tytuł zadania/i), 'Joiny')
    await user.type(screen.getByLabelText(/godziny/i), '1,5')
    await user.click(within(screen.getByRole('group', { name: 'Wymagania nowego zadania' })).getByRole('checkbox', { name: 'Klasy' }))
    await user.click(screen.getByRole('button', { name: /dodaj zadanie/i }))

    await waitFor(() => expect(calls.some((call) => call.method === 'POST')).toBe(true))
    expect(calls.find((call) => call.method === 'POST').body).toEqual({ title: 'Joiny', hours: '1.5', prerequisite_ids: [3] })
    const item = (await screen.findByRole('button', { name: 'Usuń zadanie: Joiny' })).closest('li')
    expect(within(item).getByText(/wymaga: klasy/i)).toBeInTheDocument()
  })

  it('usunięte zadanie znika z wymagań pozostałych zadań', async () => {
    setup({ 'DELETE /api/courses/5/tasks/1/': { status: 204, body: undefined } })
    const user = userEvent.setup()
    renderApp('/kursy/moje/5')

    await user.click(await screen.findByRole('button', { name: 'Usuń zadanie: Pętle' }))

    await waitFor(() => expect(screen.queryByRole('button', { name: 'Usuń zadanie: Pętle' })).toBeNull())
    const item = screen.getByRole('button', { name: 'Usuń zadanie: Funkcje' }).closest('li')
    expect(within(item).queryByText(/wymaga:/i)).toBeNull()
  })

  it('mentor otwiera tablicę instancji ucznia', async () => {
    setup({
      'GET /api/instances/': ok([{ id: 10, course: 5, student: 21, mentor: MENTOR.id, status: 'active', closed_at: null, progress: 0, tasks: [] }]),
    })
    renderApp('/kursy/moje/5')

    expect(await screen.findByRole('link', { name: 'Otwórz tablicę ucznia nr 21' })).toHaveAttribute('href', '/kursy/instancje/10')
  })
})