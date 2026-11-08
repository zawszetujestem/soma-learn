export const ROOT = '/api/instances/11/lesson-cycles/'
const lesson = (id, title) => ({ id, kind: 'lesson', title, children: [] })
export const CONTENT = {
  id: 2, number: 1, title: 'Przypięty kurs', nodes: [
    { id: 10, kind: 'section', title: 'Dział B', children: [
      { id: 20, kind: 'topic', title: 'Temat Z', children: [lesson(9, 'Lekcja Z'), lesson(3, 'Lekcja A')] },
      { id: 21, kind: 'topic', title: 'Temat A', children: [lesson(7, 'Lekcja B')] },
    ] },
    { id: 11, kind: 'section', title: 'Dział A', children: [
      { id: 22, kind: 'topic', title: 'Temat B', children: [lesson(8, 'Lekcja C')] },
    ] },
  ],
}
export const cycle = (id, lesson_ids = [], extra = {}) => ({
  id, start_date: '2026-03-28', end_date: '2026-04-04', status: 'planned',
  started_at: null, ended_at: null, lesson_ids, ...extra,
})
export const EMPTY = { active_cycle: null, planned_cycle: null, history: [] }
export const PLANNED = { ...EMPTY, planned_cycle: cycle(6, [3]) }
export const BOTH = { ...PLANNED, active_cycle: cycle(5, [9], { status: 'active', started_at: '2026-03-28T10:00:00Z' }) }
