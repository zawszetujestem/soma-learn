import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { coursesApi } from './api.js'
import { approvalLabels, formatHours, formatPercent, instanceStatusLabels, visibilityLabels } from './format.js'
import { useCurrentUser, useLoader } from './RequireAuth.jsx'
import { InstanceControls, TaskBoard } from './InstanceParts.jsx'
import { EmptyMessage, ErrorMessage, LoadingMessage } from './StateViews.jsx'

function normalizeHours(value) {
  return value.trim().replace(',', '.')
}

export function validateTask({ title, hours }) {
  if (!title.trim()) return 'Podaj tytuł zadania.'
  const number = Number(normalizeHours(hours))
  if (!normalizeHours(hours) || !Number.isFinite(number) || number <= 0) {
    return 'Godziny muszą być większe od zera.'
  }
  return null
}

export function inviteUrl(token) {
  return `${window.location.origin}/kursy/dolacz/${token}`
}

export default function MentorCourseDetailPage() {
  const { id } = useParams()
  const user = useCurrentUser()
  const courseId = Number(id)
  const detail = useLoader(async () => {
    const [course, count, instances] = await Promise.all([
      coursesApi.getMine(id),
      coursesApi.studentsCount(id),
      coursesApi.listInstances(),
    ])
    return {
      course,
      count,
      instances: instances.filter((instance) => instance.course === courseId && instance.mentor === user.id),
    }
  }, [id, user.id])

  if (detail.status === 'loading') {
    return <main className="courses-page page-width"><LoadingMessage>Ładowanie kursu…</LoadingMessage></main>
  }
  if (detail.status === 'error') {
    if (detail.error.kind === 'notFound') {
      return (
        <main className="courses-page page-width">
          <p className="courses-empty">Nie znaleziono kursu.</p>
          <Link className="text-link" to="/kursy/moje">Wróć do moich kursów</Link>
        </main>
      )
    }
    return (
      <main className="courses-page page-width">
        <ErrorMessage onRetry={detail.reload}>Nie udało się wczytać kursu. {detail.error.message}</ErrorMessage>
      </main>
    )
  }

  return <CourseManagement courseId={courseId} data={detail.data} setData={detail.setData} />
}

