import { connectionError } from '../authApi.js'

export function getToken() {
  return sessionStorage.getItem('token')
}

export function clearToken() {
  sessionStorage.removeItem('token')
}

const conflictMessages = {
  slot_taken: 'Masz już aktywny kurs.',
  instance_closed: 'Instancja jest zamknięta.',
  already_closed: 'Instancja jest już zamknięta.',
  already_active: 'Instancja jest już aktywna.',
  course_inactive: 'Kurs jest nieaktywny.',
  course_not_approved: 'Kurs nie został zatwierdzony.',
  course_not_rejected: 'Kurs nie został odrzucony.',
  course_not_private: 'Kurs nie jest prywatny.',
}

export function courseErrorMessage(status, payload = {}) {
  if (payload.code && conflictMessages[payload.code]) return conflictMessages[payload.code]
  if (status === 401) return 'Sesja wygasła. Zaloguj się ponownie.'
  if (status === 403 || payload.code === 'forbidden') return 'Nie masz uprawnień do tej operacji.'
  if (status === 404) return 'Nie znaleziono.'
  if (status >= 500) return 'Błąd serwera. Spróbuj ponownie później.'
  if (status === 400) return 'Nie udało się zapisać. Sprawdź poprawność danych.'
  return 'Nie udało się wykonać operacji. Spróbuj ponownie.'
}

export class CourseApiError extends Error {
  constructor({ kind, status = 0, code, message }) {
    super(message)
    this.name = 'CourseApiError'
    this.kind = kind
    this.status = status
    this.code = code
  }
}

function kindForStatus(status) {
  if (status === 401) return 'auth'
  if (status === 403) return 'forbidden'
  if (status === 404) return 'notFound'
  if (status === 409) return 'conflict'
  if (status >= 500) return 'server'
  return 'validation'
}

async function request(method, url, body) {
  const headers = { Accept: 'application/json', Authorization: `Token ${getToken()}` }
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  let response
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new CourseApiError({ kind: 'network', message: connectionError })
  }

  const payload = response.status === 204 ? {} : await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new CourseApiError({
      kind: kindForStatus(response.status),
      status: response.status,
      code: payload.code,
      message: courseErrorMessage(response.status, payload),
    })
  }
  return payload
}

const get = (url) => request('GET', url)
const post = (url, body) => request('POST', url, body ?? {})
const patch = (url, body) => request('PATCH', url, body)

export const coursesApi = {
  currentUser: () => get('/api/auth/me/'),
  listCourses: () => get('/api/courses/'),
  getCourse: (id) => get(`/api/courses/${id}/`),
  listMine: () => get('/api/courses/mine/'),
  getMine: (id) => get(`/api/courses/mine/${id}/`),
  studentsCount: async (id) => (await get(`/api/courses/mine/${id}/students-count/`)).count,
  createCourse: (data) => post('/api/courses/', data),
  updateCourse: (id, data) => patch(`/api/courses/${id}/`, data),
  resubmitCourse: (id) => post(`/api/courses/${id}/resubmit/`),
  regenerateToken: (id) => post(`/api/courses/${id}/regenerate-token/`),
  joinCourse: (id) => post(`/api/courses/${id}/join/`),
  joinByToken: (token) => post(`/api/courses/join/${encodeURIComponent(token)}/`),
  createTask: (id, data) => post(`/api/courses/${id}/tasks/`, data),
  deleteTask: (id, taskId) => request('DELETE', `/api/courses/${id}/tasks/${taskId}/`),
  listInstances: () => get('/api/instances/'),
  getInstance: (id) => get(`/api/instances/${id}/`),
  updateInstanceTask: (id, taskId, status) => patch(`/api/instances/${id}/tasks/${taskId}/`, { status }),
  closeInstance: (id) => post(`/api/instances/${id}/close/`),
  resumeInstance: (id) => post(`/api/instances/${id}/resume/`),
}
