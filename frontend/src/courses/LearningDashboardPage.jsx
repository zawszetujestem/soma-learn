import { Link } from 'react-router-dom'
import { coursesApi } from './api.js'
import { formatDateTime, formatPercent } from './format.js'
import { useCurrentUser, useLoader } from './RequireAuth.jsx'
import { EmptyMessage, ErrorMessage, LoadingMessage } from './StateViews.jsx'

// Only instances in which the current user is the learner belong here; an
// instance the user merely mentors is never shown, even if the API returned it.
export function splitLearning(data, user) {
  const own = (list) => (Array.isArray(list) ? list : []).filter((item) => item.student == null || item.student === user.id)
  if (Array.isArray(data)) {
    const mine = own(data)
    return { active: mine.filter((item) => item.status === 'active'), history: mine.filter((item) => item.status !== 'active') }
  }
  return { active: own(data?.active), history: own(data?.history) }
}

const titleOf = (instance) => instance.course_title || 'Kurs bez tytułu'

function ActiveCard({ instance }) {
  const title = titleOf(instance)
  return (
    <article className="course-card learning-card">
      <h3>{title}</h3>
      <p className="course-meta">Postęp: <span>{formatPercent(instance.progress ?? 0)}</span></p>
      {instance.active_cycle !== undefined && (
        <p className="course-meta">{instance.active_cycle ? 'Cykl w toku' : 'Brak aktywnego cyklu'}</p>
      )}
      <div className="course-actions">
        <Link className="button button-primary" to={`/kursy/instancje/${instance.id}`} aria-label={`Otwórz tablicę: ${title}`}>
          Otwórz tablicę
        </Link>
      </div>
    </article>
  )
}

function HistoryCard({ instance }) {
  const title = titleOf(instance)
  return (
    <article className="course-card learning-card">
      <h3>{title}</h3>
      {instance.closed_at && <p className="course-meta">Zakończono: {formatDateTime(instance.closed_at)}</p>}
      <p className="course-meta">Postęp przy zakończeniu: <span>{formatPercent(instance.progress ?? 0)}</span></p>
      <div className="course-actions">
        <Link className="button button-secondary" to={`/kursy/instancje/${instance.id}`} aria-label={`Zobacz historię: ${title}`}>
          Zobacz historię
        </Link>
      </div>
    </article>
  )
}

export default function LearningDashboardPage() {
  const user = useCurrentUser()
  const learning = useLoader(() => coursesApi.listMyInstances(), [user.id])

  return (
    <main className="courses-page page-width learning-page">
      <header className="courses-header">
        <p className="eyebrow">Twoja przestrzeń</p>
        <h1>Moja nauka</h1>
        <p>Kursy, których się uczysz. Otwórz tablicę, aby wybrać zadania na cykl i śledzić postęp we własnym tempie.</p>
        <Link className="text-link" to="/kursy">Przeglądaj katalog kursów</Link>
      </header>

      {learning.status === 'loading' && <LoadingMessage>Ładowanie Twojej nauki…</LoadingMessage>}
      {learning.status === 'error' && (
        <ErrorMessage onRetry={learning.reload}>Nie udało się wczytać Twojej nauki. {learning.error.message}</ErrorMessage>
      )}
      {learning.status === 'ready' && <LearningLists {...splitLearning(learning.data, user)} />}
    </main>
  )
}

function LearningLists({ active, history }) {
  return (
    <>
      <section className="course-section" aria-labelledby="learning-active-title">
        <h2 id="learning-active-title">Aktywne kursy</h2>
        {active.length === 0 ? (
          <>
            <EmptyMessage>Nie uczysz się jeszcze żadnego kursu.</EmptyMessage>
            <div className="course-actions">
              <Link className="button button-primary" to="/kursy">Przejdź do katalogu kursów</Link>
            </div>
          </>
        ) : (
          <ul className="course-grid">
            {active.map((instance) => <li key={instance.id}><ActiveCard instance={instance} /></li>)}
          </ul>
        )}
      </section>
      <section className="course-section" aria-labelledby="learning-history-title">
        <h2 id="learning-history-title">Zakończone kursy</h2>
        {history.length === 0 ? (
          <EmptyMessage>Nie masz jeszcze zakończonych kursów.</EmptyMessage>
        ) : (
          <ul className="course-grid">
            {history.map((instance) => <li key={instance.id}><HistoryCard instance={instance} /></li>)}
          </ul>
        )}
      </section>
    </>
  )
}