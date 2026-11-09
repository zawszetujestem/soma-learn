import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  COURSE_OPEN, INSTANCE_OWN, STUDENT, currentPath, fail, mockApi, ok,
  renderApp, resetTestEnv, sessionAs,
} from './helpers.jsx'
import { BOTH, CONTENT, EMPTY, ROOT, cycle } from './lesson-cycle-fixtures.js'

afterEach(() => {
  resetTestEnv()
  document.cookie = 'csrftoken=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
})

beforeEach(() => {
  document.cookie = 'csrftoken=test-csrf-token; path=/'
})

const content = { ...CONTENT, course: 2, course_owner: 2 }
const progress = (lesson_id, status, revision = 1) => ({ lesson_id, status, revision })
const projection = {
  ...BOTH,
  active_cycle: cycle(5, [9, 3, 7], { status: 'active' }),
  // Completed lessons outside the active selection must not affect its metrics.
  lesson_progress: [progress(9, 'done'), progress(8, 'done')],
}

function setup(data = projection, handlers = {}, instance = INSTANCE_OWN, path = '/kursy/instancje/11') {
  const api = mockApi({
    ...sessionAs(STUDENT),
    'GET /api/instances/11/': ok({ ...instance, progress: 73 }),
    'GET /api/instances/11/content/': ok(content),
    [`GET ${ROOT}`]: ok(data),
    'GET /api/courses/2/': ok(COURSE_OPEN),
    'GET /api/instances/': ok([]),
    ...handlers,
  })
  renderApp(path)
  return api
}

const ready = () => screen.findByRole('region', { name: 'Aktywny cykl' })
const active = () => screen.getByRole('region', { name: 'Aktywny cykl' })
const metrics = () => screen.findByRole('region', { name: 'Postęp aktywnego cyklu' })

