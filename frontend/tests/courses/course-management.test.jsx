import { afterEach, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ADMIN, MENTOR, mockApi, ok, fail, renderApp, resetTestEnv, sessionAs } from './helpers.jsx'
import { editorApi, editorPath, manage, version, V } from './version-fixtures.jsx'

afterEach(resetTestEnv)
const publishedCourse = { ...manage, versions: [{ ...version, id: 1, number: 1, state: 'published' }, version] }

it('administrator widzi całą listę z etykietą admina i akcjami cudzych kursów', async () => {
  mockApi({ ...sessionAs(ADMIN), 'GET /api/courses/mine/': ok([publishedCourse, { ...manage, id: 4, owner: 9 }]) })
  renderApp('/kursy/moje')
  expect(await screen.findByRole('heading', { name: 'Wszystkie kursy' })).toBeInTheDocument()
  expect(screen.getByText('Panel administratora')).toBeInTheDocument()
  expect(await screen.findAllByRole('button', { name: 'Usuń kurs' })).toHaveLength(2)
  expect(screen.getAllByRole('link', { name: 'Otwórz wersję roboczą' })).toHaveLength(2)
})

it('mentor traci akcje publicznego kursu po dowolnej publikacji, ale zachowuje je dla draftu i prywatnego', async () => {
  mockApi({ ...sessionAs(MENTOR), 'GET /api/courses/mine/': ok([
    publishedCourse, { ...manage, id: 4 }, { ...publishedCourse, id: 5, visibility: 'private' },
  ]) })
  renderApp('/kursy/moje')
  const cards = await screen.findAllByRole('article')
  expect(within(cards[0]).queryByRole('button')).not.toBeInTheDocument()
  expect(within(cards[0]).queryByRole('link', { name: 'Otwórz wersję roboczą' })).not.toBeInTheDocument()
  for (const card of cards.slice(1)) expect(within(card).getByRole('button', { name: 'Usuń kurs' })).toBeInTheDocument()
})

it.each([200, 204])('usuwanie %s wymaga potwierdzenia i aktualizuje listę oraz komunikat', async status => {
  const { calls } = mockApi({
    ...sessionAs(MENTOR), 'GET /api/courses/mine/': ok([manage]),
    'DELETE /api/courses/1/': { status, body: status === 200 ? { ...manage, is_active: false } : undefined },
  })
  renderApp('/kursy/moje')
  const user = userEvent.setup()
  const trigger = await screen.findByRole('button', { name: 'Usuń kurs' })
  await user.click(trigger)
  const dialog = screen.getByRole('alertdialog', { name: 'Usunięcie kursu' })
  expect(dialog).toHaveTextContent('Wersja robocza')
  expect(dialog).toHaveTextContent(/instancjami.*zarchiwizowany/i)
  expect(within(dialog).getByRole('button', { name: 'Anuluj' })).toHaveFocus()
  await user.keyboard('{Escape}')
  expect(trigger).toHaveFocus()
  expect(calls.some(c => c.method === 'DELETE')).toBe(false)
  await user.click(trigger)
  await user.click(screen.getByRole('button', { name: 'Potwierdź usunięcie' }))
  expect(await screen.findByRole('status')).toHaveTextContent(status === 200 ? /zarchiwizowano/i : /trwale usunięto/i)
  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  if (status === 200) {
    expect(screen.getByText('nieaktywny')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reaktywuj' })).toBeInTheDocument()
    expect(trigger).toHaveFocus()
  } else {
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Moje kursy' })).toHaveFocus()
  }
})

it('błąd usuwania zachowuje message/status/code i kurs na liście', async () => {
  mockApi({
    ...sessionAs(MENTOR), 'GET /api/courses/mine/': ok([manage]),
    'DELETE /api/courses/1/': fail(403, { message: 'Kurs został już opublikowany.', code: 'forbidden' }),
  })
  renderApp('/kursy/moje')
  const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: 'Usuń kurs' }))
  await user.click(screen.getByRole('button', { name: 'Potwierdź usunięcie' }))
  const alert = await screen.findByRole('alert')
  expect(alert).toHaveTextContent('Kurs został już opublikowany.')
  expect(alert).toHaveTextContent('403')
  expect(alert).toHaveTextContent('forbidden')
  expect(screen.getByRole('article')).toBeInTheDocument()
})

