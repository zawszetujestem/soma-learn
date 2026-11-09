import { afterEach, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LessonCycleBoard from '../../src/courses/LessonCycleBoard.jsx'
import { ADMIN, INSTANCE_OWN, MENTOR, STUDENT, fail, mockApi, ok, renderApp, resetTestEnv, sessionAs } from './helpers.jsx'
import { BOTH, CONTENT, ROOT, cycle } from './lesson-cycle-fixtures.js'

afterEach(resetTestEnv)
const labels = ['Do zrobienia', 'Do poprawy', 'W trakcie', 'Do sprawdzenia', 'Zakończone']
const progress = (lesson_id, status, revision = 1) => ({ lesson_id, status, revision })
const projection = (items = []) => ({
  ...BOTH, active_cycle: cycle(5, [9, 3, 7], { status: 'active' }), lesson_progress: items,
})
const path = id => `${ROOT}5/lessons/${id}/progress/`
function setup(data = projection(), handlers = {}, props = {}) {
  const api = mockApi({ [`GET ${ROOT}`]: ok(data), ...handlers })
  render(<LessonCycleBoard instanceId={11} content={CONTENT} canEdit refreshKey="active" {...props} />)
  return api
}
const active = () => screen.getByRole('region', { name: 'Aktywny cykl' })
const column = name => within(active()).getByRole('region', { name })
const card = title => within(active()).getByRole('listitem', { name: title })
const selector = title => within(card(title)).getByRole('combobox', { name: `Zmień status: ${title}` })
const patches = calls => calls.filter(c => c.method === 'PATCH')

const previewContent = {
  ...CONTENT, course: 42, nodes: [{
    id: 20, kind: 'topic', title: 'Temat Z', children: [{
      id: 9, kind: 'lesson', title: 'Lekcja Z', children: [],
      theory: [{ id: 1, format: 'markdown', text: '**Teoria lekcji** <script>bad()</script> [zły](javascript:alert)' }],
      practice: [{ id: 2, format: 'text', text: 'Praktyka lekcji', answer_mode: 'keyed', answer_text: 'TAJNY KLUCZ' }],
      test: { questions: [
        { id: 1, type: 'single', text: 'Pytanie pojedyncze', options: [{ id: 1, text: 'Opcja pierwsza', is_correct: true }, { id: 2, text: 'Opcja druga', is_correct: false }] },
        { id: 2, type: 'multiple', text: 'Pytanie wielokrotne', options: [{ id: 3, text: 'Opcja trzecia', is_correct: true }] },
      ] },
    }],
  }],
}
const preview = () => screen.getByRole('dialog', { name: 'Lekcja Z' })
const opener = (scope = active()) => within(scope).getByRole('button', { name: 'Otwórz lekcję: Lekcja Z' })
const locations = ['Aktywny cykl', 'Plan kolejnego cyklu', 'Pozostałe lekcje']
const locatedProjection = location => ({
  ...projection([progress(9, 'done')]),
  active_cycle: cycle(5, location === locations[0] ? [9] : [], { status: 'active' }),
  planned_cycle: cycle(6, location === locations[1] ? [9] : []),
})

it.each([
  ['todo', true], ['done', true], ['done', false], ['in_progress', false],
])('modal %s (canEdit=%s): teoria, praktyka i test bez kluczy, formularzy i mutacji', async (status, canEdit) => {
  const { calls } = setup(projection([progress(9, status)]), {}, { content: previewContent, canEdit })
  await screen.findByRole('region', { name: 'Aktywny cykl' })
  const user = userEvent.setup()
  const trigger = opener()
  await user.click(trigger)
  const details = preview()
  expect(details).toHaveAttribute('aria-modal', 'true')
  expect(within(details).getByText('Teoria lekcji').tagName).toBe('STRONG')
  for (const text of ['Praktyka lekcji', /Pytanie pojedyncze/, /Pytanie wielokrotne/, 'Opcja pierwsza', 'Opcja druga', 'Opcja trzecia']) {
    expect(within(details).getByText(text)).toBeVisible()
  }
  expect(details).toHaveTextContent('jedna odpowiedź')
  expect(details).toHaveTextContent('wiele odpowiedzi')
  expect(details).not.toHaveTextContent(/TAJNY KLUCZ|poprawna|Rozwiązywanie/)
  expect(details.querySelector('form,input,select,textarea,script,iframe,a[href^="javascript"]')).toBeNull()
  await user.click(within(details).getByRole('button', { name: 'Zamknij' }))
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(trigger).toHaveFocus()
  expect(calls.map(c => c.method)).toEqual(['GET'])
})

it.each(locations.flatMap(location => ['click', 'Enter', 'Space', 'tile'].map(mode => [location, mode])))(
  '%s: %s otwiera modal, Escape przywraca fokus, tło jest inert i Tab pozostaje wewnątrz', async (location, mode) => {
    const { calls } = setup(locatedProjection(location), {}, { content: previewContent, canEdit: false })
    const scope = await screen.findByRole('region', { name: location })
    const trigger = opener(scope)
    expect(trigger.tagName).toBe('BUTTON')
    const user = userEvent.setup()
    if (mode === 'click') await user.click(trigger)
    else if (mode === 'tile') await user.click(within(scope).getByRole('listitem', { name: 'Lekcja Z' }))
    else {
      trigger.focus()
      await user.keyboard(mode === 'Enter' ? '{Enter}' : ' ')
    }
    const dialog = preview()
    expect(within(dialog).getByText('Teoria lekcji')).toBeVisible()
    expect(within(dialog).getByText('Praktyka lekcji')).toBeVisible()
    expect(within(dialog).getByText('Opcja pierwsza')).toBeVisible()
    expect(dialog).not.toHaveTextContent(/TAJNY KLUCZ|poprawna/)
    const close = within(dialog).getByRole('button', { name: 'Zamknij' })
    expect(close).toHaveFocus()
    expect(scope.closest('[inert]')).not.toBeNull()
    await user.tab()
    expect(close).toHaveFocus()
    await user.tab({ shift: true })
    expect(close).toHaveFocus()
    trigger.focus() // Programmatic focus cannot escape, either.
    expect(close).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(trigger).toHaveFocus()
    expect(scope.closest('[inert]')).toBeNull()
    expect(calls.map(c => c.method)).toEqual(['GET'])
  },
)

it('modal z linkami zapętla fokus w obu kierunkach i izoluje zdarzenia od tablicy', async () => {
  const content = {
    ...previewContent, nodes: [{
      ...previewContent.nodes[0], children: [{
        ...previewContent.nodes[0].children[0],
        theory: [{ id: 1, format: 'markdown', text: '[Materiał](https://example.test/lesson)' }],
      }],
    }],
  }
  const { calls } = setup(projection(), {}, { content })
  await screen.findByRole('region', { name: locations[0] })
  const user = userEvent.setup()
  await user.click(opener())
  const dialog = preview()
  const close = within(dialog).getByRole('button', { name: 'Zamknij' })
  const link = within(dialog).getByRole('link', { name: 'Materiał' })
  await user.tab({ shift: true })
  expect(link).toHaveFocus()
  await user.tab()
  expect(close).toHaveFocus()
  await user.tab()
  expect(link).toHaveFocus()
  await user.tab()
  expect(close).toHaveFocus()
  const dataTransfer = { getData: () => '9' }
  expect(fireEvent.dragStart(link, { dataTransfer })).toBe(false)
  fireEvent.drop(dialog, { dataTransfer })
  expect(calls.map(c => c.method)).toEqual(['GET'])
  await user.click(close)
  expect(screen.queryByRole('dialog')).toBeNull()
})

it('zmiana selecta statusu zapisuje wyłącznie status i nie otwiera modala', async () => {
  const { calls } = setup(projection(), {
    [`PATCH ${path(9)}`]: ok(projection([progress(9, 'in_progress')])),
  })
  await screen.findByRole('region', { name: locations[0] })
  await userEvent.setup().selectOptions(selector('Lekcja Z'), 'in_progress')
  await waitFor(() => expect(selector('Lekcja Z')).toHaveValue('in_progress'))
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(patches(calls)).toHaveLength(1)
})

it('podgląd pustej lekcji pokazuje stan pusty bez zapisu', async () => {
  const { calls } = setup()
  await screen.findByRole('region', { name: 'Do zrobienia' })
  await userEvent.setup().click(opener())
  expect(within(preview()).getByText('Brak materiałów w tej lekcji.')).toBeVisible()
  expect(patches(calls)).toHaveLength(0)
})

it('załącznik pobiera leniwie z przypiętej wersji, pokazuje ładowanie, błąd i retry bez PATCH', async () => {
  let release
  const content = {
    ...previewContent, nodes: [{
      ...previewContent.nodes[0], children: [{
        ...previewContent.nodes[0].children[0],
        theory: [{ id: 1, format: 'pdf', asset: { id: 'private-file' } }],
      }],
    }],
  }
  const assetPath = '/api/courses/42/versions/2/assets/private-file/download/'
  const { calls } = setup(projection(), {
    [`GET ${assetPath}`]: () => new Promise(resolve => { release = resolve }),
  }, { content })
  await screen.findByRole('region', { name: 'Do zrobienia' })
  expect(calls).toHaveLength(1)
  await userEvent.setup().click(opener())
  expect(within(preview()).getByText('Ładowanie załącznika…')).toBeVisible()
  await waitFor(() => expect(calls.filter(c => c.path === assetPath)).toHaveLength(1))
  release(fail(403, { message: 'Załącznik niedostępny.' }))
  expect(await within(preview()).findByRole('alert')).toHaveTextContent('Załącznik niedostępny.')
  await userEvent.setup().click(within(preview()).getByRole('button', { name: 'Spróbuj ponownie' }))
  await waitFor(() => expect(calls.filter(c => c.path === assetPath)).toHaveLength(2))
  release(fail(503, { message: 'Spróbuj później.' }))
  expect(await within(preview()).findByRole('alert')).toHaveTextContent('Spróbuj później.')
  expect(patches(calls)).toHaveLength(0)
})

it('select nie otwiera modala ani nie rozpoczyna drag/drop, a drag karty nie otwiera modala', async () => {
  const { calls } = setup(projection(), {
    [`PATCH ${path(9)}`]: ok(projection([progress(9, 'in_progress')])),
  }, { content: previewContent })
  await screen.findByRole('region', { name: 'Do zrobienia' })
  const store = {}
  const dataTransfer = { setData: (key, value) => { store[key] = value }, getData: key => store[key] || '' }
  await userEvent.setup().click(selector('Lekcja Z'))
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(fireEvent.dragStart(selector('Lekcja Z'), { dataTransfer })).toBe(false)
  expect(store).toEqual({})
  fireEvent.dragStart(card('Lekcja Z'), { dataTransfer })
  fireEvent.dragEnd(card('Lekcja Z'), { dataTransfer })
  fireEvent.click(opener())
  expect(screen.queryByRole('dialog')).toBeNull()
  fireEvent.drop(column('W trakcie'), { dataTransfer })
  await waitFor(() => expect(patches(calls)).toHaveLength(1))
  expect(screen.queryByRole('dialog')).toBeNull()
})

it.each(['Usuń z planu', 'Dodaj do planu'])('%s pozostaje niezależną akcją; drag plan/backlog nie otwiera modala', async action => {
  const removing = action === 'Usuń z planu'
  const before = locatedProjection(removing ? locations[1] : locations[2])
  const after = locatedProjection(removing ? locations[2] : locations[1])
  const method = removing ? 'DELETE' : 'POST'
  const url = `${ROOT}6/lessons/${removing ? '9/' : ''}`
  const { calls } = setup(before, { [`${method} ${url}`]: ok(after) }, { content: previewContent })
  const scope = await screen.findByRole('region', { name: removing ? locations[1] : locations[2] })
  const item = within(scope).getByRole('listitem', { name: 'Lekcja Z' })
  const actionButton = within(item).getByRole('button', { name: `${action}: Lekcja Z` })
  const store = {}
  const dataTransfer = { setData: (key, value) => { store[key] = value }, getData: key => store[key] || '' }
  expect(fireEvent.dragStart(actionButton, { dataTransfer })).toBe(false)
  expect(store).toEqual({})
  fireEvent.dragStart(item, { dataTransfer })
  expect(store['application/x-soma-lesson-id']).toBe('9')
  fireEvent.dragEnd(item, { dataTransfer })
  fireEvent.click(opener(scope))
  expect(screen.queryByRole('dialog')).toBeNull()
  // A fresh user click on the independent action must still work after a drag.
  await userEvent.setup().click(actionButton)
  await waitFor(() => expect(calls.filter(c => c.method !== 'GET')).toHaveLength(1))
  expect(calls.find(c => c.method !== 'GET')).toMatchObject({ method, path: url })
  expect(screen.queryByRole('dialog')).toBeNull()
})

it.each([locations[1], locations[2]])('%s: drop zachowuje planowanie, bez otwierania modala', async location => {
  const removing = location === locations[1]
  const before = locatedProjection(location)
  const after = locatedProjection(removing ? locations[2] : locations[1])
  const method = removing ? 'DELETE' : 'POST'
  const url = `${ROOT}6/lessons/${removing ? '9/' : ''}`
  const { calls } = setup(before, { [`${method} ${url}`]: ok(after) }, { content: previewContent })
  const scope = await screen.findByRole('region', { name: location })
  const item = within(scope).getByRole('listitem', { name: 'Lekcja Z' })
  const store = {}
  const dataTransfer = { setData: (key, value) => { store[key] = value }, getData: key => store[key] || '' }
  fireEvent.dragStart(item, { dataTransfer })
  fireEvent.drop(screen.getByRole('region', { name: removing ? locations[2] : locations[1] }), { dataTransfer })
  await waitFor(() => expect(calls.filter(c => c.method !== 'GET')).toHaveLength(1))
  expect(screen.queryByRole('dialog')).toBeNull()
})

it('gest przeciągania na przycisku treści nie wywołuje click/open; kolejna aktywacja klawiaturą działa', async () => {
  vi.stubGlobal('PointerEvent', MouseEvent)
  setup()
  await screen.findByRole('region', { name: locations[0] })
  const trigger = opener()
  fireEvent.pointerDown(trigger, { clientX: 10, clientY: 10 })
  fireEvent.pointerMove(trigger, { clientX: 40, clientY: 10 })
  fireEvent.pointerUp(trigger, { clientX: 40, clientY: 10 })
  fireEvent.click(trigger)
  expect(screen.queryByRole('dialog')).toBeNull()
  trigger.focus()
  await userEvent.setup().keyboard('{Enter}')
  expect(preview()).toBeVisible()
})

it.each(['select', 'drag/drop'])('in_progress→todo przez %s używa CAS i zwalnia globalny lock', async method => {
  const { calls } = setup(projection([progress(9, 'in_progress', 6)]), {
    [`PATCH ${path(9)}`]: ok(projection([progress(9, 'todo', 7)])),
  })
  await screen.findByRole('region', { name: 'W trakcie' })
  expect(selector('Lekcja A')).toBeDisabled()
  if (method === 'select') {
    await userEvent.setup().selectOptions(selector('Lekcja Z'), 'todo')
  } else {
    const store = {}
    const dataTransfer = { setData: (key, value) => { store[key] = value }, getData: key => store[key] || '' }
    fireEvent.dragStart(card('Lekcja Z'), { dataTransfer })
    fireEvent.drop(column('Do zrobienia'), { dataTransfer })
  }
  await waitFor(() => expect(selector('Lekcja A')).toBeEnabled())
  expect(within(column('Do zrobienia')).getByText('Lekcja Z')).toBeInTheDocument()
  expect(patches(calls).map(c => c.body)).toEqual([{ status: 'todo', expected_status: 'in_progress', expected_revision: 6 }])
})

it('konflikt cofnięcia do todo odświeża bez replay i utrzymuje globalny lock', async () => {
  let gets = 0
  const { calls } = setup(projection([progress(9, 'in_progress', 6)]), {
    [`GET ${ROOT}`]: () => ok(projection([progress(9, 'in_progress', gets++ ? 8 : 6)])),
    [`PATCH ${path(9)}`]: fail(409, { code: 'invalid_lesson_transition', message: 'Ta zmiana nie jest dozwolona.' }),
  })
  await screen.findByRole('region', { name: 'W trakcie' })
  await userEvent.setup().selectOptions(selector('Lekcja Z'), 'todo')
  expect(await screen.findByRole('alert')).toHaveTextContent('Ta zmiana nie jest dozwolona.')
  await waitFor(() => expect(gets).toBe(2))
  expect(selector('Lekcja A')).toBeDisabled()
  expect(selector('Lekcja Z')).toHaveValue('in_progress')
  expect(patches(calls)).toHaveLength(1)
})

it('pokazuje pięć kolumn w kolejności, tylko selected, tematy i domyślne todo/revision=0', async () => {
  const { calls } = setup(projection(), { [`PATCH ${path(3)}`]: ok(projection([progress(3, 'in_progress')])) })
  await screen.findByRole('region', { name: labels[0] })
  expect(within(active()).getAllByRole('region').filter(r => labels.includes(r.getAttribute('aria-label'))).map(r => r.getAttribute('aria-label'))).toEqual(labels)
  expect(within(column('Do zrobienia')).getAllByRole('listitem').map(li => li.getAttribute('aria-label'))).toEqual(['Lekcja Z', 'Lekcja A', 'Lekcja B'])
  expect(within(active()).queryByText('Lekcja C')).toBeNull()
  expect(within(active()).queryByText('Temat B')).toBeNull()
  expect(within(active()).getByRole('region', { name: 'Podsumowanie tematów' })).toHaveTextContent('Do zrobienia: 2')
  await userEvent.setup().selectOptions(selector('Lekcja A'), 'in_progress')
  await waitFor(() => expect(patches(calls)).toHaveLength(1))
  expect(patches(calls)[0].body).toEqual({ status: 'in_progress', expected_status: 'todo', expected_revision: 0 })
  expect(await screen.findByRole('status')).toHaveTextContent('Zapisano status lekcji.')
})

it('wylicza status tematów z całej selekcji: all-done, in_progress lub summary review/revision/todo; ukrywa pusty', async () => {
  const view = setup(projection([progress(9, 'review'), progress(3, 'revision'), progress(7, 'done')]))
  const summaries = await screen.findByRole('region', { name: 'Podsumowanie tematów' })
  expect(summaries).toHaveTextContent('Do sprawdzenia: 1')
  expect(summaries).toHaveTextContent('Do poprawy: 1')
  expect(summaries).toHaveTextContent('Do zrobienia: 0')
  expect(summaries).toHaveTextContent('Ukończony')
  expect(within(summaries).queryByText('Temat B')).toBeNull()
  expect(view.calls).toHaveLength(1)
})

it('klawiaturą zgłasza review, zwalnia globalny lock, rozpoczyna dowolną następną i zachowuje terminalne done z serwera', async () => {
  const start = projection([progress(9, 'in_progress', 3), progress(7, 'done', 8)])
  const submitted = projection([progress(9, 'review', 4), progress(7, 'done', 8)])
  const next = projection([progress(9, 'review', 4), progress(3, 'in_progress', 1), progress(7, 'done', 8)])
  const finished = projection([progress(9, 'done', 5), progress(3, 'in_progress', 1), progress(7, 'done', 8)])
  const { calls } = setup(start, {
    [`PATCH ${path(9)}`]: options => ok(JSON.parse(options.body).status === 'review' ? submitted : finished),
    [`PATCH ${path(3)}`]: ok(next),
  })
  await screen.findByRole('region', { name: 'W trakcie' })
  expect(selector('Lekcja A')).toBeDisabled()
  expect(screen.getByRole('region', { name: 'Podsumowanie tematów' })).toHaveTextContent('W trakcie')
  const user = userEvent.setup()
  selector('Lekcja Z').focus()
  await user.selectOptions(selector('Lekcja Z'), 'review')
  await waitFor(() => expect(selector('Lekcja A')).toBeEnabled())
  expect(selector('Lekcja Z')).toHaveFocus()
  await user.selectOptions(selector('Lekcja A'), 'in_progress')
  await waitFor(() => expect(within(column('W trakcie')).getByText('Lekcja A')).toBeInTheDocument())
  await user.selectOptions(selector('Lekcja Z'), 'done')
  await waitFor(() => expect(within(column('Zakończone')).getAllByRole('listitem')).toHaveLength(2))
  expect(within(card('Lekcja Z')).queryByRole('combobox')).toBeNull()
  expect(card('Lekcja Z')).toHaveFocus()
  expect(patches(calls).map(c => c.body)).toEqual([
    { status: 'review', expected_status: 'in_progress', expected_revision: 3 },
    { status: 'in_progress', expected_status: 'todo', expected_revision: 0 },
    { status: 'done', expected_status: 'review', expected_revision: 4 },
  ])
})

it('native drag/drop pozwala tylko na legalne przejścia i nie przywraca done', async () => {
  const data = projection([progress(9, 'revision', 2), progress(7, 'done')])
  const { calls } = setup(data, { [`PATCH ${path(9)}`]: ok(projection([progress(9, 'in_progress', 3), progress(7, 'done')])) })
  await screen.findByRole('region', { name: 'Do poprawy' })
  const store = {}
  const dataTransfer = { setData: (key, value) => { store[key] = value }, getData: key => store[key] || '' }
  fireEvent.dragStart(card('Lekcja Z'), { dataTransfer })
  fireEvent.drop(column('Zakończone'), { dataTransfer })
  expect(patches(calls)).toHaveLength(0)
  fireEvent.dragOver(column('W trakcie'), { dataTransfer })
  fireEvent.drop(column('W trakcie'), { dataTransfer })
  await waitFor(() => expect(within(column('W trakcie')).getByText('Lekcja Z')).toBeInTheDocument())
  expect(patches(calls)).toHaveLength(1)
  expect(card('Lekcja B')).toHaveAttribute('draggable', 'false')
})

it('blokuje start także gdy globalne in_progress leży poza aktywną selekcją', async () => {
  const { calls } = setup(projection([progress(888, 'in_progress', 4)]))
  await screen.findByRole('region', { name: 'Do zrobienia' })
  expect(within(active()).getByText(/poza aktywnym cyklem/i)).toBeInTheDocument()
  expect(selector('Lekcja Z')).toBeDisabled()
  fireEvent.change(selector('Lekcja Z'), { target: { value: 'in_progress' } })
  expect(patches(calls)).toHaveLength(0)
})

it.each(['stale_lesson_progress', 'invalid_lesson_transition', 'lesson_in_progress_exists', 'lesson_cycle_not_active', 'instance_closed'])(
  '409 %s: wyświetla bezpieczne message, odświeża projekcję bez replay', async code => {
    let gets = 0
    const refreshed = projection([progress(9, 'done', 9)])
    const { calls } = setup(projection([progress(9, 'review', 3)]), {
      [`GET ${ROOT}`]: () => ok(gets++ ? refreshed : projection([progress(9, 'review', 3)])),
      [`PATCH ${path(9)}`]: fail(409, { code, message: 'Stan zmieniony. <b>Odśwież</b> tablicę.' }),
    })
    await screen.findByRole('region', { name: 'Do sprawdzenia' })
    await userEvent.setup().selectOptions(selector('Lekcja Z'), 'done')
    expect(await screen.findByRole('alert')).toHaveTextContent('Stan zmieniony. <b>Odśwież</b> tablicę.')
    await waitFor(() => expect(within(column('Zakończone')).getByText('Lekcja Z')).toBeInTheDocument())
    expect(patches(calls)).toHaveLength(1)
    expect(calls.filter(c => c.method === 'GET')).toHaveLength(2)
    expect(screen.getByRole('alert').querySelector('b')).toBeNull()
  },
)

it('pending blokuje wszystkie aktualizacje i ogłasza zapis; błąd nie zmienia kart', async () => {
  let release
  const { calls } = setup(projection(), {
    [`PATCH ${path(9)}`]: () => new Promise(resolve => { release = resolve }),
  })
  await screen.findByRole('region', { name: 'Do zrobienia' })
  await userEvent.setup().selectOptions(selector('Lekcja Z'), 'in_progress')
  expect(selector('Lekcja A')).toBeDisabled()
  expect(screen.getByText('Zapisywanie cyklu lekcji…')).toHaveAttribute('role', 'status')
  fireEvent.change(selector('Lekcja A'), { target: { value: 'in_progress' } })
  expect(patches(calls)).toHaveLength(1)
  release(fail(500, { message: 'Spróbuj później.' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Spróbuj później.')
  expect(within(column('Do zrobienia')).getAllByRole('listitem')).toHaveLength(3)
})

it.each([STUDENT, MENTOR])('ta sama trasa dla przypisanego użytkownika $id; test pozostaje treścią i review ma ręczne revision/done', async user => {
  const content = { ...CONTENT, nodes: [{ id: 20, kind: 'topic', title: 'Temat Z', children: [
    { id: 9, kind: 'lesson', title: 'Lekcja Z', children: [], test: { questions: [{ type: 'single', text: 'Pytanie testowe', options: [{ text: 'Opcja A' }] }] } },
  ] }] }
  mockApi({
    ...sessionAs(user), 'GET /api/instances/11/': ok({ ...INSTANCE_OWN, mentor: MENTOR.id }),
    'GET /api/instances/11/content/': ok(content), [`GET ${ROOT}`]: ok(projection([progress(9, 'review')])),
    [`PATCH ${path(9)}`]: ok(projection([progress(9, 'revision', 2)])),
  })
  renderApp('/kursy/instancje/11')
  await screen.findByRole('region', { name: 'Do sprawdzenia' })
  const contentRegion = within(screen.getByRole('region', { name: 'Treść wersji' }))
  await userEvent.setup().click(contentRegion.getByRole('button', { name: 'Lekcja: Lekcja Z' }))
  expect(contentRegion.getByText(/Pytanie testowe/)).toBeVisible()
  expect(within(active()).getByText(/ręcznie/i)).toBeInTheDocument()
  expect(within(selector('Lekcja Z')).getAllByRole('option').map(o => o.value)).toEqual(['review', 'revision', 'done'])
  await userEvent.setup().selectOptions(selector('Lekcja Z'), 'revision')
  await waitFor(() => expect(within(column('Do poprawy')).getByText('Lekcja Z')).toBeInTheDocument())
})

it.each(['closed', 'unassigned'])('read-only: %s nie wysyła statusów ani drag/drop', async mode => {
  const user = mode === 'closed' ? STUDENT : ADMIN
  const { calls } = mockApi({
    ...sessionAs(user),
    'GET /api/instances/11/': ok({ ...INSTANCE_OWN, status: mode === 'closed' ? 'closed' : 'active' }),
    'GET /api/instances/11/content/': ok(CONTENT), [`GET ${ROOT}`]: ok(projection()),
  })
  renderApp('/kursy/instancje/11')
  await screen.findByRole('region', { name: 'Do zrobienia' })
  expect(within(active()).queryByRole('combobox')).toBeNull()
  expect(card('Lekcja Z')).toHaveAttribute('draggable', 'false')
  fireEvent.drop(column('W trakcie'), { dataTransfer: { getData: () => '9' } })
  expect(patches(calls)).toHaveLength(0)
})

it('pusta aktywna selekcja nie pokazuje pustych tematów', async () => {
  setup({ ...projection(), active_cycle: cycle(5, [], { status: 'active' }) })
  expect(await screen.findByText('Cykl nie zawiera lekcji.')).toBeInTheDocument()
  expect(within(active()).queryByRole('region', { name: 'Podsumowanie tematów' })).toBeNull()
})

it('done z wcześniejszego cyklu pozostaje terminalne po wczytaniu nowego cyklu z tą samą lekcją', async () => {
  const { calls } = setup({
    ...projection([progress(9, 'done', 12), progress(3, 'done', 4)]),
    active_cycle: cycle(15, [9, 3], { status: 'active' }),
  })
  await screen.findByRole('region', { name: 'Zakończone' })
  expect(within(column('Zakończone')).getAllByRole('listitem')).toHaveLength(2)
  expect(within(active()).queryByRole('combobox')).toBeNull()
  expect(screen.getByRole('region', { name: 'Podsumowanie tematów' })).toHaveTextContent('Ukończony')
  fireEvent.drop(column('W trakcie'), { dataTransfer: { getData: () => '9' } })
  expect(patches(calls)).toHaveLength(0)
})

it('nieudane odświeżenie po konflikcie blokuje zapis do udanego GET; retry nie powtarza PATCH', async () => {
  let gets = 0
  const { calls } = setup(projection([progress(9, 'review', 3)]), {
    [`GET ${ROOT}`]: () => {
      gets += 1
      return gets === 2 ? fail(503, { message: 'Projekcja niedostępna.' }) : ok(projection([progress(9, 'review', gets === 1 ? 3 : 7)]))
    },
    [`PATCH ${path(9)}`]: fail(409, { code: 'stale_lesson_progress', message: 'Nieaktualna wersja.' }),
  })
  await screen.findByRole('region', { name: 'Do sprawdzenia' })
  const user = userEvent.setup()
  await user.selectOptions(selector('Lekcja Z'), 'done')
  expect(await screen.findByText(/Projekcja niedostępna/)).toBeInTheDocument()
  expect(selector('Lekcja Z')).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Zakończ cykl lekcji' })).toBeDisabled()
  await user.click(screen.getByRole('button', { name: 'Spróbuj ponownie' }))
  await waitFor(() => expect(selector('Lekcja Z')).toBeEnabled())
  expect(gets).toBe(3)
  expect(patches(calls)).toHaveLength(1)
  expect(screen.queryByText(/Projekcja niedostępna/)).toBeNull()
})

it('po sukcesie zastępuje całą projekcję serwerową, także selekcję i plan, nie scala starego stanu', async () => {
  const authoritative = {
    ...projection([progress(9, 'review', 4), progress(8, 'done', 9)]),
    active_cycle: cycle(5, [9, 8], { status: 'active' }),
    planned_cycle: cycle(6, [7]),
  }
  setup(projection([progress(9, 'in_progress', 3)]), { [`PATCH ${path(9)}`]: ok(authoritative) })
  await screen.findByRole('region', { name: 'W trakcie' })
  await userEvent.setup().selectOptions(selector('Lekcja Z'), 'review')
  await waitFor(() => expect(within(column('Zakończone')).getByText('Lekcja C')).toBeInTheDocument())
  expect(within(active()).queryByText('Lekcja A')).toBeNull()
  expect(within(active()).queryByText('Lekcja B')).toBeNull()
  expect(within(screen.getByRole('region', { name: 'Plan kolejnego cyklu' })).getByText('Lekcja B')).toBeInTheDocument()
})
