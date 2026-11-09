export const lessonStatuses = [
  ['todo', 'Do zrobienia'],
  ['revision', 'Do poprawy'],
  ['in_progress', 'W trakcie'],
  ['review', 'Do sprawdzenia'],
  ['done', 'Zakończone'],
]

const transitions = {
  todo: ['in_progress'],
  revision: ['in_progress'],
  in_progress: ['todo', 'review'],
  review: ['revision', 'done'],
  done: [],
}

export function lessonWorkflow(projection) {
  const byId = new Map((projection.lesson_progress || []).map(item => [item.lesson_id, item]))
  const progress = id => byId.get(id) ?? { lesson_id: id, status: 'todo', revision: 0 }
  // The lock spans the instance, including lessons outside the active selection.
  const inProgress = [...byId.values()].find(item => item.status === 'in_progress')
  const allowed = id => (transitions[progress(id).status] || [])
    .filter(status => status !== 'in_progress' || !inProgress)
  return { progress, inProgress, allowed }
}

export default function LessonStatusControl({ lesson, current, targets, movable, onMove, buttonRefs }) {
  if (current.status === 'done') return null
  return (
    <label>
      <span className="sr-only">Zmień status: {lesson.title}</span>
      <select value={current.status} disabled={!movable || !targets.length}
        ref={element => { buttonRefs.current[lesson.id] = element }}
        onChange={event => {
          if (movable && targets.includes(event.target.value)) onMove(lesson.id, event.target.value, current)
        }}>
        <option value={current.status}>{lessonStatuses.find(([key]) => key === current.status)?.[1]}</option>
        {targets.map(target => <option key={target} value={target}>
          {lessonStatuses.find(([key]) => key === target)[1]}
        </option>)}
      </select>
    </label>
  )
}
