import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LessonCycleBoard, { addCalendarDays, displayCycleDates } from '../../src/courses/LessonCycleBoard.jsx'
import { fail, mockApi, ok, resetTestEnv } from './helpers.jsx'
import { BOTH, CONTENT, EMPTY, PLANNED, ROOT, cycle } from './lesson-cycle-fixtures.js'

afterEach(() => { vi.useRealTimers(); resetTestEnv() })
function setup(projection = BOTH, handlers = {}, props = {}) {
  const api = mockApi({ [`GET ${ROOT}`]: ok(projection), ...handlers })
  render(<LessonCycleBoard instanceId={11} content={CONTENT} canEdit refreshKey="active" {...props} />)
  return api
}
const region = name => screen.getByRole('region', { name })
const mutations = calls => calls.filter(c => c.method !== 'GET')

describe('cykle lekcji', () => {
  it('mapuje tylko lekcje, zachowuje kolejność drzewa i grupuje backlog w działy/tematy', async () => {
    setup({ ...BOTH, active_cycle: cycle(5, [3, 9], { status: 'active' }), planned_cycle: cycle(6) })
    await screen.findByText('Lekcja Z')
    expect(within(region('Aktywny cykl')).getAllByRole('listitem').map(li => li.getAttribute('aria-label'))).toEqual(['Lekcja Z', 'Lekcja A'])
    const backlog = within(region('Pozostałe lekcje'))
    expect(backlog.getAllByRole('heading').map(h => h.textContent)).toEqual(['Pozostałe lekcje', 'Dział B', 'Temat A', 'Dział A', 'Temat B'])
    expect(backlog.queryByText('Lekcja Z')).toBeNull()
    expect(within(region('Plan kolejnego cyklu')).getByText(/plan nie zawiera lekcji/i)).toBeInTheDocument()
  })

  it('daty date-only pokazuje z exclusive end, bez przesunięć UTC / DST', () => {
    expect(displayCycleDates(cycle(1))).toBe('28.03.2026 – 03.04.2026')
    expect(addCalendarDays('2026-03-28', 7)).toBe('2026-04-04')
    expect(displayCycleDates(cycle(1, [], { start_date: '2026-01-01', end_date: '2026-01-02' }))).toBe('01.01.2026 – 01.01.2026')
    expect(addCalendarDays('2028-02-28', 2)).toBe('2028-03-01')
    expect(addCalendarDays('2026-01-01', -1)).toBe('2025-12-31')
  })

  it.each([
    ['0099-12-31', '0100-01-01', '31.12.0099 – 31.12.0099'],
    ['0001-01-01', '0001-01-02', '01.01.0001 – 01.01.0001'],
    ['0004-02-28', '0004-02-29', '28.02.0004 – 28.02.0004'],
  ])('date-only obsługuje niskie lata: %s', (start, end, display) => {
    expect(addCalendarDays(start, 1)).toBe(end)
    expect(addCalendarDays(end, -1)).toBe(start)
    expect(displayCycleDates(cycle(1, [], { start_date: start, end_date: end }))).toBe(display)
  })

  it.each(['0001-01-01', '0099-12-31'])('formularz przyjmuje jednodniowy zakres w roku %s', async start => {
    const end = start === '0099-12-31' ? '0100-01-01' : '0001-01-02'
    const plan = { ...EMPTY, planned_cycle: cycle(6, [], { start_date: start, end_date: end }) }
    const { calls } = setup(EMPTY, { [`POST ${ROOT}`]: ok(plan) })
    fireEvent.change(await screen.findByLabelText('Początek planu'), { target: { value: start } })
    fireEvent.change(screen.getByLabelText('Ostatni dzień cyklu'), { target: { value: start } })
    await userEvent.setup().click(screen.getByRole('button', { name: 'Utwórz plan' }))
    await screen.findByRole('button', { name: 'Zapisz daty planu' })
    expect(mutations(calls)[0].body).toEqual({ start_date: start, end_date: end })
    expect(screen.getByLabelText('Ostatni dzień cyklu')).toHaveValue(start)
  })

  it('jawnie tworzy plan z domyślnymi 7 dniami i edytowalnymi datami date-only', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 2, 28, 12))
    const { calls } = setup(EMPTY, { [`POST ${ROOT}`]: ok({ ...EMPTY, planned_cycle: cycle(6) }) })
    const user = userEvent.setup()
    const start = await screen.findByLabelText('Początek planu')
    expect(start).toHaveValue('2026-03-28')
    expect(screen.getByLabelText('Ostatni dzień cyklu')).toHaveValue('2026-04-03')
    expect(mutations(calls)).toHaveLength(0)
    expect(screen.queryByRole('button', { name: /dodaj do planu/i })).toBeNull()
    fireEvent.change(start, { target: { value: '2026-04-01' } })
    fireEvent.change(screen.getByLabelText('Ostatni dzień cyklu'), { target: { value: '2026-04-07' } })
    await user.click(screen.getByRole('button', { name: 'Utwórz plan' }))
    await screen.findByRole('button', { name: 'Zapisz daty planu' })
    expect(mutations(calls)).toEqual([expect.objectContaining({ method: 'POST', path: ROOT, body: { start_date: '2026-04-01', end_date: '2026-04-08' } })])
    vi.useRealTimers()
  })

  it('edytuje tylko daty planu przez PATCH i pokazuje ostatnią projekcję', async () => {
    const updated = { ...BOTH, planned_cycle: cycle(6, [3], { start_date: '2026-04-02', end_date: '2026-04-10' }) }
    const { calls } = setup(BOTH, { [`PATCH ${ROOT}6/`]: ok(updated) })
    expect(await screen.findByLabelText('Ostatni dzień cyklu')).toHaveValue('2026-04-03')
    fireEvent.change(screen.getByLabelText('Początek planu'), { target: { value: '2026-04-02' } })
    fireEvent.change(screen.getByLabelText('Ostatni dzień cyklu'), { target: { value: '2026-04-09' } })
    await userEvent.setup().click(screen.getByRole('button', { name: 'Zapisz daty planu' }))
    expect(await screen.findByText('02.04.2026 – 09.04.2026')).toBeInTheDocument()
    expect(screen.getByLabelText('Ostatni dzień cyklu')).toHaveValue('2026-04-09')
    expect(mutations(calls)[0]).toMatchObject({ method: 'PATCH', path: `${ROOT}6/`, body: { start_date: '2026-04-02', end_date: '2026-04-10' } })
    expect(within(region('Aktywny cykl')).queryByRole('textbox')).toBeNull()
  })

  it('waliduje zakres dat przed wysłaniem', async () => {
    const { calls } = setup(EMPTY)
    fireEvent.change(await screen.findByLabelText('Początek planu'), { target: { value: '2026-04-10' } })
    fireEvent.change(screen.getByLabelText('Ostatni dzień cyklu'), { target: { value: '2026-04-09' } })
    await userEvent.setup().click(screen.getByRole('button', { name: 'Utwórz plan' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/ostatni dzień.*wcześniejszy/i)
    expect(mutations(calls)).toHaveLength(0)
  })

  it.each(['create', 'edit'])('jednodniowy zakres jest poprawny (%s), API otrzymuje kolejny dzień', async action => {
    const oneDay = { ...EMPTY, planned_cycle: cycle(6, [], { start_date: '2026-03-29', end_date: '2026-03-30' }) }
    const method = action === 'create' ? 'POST' : 'PATCH'
    const path = action === 'create' ? ROOT : `${ROOT}6/`
    const { calls } = setup(action === 'create' ? EMPTY : oneDay, { [`${method} ${path}`]: ok(oneDay) })
    const start = await screen.findByLabelText('Początek planu')
    if (action === 'edit') expect(screen.getByLabelText('Ostatni dzień cyklu')).toHaveValue('2026-03-29')
    fireEvent.change(start, { target: { value: '2026-03-29' } })
    fireEvent.change(screen.getByLabelText('Ostatni dzień cyklu'), { target: { value: '2026-03-29' } })
    await userEvent.setup().click(screen.getByRole('button', { name: action === 'create' ? 'Utwórz plan' : 'Zapisz daty planu' }))
    expect(await screen.findByText('29.03.2026 – 29.03.2026')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(mutations(calls)[0]).toMatchObject({
      method, path, body: { start_date: '2026-03-29', end_date: '2026-03-30' },
    })
  })

  it('niezmieniony domyślny zakres pokazuje siedem dni i wysyła exclusive end', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 2, 28, 12))
    const { calls } = setup(EMPTY, { [`POST ${ROOT}`]: ok(PLANNED) })
    expect(await screen.findByLabelText('Początek planu')).toHaveValue('2026-03-28')
    expect(screen.getByLabelText('Ostatni dzień cyklu')).toHaveValue('2026-04-03')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Utwórz plan' }))
    await screen.findByRole('button', { name: 'Zapisz daty planu' })
    expect(mutations(calls)[0].body).toEqual({ start_date: '2026-03-28', end_date: '2026-04-04' })
  })

  it.each(['create', 'update', 'start', 'close'])('przywraca fokus po mutacji %s na stabilnym nagłówku', async action => {
    const config = {
      create: [EMPTY, `POST ${ROOT}`, 'Utwórz plan', PLANNED, 'Plan kolejnego cyklu'],
      update: [PLANNED, `PATCH ${ROOT}6/`, 'Zapisz daty planu',
        { ...PLANNED, planned_cycle: cycle(6, [3], { end_date: '2026-04-05' }) }, 'Plan kolejnego cyklu'],
      start: [PLANNED, `POST ${ROOT}6/start/`, 'Rozpocznij cykl lekcji',
        { ...EMPTY, active_cycle: { ...PLANNED.planned_cycle, status: 'active' } }, 'Aktywny cykl'],
      close: [BOTH, `POST ${ROOT}5/close/`, 'Zakończ cykl lekcji', PLANNED, 'Aktywny cykl'],
    }[action]
    setup(config[0], { [config[1]]: ok(config[3]) })
    const user = userEvent.setup()
    const button = await screen.findByRole('button', { name: config[2] })
    if (action === 'update') {
      fireEvent.change(screen.getByLabelText('Ostatni dzień cyklu'), { target: { value: '2026-04-04' } })
    }
    button.focus()
    await user.keyboard('{Enter}')
    await waitFor(() => expect(screen.getByRole('heading', { name: config[4], level: 3 })).toHaveFocus())
  })

  it('button dodaje/usuwa pojedynczą lekcję; aktywny cykl nie jest edytowalny', async () => {
    const added = { ...BOTH, planned_cycle: cycle(6, [3, 7]) }
    const { calls } = setup(BOTH, {
      [`POST ${ROOT}6/lessons/`]: ok(added),
      [`DELETE ${ROOT}6/lessons/7/`]: ok(BOTH),
    })
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Dodaj do planu: Lekcja B' }))
    const remove = await screen.findByRole('button', { name: 'Usuń z planu: Lekcja B' })
    expect(within(region('Pozostałe lekcje')).queryByText('Lekcja B')).toBeNull()
    await user.click(remove)
    expect(await screen.findByRole('button', { name: 'Dodaj do planu: Lekcja B' })).toBeEnabled()
    expect(mutations(calls).map(c => [c.method, c.path, c.body])).toEqual([
      ['POST', `${ROOT}6/lessons/`, { lesson_id: 7 }],
      ['DELETE', `${ROOT}6/lessons/7/`, undefined],
    ])
    expect(within(region('Aktywny cykl')).queryByRole('button', { name: /usuń|dodaj/i })).toBeNull()
  })

  it('DnD backlog ↔ plan ma ten sam kontrakt; obce/aktywne lekcje nie są przenoszone', async () => {
    const { calls } = setup(BOTH, {
      [`POST ${ROOT}6/lessons/`]: ok({ ...BOTH, planned_cycle: cycle(6, [3, 7]) }),
      [`DELETE ${ROOT}6/lessons/7/`]: ok(BOTH),
    })
    await screen.findByText('Lekcja B')
    const store = {}
    const dataTransfer = { setData: (k, v) => { store[k] = v }, getData: k => store[k] || '', effectAllowed: '', dropEffect: '' }
    const card = screen.getByRole('button', { name: 'Dodaj do planu: Lekcja B' }).closest('li')
    expect(card).toHaveAttribute('draggable', 'true')
    fireEvent.dragStart(card, { dataTransfer })
    fireEvent.dragOver(region('Plan kolejnego cyklu'), { dataTransfer })
    fireEvent.drop(region('Plan kolejnego cyklu'), { dataTransfer })
    const planned = (await screen.findByRole('button', { name: 'Usuń z planu: Lekcja B' })).closest('li')
    fireEvent.dragStart(planned, { dataTransfer })
    fireEvent.drop(region('Pozostałe lekcje'), { dataTransfer })
    await screen.findByRole('button', { name: 'Dodaj do planu: Lekcja B' })
    fireEvent.drop(region('Plan kolejnego cyklu'), { dataTransfer: { getData: () => '999' } })
    fireEvent.drop(region('Plan kolejnego cyklu'), { dataTransfer: { getData: () => '9' } })
    expect(mutations(calls)).toHaveLength(2)
  })

  it('klawiatura Enter/Space przenosi lekcję bez DnD i zachowuje fokus na równoważnej akcji', async () => {
    const { calls } = setup(BOTH, {
      [`POST ${ROOT}6/lessons/`]: ok({ ...BOTH, planned_cycle: cycle(6, [3, 7]) }),
      [`DELETE ${ROOT}6/lessons/7/`]: ok(BOTH),
    })
    const user = userEvent.setup()
    const add = await screen.findByRole('button', { name: 'Dodaj do planu: Lekcja B' })
    add.focus()
    await user.keyboard('{Enter}')
    const remove = await screen.findByRole('button', { name: 'Usuń z planu: Lekcja B' })
    await waitFor(() => expect(remove).toHaveFocus())
    await user.keyboard(' ')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Dodaj do planu: Lekcja B' })).toHaveFocus())
    expect(mutations(calls)).toHaveLength(2)
  })

  it('koniec ręczny zachowuje plan, start ręczny, daty nie powodują żadnej automatycznej zmiany', async () => {
    const started = { ...EMPTY, active_cycle: { ...PLANNED.planned_cycle, status: 'active' } }
    const { calls } = setup(BOTH, {
      [`POST ${ROOT}5/close/`]: ok({ ...PLANNED, history: [{ ...BOTH.active_cycle, status: 'closed' }] }),
      [`POST ${ROOT}6/start/`]: ok(started),
    })
    const user = userEvent.setup()
    expect(await screen.findByRole('button', { name: 'Rozpocznij cykl lekcji' })).toBeDisabled()
    expect(mutations(calls)).toHaveLength(0)
    await user.click(screen.getByRole('button', { name: 'Zakończ cykl lekcji' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Rozpocznij cykl lekcji' })).toBeEnabled())
    expect(within(region('Plan kolejnego cyklu')).getByText('Lekcja A')).toBeInTheDocument()
    expect(within(region('Aktywny cykl')).getByText(/brak aktywnego cyklu/i)).toBeInTheDocument()
    expect(mutations(calls)).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: 'Rozpocznij cykl lekcji' }))
    await within(region('Aktywny cykl')).findByText('Lekcja A')
    expect(mutations(calls).map(c => c.path)).toEqual([`${ROOT}5/close/`, `${ROOT}6/start/`])
    expect(within(region('Plan kolejnego cyklu')).getByText(/brak planu/i)).toBeInTheDocument()
  })

  it('loading, błąd GET i retry pozostają osobne od pustych danych', async () => {
    let finish
    let read = 0
    setup(EMPTY, { [`GET ${ROOT}`]: () => read++ === 0
      ? new Promise(resolve => { finish = () => resolve(fail(500, { message: 'Cykle niedostępne.' })) })
      : ok(EMPTY) })
    expect(screen.getByRole('status')).toHaveTextContent(/ładowanie cykli lekcji/i)
    await waitFor(() => expect(finish).toBeTypeOf('function'))
    finish()
    expect(await screen.findByRole('alert')).toHaveTextContent('Cykle niedostępne.')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Spróbuj ponownie' }))
    expect(await screen.findByText(/brak aktywnego cyklu/i)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it.each(['create', 'dates', 'start', 'close', 'add', 'remove'])('mutation %s: błąd serwera zachowuje projekcję', async action => {
    const config = {
      create: [EMPTY, `POST ${ROOT}`, 'Utwórz plan'],
      dates: [BOTH, `PATCH ${ROOT}6/`, 'Zapisz daty planu'],
      start: [PLANNED, `POST ${ROOT}6/start/`, 'Rozpocznij cykl lekcji'],
      close: [BOTH, `POST ${ROOT}5/close/`, 'Zakończ cykl lekcji'],
      add: [BOTH, `POST ${ROOT}6/lessons/`, 'Dodaj do planu: Lekcja B'],
      remove: [BOTH, `DELETE ${ROOT}6/lessons/3/`, 'Usuń z planu: Lekcja A'],
    }[action]
    setup(config[0], { [config[1]]: fail(409, { message: 'Konflikt cyklu lekcji.' }) })
    await userEvent.setup().click(await screen.findByRole('button', { name: config[2] }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Konflikt cyklu lekcji.')
    expect(screen.getByRole('button', { name: config[2] })).toBeEnabled()
    const focusTarget = action === 'add' || action === 'remove'
      ? screen.getByRole('button', { name: config[2] })
      : screen.getByRole('heading', { name: action === 'start' || action === 'close' ? 'Aktywny cykl' : 'Plan kolejnego cyklu', level: 3 })
    await waitFor(() => expect(focusTarget).toHaveFocus())
    expect(within(region('Pozostałe lekcje')).getByText('Lekcja B')).toBeInTheDocument()
  })

  it('podczas zapisu blokuje button, daty i DnD', async () => {
    let finish
    const { calls } = setup(BOTH, { [`POST ${ROOT}6/lessons/`]: () => new Promise(resolve => { finish = () => resolve(ok(BOTH)) }) })
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Dodaj do planu: Lekcja B' }))
    expect(screen.getByRole('status')).toHaveTextContent(/zapisywanie cyklu lekcji/i)
    expect(screen.getByRole('button', { name: 'Zakończ cykl lekcji' })).toBeDisabled()
    expect(screen.getByLabelText('Początek planu')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Dodaj do planu: Lekcja C' }).closest('li')).toHaveAttribute('draggable', 'false')
    fireEvent.drop(region('Plan kolejnego cyklu'), { dataTransfer: { getData: () => '8' } })
    expect(mutations(calls)).toHaveLength(1)
    finish()
    await waitFor(() => expect(screen.getByLabelText('Początek planu')).toBeEnabled())
  })

  it('read-only nie oferuje dat/button/DnD ani nie reaguje na drop', async () => {
    const { calls } = setup(BOTH, {}, { canEdit: false })
    await screen.findByText('Lekcja Z')
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.queryByLabelText('Początek planu')).toBeNull()
    expect(within(region('Pozostałe lekcje')).getAllByRole('listitem')[0]).toHaveAttribute('draggable', 'false')
    fireEvent.drop(region('Plan kolejnego cyklu'), { dataTransfer: { getData: () => '7' } })
    expect(mutations(calls)).toHaveLength(0)
  })

  it('pusta przypięta hierarchia ma komunikat bez CourseTask', async () => {
    setup(EMPTY, {}, { content: { ...CONTENT, nodes: [] } })
    expect(await screen.findByText(/brak lekcji w tej wersji/i)).toBeInTheDocument()
  })

  it('backlog bez pozostałych lekcji ma osobny pusty stan', async () => {
    setup({ ...BOTH, planned_cycle: cycle(6, [3, 7, 8]) })
    expect(await screen.findByText(/wszystkie lekcje są przypisane/i)).toBeInTheDocument()
  })
})
