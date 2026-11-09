import { afterEach, expect, it } from 'vitest'
import { CourseApiError, coursesApi } from '../../src/courses/api.js'
import { fail, mockApi, ok, resetTestEnv } from './helpers.jsx'
import { BOTH, ROOT } from './lesson-cycle-fixtures.js'

afterEach(resetTestEnv)
const path = `${ROOT}5/lessons/9/progress/`
it('PATCH postępu przekazuje oba warunki i zwraca pełną projekcję bez przekształceń', async () => {
  const projection = { ...BOTH, lesson_progress: [{ lesson_id: 9, status: 'review', revision: 4 }] }
  const { calls } = mockApi({ [`PATCH ${path}`]: ok(projection) })
  const changes = { status: 'review', expected_status: 'in_progress', expected_revision: 3 }
  expect(await coursesApi.updateLessonProgress(11, 5, 9, changes)).toEqual(projection)
  expect(calls).toEqual([expect.objectContaining({ method: 'PATCH', path, body: changes })])
})

it.each(['stale_lesson_progress', 'invalid_lesson_transition', 'lesson_in_progress_exists', 'lesson_cycle_not_active', 'instance_closed'])(
  'zachowuje CourseApiError message/status/code/payload dla %s', async code => {
    const payload = { code, message: 'Stan lekcji zmienił się. Odświeżono tablicę.', extra: { revision: 5 } }
    mockApi({ [`PATCH ${path}`]: fail(409, payload) })
    const promise = coursesApi.updateLessonProgress(11, 5, 9, {
      status: 'review', expected_status: 'in_progress', expected_revision: 3,
    })
    await expect(promise).rejects.toBeInstanceOf(CourseApiError)
    await expect(promise).rejects.toMatchObject({ status: 409, code, message: payload.message, payload })
  },
)
