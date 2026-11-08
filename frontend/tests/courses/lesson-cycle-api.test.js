import { afterEach, expect, it } from 'vitest'
import { coursesApi } from '../../src/courses/api.js'
import { mockApi, ok, resetTestEnv } from './helpers.jsx'
import { BOTH, ROOT } from './lesson-cycle-fixtures.js'

afterEach(resetTestEnv)
it('API cykli lekcji zachowuje projekcję, date-only i kontrakt każdej mutacji', async () => {
  const { calls } = mockApi(Object.fromEntries([
    `GET ${ROOT}`, `POST ${ROOT}`, `PATCH ${ROOT}6/`, `POST ${ROOT}6/start/`,
    `POST ${ROOT}5/close/`, `POST ${ROOT}6/lessons/`, `DELETE ${ROOT}6/lessons/7/`,
  ].map(key => [key, ok(BOTH)])))
  sessionStorage.setItem('token', 'token-abc')
  const dates = { start_date: '2026-03-28', end_date: '2026-04-04' }
  expect(await coursesApi.getLessonCycles(11)).toEqual(BOTH)
  expect(await coursesApi.createLessonCycle(11, dates)).toEqual(BOTH)
  expect(await coursesApi.updateLessonCycle(11, 6, dates)).toEqual(BOTH)
  expect(await coursesApi.startLessonCycle(11, 6)).toEqual(BOTH)
  expect(await coursesApi.closeLessonCycle(11, 5)).toEqual(BOTH)
  expect(await coursesApi.addLessonToCycle(11, 6, 7)).toEqual(BOTH)
  expect(await coursesApi.removeLessonFromCycle(11, 6, 7)).toEqual(BOTH)
  expect(calls.map(c => [c.method, c.path, c.body])).toEqual([
    ['GET', ROOT, undefined], ['POST', ROOT, dates], ['PATCH', `${ROOT}6/`, dates],
    ['POST', `${ROOT}6/start/`, {}], ['POST', `${ROOT}5/close/`, {}],
    ['POST', `${ROOT}6/lessons/`, { lesson_id: 7 }], ['DELETE', `${ROOT}6/lessons/7/`, undefined],
  ])
  expect(calls.every(c => c.headers.Authorization === 'Token token-abc')).toBe(true)
})
