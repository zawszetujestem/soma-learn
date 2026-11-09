import { MaterialContent } from './VersionContent.jsx'
import SafeMarkdown from './SafeMarkdown.jsx'

// Read-only lesson content, even when the API projection includes author keys.
export default function LessonContentPreview({ lesson, courseId, versionId }) {
  return (
      <div className="lesson-content-body">
        {lesson.theory?.length > 0 && <section>
          <h3>Teoria</h3>
          {lesson.theory.map(item => <MaterialContent key={item.id} item={item}
            courseId={courseId} versionId={versionId} student />)}
        </section>}
        {lesson.practice?.length > 0 && <section>
          <h3>Praktyka</h3>
          {lesson.practice.map(item => <MaterialContent key={item.id} item={item}
            courseId={courseId} versionId={versionId} student />)}
        </section>}
        {lesson.test && <section>
          <h3>Test (bez oceniania)</h3>
          {lesson.test.questions?.length ? lesson.test.questions.map((question, index) => <div key={question.id ?? index}>
            <p>Pytanie {index + 1} ({question.type === 'single' ? 'jedna odpowiedź' : 'wiele odpowiedzi'})</p>
            <SafeMarkdown>{question.text}</SafeMarkdown>
            {question.options?.length > 0 && <ul>
              {question.options.map((option, i) => <li key={option.id ?? i}><SafeMarkdown>{option.text}</SafeMarkdown></li>)}
            </ul>}
          </div>) : <p>Brak pytań w teście.</p>}
        </section>}
        {!lesson.theory?.length && !lesson.practice?.length && !lesson.test && <p>Brak materiałów w tej lekcji.</p>}
      </div>
  )
}