it('nie traktuje niekompletnej odpowiedzi 200 jako trwałego usunięcia', async () => {
  mockApi({
    ...sessionAs(MENTOR), 'GET /api/courses/mine/': ok([manage]),
    'DELETE /api/courses/1/': ok({}),
  })
  renderApp('/kursy/moje')
  const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: 'Usuń kurs' }))
  await user.click(screen.getByRole('button', { name: 'Potwierdź usunięcie' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(/odpowiedzi/i)
  expect(screen.getByRole('article')).toBeInTheDocument()
  expect(screen.queryByText('Trwale usunięto kurs.')).not.toBeInTheDocument()
})

it('mentor nadal może czytać opublikowaną wersję bez dostępu do mine', async () => {
  const { calls } = mockApi(editorApi({ 'GET /api/courses/mine/1/': fail(404, {}) }, MENTOR, { ...version, state: 'published' }))
  renderApp('/kursy/podglad/1/wersje/2')
  await screen.findByRole('heading', { name: 'Treść wersji 2' })
  expect(calls.some(c => c.path === '/api/courses/mine/1/')).toBe(false)
  expect(screen.queryByRole('link', { name: 'Edytor wersji' })).not.toBeInTheDocument()
})

it('blokuje ponowne usuwanie podczas operacji', async () => {
  let resolve
  const { calls } = mockApi({
    ...sessionAs(MENTOR), 'GET /api/courses/mine/': ok([manage]),
    'DELETE /api/courses/1/': () => new Promise(r => { resolve = r }),
  })
  renderApp('/kursy/moje')
  const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: 'Usuń kurs' }))
  await user.click(screen.getByRole('button', { name: 'Potwierdź usunięcie' }))
  expect(screen.getByRole('button', { name: 'Potwierdź usunięcie' })).toBeDisabled()
  await user.keyboard('{Escape}')
  expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  expect(calls.filter(c => c.method === 'DELETE')).toHaveLength(1)
  resolve({ status: 204 })
  await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
})

it('admin publikuje kolejną wersję cudzego publicznego kursu bezpośrednio i edytuje draft', async () => {
  const { calls } = mockApi(editorApi({
    'GET /api/courses/mine/1/': ok(publishedCourse),
    [`POST ${V}publish/`]: ok({ ...version, state: 'published' }),
  }, ADMIN))
  renderApp(editorPath)
  const user = userEvent.setup()
  const {settings,versionMenu}=await import('./editor-ui.jsx')
  await settings(user)
  expect(await screen.findByRole('button', { name: 'Zapisz draft' })).toBeInTheDocument()
  await versionMenu(user)
  await user.click(screen.getByRole('menuitem', { name: 'Opublikuj' }))
  await screen.findByText('Zapisano zmiany.')
  expect(calls.find(c => c.method === 'POST').path).toBe(`${V}publish/`)
})

it('bezpośredni edytor nie daje mentorowi akcji publicznego kursu z historią publikacji', async () => {
  mockApi(editorApi({ 'GET /api/courses/mine/1/': ok(publishedCourse) }))
  renderApp(editorPath)
  await screen.findByRole('heading', { name: 'Edytor wersji' })
  expect(screen.queryByRole('button', { name: 'Zapisz draft' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Wyślij do akceptacji' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Dodaj dział' })).not.toBeInTheDocument()
})

