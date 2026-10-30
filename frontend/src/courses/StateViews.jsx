export function LoadingMessage({ children }) {
  return <p className="courses-status" role="status">{children}</p>
}

export function ErrorMessage({ children, onRetry }) {
  return (
    <div className="courses-alert" role="alert">
      <p>{children}</p>
      {onRetry && (
        <button type="button" className="button button-secondary" onClick={onRetry}>
          Spróbuj ponownie
        </button>
      )}
    </div>
  )
}

export function EmptyMessage({ children }) {
  return <p className="courses-empty">{children}</p>
}
