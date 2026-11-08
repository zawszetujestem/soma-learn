import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { coursesApi } from './api.js'
import { formatHours } from './format.js'
import { isStudent, isManager, useCurrentUser, useLoader } from './RequireAuth.jsx'
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

// Learners may have active instances of several different courses at once, so
// an active instance only blocks joining the same course again.
export function activeInstanceOf(instances, user, courseId) {
  return instances.find((instance) => instance.status === 'active'
    && instance.student === user.id
    && (courseId === undefined || instance.course === courseId)) ?? null
}

export function ActiveCourseNotice({ instance }) {
  return (
    <p className="courses-banner">
      Uczysz się już tego kursu. <Link to={`/kursy/instancje/${instance.id}`}>Przejdź do swojej instancji</Link>
    </p>
  )
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
        {isManager(user) && <Link className="button button-primary" to="/kursy/moje/nowy">Utwórz nowy</Link>}
        {isManager(user) && <Link className="text-link" to="/kursy/moje">Moje kursy</Link>}
        {user.roles.includes('admin') && <Link className="text-link" to="/course-moderation/">Moderacja kursów</Link>}
        {student && <Link className="text-link" to="/nauka">Moja nauka</Link>}
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
  return (
    <>
      {data.courses.length === 0 && <EmptyMessage>Brak kursów do wyświetlenia.</EmptyMessage>}
      {data.courses.length > 0 && (
        <ul className="course-grid">
          {data.courses.map((course) => {
            const active = student ? activeInstanceOf(data.instances, user, course.id) : null
            return (
            <li key={course.id}>
              <article className="course-card">
                <h2>{course.title}</h2>
                {course.description && <p>{course.description}</p>}
                <p>{course.scope?.name} {course.subject?.name}</p>
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
                {active && <ActiveCourseNotice instance={active} />}
              </article>
            </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
