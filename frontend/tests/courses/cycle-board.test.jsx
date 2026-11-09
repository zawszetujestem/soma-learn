import { afterEach, describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ADMIN, MENTOR, STUDENT, INSTANCE_OWN, fail, mockApi, ok, renderApp, resetTestEnv, sessionAs } from './helpers.jsx'
import { BOTH, CONTENT, EMPTY, ROOT } from './lesson-cycle-fixtures.js'

afterEach(resetTestEnv)

function setup({ user = STUDENT, instances = [INSTANCE_OWN], projection = BOTH, handlers = {} } = {}) {
  let index = 0
  return mockApi({
    ...sessionAs(user),
    'GET /api/instances/11/': () => ok(instances[Math.min(index++, instances.length - 1)]),
    'GET /api/instances/11/content/': ok(CONTENT),
    [`GET ${ROOT}`]: ok(projection),
    ...handlers,
  })
}

describe('nowa tablica lekcji na stronie Instance', () => {
  it('zastępuje UI zadań; zachowuje pinned content poniżej i kolejność tablicy', async () => {
    const { calls } = setup()
    renderApp('/kursy/instancje/11')
    const board = await screen.findByRole('region', { name: 'Cykle lekcji' })
    await within(board).findByText('Lekcja Z')
    expect(within(board).getAllByRole('heading', { level: 3 }).map(h => h.textContent))
      .toEqual(['Aktywny cykl', 'Plan kolejnego cyklu', 'Pozostałe lekcje'])
    expect(screen.queryByRole('region', { name: 'Tablica cyklu' })).toBeNull()
    expect(screen.queryByRole('region', { name: 'Historia cykli' })).toBeNull()
    expect(screen.queryByLabelText('Zmień status: Select')).toBeNull()
    expect(screen.queryByLabelText('Zmień status: Join')).toBeNull()
    expect(within(board).getByLabelText('Zmień status: Lekcja Z')).toBeEnabled()
    expect(within(board).queryByText('Select')).toBeNull()
    expect(within(board).queryByText('Join')).toBeNull()
    const content = screen.getByRole('region', { name: 'Treść wersji' })
    expect(board.compareDocumentPosition(content) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(calls.some(c => /\/cycles\/|\/tasks\//.test(c.path))).toBe(false)
  })

  it.each([STUDENT, MENTOR])('student / przypisany mentor może edytować: %#', async user => {
    setup({ user, instances: [{ ...INSTANCE_OWN, mentor: MENTOR.id }] })
    renderApp('/kursy/instancje/11')
    expect(await screen.findByRole('button', { name: 'Dodaj do planu: Lekcja B' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Zakończ cykl lekcji' })).toBeEnabled()
    expect(screen.getByRole('button', { name: /zamknij instancję/i })).toBeEnabled()
  })

  it.each([ADMIN, { ...MENTOR, id: 99 }])('pozostali mają tylko odczyt: %#', async user => {
    const { calls } = setup({ user })
    renderApp('/kursy/instancje/11')
    expect(await screen.findByText(/ten widok jest tylko do odczytu/i)).toBeInTheDocument()
    await screen.findByRole('region', { name: 'Plan kolejnego cyklu' })
    expect(screen.queryByRole('button', { name: /dodaj do planu|zakończ cykl lekcji|zapisz daty/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /zamknij instancję/i })).toBeNull()
    expect(calls.every(c => c.method === 'GET')).toBe(true)
  })

  it('close/resume odświeża instancję bez zakończenia cyklu lekcji; zamknięta tablica jest tylko do odczytu', async () => {
    const closed = { ...INSTANCE_OWN, status: 'closed', progress: 0 }
    const { calls } = setup({
      instances: [{ ...INSTANCE_OWN, progress: 0 }, closed, INSTANCE_OWN],
      handlers: {
        [`GET ${ROOT}`]: ok(BOTH),
        'POST /api/instances/11/close/': ok(closed),
        'POST /api/instances/11/resume/': ok(INSTANCE_OWN),
      },
    })
    const user = userEvent.setup()
    renderApp('/kursy/instancje/11')
    await screen.findByRole('button', { name: 'Zakończ cykl lekcji' })
    expect(screen.getByText(/niezależnie od postępu/i)).toBeInTheDocument()
    expect(screen.getByText(/zamknięcie instancji nie kończy cyklu lekcji/i)).toBeInTheDocument()
    expect(screen.queryByText(/zamknięcie zakończy aktywny cykl/i)).toBeNull()
    await user.click(screen.getByRole('button', { name: /zamknij instancję/i }))
    expect(await screen.findByRole('button', { name: /wznów instancję/i })).toBeEnabled()
    await waitFor(() => expect(screen.queryByRole('button', { name: /dodaj do planu/i })).toBeNull())
    expect(screen.getByText(/tylko do odczytu/i)).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Plan kolejnego cyklu' })).getByText('Lekcja A')).toBeInTheDocument()
    expect(await within(screen.getByRole('region', { name: 'Aktywny cykl' })).findByText('Lekcja Z')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Zakończ cykl lekcji' })).toBeNull()
    await user.click(screen.getByRole('button', { name: /wznów instancję/i }))
    expect(await screen.findByRole('button', { name: /zamknij instancję/i })).toBeEnabled()
    await screen.findByRole('button', { name: 'Dodaj do planu: Lekcja B' })
    expect(screen.getByRole('button', { name: 'Zakończ cykl lekcji' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Rozpocznij cykl lekcji' })).toBeDisabled()
    expect(within(screen.getByRole('region', { name: 'Aktywny cykl' })).getByText('Lekcja Z')).toBeInTheDocument()
    expect(calls.filter(c => c.path === ROOT && c.method === 'GET')).toHaveLength(3)
    expect(calls.some(c => c.path.endsWith('/start/'))).toBe(false)
    expect(calls.some(c => c.method === 'POST' && c.path.startsWith(ROOT))).toBe(false)
  })

  it('zachowuje komunikat błędu zamknięcia instancji', async () => {
    setup({ projection: EMPTY, handlers: { 'POST /api/instances/11/close/': fail(409, { message: 'Nie można zamknąć instancji.' }) } })
    renderApp('/kursy/instancje/11')
    await userEvent.setup().click(await screen.findByRole('button', { name: /zamknij instancję/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Nie można zamknąć instancji.')
  })
})
