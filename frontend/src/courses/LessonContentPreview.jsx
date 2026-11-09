import { useState } from 'react'
import { MaterialContent } from './VersionContent.jsx'
import SafeMarkdown from './SafeMarkdown.jsx'

// Read-only lesson content, even when the API projection includes author keys.
export default function LessonContentPreview({ lesson, courseId, versionId }) {
  const [open, setOpen] = useState(false)
  return (
    <details className="lesson-content-preview" onToggle={event => setOpen(event.currentTarget.open)}
      onDragStart={event => { event.preventDefault(); event.stopPropagation() }}
      onDragOver={event => event.stopPropagation()}
      onDrop={event => { event.preventDefault(); event.stopPropagation() }}>
      <summary>Treść lekcji</summary>
      {open && <div className="lesson-content-body">
        {lesson.theory?.length > 0 && <section>
          <h6>Teoria</h6>
          {lesson.theory.map(item => <MaterialContent key={item.id} item={item}
            courseId={courseId} versionId={versionId} student />)}
        </section>}
        {lesson.practice?.length > 0 && <section>
          <h6>Praktyka</h6>
          {lesson.practice.map(item => <MaterialContent key={item.id} item={item}
            courseId={courseId} versionId={versionId} student />)}
        </section>}
        {lesson.test && <section>
          <h6>Test (bez oceniania)</h6>
          {lesson.test.questions?.length ? lesson.test.questions.map((question, index) => <div key={question.id ?? index}>
            <p>Pytanie {index + 1} ({question.type === 'single' ? 'jedna odpowiedź' : 'wiele odpowiedzi'})</p>
            <SafeMarkdown>{question.text}</SafeMarkdown>
            {question.options?.length > 0 && <ul>
              {question.options.map((option, i) => <li key={option.id ?? i}><SafeMarkdown>{option.text}</SafeMarkdown></li>)}
            </ul>}
          </div>) : <p>Brak pytań w teście.</p>}
        </section>}
        {!lesson.theory?.length && !lesson.practice?.length && !lesson.test && <p>Brak materiałów w tej lekcji.</p>}
      </div>}
    </details>
  )
}
