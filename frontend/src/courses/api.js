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
  if (typeof payload.message === 'string' && payload.message.trim()) return payload.message
  if (payload.code && conflictMessages[payload.code]) return conflictMessages[payload.code]
  if (status === 401) return 'Sesja wygasła. Zaloguj się ponownie.'
  if (status === 403 || payload.code === 'forbidden') return 'Nie masz uprawnień do tej operacji.'
  if (status === 404) return 'Nie znaleziono.'
  if (status >= 500) return 'Błąd serwera. Spróbuj ponownie później.'
  if (status === 400) return 'Nie udało się zapisać. Sprawdź poprawność danych.'
  return 'Nie udało się wykonać operacji. Spróbuj ponownie.'
}

export class CourseApiError extends Error {
  constructor({ kind, status = 0, code, message, payload }) {
    super(message)
    this.name = 'CourseApiError'
    this.kind = kind
    this.status = status
    this.code = code
    this.payload = payload
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

export async function request(method, url, body, options = {}) {
  const headers = { Accept: 'application/json', Authorization: `Token ${getToken()}` }
  const multipart = body instanceof FormData
  if (body !== undefined && !multipart) headers['Content-Type'] = 'application/json'
  if (options.etag) headers['If-Match'] = options.etag

  let response
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : multipart ? body : JSON.stringify(body),
    })
  } catch {
    throw new CourseApiError({ kind: 'network', message: connectionError })
  }

  const etag = response.headers?.get('ETag')
  if (response.ok && etag && options.onEtag) options.onEtag(etag)
  if (response.ok && options.blob) {
    try { return await response.blob() } catch { throw new CourseApiError({kind:'network',message:connectionError}) }
  }
  let payload = {}
  if (response.status !== 204) {
    try { payload = (await response.json()) ?? {} }
    catch {
      if (response.ok) throw new CourseApiError({kind:'network',message:'Nie udało się odczytać odpowiedzi serwera. Spróbuj ponownie.'})
    }
  }
  if (!response.ok) {
    throw new CourseApiError({
      kind: kindForStatus(response.status),
      status: response.status,
      code: payload.code,
      payload,
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

// ETags are opaque server values; never reconstruct them from revision fields.
const tags = new Map()
const versionUrl = (c, v) => `/api/courses/${c}/versions/${v}/`
function versionRequest(c, v, suffix, method = 'GET', body, blob = false) {
  const key = `${getToken()}/${c}/${v}`
  return request(method, versionUrl(c, v) + suffix, body, {
    etag: method === 'GET' ? undefined : tags.get(key),
    onEtag: blob ? undefined : tag => tags.set(key, tag), blob,
  })
}
export const contentApi = {
  version: (c,v) => versionRequest(c,v,''),
  save: (c,v,data) => versionRequest(c,v,'','PATCH',data),
  mutate: (c,v,path,method='POST',data) => versionRequest(c,v,path,method,method==='DELETE'?undefined:(data ?? {})),
  validation: (c,v) => versionRequest(c,v,'validation/'),
  preview: (c,v) => versionRequest(c,v,'student-preview/'),
  upload: (c,v,file) => {const data=new FormData(); data.append('file',file); return versionRequest(c,v,'assets/','POST',data)},
  download: (c,v,a) => versionRequest(c,v,`assets/${a}/download/`,'GET',undefined,true),
  assets: c => get(`/api/courses/${c}/assets/`),
  deleteAsset: (c,a) => request('DELETE',`/api/courses/${c}/assets/${a}/`),
  scopes: () => get('/api/course-scopes/'),
  subjects: () => get('/api/course-subjects/'),
  createVersion: c => post(`/api/courses/${c}/versions/`,{}),
  moderation: () => get('/api/course-moderation/'),
  instanceContent: i => get(`/api/instances/${i}/content/`),
}
