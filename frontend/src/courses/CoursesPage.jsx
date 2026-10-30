import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { coursesApi } from './api.js'
import { formatHours } from './format.js'
import { isStudent, useCurrentUser, useLoader } from './RequireAuth.jsx'
import { EmptyMessage, ErrorMessage, LoadingMessage } from './StateViews.jsx'

export function JoinCourseButton({ courseId, disabled = false }) {
  const navigate = useNavigate()
  const [pending, setPending] = useState(false)
  const [taken, setTaken] = useState(false)
  const [error, setError] = useState(null)

  async function join() {
    setPending(true)
    setError(null)
    try {
      const instance = await coursesApi.joinCourse(courseId)
      navigate(`/kursy/instancje/${instance.id}`)
    } catch (joinError) {
      if (joinError.code === 'slot_taken') setTaken(true)
      setError(joinError.message)
      setPending(false)
    }
  }

  return (
    <div className="join-course">
      <button
        type="button"
        className="button button-primary"
        disabled={disabled || taken || pending}
        onClick={join}
      >
        {pending ? 'Dołączanie…' : 'Dołącz'}
      </button>
      {error && <p className="courses-error" role="alert">{error}</p>}
    </div>
  )
}

export function activeInstanceOf(instances, user) {
  return instances.find((instance) => instance.status === 'active' && instance.student === user.id) ?? null
}

export default function CoursesPage() {
  const user = useCurrentUser()
  const student = isStudent(user)
  const catalog = useLoader(async () => {
    const [courses, instances] = await Promise.all([
      coursesApi.listCourses(),
      student ? coursesApi.listInstances() : Promise.resolve([]),
    ])
    return { courses, instances }
  }, [student, user.id])

  return (
    <main className="courses-page page-width">
      <header className="courses-header">
        <p className="eyebrow">Przestrzeń kursów</p>
        <h1>Kursy</h1>
      </header>

      {catalog.status === 'loading' && <LoadingMessage>Ładowanie kursów…</LoadingMessage>}
      {catalog.status === 'error' && (
        <ErrorMessage onRetry={catalog.reload}>
          Nie udało się wczytać kursów. {catalog.error.message}
        </ErrorMessage>
      )}
      {catalog.status === 'ready' && <CourseCatalog data={catalog.data} student={student} user={user} />}
    </main>
  )
}

function CourseCatalog({ data, student, user }) {
  const active = student ? activeInstanceOf(data.instances, user) : null

  return (
    <>
      {active && (
        <p className="courses-banner">
          Masz już aktywny kurs. <Link to={`/kursy/instancje/${active.id}`}>Przejdź do swojej instancji</Link>
        </p>
      )}
      {data.courses.length === 0 && <EmptyMessage>Brak kursów do wyświetlenia.</EmptyMessage>}
      {data.courses.length > 0 && (
        <ul className="course-grid">
          {data.courses.map((course) => (
            <li key={course.id}>
              <article className="course-card">
                <h2>{course.title}</h2>
                {course.description && <p>{course.description}</p>}
                <p className="course-meta">
                  Zadania: {course.tasks.length}
                  {' · '}
                  {formatHours(course.tasks.reduce((sum, task) => sum + Number(task.hours), 0))}
                </p>
                <div className="course-actions">
                  <Link className="text-link" to={`/kursy/${course.id}`} aria-label={`Zobacz kurs: ${course.title}`}>
                    Zobacz kurs
                  </Link>
                  {student && <JoinCourseButton courseId={course.id} disabled={Boolean(active)} />}
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
