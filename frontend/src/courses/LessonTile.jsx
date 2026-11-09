import { useRef, useState } from 'react'
import LessonContentModal from './LessonContentModal.jsx'

// The opener and mutation controls are siblings, never nested buttons.
export default function LessonTile({ lesson, courseId, versionId, children, className = '',
  draggable, onDragStart, tileRef, ...props }) {
  const [open, setOpen] = useState(false)
  const opener = useRef(null)
  const gesture = useRef({ suppressClick: false })
  const isAction = target => target.closest('button:not(.lesson-tile-opener),select,label,input,textarea,a')

  function show(event) {
    if (gesture.current.suppressClick || isAction(event.target)) return
    opener.current?.focus()
    setOpen(true)
  }
  return (
    <li {...props} ref={tileRef} aria-label={lesson.title} className={`lesson-tile ${className}`}
      draggable={Boolean(draggable)}
      onPointerDown={event => {
        gesture.current = { x: event.clientX, y: event.clientY, suppressClick: false }
      }}
      onPointerMove={event => {
        const start = gesture.current
        if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 5) start.suppressClick = true
      }}
      onPointerCancel={() => { gesture.current.suppressClick = true }}
      onDragStart={event => {
        if (!draggable || isAction(event.target)) { event.preventDefault(); return }
        gesture.current.suppressClick = true
        onDragStart?.(event)
      }}
      onDragEnd={() => { gesture.current.suppressClick = true }}
      onClick={show}>
      <button ref={opener} type="button" className="lesson-tile-opener"
        aria-label={`Otwórz lekcję: ${lesson.title}`} aria-haspopup="dialog"
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') gesture.current.suppressClick = false
        }}>
        {lesson.title}
      </button>
      {children}
      {open && <LessonContentModal lesson={lesson} courseId={courseId} versionId={versionId}
        onClose={() => setOpen(false)} />}
    </li>
  )
}
