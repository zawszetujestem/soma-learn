// Lesson workflow is separate from CourseTask and from planned-cycle selection.
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
  in_progress: ['review'],
  review: ['revision', 'done'],
  done: [],
}
const dragType = 'application/x-soma-lesson-progress'

function topicGroups(entries) {
  const groups = new Map()
  for (const entry of entries) {
    const key = entry.topic?.id ?? `section-${entry.section?.id ?? 'none'}`
    if (!groups.has(key)) groups.set(key, {
      key, title: entry.topic?.title ?? entry.section?.title ?? 'Lekcje bez tematu', entries: [],
    })
    groups.get(key).entries.push(entry)
  }
  return [...groups.values()]
}

function topicSummary(entries, progress) {
  const statuses = entries.map(({ lesson }) => progress(lesson.id).status)
  if (statuses.every(status => status === 'done')) return 'Ukończony'
  if (statuses.includes('in_progress')) return 'W trakcie'
  return ['review', 'revision', 'todo'].map(status => (
    `${lessonStatuses.find(([key]) => key === status)[1]}: ${statuses.filter(value => value === status).length}`
  )).join(' · ')
}

export default function LessonProgressBoard({ entries, projection, canEdit, movable, onMove, buttonRefs }) {
  const progressById = new Map((projection.lesson_progress || []).map(item => [item.lesson_id, item]))
  const progress = id => progressById.get(id) ?? { lesson_id: id, status: 'todo', revision: 0 }
  // The projection includes progress outside this cycle/selection. Never scope the lock to cards.
  const inProgress = [...progressById.values()].find(item => item.status === 'in_progress')
  const outsideLock = inProgress && !entries.some(({ lesson }) => lesson.id === inProgress.lesson_id)
  const groups = topicGroups(entries)
  function allowed(id) {
    return (transitions[progress(id).status] || []).filter(status => status !== 'in_progress' || !inProgress)
  }
  function move(id, status) {
    if (!movable || !entries.some(({ lesson }) => lesson.id === id) || !allowed(id).includes(status)) return
    onMove(id, status, progress(id))
  }
  function droppedId(event) {
    const value = event.dataTransfer.getData(dragType)
    return /^\d+$/.test(value) ? Number(value) : null
  }

  return (
    <div className="lesson-progress-board">
      <p className="instance-note">Test jest treścią lekcji, bez automatycznej oceny. Po pracy przekaż lekcję do sprawdzenia ręcznie. Uczeń lub przypisany mentor ręcznie wybiera „Do poprawy” albo „Zakończone”.</p>
      {inProgress && <p className="courses-banner">
        {outsideLock
          ? 'Lekcja poza aktywnym cyklem jest w trakcie. Przekaż ją do sprawdzenia przed rozpoczęciem kolejnej; jeśli jest niedostępna, skontaktuj się z mentorem.'
          : 'Jedna lekcja jest w trakcie. Przekaż ją do sprawdzenia, aby rozpocząć kolejną — nie musisz czekać na sprawdzenie.'}
      </p>}
      <section className="lesson-progress-summaries" aria-label="Podsumowanie tematów">
        {groups.map(group => <div key={group.key}>
          <h4>{group.title}</h4>
          <p>{topicSummary(group.entries, progress)}</p>
        </div>)}
      </section>
      <div className="lesson-progress-columns">
        {lessonStatuses.map(([status, label]) => {
          const columnGroups = topicGroups(entries.filter(({ lesson }) => progress(lesson.id).status === status))
          return (
            <section key={status} className="lesson-progress-column" aria-label={label}
              onDragOver={event => {
                if (!movable) return
                // Browsers protect drag data during dragover; validate the actual ID again on drop.
                if (event.dataTransfer.types && !Array.from(event.dataTransfer.types).includes(dragType)) return
                event.preventDefault()
                event.dataTransfer.dropEffect = 'move'
              }}
              onDrop={event => {
                event.preventDefault()
                const id = droppedId(event)
                if (id !== null) move(id, status)
              }}>
              <h4>{label}</h4>
              {!columnGroups.length && <p className="instance-note">Brak lekcji.</p>}
              {columnGroups.map(group => <div key={group.key} className="lesson-progress-topic">
                <h5>{group.title}</h5>
                <ul className="lesson-progress-cards">
                  {group.entries.map(({ lesson }) => {
                    const current = progress(lesson.id)
                    const targets = allowed(lesson.id)
                    const editable = movable && targets.length > 0
                    const terminal = current.status === 'done'
                    return (
                      <li key={lesson.id} aria-label={lesson.title} className="lesson-progress-card"
                        tabIndex={-1}
                        ref={element => { if (!canEdit || terminal) buttonRefs.current[lesson.id] = element }}
                        draggable={Boolean(editable)}
                        onDragStart={event => {
                          if (!editable) { event.preventDefault(); return }
                          event.dataTransfer.setData(dragType, String(lesson.id))
                          event.dataTransfer.effectAllowed = 'move'
                        }}>
                        <span className="lesson-progress-title">{lesson.title}</span>
                        {canEdit && !terminal && <label>
                          <span className="sr-only">Zmień status: {lesson.title}</span>
                          <select value={current.status} disabled={!editable}
                            ref={element => { buttonRefs.current[lesson.id] = element }}
                            onChange={event => move(lesson.id, event.target.value)}>
                            <option value={current.status}>{label}</option>
                            {targets.map(target => <option key={target} value={target}>
                              {lessonStatuses.find(([key]) => key === target)[1]}
                            </option>)}
                          </select>
                        </label>}
                      </li>
                    )
                  })}
                </ul>
              </div>)}
            </section>
          )
        })}
      </div>
    </div>
  )
}