it('szczegóły publicznego kursu po publikacji nie dają mentorowi akcji kursu ani planu godzinowego', async () => {
  mockApi({
    ...sessionAs(MENTOR), 'GET /api/courses/mine/1/': ok(publishedCourse),
    'GET /api/courses/mine/1/students-count/': ok({ count: 0 }),
    'GET /api/instances/': ok([]),
  })
  renderApp('/kursy/moje/1')
  await screen.findByRole('heading', { name: 'Wersja robocza' })
  expect(screen.queryByRole('button', { name: 'Dezaktywuj' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Dodaj zadanie' })).not.toBeInTheDocument()
  expect(screen.queryByRole('link', { name: 'Otwórz wersję roboczą' })).not.toBeInTheDocument()
})

it('podgląd nie udostępnia mentorowi akcji ani edytora po wcześniejszej publikacji', async () => {
  mockApi(editorApi({ 'GET /api/courses/mine/1/': ok(publishedCourse) }))
  renderApp('/kursy/podglad/1/wersje/2')
  await screen.findByRole('heading', { name: 'Treść wersji 2' })
  expect(screen.queryByRole('button', { name: 'Wyślij do akceptacji' })).not.toBeInTheDocument()
  expect(screen.queryByRole('link', { name: 'Edytor wersji' })).not.toBeInTheDocument()
})

it('katalog kieruje administratora do wszystkich kursów pod istniejącą trasą', async () => {
  mockApi({ ...sessionAs(ADMIN), 'GET /api/courses/': ok([]) })
  renderApp('/kursy')
  expect(await screen.findByRole('link', { name: 'Wszystkie kursy' })).toHaveAttribute('href', '/kursy/moje')
})

it('szczegóły katalogu udostępniają zarządzanie publikacją administratorowi, nie mentorowi', async () => {
  mockApi({ ...sessionAs(ADMIN), 'GET /api/courses/1/': ok({ ...manage, current_published_version: 1 }) })
  renderApp('/kursy/1')
  expect(await screen.findByRole('link', { name: 'Zarządzaj kursem' })).toHaveAttribute('href', '/kursy/moje/1')
})

it('błąd odczytu historii nie jest maskowany jako prawo do edycji', async () => {
  mockApi(editorApi({ 'GET /api/courses/mine/1/': fail(403, { message: 'Zarządzanie przejął administrator.', code: 'forbidden' }) }))
  renderApp(editorPath)
  const alert = await screen.findByRole('alert')
  expect(alert).toHaveTextContent('Zarządzanie przejął administrator.')
  expect(alert).toHaveTextContent('403')
  expect(alert).toHaveTextContent('forbidden')
  expect(screen.queryByRole('button', { name: 'Zapisz draft' })).not.toBeInTheDocument()
})

it('usunięcie ze szczegółów przenosi na listę i ogłasza wynik', async () => {
  let finishLoadingList
  mockApi({
    ...sessionAs(ADMIN), 'GET /api/courses/mine/1/': ok(publishedCourse),
    'GET /api/courses/mine/1/students-count/': ok({ count: 0 }), 'GET /api/instances/': ok([]),
    'DELETE /api/courses/1/': { status: 204 },
    'GET /api/courses/mine/': () => new Promise(resolve => { finishLoadingList = () => resolve(ok([])) }),
  })
  renderApp('/kursy/moje/1')
  const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: 'Usuń kurs' }))
  await user.click(screen.getByRole('button', { name: 'Potwierdź usunięcie' }))
  await screen.findByRole('heading', { name: 'Wszystkie kursy' })
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Wszystkie kursy' })).toHaveFocus())
  expect(await screen.findByText('Trwale usunięto kurs.')).toHaveAttribute('role', 'status')
  await waitFor(() => expect(screen.queryAllByRole('status')).toHaveLength(2))
  finishLoadingList()
  expect(await screen.findByText('Brak kursów do zarządzania.')).toBeInTheDocument()
  await waitFor(() => expect(screen.queryAllByRole('status')).toHaveLength(1))
})

