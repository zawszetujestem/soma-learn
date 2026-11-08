import { afterEach, describe, expect, it } from 'vitest'
import { courseErrorMessage, coursesApi } from '../../src/courses/api.js'
import { formatHours, formatPercent } from '../../src/courses/format.js'
import { created, mockApi, resetTestEnv } from './helpers.jsx'

afterEach(resetTestEnv)

describe('joinByToken', () => {
  it('wysyła POST na endpoint z tokenem zakodowanym w URL', async () => {
    const { calls } = mockApi({ 'POST /api/courses/join/a%20b%2Fc/': created({ id: 5 }) })
    sessionStorage.setItem('token', 'token-abc')

    const instance = await coursesApi.joinByToken('a b/c')

    expect(instance).toEqual({ id: 5 })
    expect(calls[0].method).toBe('POST')
    expect(calls[0].path).toBe('/api/courses/join/a%20b%2Fc/')
  })
})

describe('mapowanie błędów API kursów na komunikaty po polsku', () => {
  it.each([
    [409, { code: 'slot_taken' }, /masz już aktywny kurs/i],
    [409, { code: 'instance_closed' }, /instancja jest zamknięta/i],
    [409, { code: 'course_inactive' }, /kurs jest nieaktywny/i],
    [409, { code: 'course_not_approved' }, /nie został zatwierdzony/i],
    [403, { code: 'forbidden' }, /nie masz uprawnień/i],
    [404, { code: 'not_found' }, /nie znaleziono/i],
    [401, { detail: 'Invalid token.' }, /sesja wygasła/i],
    [500, {}, /błąd serwera/i],
    [503, {}, /błąd serwera/i],
  ])('status %i (%o) → %s', (status, payload, expected) => {
    expect(courseErrorMessage(status, payload)).toMatch(expected)
  })

  it('zwraca ogólny komunikat dla nieznanego błędu klienta', () => {
    expect(courseErrorMessage(418, {})).toMatch(/nie udało się wykonać operacji/i)
  })
})

describe('formatowanie liczb', () => {
  it('pokazuje godziny z przecinkiem dziesiętnym i bez zbędnych zer', () => {
    expect(formatHours('2.50')).toBe('2,5 h')
    expect(formatHours('1.00')).toBe('1 h')
  })

  it('pokazuje procent postępu bez zbędnych miejsc po przecinku', () => {
    expect(formatPercent(50)).toBe('50%')
    expect(formatPercent(33.333)).toBe('33,3%')
  })
})

describe('API Mojej nauki, cykli i wymagań zadań', () => {
  const call = async (handlers, run) => {
    const { calls } = mockApi(handlers)
    sessionStorage.setItem('token', 'token-abc')
    const result = await run()
    return { calls, result }
  }

  it('pobiera własne instancje ucznia z /api/instances/mine/', async () => {
    const { calls, result } = await call({ 'GET /api/instances/mine/': { status: 200, body: [{ id: 1, course_title: 'A' }] } }, () => coursesApi.listMyInstances())
    expect(result).toEqual([{ id: 1, course_title: 'A' }])
    expect(calls[0]).toMatchObject({ method: 'GET', path: '/api/instances/mine/' })
  })

  it('rozpoczyna i kończy cykl wybranej instancji', async () => {
    const { calls } = await call({
      'POST /api/instances/4/cycles/': created({ id: 7 }),
      'POST /api/instances/4/cycles/7/close/': { status: 200, body: { id: 7 } },
    }, async () => { await coursesApi.startCycle(4); await coursesApi.closeCycle(4, 7) })
    expect(calls.map((item) => `${item.method} ${item.path}`)).toEqual(['POST /api/instances/4/cycles/', 'POST /api/instances/4/cycles/7/close/'])
  })

  it('aktualizuje status lub wybór zadania instancji tylko podanymi polami', async () => {
    const { calls } = await call({ 'PATCH /api/instances/4/tasks/9/': { status: 200, body: {} } }, async () => {
      await coursesApi.updateInstanceTask(4, 9, 'done')
      await coursesApi.updateInstanceTask(4, 9, { selected: true })
      await coursesApi.updateInstanceTask(4, 9, { status: 'todo', selected: false })
    })
    expect(calls.map((item) => item.body)).toEqual([{ status: 'done' }, { selected: true }, { status: 'todo', selected: false }])
  })

  it('zapisuje prerequisite_ids zadania kursu przez PATCH', async () => {
    const { calls } = await call({ 'PATCH /api/courses/5/tasks/3/': { status: 200, body: {} } }, () => coursesApi.updateTask(5, 3, { prerequisite_ids: [1, 2] }))
    expect(calls[0]).toMatchObject({ method: 'PATCH', path: '/api/courses/5/tasks/3/', body: { prerequisite_ids: [1, 2] } })
  })

  it('zachowuje status, kod, szczegóły i bezpieczny komunikat błędu z serwera', async () => {
    const payload = { code: 'prerequisite_cycle', message: 'Wymagania tworzą cykl.', detail: 'cycle', prerequisite_ids: ['cycle'] }
    mockApi({ 'PATCH /api/courses/5/tasks/3/': { status: 400, body: payload } })
    sessionStorage.setItem('token', 'token-abc')
    const error = await coursesApi.updateTask(5, 3, { prerequisite_ids: [3] }).catch((failure) => failure)
    expect(error).toMatchObject({ name: 'CourseApiError', kind: 'validation', status: 400, code: 'prerequisite_cycle', message: 'Wymagania tworzą cykl.', payload })
  })
})