import { Link, Navigate, useParams } from 'react-router-dom'
import { coursesApi } from './api.js'
import { useLoader } from './RequireAuth.jsx'
import { ErrorMessage, LoadingMessage } from './StateViews.jsx'

const invalidInviteMessage = 'Zaproszenie jest nieaktualne lub nieprawidłowe.'
const retryableKinds = ['server', 'network']

export default function JoinByTokenPage() {
  const { token } = useParams()
  const join = useLoader(() => coursesApi.joinByToken(token), [token])

  if (join.status === 'ready') {
    return <Navigate to={`/kursy/instancje/${join.data.id}`} replace />
  }

  return (
    <main className="courses-page page-width">
      <h1>Zaproszenie do kursu</h1>
      {join.status === 'loading' && <LoadingMessage>Dołączamy do kursu…</LoadingMessage>}
      {join.status === 'error' && (
        <ErrorMessage onRetry={retryableKinds.includes(join.error.kind) ? join.reload : undefined}>
          {join.error.status === 404 || join.error.code === 'not_found' ? invalidInviteMessage : join.error.message}
        </ErrorMessage>
      )}
      {join.status === 'error' && <Link className="text-link" to="/kursy">Wróć do kursów</Link>}
    </main>
  )
}
