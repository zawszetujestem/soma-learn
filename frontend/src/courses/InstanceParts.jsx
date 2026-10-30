import { formatHours, taskStatusLabels } from './format.js'

export function TaskBoard({ tasks, readOnly = false, onChange }) {
  if (tasks.length === 0) return <p className="courses-empty">Brak zadań w tej instancji.</p>

  return (
    <div className="task-board">
      {Object.entries(taskStatusLabels).map(([status, label]) => {
        const group = tasks.filter((task) => task.status === status)
        return (
          <section key={status} className={`task-column task-column-${status}`} aria-label={label}>
            <h4>{label} <span className="task-count">({group.length})</span></h4>
            <ul>
              {group.map((task) => (
                <li key={task.id} className="task-card">
                  <span className="task-title">{task.title}</span>
                  <span className="task-hours">{formatHours(task.hours)}</span>
                  <select
                    aria-label={`Zmień status: ${task.title}`}
                    value={task.status}
                    disabled={readOnly}
                    onChange={(event) => onChange(task, event.target.value)}
                  >
                    {Object.entries(taskStatusLabels).map(([value, text]) => (
                      <option key={value} value={value}>{text}</option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

export function InstanceControls({ instance, onClose, onResume, busy = false }) {
  if (instance.status === 'active') {
    return (
      <button type="button" className="button button-secondary" disabled={busy} onClick={onClose}>
        Zamknij instancję
      </button>
    )
  }
  return (
    <button type="button" className="button button-secondary" disabled={busy} onClick={onResume}>
      Wznów instancję
    </button>
  )
}
