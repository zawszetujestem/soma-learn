import { useLayoutEffect, useRef, useState } from 'react'
import { coursesApi } from './api.js'
import { useLoader } from './RequireAuth.jsx'
import { EmptyMessage, ErrorMessage, LoadingMessage } from './StateViews.jsx'
import LessonProgressBoard from './LessonProgressBoard.jsx'
import LessonTile from './LessonTile.jsx'
import LessonStatusControl, { lessonStatuses, lessonWorkflow } from './LessonStatusControl.jsx'
import './lesson-cycle-board.css'

// Calendar dates, never UTC timestamps. Noon avoids DST midnight discontinuities.
function calendarDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null
  const [year, month, day] = value.split('-').map(Number)
  // The multi-argument Date constructor remaps years 0–99 to 1900–1999.
  const date = new Date(0)
  date.setHours(12, 0, 0, 0)
  date.setFullYear(year, month - 1, day)
  if (year < 1) return null
  return dateOnly(date) === value ? date : null
}
function dateOnly(date) {
  return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
export function addCalendarDays(value, days) {
  const date = calendarDate(value)
  if (!date) return ''
  date.setDate(date.getDate() + days)
  return dateOnly(date)
}
function displayDate(value) {
  return value.split('-').reverse().join('.')
}
export function displayCycleDates(cycle) {
  const lastDay = addCalendarDays(cycle.end_date, -1)
  if (!calendarDate(cycle.start_date) || !lastDay) return 'Brak poprawnych dat cyklu.'
  return `${displayDate(cycle.start_date)} – ${displayDate(lastDay)}`
}

// Preserve the pinned tree's array order; CourseTask is not a lesson.
function lessonGroups(nodes, section = null, topic = null) {
  return (nodes || []).flatMap(node => {
    if (node.kind === 'lesson') return [{ lesson: node, section, topic }]
    return lessonGroups(
      node.children,
      node.kind === 'section' ? node : section,
      node.kind === 'topic' ? node : topic,
    )
  })
}

function PlanDates({ planned, disabled, onSave }) {
  const [start, setStart] = useState(() => planned?.start_date || dateOnly(new Date()))
  const [lastDay, setLastDay] = useState(() => planned
    ? addCalendarDays(planned.end_date, -1)
    : addCalendarDays(dateOnly(new Date()), 6))
  const [error, setError] = useState(null)
  function submit(event) {
    event.preventDefault()
    const exclusiveEnd = addCalendarDays(lastDay, 1)
    if (!calendarDate(start) || !calendarDate(lastDay) || lastDay < start || !calendarDate(exclusiveEnd)) {
      setError('Ostatni dzień cyklu nie może być wcześniejszy niż początek. Podaj poprawne daty.')
      return
    }
    setError(null)
    onSave({ start_date: start, end_date: exclusiveEnd })
  }
  return (
    <form className="lesson-cycle-dates" onSubmit={submit}>
      <label>Początek planu
        <input type="date" value={start} onChange={event => { setStart(event.target.value); setError(null) }} disabled={disabled} />
      </label>
      <label>Ostatni dzień cyklu
        <input type="date" value={lastDay} onChange={event => { setLastDay(event.target.value); setError(null) }} disabled={disabled} />
      </label>
      <p className="instance-note">Zakres obejmuje początek i ostatni dzień cyklu. Domyślny plan trwa 7 dni.</p>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      <button type="submit" className="button button-secondary" disabled={disabled}>
        {planned ? 'Zapisz daty planu' : 'Utwórz plan'}
      </button>
    </form>
  )
}

const dragType = 'application/x-soma-lesson-id'
const progressLabels = Object.fromEntries(lessonStatuses)

function AllLessonsList({ entries, progress, activeIds, plannedIds, planned, movable,
  canEdit, add, remove, allowed, onStatusMove, buttonRefs, courseId, versionId }) {
  const groups = new Map()
  for (const entry of entries) {
    const key = entry.topic?.id ?? `section-${entry.section?.id ?? 'none'}`
    if (!groups.has(key)) groups.set(key, {
      key, title: entry.topic?.title ?? entry.section?.title ?? 'Lekcje bez tematu', entries: [],
    })
    groups.get(key).entries.push(entry)
  }
  return (
    <div className="lesson-all-groups">
      {[...groups.values()].map(group => (
        <section key={group.key} className="lesson-all-topic" aria-label={group.title}>
          <h4>{group.title}</h4>
          <ul className="lesson-cycle-list">
            {group.entries.map(({ lesson }) => {
              const isActive = activeIds.has(lesson.id)
              const isPlanned = plannedIds.has(lesson.id)
              const canPlan = canEdit && Boolean(planned) && !isActive
              const action = !canPlan ? null : isPlanned ? 'Usuń z planu' : 'Dodaj do planu'
              return (
                <LessonTile key={lesson.id} lesson={lesson} courseId={courseId} versionId={versionId}
                  className="lesson-all-card"
                  tabIndex={-1}
                  tileRef={element => {
                    if (isActive && (!canEdit || progress(lesson.id).status === 'done')) {
                      buttonRefs.current[lesson.id] = element
                    }
                  }}
                  draggable={Boolean(canPlan && movable)}
                  onDragStart={event => {
                    event.dataTransfer.setData(dragType, String(lesson.id))
                    event.dataTransfer.effectAllowed = 'move'
                  }}>
                  <span className="lesson-all-status">{progressLabels[progress(lesson.id).status] || progressLabels.todo}</span>
                  {canEdit && isActive && <LessonStatusControl lesson={lesson} current={progress(lesson.id)}
                    targets={allowed(lesson.id)} movable={movable} onMove={onStatusMove} buttonRefs={buttonRefs} />}
                  {action && <button ref={element => { buttonRefs.current[lesson.id] = element }}
                    type="button" className="button button-secondary" disabled={!movable}
                    aria-label={`${action}: ${lesson.title}`}
                    onClick={() => (isPlanned ? remove : add)(lesson.id)}>
                    {action}
                  </button>}
                </LessonTile>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}

export default function LessonCycleBoard({ instanceId, content, canEdit, busy: instanceBusy = false, refreshKey }) {
  const state = useLoader(() => coursesApi.getLessonCycles(instanceId), [instanceId, refreshKey])
  const [lessonView, setLessonView] = useState('active')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [announcement, setAnnouncement] = useState('')
  const inFlight = useRef(false)
  const [refreshError, setRefreshError] = useState(null)
  const buttonRefs = useRef({})
  const planHeadingRef = useRef(null)
  const activeHeadingRef = useRef(null)
  const [focusRequest, setFocusRequest] = useState(null)
  useLayoutEffect(() => {
    if (!focusRequest) return
    const heading = focusRequest.target === 'active' ? activeHeadingRef.current : planHeadingRef.current
    const action = focusRequest.lessonId != null ? buttonRefs.current[focusRequest.lessonId] : null
    // Run after the projection and enabled controls commit, including remounted forms.
    const focusTarget = action || heading
    focusTarget?.focus()
  }, [focusRequest])
  const movable = canEdit && !busy && !instanceBusy && !refreshError && state.status === 'ready'

  async function refreshProjection() {
    if (inFlight.current) return
    inFlight.current = true
    setBusy(true)
    try {
      state.setData(await coursesApi.getLessonCycles(instanceId))
      setRefreshError(null)
    } catch (failure) {
      setRefreshError(failure)
    } finally {
      inFlight.current = false
      setBusy(false)
      setFocusRequest({ target: 'active' })
    }
  }

  async function mutate(operation, lessonId, target = 'plan', refreshOnConflict = false) {
    if (!movable || inFlight.current) return
    inFlight.current = true
    setBusy(true)
    setError(null)
    setAnnouncement('')
    try {
      // Each mutation returns the authoritative projection, including the surviving plan.
      state.setData(await operation())
      if (refreshOnConflict) setAnnouncement('Zapisano status lekcji.')
    } catch (failure) {
      setError(failure.message)
      if (refreshOnConflict && failure.status === 409) {
        // Never replay a rejected transition against a new revision.
        try {
          state.setData(await coursesApi.getLessonCycles(instanceId))
          setRefreshError(null)
        } catch (refreshFailure) {
          setRefreshError(refreshFailure)
        }
      }
    } finally {
      inFlight.current = false
      setBusy(false)
      setFocusRequest({ lessonId, target })
    }
  }

  if (state.status === 'loading') return <LoadingMessage>Ładowanie cykli lekcji…</LoadingMessage>
  if (state.status === 'error') return <ErrorMessage onRetry={state.reload}>Nie udało się wczytać cykli lekcji. {state.error.message}</ErrorMessage>

  const { active_cycle: active, planned_cycle: planned } = state.data
  const entries = lessonGroups(content.nodes)
  const activeIds = new Set(active?.lesson_ids || [])
  const plannedIds = new Set(planned?.lesson_ids || [])
  const activeEntries = entries.filter(({ lesson }) => activeIds.has(lesson.id))
  const plannedEntries = entries.filter(({ lesson }) => plannedIds.has(lesson.id))
  const backlog = entries.filter(({ lesson }) => !activeIds.has(lesson.id) && !plannedIds.has(lesson.id))
  const { progress, allowed } = lessonWorkflow(state.data)
  const add = id => mutate(() => coursesApi.addLessonToCycle(instanceId, planned.id, id), id)
  const remove = id => mutate(() => coursesApi.removeLessonFromCycle(instanceId, planned.id, id), id)
  function moveStatus(lessonId, status, previous) {
    if (!activeIds.has(lessonId) || !allowed(lessonId).includes(status)) return
    return mutate(() => coursesApi.updateLessonProgress(
      instanceId, active.id, lessonId,
      { status, expected_status: previous.status, expected_revision: previous.revision },
    ), lessonId, 'active', true)
  }

  function dropToPlan(event) {
    event.preventDefault()
    if (!movable || !planned || inFlight.current) return
    const value = event.dataTransfer.getData(dragType)
    if (!/^\d+$/.test(value)) return
    const id = Number(value)
    // Ignore external/unpinned IDs and attempts to move an active assignment.
    if (!backlog.some(({ lesson }) => lesson.id === id)) return
    add(id)
  }
  function dragOver(event) {
    if (movable && planned) {
      event.preventDefault()
      event.dataTransfer.dropEffect = 'move'
    }
  }

  return (
    <section className="course-section lesson-cycle-board" aria-label="Cykle lekcji" aria-busy={busy || instanceBusy}>
      <h2>Cykle lekcji</h2>
      <p className="instance-note">Cykl rozpoczynasz i kończysz ręcznie. Daty nie uruchamiają ani nie zamykają cyklu.</p>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {refreshError && <ErrorMessage onRetry={refreshProjection}>
        Nie udało się odświeżyć tablicy. Zmiany są zablokowane do odświeżenia. {refreshError.message}
      </ErrorMessage>}
      <p role="status" aria-live="polite" className={busy || announcement ? 'courses-status' : 'sr-only'}>
        {busy ? 'Zapisywanie cyklu lekcji…' : announcement}
      </p>

      <section className="lesson-cycle-zone" aria-label={lessonView === 'active' ? 'Aktywny cykl' : 'Widok wszystkich lekcji'}>
        <h3 ref={activeHeadingRef} tabIndex={-1}>{lessonView === 'active' ? 'Aktywny cykl' : 'Wszystkie lekcje'}</h3>
        {lessonView === 'active' && active && <p>{displayCycleDates(active)}</p>}
        <div className="lesson-cycle-view-switch" role="group" aria-label="Widok lekcji">
          <button type="button" className="button button-secondary" aria-pressed={lessonView === 'active'}
            onClick={() => setLessonView('active')}>Tematy</button>
          <button type="button" className="button button-secondary" aria-pressed={lessonView === 'all'}
            onClick={() => setLessonView('all')}>Wszystkie</button>
        </div>
        {lessonView === 'active' ? active
          ? activeEntries.length ? <LessonProgressBoard entries={activeEntries} projection={state.data}
            courseId={content.course} versionId={content.id}
            canEdit={canEdit} movable={movable} buttonRefs={buttonRefs}
            onMove={moveStatus} /> : <EmptyMessage>Cykl nie zawiera lekcji.</EmptyMessage>
          : <EmptyMessage>Brak aktywnego cyklu.</EmptyMessage>
          : <section className="lesson-progress-all" aria-label="Wszystkie lekcje">
            {entries.length ? <AllLessonsList entries={entries} progress={progress}
              activeIds={activeIds} plannedIds={plannedIds} planned={planned} movable={movable}
              canEdit={canEdit} add={add} remove={remove} buttonRefs={buttonRefs}
              allowed={allowed} onStatusMove={moveStatus}
              courseId={content.course} versionId={content.id} />
              : <EmptyMessage>Brak lekcji w tej wersji.</EmptyMessage>}
          </section>}
        {active && <>
          {canEdit && <button type="button" className="button button-secondary" disabled={!movable}
            onClick={() => mutate(() => coursesApi.closeLessonCycle(instanceId, active.id), undefined, 'active')}>Zakończ cykl lekcji</button>}
        </>}
      </section>

      <section className="lesson-cycle-zone" aria-label="Plan kolejnego cyklu" onDragOver={dragOver} onDrop={dropToPlan}>
        <h3 ref={planHeadingRef} tabIndex={-1}>Plan kolejnego cyklu</h3>
        {planned ? <>
          <p>{displayCycleDates(planned)}</p>
          {plannedEntries.length
            ? <p className="instance-note">Wybrane lekcje i akcje planu są dostępne w widoku „Wszystkie”.</p>
            : <EmptyMessage>Plan nie zawiera lekcji.</EmptyMessage>}
        </> : <EmptyMessage>Brak planu kolejnego cyklu. Utwórz plan, aby przypisać lekcje.</EmptyMessage>}
        {canEdit && <PlanDates key={`${planned?.id || 'new'}:${planned?.start_date}:${planned?.end_date}`}
          planned={planned} disabled={!movable}
          onSave={dates => mutate(() => planned
            ? coursesApi.updateLessonCycle(instanceId, planned.id, dates)
            : coursesApi.createLessonCycle(instanceId, dates))} />}
        {planned && canEdit && <>
          {active && <p className="instance-note">Przed rozpoczęciem planu zakończ aktywny cykl. Plan pozostanie zapisany.</p>}
          <button type="button" className="button" disabled={!movable || Boolean(active)}
            onClick={() => mutate(() => coursesApi.startLessonCycle(instanceId, planned.id), undefined, 'active')}>Rozpocznij cykl lekcji</button>
        </>}
      </section>

    </section>
  )
}
