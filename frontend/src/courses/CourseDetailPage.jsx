import { Link, useParams } from 'react-router-dom'
import { coursesApi } from './api.js'
import { approvalLabels, formatHours } from './format.js'
import { isStudent, useCurrentUser, useLoader } from './RequireAuth.jsx'
import { activeInstanceOf, JoinCourseButton } from './CoursesPage.jsx'
import { ErrorMessage, LoadingMessage } from './StateViews.jsx'

export default function CourseDetailPage() {
  const { id } = useParams()
  const user = useCurrentUser()
  const student = isStudent(user)
  const detail = useLoader(async () => {
    const [course, instances] = await Promise.all([
      coursesApi.getCourse(id),
      student ? coursesApi.listInstances() : Promise.resolve([]),
    ])
    return { course, instances }
  }, [id, student, user.id])

  if (detail.status === 'loading') {
    return <main className="courses-page page-width"><LoadingMessage>Ładowanie kursu…</LoadingMessage></main>
  }
  if (detail.status === 'error') {
    if (detail.error.kind === 'notFound') {
      return (
        <main className="courses-page page-width">
          <p className="courses-empty">Nie znaleziono kursu.</p>
          <Link className="text-link" to="/kursy">Wróć do listy kursów</Link>
        </main>
      )
    }
    return (
      <main className="courses-page page-width">
        <ErrorMessage onRetry={detail.reload}>Nie udało się wczytać kursu. {detail.error.message}</ErrorMessage>
      </main>
    )
  }

  const { course, instances } = detail.data
  const active = student ? activeInstanceOf(instances, user) : null
  const isOwner = course.owner === user.id

  return (
    <main className="courses-page page-width">
      <header className="courses-header">
        <p className="eyebrow">{approvalLabels[course.approval_status]}</p>
        <h1>{course.title}</h1>
        {course.description && <p>{course.description}</p>}
      </header>

      <section aria-labelledby="course-tasks-title" className="course-section">
        <h2 id="course-tasks-title">Zadania w kursie</h2>
        {course.tasks.length === 0 ? (
          <p className="courses-empty">Ten kurs nie ma jeszcze zadań.</p>
        ) : (
          <ol className="task-list">
            {course.tasks.map((task) => (
              <li key={task.id}>
                <span>{task.title}</span> <span className="task-hours">{formatHours(task.hours)}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      {student && <JoinCourseButton courseId={course.id} disabled={Boolean(active)} />}
      {active && <p className="courses-banner">Masz już aktywny kurs. <Link to={`/kursy/instancje/${active.id}`}>Przejdź do swojej instancji</Link></p>}
      {isOwner && <Link className="text-link" to={`/kursy/moje/${course.id}`}>Zarządzaj kursem</Link>}
    </main>
  )
}