// New acceptance hooks for stage 2: .instance-shell / .instance-sidebar,
// a named progress region/bar, and data-status on status columns and cards.
// These are local contracts, not changes to shared .app-shell tokens or CSS.
describe('lokalny shell strony instancji', () => {
  it('zastępuje globalny nagłówek i stopkę lokalnym sidebarem z logo i istniejącą nawigacją', async () => {
    setup()
    await ready()
    const sidebar = screen.getByRole('complementary', { name: 'Nawigacja kursu' })
    expect(sidebar).toHaveClass('instance-sidebar')
    expect(sidebar.closest('.instance-shell')).not.toBeNull()
    expect(screen.getByRole('main').closest('.instance-shell')).toBe(sidebar.closest('.instance-shell'))
    expect(within(sidebar).getByRole('link', { name: 'SOMA Learn, strona główna' })).toHaveAttribute('href', '/')
    const nav = within(sidebar).getByRole('navigation', { name: 'Nawigacja kursu' })
    expect(within(nav).getByRole('link', { name: 'Kursy' })).toHaveAttribute('href', '/kursy')
    expect(within(nav).getByRole('link', { name: 'Moja nauka' })).toHaveAttribute('href', '/nauka')
    expect(within(sidebar).getByRole('button', { name: 'Wyloguj' })).toBeEnabled()
    expect(document.querySelector('.site-header, .site-footer')).toBeNull()
    expect(screen.queryByRole('navigation', { name: 'Główna nawigacja' })).toBeNull()
    // Do not turn screenshot-only destinations into dead links or fake tabs.
    for (const role of ['link', 'button', 'tab']) {
      expect(screen.queryByRole(role, { name: /^(Oś czasu|Mentor|Ustawienia|Plan i cele)$/ })).toBeNull()
    }
  })

  it('wylogowanie z sidebaru używa istniejącego przepływu i wraca na stronę główną', async () => {
    const { calls } = setup(projection, {
      'DELETE /_allauth/browser/v1/auth/session': fail(401, { meta: { is_authenticated: false } }),
    })
    await ready()
    const sidebar = screen.getByRole('complementary', { name: 'Nawigacja kursu' })
    await userEvent.setup().click(within(sidebar).getByRole('button', { name: 'Wyloguj' }))
    await waitFor(() => expect(currentPath()).toBe('/'))
    expect(sessionStorage.getItem('token')).toBeNull()
    expect(calls.filter(call => call.method === 'DELETE')).toEqual([
      expect.objectContaining({ path: '/_allauth/browser/v1/auth/session' }),
    ])
    expect(screen.queryByRole('complementary', { name: 'Nawigacja kursu' })).toBeNull()
  })

  it('lokalna nawigacja pozostaje dostępna klawiaturą podczas ładowania danych strony', async () => {
    let finish
    setup(projection, {
      'GET /api/instances/11/': () => new Promise(resolve => {
        finish = () => resolve(ok(INSTANCE_OWN))
      }),
    })
    expect(await screen.findByText('Ładowanie instancji…')).toBeVisible()
    const sidebar = screen.getByRole('complementary', { name: 'Nawigacja kursu' })
    const logo = within(sidebar).getByRole('link', { name: 'SOMA Learn, strona główna' })
    logo.focus()
    expect(logo).toHaveFocus()
    await userEvent.setup().tab()
    expect(sidebar).toContainElement(document.activeElement)
    expect(document.activeElement).not.toBe(logo)
    expect(document.activeElement.matches('a[href], button')).toBe(true)
    expect(document.querySelector('.site-header, .site-footer')).toBeNull()
    expect(screen.queryByRole('progressbar', { name: 'Postęp cyklu' })).toBeNull()
    finish()
    await ready()
  })

  it('po opuszczeniu instancji przywraca globalny shell bez lokalnego sidebaru', async () => {
    setup()
    await ready()
    await userEvent.setup().click(screen.getByRole('link', { name: 'Wróć do kursu' }))
    await screen.findByRole('heading', { name: COURSE_OPEN.title })
    expect(currentPath()).toBe('/kursy/2')
    expect(screen.getAllByRole('banner').filter(element => element.matches('.site-header'))).toHaveLength(1)
    expect(screen.getByRole('contentinfo')).toHaveClass('site-footer')
    expect(screen.queryByRole('complementary', { name: 'Nawigacja kursu' })).toBeNull()
    expect(document.querySelector('.instance-shell')).toBeNull()
  })

  it.each(['/kursy/2', '/nie-ma', '/kursy/instancje/11/inny'])(
    'nie zmienia globalnego shellu na %s, również przy podobnym prefiksie trasy', async path => {
      mockApi({
        ...sessionAs(STUDENT),
        'GET /api/courses/2/': ok(COURSE_OPEN),
        'GET /api/instances/': ok([]),
      })
      renderApp(path)
      const nav = screen.getByRole('navigation', { name: 'Główna nawigacja' })
      expect(within(nav).getAllByRole('link').map(link => link.getAttribute('href')))
        .toEqual(['/#metoda', '/kursy', '/nauka'])
      expect(within(nav).getByRole('button', { name: 'Wyloguj' })).toBeEnabled()
      for (const landmark of [screen.getByRole('banner'), screen.getByRole('contentinfo')]) {
        expect(within(landmark).getByRole('link', { name: 'SOMA Learn, strona główna' })).toHaveAttribute('href', '/')
      }
      if (path === '/kursy/2') await screen.findByRole('heading', { name: COURSE_OPEN.title })
      expect(document.querySelector('.instance-shell, .instance-sidebar')).toBeNull()
    },
  )

  it('zachowuje lokalną nawigację również przy błędzie ładowania instancji', async () => {
    setup(projection, { 'GET /api/instances/11/': fail(500, {}) })
    expect(await screen.findByRole('alert')).toHaveTextContent(/błąd serwera/i)
    expect(screen.getByRole('complementary', { name: 'Nawigacja kursu' })).toBeVisible()
    expect(screen.queryByRole('banner')).toBeNull()
    expect(screen.queryByRole('contentinfo')).toBeNull()
    expect(screen.queryByRole('progressbar', { name: 'Postęp cyklu' })).toBeNull()
  })

  it('zachowuje lokalny shell dla kanonicznej trasy instancji z końcowym ukośnikiem', async () => {
    setup(projection, {}, INSTANCE_OWN, '/kursy/instancje/11/')
    await ready()
    expect(screen.getByRole('complementary', { name: 'Nawigacja kursu' })).toBeVisible()
    expect(document.querySelector('.site-header, .site-footer')).toBeNull()
  })
})

