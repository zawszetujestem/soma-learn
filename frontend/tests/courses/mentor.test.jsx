import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  COURSE_PUBLIC, MENTOR, currentPath, created, fail, mockApi, ok, renderApp, resetTestEnv, sessionAs,
} from './helpers.jsx'

import { editorApi, version, manage, editorPath } from './version-fixtures.jsx'

afterEach(resetTestEnv)

const MINE_COURSE = { ...COURSE_PUBLIC, id: 5, title: 'Analiza danych', visibility: 'private', approval_status: 'approved', invite_token: 'tok123', owner: MENTOR.id }
const PENDING_COURSE = { ...COURSE_PUBLIC, id: 6, title: 'Kurs czekający', approval_status: 'pending', owner: MENTOR.id }
const INACTIVE_COURSE = { ...COURSE_PUBLIC, id: 7, title: 'Stary kurs', is_active: false, approval_status: 'approved', owner: MENTOR.id }
const REJECTED_COURSE = { ...COURSE_PUBLIC, id: 8, title: 'Kurs bez akceptacji', approval_status: 'rejected', owner: MENTOR.id }

describe('moje kursy mentora (AC-18)', () => {
  it('pokazuje statusy kursów i przycisk nowego kursu', async () => {
    mockApi({
      ...sessionAs(MENTOR),
      'GET /api/courses/mine/': ok([PENDING_COURSE, INACTIVE_COURSE, REJECTED_COURSE]),
    })

    renderApp('/kursy/moje')

    expect(await screen.findByRole('heading', { name: /moje kursy/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /nowy kurs/i })).toHaveAttribute('href', '/kursy/moje/nowy')
    expect(await screen.findByText(/oczekuje na zatwierdzenie/i)).toBeInTheDocument()
    expect(screen.getByText(/odrzucony/i)).toBeInTheDocument()
    expect(screen.getByText(/nieaktywny/i)).toBeInTheDocument()
  })

  it('pokazuje pusty stan osobno od błędu', async () => {
    mockApi({ ...sessionAs(MENTOR), 'GET /api/courses/mine/': ok([]) })

    renderApp('/kursy/moje')

    expect(await screen.findByText(/nie masz jeszcze kursów/i)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('pokazuje błąd 5xx z możliwością ponowienia', async () => {
    let attempts = 0
    mockApi({
      ...sessionAs(MENTOR),
      'GET /api/courses/mine/': () => {
        attempts += 1
        return attempts === 1 ? fail(500, {}) : ok([PENDING_COURSE])
      },
    })
    const user = userEvent.setup()

    renderApp('/kursy/moje')

    expect(await screen.findByRole('alert')).toHaveTextContent(/nie udało się wczytać/i)
    await user.click(screen.getByRole('button', { name: /spróbuj ponownie/i }))
    expect(await screen.findByText(/kurs czekający/i)).toBeInTheDocument()
  })

  it('dezaktywuje aktywny kurs', async () => {
    const { calls } = mockApi({
      ...sessionAs(MENTOR),
      'GET /api/courses/mine/': ok([MINE_COURSE]),
      'PATCH /api/courses/5/': ok({ ...MINE_COURSE, is_active: false }),
    })
    const user = userEvent.setup()

    renderApp('/kursy/moje')

    await user.click(await screen.findByRole('button', { name: /dezaktywuj/i }))

    await waitFor(() => expect(calls.some((call) => call.method === 'PATCH')).toBe(true))
    expect(calls.find((call) => call.method === 'PATCH').body).toEqual({ is_active: false })
  })

  it('reaktywuje nieaktywny kurs', async () => {
    const { calls } = mockApi({
      ...sessionAs(MENTOR),
      'GET /api/courses/mine/': ok([INACTIVE_COURSE]),
      'PATCH /api/courses/7/': ok({ ...INACTIVE_COURSE, is_active: true }),
    })
    const user = userEvent.setup()

    renderApp('/kursy/moje')

    await user.click(await screen.findByRole('button', { name: /reaktywuj/i }))

    await waitFor(() => expect(calls.some((call) => call.method === 'PATCH')).toBe(true))
    expect(calls.find((call) => call.method === 'PATCH').body).toEqual({ is_active: true })
  })

  it('otwiera odrzuconą wersję do poprawy zamiast zgłaszać kurs automatycznie', async () => {
    mockApi({...sessionAs(MENTOR), 'GET /api/courses/mine/': ok([{...REJECTED_COURSE, working_version: {...version, state:'rejected'}}])})
    renderApp('/kursy/moje')
    expect(await screen.findByRole('link', {name:'Otwórz wersję roboczą'})).toHaveAttribute('href','/kursy/moje/8/wersje/2/edytuj')
    expect(screen.queryByRole('button',{name:/wyślij ponownie/i})).not.toBeInTheDocument()
  })

})

describe('tworzenie kursu (AC-51)', () => {
  it('pozwala zapisać niekompletny draft bez tytułu', async () => {
    const {calls}=mockApi(editorApi({'POST /api/courses/':created(manage)}))
    renderApp('/kursy/moje/nowy'); const user=userEvent.setup()
    await user.click(await screen.findByRole('button',{name:'Utwórz kurs'}))
    await screen.findByRole('heading',{name:'Edytor wersji'})
    expect(calls.find(c=>c.method==='POST').body.title).toBe('')
  })

  it('pokazuje błąd, gdy tytuł przekracza 200 znaków', async () => {
    const { calls } = mockApi({ ...sessionAs(MENTOR) })
    const user = userEvent.setup()

    renderApp('/kursy/moje/nowy')

    await user.type(await screen.findByLabelText(/tytuł kursu/i), 'a'.repeat(201))
    await user.click(screen.getByRole('button', { name: /utwórz kurs/i }))

    expect(await screen.findByText(/maksymalnie 200 znaków/i)).toBeInTheDocument()
    expect(calls.some((call) => call.method === 'POST')).toBe(false)
  })

  it.each(['public','private'])('kurs %s otwiera edytor draftu bez automatycznego zgłoszenia', async visibility => {
    const {calls}=mockApi(editorApi({'POST /api/courses/':created({...manage,visibility})}))
    const user=userEvent.setup();renderApp('/kursy/moje/nowy')
    await user.type(await screen.findByLabelText(/tytuł kursu/i),'Nowy kurs')
    await user.selectOptions(screen.getByLabelText(/typ kursu/i),visibility)
    await user.click(screen.getByRole('button',{name:'Utwórz kurs'}))
    await screen.findByRole('heading',{name:'Edytor wersji'})
    expect(currentPath()).toBe(editorPath)
    expect(calls.find(c=>c.method==='POST').body).toMatchObject({title:'Nowy kurs',visibility})
    expect(screen.queryByText(/oczekuje na zatwierdzenie/i)).not.toBeInTheDocument()
  })

  it('administrator może tworzyć tylko kursy publiczne', async () => {
    mockApi({ ...sessionAs({ ...MENTOR, id: 3, roles: ['admin'] }) })

    renderApp('/kursy/moje/nowy')

    const select = await screen.findByLabelText(/typ kursu/i)
    const options = within(select).getAllByRole('option').map((option) => option.value)
    expect(options).toEqual(['public'])
  })
})

describe('szczegóły kursu mentora (AC-22, AC-50)', () => {
  const INSTANCES = [
    {
      id: 10, course: 5, student: 21, mentor: MENTOR.id, status: 'active', closed_at: null, progress: 50.0,
      created_at: '2026-01-02T10:00:00Z',
      tasks: [{ id: 1, title: 'Pętle', hours: '2.50', status: 'in_progress', position: 1 }],
    },
    {
      id: 11, course: 5, student: 22, mentor: MENTOR.id, status: 'closed', closed_at: '2026-01-05T10:00:00Z', progress: 0,
      created_at: '2026-01-03T10:00:00Z',
      tasks: [{ id: 1, title: 'Pętle', hours: '2.50', status: 'todo', position: 1 }],
    },
    {
      id: 13, course: 5, student: 23, mentor: 99, status: 'active', closed_at: null, progress: 0,
      created_at: '2026-01-03T10:00:00Z', tasks: [],
    },
  ]

  function setup(overrides = {}) {
    let activeCount = 1
    const handlers = {
      ...sessionAs(MENTOR),
      'GET /api/courses/mine/5/': ok(MINE_COURSE),
      'GET /api/courses/mine/5/students-count/': () => ok({ count: activeCount }),
      'GET /api/instances/': ok(INSTANCES),
      'POST /api/instances/10/close/': () => {
        activeCount = 0
        return ok({ ...INSTANCES[0], status: 'closed', closed_at: '2026-01-06T10:00:00Z' })
      },
      'POST /api/instances/11/resume/': () => {
        activeCount = 2
        return ok({ ...INSTANCES[1], status: 'active', closed_at: null })
      },
      'PATCH /api/instances/10/tasks/1/': ok({ id: 1, title: 'Pętle', hours: '2.50', status: 'done', position: 1 }),
      'PATCH /api/courses/5/': ok({ ...MINE_COURSE, is_active: false }),
      'POST /api/courses/5/tasks/': created({ id: 9, title: 'Joiny', hours: '1.50', position: 2 }),
      'DELETE /api/courses/5/tasks/1/': { status: 204, body: undefined },
      'POST /api/courses/5/regenerate-token/': ok({ ...MINE_COURSE, invite_token: 'new456' }),
      ...overrides,
    }
    return mockApi(handlers)
  }

  it('pokazuje tylko uczniów przypisanych do tego mentora z postępem', async () => {
    setup()

    renderApp('/kursy/moje/5')

    expect(await screen.findByRole('heading', { name: MINE_COURSE.title })).toBeInTheDocument()
    expect(screen.getByText(/uczeń nr 21/i)).toBeInTheDocument()
    expect(screen.getByText(/uczeń nr 22/i)).toBeInTheDocument()
    expect(screen.queryByText(/uczeń nr 23/i)).not.toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument()
  })

  it('pokazuje licznik aktywnych uczniów z endpointu', async () => {
    setup()

    renderApp('/kursy/moje/5')

    expect(await screen.findByText(/aktywni uczniowie: 1/i)).toBeInTheDocument()
  })

  it('zamknięcie instancji odświeża licznik', async () => {
    const { calls } = setup()
    const user = userEvent.setup()

    renderApp('/kursy/moje/5')

    await user.click(await screen.findByRole('button', { name: /zamknij instancję/i }))

    expect(await screen.findByText(/aktywni uczniowie: 0/i)).toBeInTheDocument()
    expect(calls.some((call) => call.method === 'POST' && call.path === '/api/instances/10/close/')).toBe(true)
  })

  it('wznowienie zamkniętej instancji wykonuje żądanie resume', async () => {
    const { calls } = setup()
    const user = userEvent.setup()

    renderApp('/kursy/moje/5')

    await user.click(await screen.findByRole('button', { name: /wznów instancję/i }))

    await waitFor(() => expect(calls.some((call) => call.path === '/api/instances/11/resume/')).toBe(true))
    expect(await screen.findByText(/aktywni uczniowie: 2/i)).toBeInTheDocument()
  })

  it('mentor zmienia status zadania ucznia w tablicy', async () => {
    const { calls } = setup()
    const user = userEvent.setup()

    renderApp('/kursy/moje/5')

    // Pierwszy wiersz to aktywna instancja ucznia 21; druga (zamknięta) ma select wyłączony.
    const [activeStatus] = await screen.findAllByLabelText(/zmień status: pętle/i)
    await user.selectOptions(activeStatus, 'done')

    await waitFor(() => expect(calls.some((call) => call.method === 'PATCH')).toBe(true))
    expect(calls.find((call) => call.method === 'PATCH').body).toEqual({ status: 'done' })
  })

  it('kopiuje link zaproszenia do schowka', async () => {
    setup()
    // userEvent.setup() podmienia navigator.clipboard, więc stub musi być założony po nim.
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })

    renderApp('/kursy/moje/5')

    await user.click(await screen.findByRole('button', { name: /kopiuj link/i }))

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('tok123'))
  })

  it('regeneracja linku wymaga potwierdzenia', async () => {
    const { calls } = setup()
    const user = userEvent.setup()

    renderApp('/kursy/moje/5')

    await user.click(await screen.findByRole('button', { name: /regeneruj link/i }))
    expect(calls.some((call) => call.path === '/api/courses/5/regenerate-token/')).toBe(false)
    await user.click(screen.getByRole('button', { name: /anuluj/i }))
    expect(calls.some((call) => call.path === '/api/courses/5/regenerate-token/')).toBe(false)

    await user.click(screen.getByRole('button', { name: /regeneruj link/i }))
    await user.click(screen.getByRole('button', { name: /potwierdź regenerację/i }))

    await waitFor(() => expect(calls.some((call) => call.path === '/api/courses/5/regenerate-token/')).toBe(true))
    expect(await screen.findByDisplayValue(/new456/)).toBeInTheDocument()
  })

  it('edycja publikacji tworzy osobny draft i nie zmienia tożsamości kursu', async () => {
    const PUBLIC_MINE={...MINE_COURSE,visibility:'public',current_published_version:1,working_version:null}
    const {calls}=setup({'GET /api/courses/mine/5/':ok(PUBLIC_MINE),'POST /api/courses/5/versions/':created(version)})
    const user=userEvent.setup();renderApp('/kursy/moje/5')
    await user.click(await screen.findByRole('button',{name:'Utwórz nową wersję'}))
    await waitFor(()=>expect(currentPath()).toBe('/kursy/moje/5/wersje/2/edytuj'))
    expect(calls.some(c=>c.method==='PATCH'&&c.path==='/api/courses/5/')).toBe(false)
  })

  it('pokazuje link zaproszenia tylko do odczytu', async () => {
    setup()

    renderApp('/kursy/moje/5')

    const input = await screen.findByLabelText(/link zaproszenia/i)
    expect(input).toHaveAttribute('readonly')
    expect(input.value).toContain('tok123')
  })

  it('dodaje zadanie i odrzuca nieprawidłowe godziny', async () => {
    const { calls } = setup()
    const user = userEvent.setup()

    renderApp('/kursy/moje/5')

    await user.type(await screen.findByLabelText(/tytuł zadania/i), 'Joiny')
    await user.type(screen.getByLabelText(/godziny/i), '0')
    await user.click(screen.getByRole('button', { name: /dodaj zadanie/i }))
    expect(await screen.findByText(/godziny muszą być większe od zera/i)).toBeInTheDocument()
    expect(calls.some((call) => call.method === 'POST' && call.path === '/api/courses/5/tasks/')).toBe(false)

    await user.clear(screen.getByLabelText(/godziny/i))
    await user.type(screen.getByLabelText(/godziny/i), '1,5')
    await user.click(screen.getByRole('button', { name: /dodaj zadanie/i }))

    await waitFor(() => expect(calls.some((call) => call.path === '/api/courses/5/tasks/')).toBe(true))
    expect(calls.find((call) => call.path === '/api/courses/5/tasks/').body).toEqual({ title: 'Joiny', hours: '1.5' })
  })

  it('usuwa zadanie kursu', async () => {
    const { calls } = setup()
    const user = userEvent.setup()

    renderApp('/kursy/moje/5')

    await user.click(await screen.findByRole('button', { name: /usuń zadanie: pętle/i }))

    await waitFor(() => expect(calls.some((call) => call.method === 'DELETE')).toBe(true))
  })

  it('pokazuje komunikat błędu serwera przy zamykaniu instancji', async () => {
    setup({ 'POST /api/instances/10/close/': fail(500, {}) })
    const user = userEvent.setup()

    renderApp('/kursy/moje/5')

    await user.click(await screen.findByRole('button', { name: /zamknij instancję/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/błąd serwera/i)
  })
})