it('mentor przechodzi z listy przez szczegóły do kolejnej wersji read-only po publikacji', async () => {
  const course = { ...publishedCourse, current_published_version: 1 }
  const { calls } = mockApi(editorApi({
    'GET /api/courses/mine/': ok([course]),
    'GET /api/courses/mine/1/': ok(course),
    'GET /api/courses/mine/1/students-count/': ok({ count: 0 }),
    'GET /api/instances/': ok([]),
  }))
  const user = userEvent.setup()
  renderApp('/kursy/moje')
  await user.click(await screen.findByRole('link', { name: 'Wersja robocza' }))
  await screen.findByRole('heading', { name: 'Plan godzinowy' })
  expect(screen.queryByRole('button', { name: 'Usuń kurs' })).not.toBeInTheDocument()
  await user.click(screen.getByRole('link', { name: 'Podgląd wersji 2' }))
  await screen.findByRole('heading', { name: 'Treść wersji 2' })
  expect(screen.queryByRole('link', { name: 'Edytor wersji' })).not.toBeInTheDocument()
  for (const name of ['Wyślij do akceptacji', 'Wycofaj', 'Opublikuj', 'Akceptuj', 'Odrzuć']) {
    expect(screen.queryByRole('button', { name })).not.toBeInTheDocument()
  }
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(calls.every(call => call.method === 'GET')).toBe(true)
})

it.each([404, 500])('podgląd wersji 200 pozostaje read-only przy błędzie mine %s, zachowując błąd', async status => {
  const { calls } = mockApi(editorApi({
    'GET /api/courses/mine/1/': fail(status, { message: 'Nie udało się odczytać historii.', code: 'history_unavailable' }),
  }))
  renderApp('/kursy/podglad/1/wersje/2')
  await screen.findByRole('heading', { name: 'Treść wersji 2' })
  const alert = await screen.findByRole('alert')
  expect(alert).toHaveTextContent('Nie udało się odczytać historii.')
  expect(alert).toHaveTextContent(String(status))
  expect(alert).toHaveTextContent('history_unavailable')
  expect(screen.queryByRole('link', { name: 'Edytor wersji' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Wyślij do akceptacji' })).not.toBeInTheDocument()
  expect(calls.every(call => call.method === 'GET')).toBe(true)
})

it.each([404, 200])('opublikowany kurs autora pozostaje read-only z instancjami przy students-count %s', async status => {
  const instance = {
    id: 31, course: 1, mentor: MENTOR.id, student: 21, status: 'active', progress: 50,
    active_cycle: { id: 7, started_at: '2026-01-01T10:00:00Z' },
    tasks: [{ id: 10, title: 'Zadanie ucznia', hours: '1.00', status: 'todo', selected: true, blocked: false }],
  }
  const { calls } = mockApi({
    ...sessionAs(MENTOR),
    'GET /api/courses/mine/1/': ok({ ...publishedCourse, current_published_version: 1 }),
    'GET /api/courses/mine/1/students-count/': status === 200 ? ok({ count: 3 }) :
      fail(404, { message: 'Nie znaleziono licznika.', code: 'not_found' }),
    'GET /api/instances/': ok([
      instance, { ...instance, id: 32, mentor: 9, student: 22 },
      { ...instance, id: 33, course: 9, student: 23 },
    ]),
  })
  renderApp('/kursy/moje/1')
  await screen.findByRole('heading', { name: 'Wersja robocza' })
  expect(screen.getByRole('link', { name: 'Otwórz tablicę ucznia nr 21' })).toHaveAttribute('href', '/kursy/instancje/31')
  expect(screen.queryByRole('link', { name: /ucznia nr 22|ucznia nr 23/ })).not.toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Podgląd wersji 2' })).toHaveAttribute('href', '/kursy/podglad/1/wersje/2')
  for (const name of ['Dezaktywuj', 'Usuń kurs', 'Dodaj zadanie', 'Zamknij instancję', 'Wznów instancję']) {
    expect(screen.queryByRole('button', { name })).not.toBeInTheDocument()
  }
  expect(screen.queryByRole('link', { name: 'Otwórz wersję roboczą' })).not.toBeInTheDocument()
  for (const control of screen.queryAllByRole('combobox')) expect(control).toBeDisabled()
  if (status === 404) {
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Nie znaleziono licznika.')
    expect(alert).toHaveTextContent('404')
    expect(alert).toHaveTextContent('not_found')
    expect(screen.queryByText(/Aktywni uczniowie:/)).not.toBeInTheDocument()
  } else {
    expect(screen.getByText('Aktywni uczniowie: 3')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  }
  expect(calls.every(call => call.method === 'GET')).toBe(true)
})