describe('metryki aktywnego cyklu, nie starego postępu instancji', () => {
  it.each([
    [projection, '1 / 3', 33],
    [{ ...projection, lesson_progress: [progress(8, 'done')] }, '0 / 3', 0],
    [{ ...projection, lesson_progress: [9, 3, 7, 8].map(id => progress(id, 'done')) }, '3 / 3', 100],
    [{ ...projection, active_cycle: cycle(5, [], { status: 'active' }) }, '0 / 0', 0],
  ])('wyświetla done/total: %s → %s, procent: %s', async (data, count, percent) => {
    setup(data)
    await ready()
    const summary = await metrics()
    expect(summary).toHaveTextContent(count)
    const bar = within(summary).getByRole('progressbar', { name: 'Postęp cyklu' })
    expect(bar).toHaveAttribute('aria-valuemin', '0')
    expect(bar).toHaveAttribute('aria-valuemax', '100')
    expect(bar).toHaveAttribute('aria-valuenow', String(percent))
    expect(summary).not.toHaveTextContent(/73%|NaN|Infinity/)
  })

  it('bez aktywnego cyklu nie używa planu, historii ani progress instancji jako metryki', async () => {
    setup({
      ...EMPTY, planned_cycle: cycle(6, [8]), history: [cycle(4, [9], { status: 'closed' })],
      lesson_progress: [progress(8, 'done'), progress(9, 'done')],
    })
    await ready()
    const summary = await metrics()
    expect(summary).toHaveTextContent('Brak aktywnego cyklu')
    expect(within(summary).queryByRole('progressbar')).toBeNull()
    expect(summary).not.toHaveTextContent(/73%|100%|NaN|Infinity/)
  })

  it('aktualizuje metrykę dopiero z projekcji po zapisie statusu, zachowując Wszystkie i modal', async () => {
    const initial = { ...projection, lesson_progress: [progress(9, 'review', 4)] }
    const updated = { ...projection, lesson_progress: [progress(9, 'done', 5)] }
    let finish
    const { calls } = setup(initial, {
      [`PATCH ${ROOT}5/lessons/9/progress/`]: () => new Promise(resolve => {
        finish = () => resolve(ok(updated))
      }),
    })
    const user = userEvent.setup()
    await ready()
    expect(await metrics()).toHaveTextContent('0 / 3')
    await user.click(screen.getByRole('button', { name: 'Wszystkie' }))
    const all = screen.getByRole('region', { name: 'Wszystkie lekcje' })
    expect(within(all).getAllByRole('listitem').map(item => item.getAttribute('aria-label')))
      .toEqual(['Lekcja Z', 'Lekcja A', 'Lekcja B', 'Lekcja C'])
    expect(within(all).queryByRole('combobox', { name: 'Zmień status: Lekcja C' })).toBeNull()
    await user.selectOptions(within(all).getByRole('combobox', { name: 'Zmień status: Lekcja Z' }), 'done')
    await waitFor(() => expect(finish).toBeTypeOf('function'))
    expect(await metrics()).toHaveTextContent('0 / 3')
    expect(within(all).getByRole('combobox', { name: 'Zmień status: Lekcja Z' })).toBeDisabled()
    finish()
    await waitFor(() => expect(screen.getByRole('region', { name: 'Postęp aktywnego cyklu' })).toHaveTextContent('1 / 3'))
    expect(calls.filter(call => call.method === 'PATCH')).toEqual([
      expect.objectContaining({
        path: `${ROOT}5/lessons/9/progress/`,
        body: { status: 'done', expected_status: 'review', expected_revision: 4 },
      }),
    ])
    await user.click(screen.getByRole('button', { name: 'Tematy' }))
    const opener = within(active()).getByRole('button', { name: 'Otwórz lekcję: Lekcja Z' })
    await user.click(opener)
    expect(screen.getByRole('dialog', { name: 'Lekcja Z' })).toBeVisible()
    await user.keyboard('{Escape}')
    expect(opener).toHaveFocus()
    expect(calls.filter(call => call.method !== 'GET')).toHaveLength(1)
  })
})

