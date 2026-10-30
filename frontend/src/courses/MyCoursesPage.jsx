import { useState } from 'react'
import { Link } from 'react-router-dom'
import { coursesApi } from './api.js'
import { approvalLabels, visibilityLabels } from './format.js'
import { useLoader } from './RequireAuth.jsx'
import { EmptyMessage, ErrorMessage, LoadingMessage } from './StateViews.jsx'

export default function MyCoursesPage() {
  const courses = useLoader(() => coursesApi.listMine(), [])
  const [actionError, setActionError] = useState(null)

  async function runAction(course, action) {
    setActionError(null)
    try {
      const updated = await action(course)
      courses.setData((list) => list.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)))
    } catch (error) {
      setActionError(error.message)
    }
  }

  return (
    <main className="courses-page page-width">
      <header className="courses-header">
        <p className="eyebrow">Panel mentora</p>
        <h1>Moje kursy</h1>
        <Link className="button button-primary" to="/kursy/moje/nowy">Nowy kurs</Link>
      </header>

      {courses.status === 'loading' && <LoadingMessage>Ładowanie kursów…</LoadingMessage>}
      {courses.status === 'error' && (
        <ErrorMessage onRetry={courses.reload}>Nie udało się wczytać kursów. {courses.error.message}</ErrorMessage>
      )}
      {courses.status === 'ready' && courses.data.length === 0 && (
        <EmptyMessage>Nie masz jeszcze kursów.</EmptyMessage>
      )}
      {courses.status === 'ready' && actionError && <p className="courses-error" role="alert">{actionError}</p>}
      {courses.status === 'ready' && courses.data.length > 0 && (
        <ul className="course-grid">
          {courses.data.map((course) => (
            <li key={course.id}>
              <article className="course-card">
                <h2><Link to={`/kursy/moje/${course.id}`}>{course.title}</Link></h2>
                <p className="course-meta">
                  <span>{visibilityLabels[course.visibility]}</span>
                  {' · '}
                  <span>{approvalLabels[course.approval_status]}</span>
                  {!course.is_active && <span className="badge badge-muted">nieaktywny</span>}
                </p>
                <div className="course-actions">
                  {course.approval_status === 'rejected' && (
                    <button type="button" className="button button-secondary" onClick={() => runAction(course, (item) => coursesApi.resubmitCourse(item.id))}>
                      Wyślij ponownie
                    </button>
                  )}
                  {course.is_active && (
                    <button type="button" className="button button-secondary" onClick={() => runAction(course, (item) => coursesApi.updateCourse(item.id, { is_active: false }))}>
                      Dezaktywuj
                    </button>
                  )}
                  {!course.is_active && (
                    <button type="button" className="button button-secondary" onClick={() => runAction(course, (item) => coursesApi.updateCourse(item.id, { is_active: true }))}>
                      Reaktywuj
                    </button>
                  )}
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
