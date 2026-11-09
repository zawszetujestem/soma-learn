import LessonTile from './LessonTile.jsx'
import LessonStatusControl, { lessonStatuses, lessonWorkflow } from './LessonStatusControl.jsx'

// Lesson workflow is separate from CourseTask and from planned-cycle selection.
export { lessonStatuses }
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

export default function LessonProgressBoard({
  entries, projection, canEdit, movable, onMove, buttonRefs, courseId, versionId,
}) {
  const { progress, inProgress, allowed } = lessonWorkflow(projection)
  const outsideLock = inProgress && !entries.some(({ lesson }) => lesson.id === inProgress.lesson_id)
  const groups = topicGroups(entries)
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
          : 'Jedna lekcja jest w trakcie. Cofnij ją do „Do zrobienia” lub przekaż do sprawdzenia, aby rozpocząć kolejną — nie musisz czekać na sprawdzenie.'}
      </p>}
      <section className="lesson-progress-summaries" aria-label="Podsumowanie tematów">
        {groups.map(group => <div key={group.key}>
          <h4>{group.title}</h4>
          <p>{topicSummary(group.entries, progress)}</p>
        </div>)}
      </section>
      <div className="lesson-progress-columns">
        {groups.map(group => {
          const completed = group.entries.filter(({ lesson }) => progress(lesson.id).status === 'done').length
          return (
            <section key={group.key} className="lesson-progress-topic" aria-label={group.title}>
              <header className="lesson-progress-topic-header">
                <h4>{group.title}</h4>
                <p>{completed} / {group.entries.length} ukończone</p>
                <span className="instance-topic-progress" aria-hidden="true">
                  <span style={{ width: `${Math.round(completed / group.entries.length * 100)}%` }} />
                </span>
              </header>
              <div className="lesson-progress-topic-grid">
                {lessonStatuses.map(([status, label]) => {
                  const statusEntries = group.entries.filter(({ lesson }) => progress(lesson.id).status === status)
                  return (
                    <section key={status} className="lesson-progress-column"
                      data-status={status}
                      aria-label={`${label} — ${group.title}`}
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
                      <h5>{label} <span className="instance-status-count">{statusEntries.length}</span></h5>
                      {!statusEntries.length && <p className="instance-note">Brak lekcji.</p>}
                      <ul className="lesson-progress-cards">
                        {statusEntries.map(({ lesson }) => {
                          const current = progress(lesson.id)
                          const targets = allowed(lesson.id)
                          const editable = movable && targets.length > 0
                          const terminal = current.status === 'done'
                          return (
                            <LessonTile key={lesson.id} lesson={lesson} courseId={courseId} versionId={versionId} className="lesson-progress-card"
                              data-status={current.status}
                              tabIndex={-1}
                              tileRef={element => { if (!canEdit || terminal) buttonRefs.current[lesson.id] = element }}
                              draggable={Boolean(editable)}
                              onDragStart={event => {
                                event.dataTransfer.setData(dragType, String(lesson.id))
                                event.dataTransfer.effectAllowed = 'move'
                              }}>
                              <span className="instance-lesson-status">{label}</span>
                              {canEdit && <LessonStatusControl lesson={lesson} current={current}
                                targets={targets} movable={movable} buttonRefs={buttonRefs} onMove={move} />}
                            </LessonTile>
                          )
                        })}
                      </ul>
                    </section>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
