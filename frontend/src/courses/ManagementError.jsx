export function ManagementErrorDetails({ error }) {
  if (!error) return null
  return <span>
    {typeof error === 'string' ? error : error.message}
    {error.status > 0 && <> (HTTP {error.status}{error.code ? ` · ${error.code}` : ''})</>}
  </span>
}

export default function ManagementError({ error }) {
  return error ? <p className="courses-error" role="alert"><ManagementErrorDetails error={error} /></p> : null
}