function CourseManagement({ courseId, data, setData }) {
  const { course, count, instances } = data
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function run(action) {
    setError(null)
    setBusy(true)
    try {
      await action()
    } catch (actionError) {
      setError(actionError.message)
    } finally {
      setBusy(false)
    }
  }

  function patchCourse(changes) {
    return run(async () => {
      const updated = await coursesApi.updateCourse(courseId, changes)
      setData((current) => ({ ...current, course: { ...current.course, ...updated } }))
    })
  }

  function replaceInstance(updated) {
    setData((current) => ({
      ...current,
      instances: current.instances.map((instance) => (instance.id === updated.id ? { ...instance, ...updated } : instance)),
    }))
  }

  function changeInstance(instance, operation) {
    return run(async () => {
      const updated = await operation(instance.id)
      const activeCount = await coursesApi.studentsCount(courseId)
      replaceInstance(updated)
      setData((current) => ({ ...current, count: activeCount }))
    })
  }

  function changeTaskStatus(instance, task, status) {
    return run(async () => {
      await coursesApi.updateInstanceTask(instance.id, task.id, status)
      // Postęp zmienia się po stronie backendu, więc pobieramy świeży stan tej instancji.
      const refreshed = await coursesApi.listInstances()
      const fresh = refreshed.find((item) => item.id === instance.id)
      if (fresh) replaceInstance(fresh)
    })
  }

  return (
    <main className="courses-page page-width">
      <header className="courses-header">
        <p className="eyebrow">
          {visibilityLabels[course.visibility]} · {approvalLabels[course.approval_status]}
          {!course.is_active && ' · nieaktywny'}
        </p>
        <h1>{course.title}</h1>
        <div className="course-actions">
          <button type="button" className="button button-secondary" disabled={busy} onClick={() => patchCourse({ is_active: !course.is_active })}>
            {course.is_active ? 'Dezaktywuj' : 'Reaktywuj'}
          </button>
        </div>
      </header>

      {error && <p className="courses-error" role="alert">{error}</p>}

      <CourseEditForm course={course} busy={busy} onSave={patchCourse} />

      {course.visibility === 'private' && course.invite_token && (
        <InviteLink
          token={course.invite_token}
          busy={busy}
          onRegenerate={() => run(async () => {
            const updated = await coursesApi.regenerateToken(courseId)
            setData((current) => ({ ...current, course: { ...current.course, ...updated } }))
          })}
        />
      )}

      <TasksSection
        course={course}
        busy={busy}
        onAdd={(task) => run(async () => {
          const created = await coursesApi.createTask(courseId, task)
          setData((current) => ({ ...current, course: { ...current.course, tasks: [...current.course.tasks, created] } }))
        })}
        onDelete={(task) => run(async () => {
          await coursesApi.deleteTask(courseId, task.id)
          setData((current) => ({ ...current, course: { ...current.course, tasks: current.course.tasks.filter((t) => t.id !== task.id) } }))
        })}
      />

      <section className="course-section" aria-labelledby="students-title">
        <h2 id="students-title">Uczniowie</h2>
        <p className="students-counter">Aktywni uczniowie: {count}</p>
        {instances.length === 0 && <EmptyMessage>Nie ma jeszcze uczniów w tym kursie.</EmptyMessage>}
        <ul className="student-list">
          {instances.map((instance) => (
            <li key={instance.id}>
              <article className="student-card">
                <h3>Uczeń nr {instance.student}</h3>
                <p>{instanceStatusLabels[instance.status]}</p>
                <p>Postęp: <span>{formatPercent(instance.progress)}</span></p>
                <InstanceControls
                  instance={instance}
                  busy={busy}
                  onClose={() => changeInstance(instance, coursesApi.closeInstance)}
                  onResume={() => changeInstance(instance, coursesApi.resumeInstance)}
                />
                <TaskBoard
                  tasks={instance.tasks}
                  readOnly={instance.status !== 'active' || busy}
                  onChange={(task, status) => changeTaskStatus(instance, task, status)}
                />
              </article>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}

function CourseEditForm({ course, busy, onSave }) {
  const [title, setTitle] = useState(course.title)
  const [description, setDescription] = useState(course.description ?? '')
  const publicApproved = course.visibility === 'public' && course.approval_status === 'approved'

  return (
    <section className="course-section" aria-labelledby="course-edit-title">
      <h2 id="course-edit-title">Dane kursu</h2>
      {publicApproved && (
        <p className="courses-banner">
          Zmiana treści zatwierdzonego kursu publicznego wymaga ponownego zatwierdzenia.
        </p>
      )}
      <form
        className="course-form"
        onSubmit={(event) => {
          event.preventDefault()
          onSave({ title: title.trim(), description: description.trim() })
        }}
      >
        <div className="field">
          <label htmlFor="edit-title">Tytuł kursu</label>
          <input id="edit-title" type="text" value={title} onChange={(event) => setTitle(event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="edit-description">Opis</label>
          <textarea id="edit-description" rows={3} value={description} onChange={(event) => setDescription(event.target.value)} />
        </div>
        <button type="submit" className="button button-secondary" disabled={busy}>Zapisz zmiany</button>
      </form>
    </section>
  )
}

function InviteLink({ token, busy, onRegenerate }) {
  const [confirming, setConfirming] = useState(false)
  const url = inviteUrl(token)

  async function copy() {
    await navigator.clipboard.writeText(url)
  }

  return (
    <section className="course-section" aria-labelledby="invite-title">
      <h2 id="invite-title">Zaproszenie do kursu</h2>
      <div className="field">
        <label htmlFor="invite-link">Link zaproszenia</label>
        <input id="invite-link" type="text" readOnly value={url} />
      </div>
      <div className="course-actions">
        <button type="button" className="button button-secondary" onClick={copy}>Kopiuj link</button>
        {!confirming && (
          <button type="button" className="button button-secondary" onClick={() => setConfirming(true)}>
            Regeneruj link
          </button>
        )}
        {confirming && (
          <>
            <p>Stary link przestanie działać. Czy na pewno wygenerować nowy?</p>
            <button
              type="button"
              className="button button-primary"
              disabled={busy}
              onClick={() => { setConfirming(false); onRegenerate() }}
            >
              Potwierdź regenerację
            </button>
            <button type="button" className="button button-secondary" onClick={() => setConfirming(false)}>Anuluj</button>
          </>
        )}
      </div>
    </section>
  )
}

function TasksSection({ course, busy, onAdd, onDelete }) {
  const [draft, setDraft] = useState({ title: '', hours: '' })
  const [error, setError] = useState(null)

  function submit(event) {
    event.preventDefault()
    const validation = validateTask(draft)
    setError(validation)
    if (validation) return
    onAdd({ title: draft.title.trim(), hours: normalizeHours(draft.hours) })
    setDraft({ title: '', hours: '' })
  }

  return (
    <section className="course-section" aria-labelledby="course-tasks-title">
      <h2 id="course-tasks-title">Zadania kursu</h2>
      {course.tasks.length === 0 && <EmptyMessage>Kurs nie ma jeszcze zadań.</EmptyMessage>}
      <ol className="task-list">
        {course.tasks.map((task) => (
          <li key={task.id}>
            <span>{task.title}</span> <span className="task-hours">{formatHours(task.hours)}</span>{' '}
            <button type="button" className="button button-secondary" disabled={busy} aria-label={`Usuń zadanie: ${task.title}`} onClick={() => onDelete(task)}>
              Usuń
            </button>
          </li>
        ))}
      </ol>
      <form className="course-form" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="task-title">Tytuł zadania</label>
          <input id="task-title" type="text" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="task-hours">Godziny</label>
          <input id="task-hours" type="text" inputMode="decimal" value={draft.hours} onChange={(event) => setDraft({ ...draft, hours: event.target.value })} />
        </div>
        {error && <p className="courses-error" role="alert">{error}</p>}
        <button type="submit" className="button button-secondary" disabled={busy}>Dodaj zadanie</button>
      </form>
    </section>
  )
}
