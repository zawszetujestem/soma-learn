import { useId, useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import LessonContentPreview from './LessonContentPreview.jsx'

// Same portal/inert/focus pattern as EditorModal, without editor state or mutations.
export default function LessonContentModal({ lesson, courseId, versionId, onClose }) {
  const dialog = useRef(null)
  const close = useRef(null)
  const titleId = useId()
  useLayoutEffect(() => {
    const previous = document.activeElement
    const backdrop = dialog.current.parentElement
    const saved = [...document.body.children].filter(element => element !== backdrop)
      .map(element => [element, element.hasAttribute('inert'), element.getAttribute('aria-hidden')])
    saved.forEach(([element]) => { element.setAttribute('inert', ''); element.setAttribute('aria-hidden', 'true') })
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    close.current.focus()
    function contain(event) {
      if (!dialog.current.contains(event.target)) close.current.focus()
    }
    document.addEventListener('focusin', contain)
    return () => {
      document.removeEventListener('focusin', contain)
      saved.forEach(([element, inert, aria]) => {
        if (!inert) element.removeAttribute('inert')
        if (aria === null) element.removeAttribute('aria-hidden')
        else element.setAttribute('aria-hidden', aria)
      })
      document.body.style.overflow = overflow
      if (previous?.isConnected) previous.focus()
    }
  }, [])

  function key(event) {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      onClose()
    }
    if (event.key === 'Tab') {
      const all = [...dialog.current.querySelectorAll('button,a[href],input,select,textarea,[tabindex="0"]')]
        .filter(element => !element.matches(':disabled') && !element.closest('[hidden]'))
      const first = all[0], last = all.at(-1)
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
  }
  // Portal events still bubble through the tile in React: keep them out of tile/DnD handlers.
  return createPortal(
    <div className="app-shell lesson-modal-backdrop" onClick={event => event.stopPropagation()}
      onDragStart={event => { event.preventDefault(); event.stopPropagation() }}
      onDragOver={event => event.stopPropagation()}
      onDrop={event => { event.preventDefault(); event.stopPropagation() }}>
      <section ref={dialog} role="dialog" aria-modal="true" aria-labelledby={titleId}
        tabIndex={-1} className="lesson-content-modal" onKeyDown={key}>
        <header className="lesson-modal-header">
          <h2 id={titleId}>{lesson.title}</h2>
          <button ref={close} type="button" className="button button-secondary" onClick={onClose}>Zamknij</button>
        </header>
        <LessonContentPreview lesson={lesson} courseId={courseId} versionId={versionId} />
      </section>
    </div>, document.body,
  )
}
