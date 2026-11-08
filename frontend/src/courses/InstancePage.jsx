import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import VersionContent from './VersionContent.jsx'
import { contentApi, coursesApi } from './api.js'
import { formatPercent, instanceStatusLabels } from './format.js'
import { useCurrentUser, useLoader } from './RequireAuth.jsx'
import { InstanceControls } from './InstanceParts.jsx'
import LessonCycleBoard from './LessonCycleBoard.jsx'
import { ErrorMessage, LoadingMessage } from './StateViews.jsx'

// The learner always manages their own instance; an assigned mentor keeps the same rights.
export function canManageInstance(user, instance) {
  return instance.student === user.id || (instance.mentor != null && instance.mentor === user.id)
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

  // Instance close/resume refreshes permissions and the separate lesson projection.
  async function mutate(operation) {
    setError(null)
    setBusy(true)
    try {
      await operation()
      const fresh = await coursesApi.getInstance(id)
      setData((current) => ({ ...current, instance: fresh }))
    } catch (actionError) {
      setError(actionError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="courses-page page-width instance-page" aria-busy={busy}>
      <header className="courses-header">
        <p className="eyebrow">{instanceStatusLabels[instance.status]}</p>
        <h1>{content.title}</h1>
        <p>Postęp: <span>{formatPercent(instance.progress)}</span></p>
        <div className="course-actions">
          <Link className="text-link" to={`/kursy/${instance.course}`}>Wróć do kursu</Link>
          <Link className="text-link" to="/nauka">Moja nauka</Link>
        </div>
      </header>

      {!isActive && (
        <p className="courses-banner">Instancja jest zamknięta i jest tylko do odczytu.</p>
      )}
      {isActive && !canManage && (
        <p className="courses-banner">Tablicę zmieniają osoba ucząca się i przypisany mentor. Ten widok jest tylko do odczytu.</p>
      )}
      {error && <p className="courses-error" role="alert">{error}</p>}
      <p role="status" aria-live="polite" className={busy ? 'courses-status' : 'sr-only'}>{busy ? 'Zapisywanie zmian…' : ''}</p>

      {canManage && (
        <div className="course-actions instance-controls">
          {isActive && (
            <p className="instance-note">
              Możesz zakończyć kurs w dowolnym momencie, niezależnie od postępu. Zamknięcie instancji nie kończy cyklu lekcji. Aktywny cykl i plan zostaną zachowane w widoku tylko do odczytu, a kurs będzie można wznowić.
            </p>
          )}
          <InstanceControls
            instance={instance}
            busy={busy}
            onClose={() => mutate(() => coursesApi.closeInstance(instance.id))}
            onResume={() => mutate(() => coursesApi.resumeInstance(instance.id))}
          />
        </div>
      )}

      <LessonCycleBoard key={instance.id} instanceId={instance.id} content={content}
        canEdit={canEdit} busy={busy} refreshKey={instance} />

      <VersionContent version={content} courseId={instance.course} student={content.course_owner !== user.id && !user.roles.includes('admin')} />
    </main>
  )
}