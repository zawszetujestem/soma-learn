import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { coursesApi } from './api.js'
import { useCurrentUser } from './RequireAuth.jsx'
import { ErrorMessage } from './StateViews.jsx'

const TITLE_MAX_LENGTH = 200

export function validateCourseForm({ title }) {
  const trimmed = title.trim()
  if (trimmed.length > TITLE_MAX_LENGTH) return `Tytuł może mieć maksymalnie ${TITLE_MAX_LENGTH} znaków.`
  return null
}

export default function CourseEditorPage() {
  const navigate = useNavigate()
  const user = useCurrentUser()
  const isAdmin = user.roles.includes('admin')
  const [form, setForm] = useState({ title: '', description: '', visibility: isAdmin ? 'public' : 'private' })
  const [error, setError] = useState(null)
  const [submitError, setSubmitError] = useState(null)
  const [saving, setSaving] = useState(false)

  function update(field) {
    return (event) => setForm((current) => ({ ...current, [field]: event.target.value }))
  }

  async function submit(event) {
    event.preventDefault()
    const validation = validateCourseForm(form)
    setError(validation)
    setSubmitError(null)
    if (validation) return

    setSaving(true)
    try {
      const course = await coursesApi.createCourse({
        title: form.title.trim(),
        description: form.description.trim(),
        visibility: form.visibility,
      })
      const versionId = typeof course.working_version === 'object' ? course.working_version?.id : course.working_version
      navigate(`/kursy/moje/${course.id}/wersje/${versionId}/edytuj`)
    } catch (createError) {
      setSubmitError(createError.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="courses-page page-width">
      <header className="courses-header">
        <p className="eyebrow">Nowy kurs</p>
        <h1>Utwórz kurs</h1>
      </header>

      {submitError && <ErrorMessage>{submitError}</ErrorMessage>}

      <form className="course-form" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="course-title">Tytuł kursu</label>
          <input id="course-title" type="text" value={form.title} onChange={update('title')} aria-invalid={Boolean(error)} />
        </div>
        <div className="field">
          <label htmlFor="course-description">Opis</label>
          <textarea id="course-description" rows={4} value={form.description} onChange={update('description')} />
        </div>
        <div className="field">
          <label htmlFor="course-visibility">Typ kursu</label>
          <select id="course-visibility" value={form.visibility} onChange={update('visibility')}>
            <option value="public">Publiczny</option>
            {!isAdmin && <option value="private">Prywatny</option>}
          </select>
        </div>
        {error && <p className="courses-error" role="alert">{error}</p>}
        <button type="submit" className="button button-primary" disabled={saving}>Utwórz kurs</button>
      </form>
    </main>
  )
}
