import { afterEach, describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ADMIN, MENTOR, STUDENT, fail, mockApi, ok, renderApp, resetTestEnv, sessionAs } from './helpers.jsx'

afterEach(resetTestEnv)

const CONTENT = { id: 2, number: 1, title: 'SQL dla analityków', nodes: [] }
const CYCLE = { id: 5, started_at: '2026-02-01T10:00:00Z', ended_at: null }
const task = (id, title, extra = {}) => ({
  id, title, hours: '1.00', status: 'todo', position: id, prerequisite_ids: [], blocked: false, selected: false, ...extra,
})
const TASKS = [
  task(3, 'Select', { status: 'done', selected: true }),
  task(4, 'Join', { prerequisite_ids: [3] }),
  task(5, 'Okna', { prerequisite_ids: [4], blocked: true }),
  task(6, 'Indeksy', { status: 'in_progress', selected: true }),
]
const INSTANCE = {
  id: 11, course: 2, student: STUDENT.id, mentor: null, status: 'active', closed_at: null, progress: 25,
  created_at: '2026-01-02T10:00:00Z', active_cycle: CYCLE, cycle_history: [], tasks: TASKS,
}

function withTasks(instance, changes) {
  return { ...instance, tasks: instance.tasks.map((t) => ({ ...t, ...(changes[t.id] || {}) })) }
}

// Sequential GET responses for the instance: first load, then each refresh.
function setup({ user = STUDENT, instances = [INSTANCE], handlers = {} } = {}) {
  let index = 0
  return mockApi({
    ...sessionAs(user),
    'GET /api/instances/11/': () => ok(instances[Math.min(index++, instances.length - 1)]),
    'GET /api/instances/11/content/': ok(CONTENT),
    ...handlers,
  })
}

const board = () => screen.getByRole('region', { name: 'Tablica cyklu' })
const backlog = () => screen.getByRole('region', { name: 'Backlog' })
const column = (name) => within(board()).getByRole('region', { name })
const patches = (calls) => calls.filter((call) => call.method === 'PATCH')

