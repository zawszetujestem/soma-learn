import { useRef, useState } from 'react'
import { coursesApi } from './api.js'
import { ConfirmDelete } from './EditorParts.jsx'

export default function DeleteCourseButton({ course, disabled, onResult, onError }) {
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  async function remove() {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    onError(null)
    try {
      const result = await coursesApi.deleteCourse(course.id)
      setConfirming(false)
      onResult(result)
    } catch (error) {
      setConfirming(false)
      onError(error)
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  return <>
    <button type="button" className="button button-secondary" disabled={disabled || busy} onClick={() => setConfirming(true)}>Usuń kurs</button>
    {confirming && <ConfirmDelete
      title={course.working_version?.title || course.title || 'Kurs bez tytułu'}
      label="Usunięcie kursu"
      description="Kurs z instancjami zostanie zarchiwizowany (nieaktywny), a istniejące instancje pozostaną. Kurs bez instancji zostanie trwale usunięty wraz z wersjami. Trwałego usunięcia nie można cofnąć."
      busy={busy}
      onCancel={() => setConfirming(false)}
      onConfirm={remove}
    />}
  </>
}