describe('lokalne hooki prezentacji i zachowane działania', () => {
  it('oznacza kolumny i karty rzeczywistym statusem, również w widoku Wszystkie', async () => {
    const statuses = ['todo', 'revision', 'in_progress', 'review', 'done']
    const ids = [9, 3, 7, 8, 12]
    const titles = ['Lekcja Z', 'Lekcja A', 'Lekcja B', 'Lekcja C', 'Lekcja D']
    const labels = ['Do zrobienia', 'Do poprawy', 'W trakcie', 'Do sprawdzenia', 'Zakończone']
    const extendedContent = {
      ...content,
      nodes: [...content.nodes, { id: 30, kind: 'topic', title: 'Temat D', children: [
        { id: 12, kind: 'lesson', title: 'Lekcja D', children: [] },
      ] }],
    }
    setup({
      ...projection,
      active_cycle: cycle(5, ids, { status: 'active' }),
      lesson_progress: ids.map((id, index) => progress(id, statuses[index])),
    }, { 'GET /api/instances/11/content/': ok(extendedContent) })
    await ready()
    expect(active().closest('.lesson-cycle-board')).not.toBeNull()
    expect(active().querySelector('.lesson-progress-topic-grid')).not.toBeNull()
    for (const [index, status] of statuses.entries()) {
      const card = within(active()).getByRole('listitem', { name: titles[index] })
      expect(card).toHaveClass('lesson-progress-card')
      expect(card).toHaveAttribute('data-status', status)
      const column = card.closest('.lesson-progress-column')
      expect(column).toHaveAttribute('data-status', status)
      expect(column.getAttribute('aria-label')).toContain(`${labels[index]} —`)
    }
    await userEvent.setup().click(screen.getByRole('button', { name: 'Wszystkie' }))
    const all = screen.getByRole('region', { name: 'Wszystkie lekcje' })
    for (const [index, status] of statuses.entries()) {
      expect(within(all).getByRole('listitem', { name: titles[index] })).toHaveAttribute('data-status', status)
    }
  })

  it('pozostawia plan, treść, kontrolę instancji i cyklu dostępne bez nowej funkcjonalności', async () => {
    const { calls } = setup({
      ...projection,
      active_cycle: cycle(5, [9, 7], { status: 'active' }),
    })
    await ready()
    const plan = screen.getByRole('region', { name: 'Plan kolejnego cyklu' })
    expect(within(plan).getByRole('button', { name: 'Zapisz daty planu' })).toBeEnabled()
    expect(within(plan).getByRole('button', { name: 'Rozpocznij cykl lekcji' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Zakończ cykl lekcji' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Zamknij instancję' })).toBeEnabled()
    expect(screen.getByRole('region', { name: 'Treść wersji' })).toBeVisible()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Wszystkie' }))
    expect(screen.getByRole('button', { name: 'Usuń z planu: Lekcja A' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Dodaj do planu: Lekcja C' })).toBeEnabled()
    expect(calls.filter(call => call.method !== 'GET')).toHaveLength(0)
  })
})
