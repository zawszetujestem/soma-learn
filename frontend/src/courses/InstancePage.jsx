import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import VersionContent from './VersionContent.jsx'
import { contentApi, coursesApi } from './api.js'
import { formatPercent, instanceStatusLabels } from './format.js'
import { useCurrentUser, useLoader } from './RequireAuth.jsx'
import { InstanceControls, TaskBoard } from './InstanceParts.jsx'
import { ErrorMessage, LoadingMessage } from './StateViews.jsx'

export function canManageInstance(user, instance) {
  if (instance.mentor != null) return instance.mentor === user.id
  return instance.student === user.id
}

export default function InstancePage() {
  const { id } = useParams()
  const user = useCurrentUser()
  const detail = useLoader(async () => {
    const instance = await coursesApi.getInstance(id)
    const content = await contentApi.instanceContent(id)
    return { instance, content }
  }, [id])

  if (detail.status === 'loading') {
    return <main className="courses-page page-width"><LoadingMessage>Ładowanie instancji…</LoadingMessage></main>
  }
  if (detail.status === 'error') {
    if (detail.error.kind === 'notFound') {
      return (
        <main className="courses-page page-width">
          <p className="courses-empty">Nie znaleziono instancji.</p><ErrorMessage>{detail.error.message}</ErrorMessage>
          <Link className="text-link" to="/kursy">Wróć do listy kursów</Link>
        </main>
      )
    }
    return (
      <main className="courses-page page-width">
        <ErrorMessage onRetry={detail.reload}>Nie udało się wczytać instancji. {detail.error.message}</ErrorMessage>
      </main>
    )
  }

  return <InstanceView user={user} data={detail.data} setData={detail.setData} id={id} />
}

function InstanceView({ user, data, setData, id }) {
  const { instance, content } = data
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const canManage = canManageInstance(user, instance)
  const isActive = instance.status === 'active'
  const canEdit = isActive && canManage

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

  function changeTask(task, status) {
    return run(async () => {
      await coursesApi.updateInstanceTask(instance.id, task.id, status)
      const fresh = await coursesApi.getInstance(id)
      setData((current) => ({ ...current, instance: fresh }))
    })
  }

  function changeState(operation) {
    return run(async () => {
      const updated = await operation(instance.id)
      setData((current) => ({ ...current, instance: { ...current.instance, ...updated } }))
    })
  }

  return (
    <main className="courses-page page-width">
      <header className="courses-header">
        <p className="eyebrow">{instanceStatusLabels[instance.status]}</p>
        <h1>{content.title}</h1>
        <p>Postęp: <span>{formatPercent(instance.progress)}</span></p>
        <Link className="text-link" to={`/kursy/${instance.course}`}>Wróć do kursu</Link>
      </header>

      {!isActive && (
        <p className="courses-banner">Instancja jest zamknięta i jest tylko do odczytu.</p>
      )}
      {isActive && !canManage && (
        <p className="courses-banner">Mentor prowadzi tę instancję. Statusy zadań są tylko do odczytu.</p>
      )}
      {error && <p className="courses-error" role="alert">{error}</p>}

      {canManage && (
        <div className="course-actions">
          <InstanceControls
            instance={instance}
            busy={busy}
            onClose={() => changeState(coursesApi.closeInstance)}
            onResume={() => changeState(coursesApi.resumeInstance)}
          />
        </div>
      )}

      <VersionContent version={content} courseId={instance.course} student={content.course_owner !== user.id && !user.roles.includes('admin')} />
      <section className="course-section" aria-labelledby="instance-tasks-title">
        <h2 id="instance-tasks-title">Zadania</h2>
        <TaskBoard
          tasks={instance.tasks}
          readOnly={!canEdit || busy}
          onChange={changeTask}
        />
      </section>
    </main>
  )
}
