import { EmptyMessage } from './StateViews.jsx'
import { formatDateTime, formatHours, taskStatusLabels } from './format.js'

const byPosition = (a, b) => (a.position ?? 0) - (b.position ?? 0) || a.id - b.id

// A task is on the board only while a cycle is active, it is selected and not
// blocked by unfinished prerequisites; every other task stays in the backlog.
export function splitTasks(instance) {
  const tasks = [...(instance.tasks ?? [])].sort(byPosition)
  const cycleActive = Boolean(instance.active_cycle)
  const onBoard = (task) => cycleActive && task.selected === true && !task.blocked
  return { board: tasks.filter(onBoard), backlog: tasks.filter((task) => !onBoard(task)) }
}

function TaskCard({ task, titles, cycleActive, onBoard, disabled, onChange }) {
  const prerequisites = (task.prerequisite_ids ?? []).map((id) => titles.get(id)).filter(Boolean)
  return (
    <li className={`task-card${task.blocked ? ' task-card-blocked' : ''}`}>
      <span className="task-title">{task.title}</span>
      <span className="task-hours">{formatHours(task.hours)}</span>
      {prerequisites.length > 0 && <span className="task-prereqs">Wymaga: {prerequisites.join(', ')}</span>}
      {task.blocked && (
        <span className="task-blocked">Zablokowane: najpierw ukończ wymagane zadania.</span>
      )}
      <select
        aria-label={`Zmień status: ${task.title}`}
        value={task.status}
        disabled={disabled}
        onChange={(event) => onChange(task, { status: event.target.value })}
      >
        {Object.entries(taskStatusLabels).map(([value, text]) => (
          <option key={value} value={value}>{text}</option>
        ))}
      </select>
      {cycleActive && (onBoard ? (
        <button
          type="button"
          className="button button-secondary"
          aria-label={`Odłóż do backlogu: ${task.title}`}
          disabled={disabled}
          onClick={() => onChange(task, { selected: false })}
        >
          Odłóż do backlogu
        </button>
      ) : (
        <button
          type="button"
          className="button button-secondary"
          aria-label={`Dodaj do cyklu: ${task.title}`}
          disabled={disabled || task.blocked}
          onClick={() => onChange(task, { selected: true })}
        >
          Dodaj do cyklu
        </button>
      ))}
    </li>
  )
}

export function CyclePanel({ instance, canEdit, busy, onStart, onClose }) {
  const cycle = instance.active_cycle
  if (instance.status !== 'active') {
    return (
      <section className="course-section cycle-panel" aria-labelledby="cycle-title">
        <h2 id="cycle-title">Cykl</h2>
        <p>Kurs jest zakończony, więc nie prowadzi aktywnego cyklu. Historia cykli pozostaje dostępna poniżej.</p>
      </section>
    )
  }
  return (
    <section className="course-section cycle-panel" aria-labelledby="cycle-title">
      <h2 id="cycle-title">Cykl</h2>
      {cycle ? (
        <>
          <p>Cykl trwa od {formatDateTime(cycle.started_at)}. Wybierz z backlogu zadania, nad którymi chcesz teraz pracować.</p>
          <p>Cykl kończysz sam, kiedy zechcesz. Niedokończone zadania wrócą do backlogu z zachowanym statusem.</p>
        </>
      ) : (
        <p>Brak aktywnego cyklu. Rozpocznij cykl, aby wybrać zadania na tablicę. Jego długość zależy od Ciebie.</p>
      )}
      {canEdit && (
        <div className="course-actions">
          {cycle ? (
            <button type="button" className="button button-secondary" disabled={busy} onClick={() => onClose(cycle)}>Zakończ cykl</button>
          ) : (
            <button type="button" className="button button-primary" disabled={busy} onClick={onStart}>Rozpocznij cykl</button>
          )}
        </div>
      )}
    </section>
  )
}

export function CycleBoard({ instance, canEdit, busy, onTaskChange }) {
  const tasks = instance.tasks ?? []
  const backlogId = `backlog-title-${instance.id}`
  const boardId = `board-title-${instance.id}`
  if (tasks.length === 0) {
    return (
      <section className="course-section" aria-labelledby={backlogId}>
        <h2 id={backlogId}>Backlog</h2>
        <EmptyMessage>Brak zadań w tej instancji.</EmptyMessage>
      </section>
    )
  }
  const titles = new Map(tasks.map((task) => [task.id, task.title]))
  const cycleActive = instance.status === 'active' && Boolean(instance.active_cycle)
  const { board, backlog } = splitTasks(instance)
  const disabled = !canEdit || busy
  const card = (task, onBoard) => (
    <TaskCard
      key={task.id}
      task={task}
      titles={titles}
      cycleActive={cycleActive}
      onBoard={onBoard}
      disabled={disabled}
      onChange={onTaskChange}
    />
  )

  return (
    <>
      {cycleActive && (
        <section className="course-section" aria-labelledby={boardId}>
          <h2 id={boardId}>Tablica cyklu</h2>
          <div className="task-board">
            {Object.entries(taskStatusLabels).map(([status, label]) => {
              const group = board.filter((task) => task.status === status)
              return (
                <section key={status} className={`task-column task-column-${status}`} aria-label={label}>
                  <h3>{label} <span className="task-count">({group.length})</span></h3>
                  {group.length === 0
                    ? <p className="task-column-empty">Brak zadań.</p>
                    : <ul>{group.map((task) => card(task, true))}</ul>}
                </section>
              )
            })}
          </div>
        </section>
      )}
      <section className="course-section" aria-labelledby={backlogId}>
        <h2 id={backlogId}>Backlog</h2>
        {backlog.length === 0
          ? <EmptyMessage>Wszystkie zadania są na tablicy cyklu.</EmptyMessage>
          : <ul className="task-list backlog-list">{backlog.map((task) => card(task, false))}</ul>}
      </section>
    </>
  )
}

function snapshotTitle(entry, titles) {
  return entry.title || titles.get(entry.task_id ?? entry.id) || 'Zadanie'
}

export function CycleHistory({ instance }) {
  const history = [...(instance.cycle_history ?? [])]
    .sort((a, b) => String(a.started_at).localeCompare(String(b.started_at)))
  const titles = new Map((instance.tasks ?? []).map((task) => [task.id, task.title]))
  return (
    <section className="course-section" aria-labelledby="history-title">
      <h2 id="history-title">Historia cykli</h2>
      {history.length === 0 ? (
        <EmptyMessage>Nie zakończono jeszcze żadnego cyklu.</EmptyMessage>
      ) : (
        <ol className="cycle-history">
          {history.map((cycle, index) => {
            const entries = cycle.tasks ?? []
            return (
              <li key={cycle.id} className="cycle-history-item" aria-labelledby={`cycle-${cycle.id}-title`}>
                <h3 id={`cycle-${cycle.id}-title`}>Cykl {index + 1}</h3>
                <p className="course-meta">
                  {formatDateTime(cycle.started_at)} – {cycle.ended_at ? formatDateTime(cycle.ended_at) : 'w toku'}
                </p>
                {entries.length === 0 ? (
                  <p>W tym cyklu nie wybrano zadań.</p>
                ) : (
                  <ul className="cycle-snapshot">
                    {entries.map((entry, entryIndex) => (
                      <li key={entry.id ?? entry.task_id ?? entryIndex}>
                        <span>{snapshotTitle(entry, titles)}</span>
                        {taskStatusLabels[entry.status] && <span className="badge badge-muted">{taskStatusLabels[entry.status]}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}