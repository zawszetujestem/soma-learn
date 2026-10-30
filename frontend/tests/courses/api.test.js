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
