import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { VersionManagementLinks } from './VersionLifecycle.jsx'
import { stateLabels } from './EditorParts.jsx'
import { coursesApi } from './api.js'
import { approvalLabels, visibilityLabels } from './format.js'
import { useCurrentUser, useLoader } from './RequireAuth.jsx'
import { canManageCourse, isAdmin } from './managementPolicy.js'
import DeleteCourseButton from './DeleteCourseButton.jsx'
import ManagementError, { ManagementErrorDetails } from './ManagementError.jsx'
import { EmptyMessage, ErrorMessage, LoadingMessage } from './StateViews.jsx'

export default function MyCoursesPage() {
  const courses = useLoader(() => coursesApi.listMine(), [])
  const user = useCurrentUser()
  const admin = isAdmin(user)
  const heading = useRef(null)
  const location = useLocation()
  const [actionError, setActionError] = useState(null)
  const [notice, setNotice] = useState(location.state?.courseNotice ?? null)
  const [busy, setBusy] = useState(null)
  const lock = useRef(false)
  useEffect(() => {
    if (location.state?.courseNotice) heading.current?.focus()
  }, [location.key, location.state])

  async function runAction(course, action) {
    if (lock.current) return
    lock.current = true
    setBusy(course.id)
    setActionError(null)
    setNotice(null)
    try {
      const updated = await action(course)
      courses.setData((list) => list.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)))
    } catch (error) {
      setActionError(error)
    } finally {
      lock.current = false
      setBusy(null)
    }
  }

  return (
    <main className="courses-page page-width">
      <header className="courses-header">
        <p className="eyebrow">{admin ? 'Panel administratora' : 'Panel mentora'}</p>
        <h1 ref={heading} tabIndex={-1}>{admin ? 'Wszystkie kursy' : 'Moje kursy'}</h1>
        <Link className="button button-primary" to="/kursy/moje/nowy">Nowy kurs</Link>
      </header>

      {courses.status === 'loading' && <LoadingMessage>Ładowanie kursów…</LoadingMessage>}
      {courses.status === 'error' && (
        <ErrorMessage onRetry={courses.reload}>Nie udało się wczytać kursów. <ManagementErrorDetails error={courses.error} /></ErrorMessage>
      )}
      {courses.status === 'ready' && courses.data.length === 0 && (
        <EmptyMessage>{admin ? 'Brak kursów do zarządzania.' : 'Nie masz jeszcze kursów.'}</EmptyMessage>
      )}
      <ManagementError error={actionError} />
      {(notice || busy !== null) && <p role="status" aria-live="polite">{busy !== null ? 'Trwa operacja…' : notice}</p>}
      {courses.status === 'ready' && courses.data.length > 0 && (
        <ul className="course-grid">
          {courses.data.map((course) => (
            <li key={course.id}>
              <article className="course-card">
                <h2><Link to={`/kursy/moje/${course.id}`}>{course.working_version?.title || course.current_published_version?.title || course.title || 'Kurs bez tytułu'}</Link></h2>
                <p className="course-meta">
                  <span>{visibilityLabels[course.visibility]}</span>
                  {' · '}
                  <span>{stateLabels[course.working_version?.state] || (course.current_published_version ? 'Opublikowana' : approvalLabels[course.approval_status])}</span>
                  {!course.is_active && <span className="badge badge-muted">nieaktywny</span>}
                </p>
                <VersionManagementLinks course={course} onError={setActionError} />
                {canManageCourse(user, course) && <div className="course-actions">
                  {course.is_active && (
                    <button type="button" className="button button-secondary" disabled={busy !== null} onClick={() => runAction(course, (item) => coursesApi.updateCourse(item.id, { is_active: false }))}>
                      Dezaktywuj
                    </button>
                  )}
                  {!course.is_active && (
                    <button type="button" className="button button-secondary" disabled={busy !== null} onClick={() => runAction(course, (item) => coursesApi.updateCourse(item.id, { is_active: true }))}>
                      Reaktywuj
                    </button>
                  )}
                  <DeleteCourseButton course={course} disabled={busy !== null} onError={error => { setNotice(null); setActionError(error) }} onResult={updated => {
                    courses.setData(list => updated ? list.map(item => item.id === course.id ? { ...item, ...updated } : item) : list.filter(item => item.id !== course.id))
                    setNotice(updated ? 'Zarchiwizowano kurs. Istniejące instancje zachowano.' : 'Trwale usunięto kurs.')
                    if (!updated) heading.current?.focus()
                  }} />
                </div>}
              </article>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