describe('tablica aktywnego cyklu', () => {
  it('pokazuje na tablicy wyłącznie wybrane zadania w kolumnach, a pozostałe w backlogu', async () => {
    setup()
    renderApp('/kursy/instancje/11')

    expect(await screen.findByRole('heading', { name: CONTENT.title })).toBeInTheDocument()
    expect(within(column('Gotowe')).getByText('Select')).toBeInTheDocument()
    expect(within(column('W trakcie')).getByText('Indeksy')).toBeInTheDocument()
    expect(within(column('Do zrobienia')).queryByRole('listitem')).toBeNull()
    expect(within(board()).queryByText('Join')).toBeNull()
    expect(within(board()).queryByText('Okna')).toBeNull()
    expect(within(backlog()).getByText('Join')).toBeInTheDocument()
    expect(within(backlog()).getByText('Okna')).toBeInTheDocument()
    expect(within(backlog()).queryByText('Select')).toBeNull()
  })

  it('zablokowane zadanie zostaje w backlogu z nazwami niespełnionych wymagań', async () => {
    setup()
    renderApp('/kursy/instancje/11')

    const blockedButton = await screen.findByRole('button', { name: 'Dodaj do cyklu: Okna' })
    expect(blockedButton).toBeDisabled()
    const card = blockedButton.closest('li')
    expect(within(card).getByText(/zablokowane/i)).toBeInTheDocument()
    expect(within(card).getByText(/wymaga: join/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Dodaj do cyklu: Join' })).toBeEnabled()
  })

  it('wybiera zadanie do cyklu jawnym przyciskiem i odświeża instancję', async () => {
    const { calls } = setup({
      instances: [INSTANCE, withTasks(INSTANCE, { 4: { selected: true } })],
      handlers: { 'PATCH /api/instances/11/tasks/4/': ok(task(4, 'Join', { selected: true })) },
    })
    const user = userEvent.setup()
    renderApp('/kursy/instancje/11')

    await user.click(await screen.findByRole('button', { name: 'Dodaj do cyklu: Join' }))

    expect(await within(column('Do zrobienia')).findByText('Join')).toBeInTheDocument()
    expect(patches(calls).map((call) => call.body)).toEqual([{ selected: true }])
    expect(calls.filter((call) => call.method === 'GET' && call.path === '/api/instances/11/')).toHaveLength(2)
    expect(within(backlog()).queryByText('Join')).toBeNull()
  })

  it('pozwala wybrać także zadanie ukończone i odłożyć zadanie z tablicy do backlogu', async () => {
    const DONE_IN_BACKLOG = withTasks(INSTANCE, { 3: { selected: false } })
    const { calls } = setup({
      instances: [DONE_IN_BACKLOG, INSTANCE, withTasks(INSTANCE, { 6: { selected: false } })],
      handlers: {
        'PATCH /api/instances/11/tasks/3/': ok(TASKS[0]),
        'PATCH /api/instances/11/tasks/6/': ok({ ...TASKS[3], selected: false }),
      },
    })
    const user = userEvent.setup()
    renderApp('/kursy/instancje/11')

    await user.click(await screen.findByRole('button', { name: 'Dodaj do cyklu: Select' }))
    expect(await within(column('Gotowe')).findByText('Select')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Odłóż do backlogu: Indeksy' }))

    expect(await within(backlog()).findByText('Indeksy')).toBeInTheDocument()
    expect(patches(calls).map((call) => call.body)).toEqual([{ selected: true }, { selected: false }])
  })

  it('zmienia status wybranego zadania i przenosi je do właściwej kolumny', async () => {
    const { calls } = setup({
      instances: [INSTANCE, withTasks(INSTANCE, { 6: { status: 'done' } })],
      handlers: { 'PATCH /api/instances/11/tasks/6/': ok({ ...TASKS[3], status: 'done' }) },
    })
    const user = userEvent.setup()
    renderApp('/kursy/instancje/11')

    await user.selectOptions(await screen.findByLabelText('Zmień status: Indeksy'), 'done')

    expect(await within(column('Gotowe')).findByText('Indeksy')).toBeInTheDocument()
    expect(patches(calls).map((call) => call.body)).toEqual([{ status: 'done' }])
  })

  it('odblokowane zadanie trafia do backlogu bez automatycznego wyboru', async () => {
    const START = withTasks(INSTANCE, { 4: { selected: true, status: 'in_progress' } })
    const { calls } = setup({
      instances: [START, withTasks(START, { 4: { status: 'done' }, 5: { blocked: false } })],
      handlers: { 'PATCH /api/instances/11/tasks/4/': ok({ ...START.tasks[1], status: 'done' }) },
    })
    const user = userEvent.setup()
    renderApp('/kursy/instancje/11')

    expect(await screen.findByRole('button', { name: 'Dodaj do cyklu: Okna' })).toBeDisabled()
    await user.selectOptions(screen.getByLabelText('Zmień status: Join'), 'done')

    await waitFor(() => expect(screen.getByRole('button', { name: 'Dodaj do cyklu: Okna' })).toBeEnabled())
    expect(within(backlog()).getByText('Okna')).toBeInTheDocument()
    expect(within(board()).queryByText('Okna')).toBeNull()
    expect(patches(calls).map((call) => call.body)).toEqual([{ status: 'done' }])
  })

  it('ponowne otwarcie ukończonego wymagania pokazuje zależne zadania w backlogu z zachowanym statusem', async () => {
    const START = withTasks(INSTANCE, { 4: { selected: true, status: 'in_progress' } })
    const AFTER = withTasks(START, { 3: { status: 'todo' }, 4: { selected: false, blocked: true } })
    const { calls } = setup({
      instances: [START, AFTER],
      handlers: { 'PATCH /api/instances/11/tasks/3/': ok({ ...TASKS[0], status: 'todo' }) },
    })
    const user = userEvent.setup()
    renderApp('/kursy/instancje/11')

    await screen.findByRole('region', { name: 'Tablica cyklu' })
    expect(within(column('W trakcie')).getByText('Join')).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Zmień status: Select'), 'todo')

    const joinButton = await screen.findByRole('button', { name: 'Dodaj do cyklu: Join' })
    expect(joinButton).toBeDisabled()
    const card = joinButton.closest('li')
    expect(within(card).getByLabelText('Zmień status: Join')).toHaveValue('in_progress')
    expect(within(column('Do zrobienia')).getByText('Select')).toBeInTheDocument()
    expect(within(board()).queryByText('Join')).toBeNull()
    expect(patches(calls).map((call) => call.body)).toEqual([{ status: 'todo' }])
  })
})

describe('ręczny cykl instancji', () => {
  const NO_CYCLE = { ...INSTANCE, active_cycle: null, tasks: TASKS.map((t) => ({ ...t, selected: false })) }

  it('bez aktywnego cyklu nie ma tablicy, wszystkie zadania są w backlogu i można rozpocząć cykl', async () => {
    const { calls } = setup({
      instances: [NO_CYCLE, { ...NO_CYCLE, active_cycle: CYCLE }],
      handlers: { 'POST /api/instances/11/cycles/': { status: 201, body: CYCLE } },
    })
    const user = userEvent.setup()
    renderApp('/kursy/instancje/11')

    await screen.findByRole('heading', { name: CONTENT.title })
    expect(screen.queryByRole('region', { name: 'Tablica cyklu' })).toBeNull()
    expect(screen.queryByRole('button', { name: /dodaj do cyklu/i })).toBeNull()
    for (const title of ['Select', 'Join', 'Okna', 'Indeksy']) expect(within(backlog()).getByText(title)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Rozpocznij cykl' }))

    expect(await screen.findByRole('region', { name: 'Tablica cyklu' })).toBeInTheDocument()
    expect(calls.some((call) => call.method === 'POST' && call.path === '/api/instances/11/cycles/')).toBe(true)
    expect(screen.getByRole('button', { name: 'Zakończ cykl' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: 'Rozpocznij cykl' })).toBeNull()
  })

  it('kończy cykl ręcznie, a historia zachowuje migawkę zadań', async () => {
    const ENDED = {
      ...NO_CYCLE,
      tasks: withTasks(INSTANCE, { 6: { selected: false } }).tasks,
      cycle_history: [{
        ...CYCLE, ended_at: '2026-02-08T10:00:00Z',
        tasks: [{ id: 3, title: 'Select', status: 'done' }, { id: 6, title: 'Indeksy', status: 'in_progress' }],
      }],
    }
    const { calls } = setup({
      instances: [INSTANCE, ENDED],
      handlers: { 'POST /api/instances/11/cycles/5/close/': ok({ ...CYCLE, ended_at: '2026-02-08T10:00:00Z' }) },
    })
    const user = userEvent.setup()
    renderApp('/kursy/instancje/11')

    expect(await screen.findByText(/niedokończone zadania wrócą do backlogu/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Zakończ cykl' }))

    expect(await screen.findByRole('button', { name: 'Rozpocznij cykl' })).toBeInTheDocument()
    expect(calls.some((call) => call.method === 'POST' && call.path === '/api/instances/11/cycles/5/close/')).toBe(true)
    const history = screen.getByRole('region', { name: 'Historia cykli' })
    const entry = within(history).getByRole('listitem', { name: /cykl 1/i })
    expect(within(entry).getByText('Select')).toBeInTheDocument()
    expect(within(entry).getByText('Gotowe')).toBeInTheDocument()
    expect(within(entry).getByText('Indeksy')).toBeInTheDocument()
    expect(within(entry).getByText('W trakcie')).toBeInTheDocument()
    expect(within(backlog()).getByText('Indeksy')).toBeInTheDocument()
  })

  it('pokazuje pustą historię cykli osobno od zadań', async () => {
    setup()
    renderApp('/kursy/instancje/11')
    const history = await screen.findByRole('region', { name: 'Historia cykli' })
    expect(within(history).getByText(/nie zakończono jeszcze żadnego cyklu/i)).toBeInTheDocument()
  })

  it('pokazuje komunikat zwrócony przez serwer przy błędzie rozpoczęcia cyklu', async () => {
    setup({
      instances: [NO_CYCLE],
      handlers: { 'POST /api/instances/11/cycles/': fail(409, { code: 'cycle_active', message: 'Ta instancja ma już aktywny cykl.', detail: 'x' }) },
    })
    const user = userEvent.setup()
    renderApp('/kursy/instancje/11')

    await user.click(await screen.findByRole('button', { name: 'Rozpocznij cykl' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Ta instancja ma już aktywny cykl.')
  })

  it('blokuje kontrolki i pokazuje zajętość podczas zapisu', async () => {
    let finish
    setup({
      handlers: { 'PATCH /api/instances/11/tasks/4/': () => new Promise((resolve) => { finish = () => resolve(fail(409, { code: 'task_blocked', message: 'Zadanie ma niedokończone wymagania.' })) }) },
    })
    const user = userEvent.setup()
    renderApp('/kursy/instancje/11')

    await user.click(await screen.findByRole('button', { name: 'Dodaj do cyklu: Join' }))

    expect(screen.getByText(/zapisywanie zmian/i)).toHaveAttribute('role', 'status')
    expect(screen.getByRole('button', { name: 'Zakończ cykl' })).toBeDisabled()
    expect(screen.getByLabelText('Zmień status: Indeksy')).toBeDisabled()
    finish()
    expect(await screen.findByRole('alert')).toHaveTextContent('Zadanie ma niedokończone wymagania.')
    expect(screen.getByRole('button', { name: 'Zakończ cykl' })).toBeEnabled()
  })

  it('pokazuje pusty stan instancji bez zadań', async () => {
    setup({ instances: [{ ...INSTANCE, tasks: [] }] })
    renderApp('/kursy/instancje/11')
    expect(await screen.findByText(/brak zadań w tej instancji/i)).toBeInTheDocument()
  })
})

describe('uprawnienia i zakończenie kursu', () => {
  const WITH_MENTOR = { ...INSTANCE, mentor: MENTOR.id }

  it('uczeń z przypisanym mentorem sam wybiera zadania, zmienia statusy i cykl', async () => {
    setup({ instances: [WITH_MENTOR] })
    renderApp('/kursy/instancje/11')

    expect(await screen.findByRole('button', { name: 'Dodaj do cyklu: Join' })).toBeEnabled()
    expect(screen.getByLabelText('Zmień status: Indeksy')).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Zakończ cykl' })).toBeEnabled()
    expect(screen.getByRole('button', { name: /zamknij instancję/i })).toBeEnabled()
    expect(screen.queryByText(/tylko do odczytu/i)).toBeNull()
  })

  it('przypisany mentor zachowuje prawa do zarządzania tablicą', async () => {
    setup({ user: MENTOR, instances: [WITH_MENTOR] })
    renderApp('/kursy/instancje/11')

    expect(await screen.findByRole('button', { name: 'Dodaj do cyklu: Join' })).toBeEnabled()
    expect(screen.getByRole('button', { name: /zamknij instancję/i })).toBeEnabled()
  })

  it('osoba spoza instancji widzi tablicę tylko do odczytu', async () => {
    setup({ user: ADMIN, instances: [WITH_MENTOR] })
    renderApp('/kursy/instancje/11')

    expect(await screen.findByText(/tylko do odczytu/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Dodaj do cyklu: Join' })).toBeDisabled()
    expect(screen.getByLabelText('Zmień status: Indeksy')).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Zakończ cykl' })).toBeNull()
    expect(screen.queryByRole('button', { name: /zamknij instancję/i })).toBeNull()
  })

  it('uczeń kończy kurs niezależnie od postępu, a historia i wznowienie pozostają dostępne', async () => {
    const CLOSED = {
      ...INSTANCE, progress: 0, status: 'closed', closed_at: '2026-02-03T10:00:00Z', active_cycle: null,
      cycle_history: [{ ...CYCLE, ended_at: '2026-02-03T10:00:00Z', tasks: [{ id: 6, title: 'Indeksy', status: 'in_progress' }] }],
    }
    const { calls } = setup({
      instances: [{ ...INSTANCE, progress: 0 }, CLOSED],
      handlers: { 'POST /api/instances/11/close/': ok({ ...CLOSED, tasks: undefined }) },
    })
    const user = userEvent.setup()
    renderApp('/kursy/instancje/11')

    expect(await screen.findByText(/niezależnie od postępu/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /zamknij instancję/i }))

    expect(await screen.findByRole('button', { name: /wznów instancję/i })).toBeEnabled()
    expect(calls.some((call) => call.path === '/api/instances/11/close/')).toBe(true)
    expect(screen.getByText(/tylko do odczytu/i)).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Tablica cyklu' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Rozpocznij cykl' })).toBeNull()
    expect(within(screen.getByRole('region', { name: 'Historia cykli' })).getByText('Indeksy')).toBeInTheDocument()
  })

  it('wznowienie zamkniętej instancji odświeża dane instancji', async () => {
    const CLOSED = { ...INSTANCE, status: 'closed', closed_at: '2026-02-03T10:00:00Z', active_cycle: null }
    const { calls } = setup({
      instances: [CLOSED, { ...CLOSED, status: 'active', closed_at: null }],
      handlers: { 'POST /api/instances/11/resume/': ok({ ...CLOSED, status: 'active' }) },
    })
    const user = userEvent.setup()
    renderApp('/kursy/instancje/11')

    await user.click(await screen.findByRole('button', { name: /wznów instancję/i }))

    expect(await screen.findByRole('button', { name: 'Rozpocznij cykl' })).toBeEnabled()
    expect(calls.filter((call) => call.method === 'GET' && call.path === '/api/instances/11/')).toHaveLength(2)
  })
})
