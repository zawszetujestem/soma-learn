export function csrfToken() {
  const cookie = document.cookie.split('; ').find((value) => value.startsWith('csrftoken='))
  return cookie ? decodeURIComponent(cookie.slice('csrftoken='.length)) : ''
}

let initialization

export async function ensureCsrf() {
  if (csrfToken()) return
  if (!initialization) {
    initialization = fetch('/_allauth/browser/v1/auth/session', { credentials: 'include' })
      .then((response) => {
        if (![200, 401].includes(response.status) || !csrfToken()) {
          throw new Error('Nie udało się przygotować bezpiecznego połączenia. Spróbuj ponownie.')
        }
      })
      .finally(() => { initialization = undefined })
  }
  await initialization
}

export async function getJson(url, headers = {}) {
  await ensureCsrf()
  const response = await fetch(url, { method: 'GET', credentials: 'include', headers })
  const payload = await response.json().catch(() => ({}))
  return { response, payload }
}

export async function postJson(url, body = {}) {
  return sendJson('POST', url, body)
}

export async function deleteJson(url) {
  return sendJson('DELETE', url)
}

async function sendJson(method, url, body) {
  await ensureCsrf()
  const response = await fetch(url, {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken() },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const payload = await response.json().catch(() => ({}))
  return { response, payload }
}

const fieldNames = {
  first_name: 'Imię', last_name: 'Nazwisko', email: 'Email', password: 'Hasło',
  specialization: 'Specjalizacja', role: 'Rola',
}

export function responseError(response, payload) {
  if (response.status === 429) return 'Zbyt wiele prób. Odczekaj chwilę i spróbuj ponownie.'
  if (response.status >= 500) return 'Błąd serwera. Spróbuj ponownie później.'
  if (response.status === 409) return 'Sesja logowania uległa zmianie. Zaloguj się ponownie.'
  if (payload.errors?.some((error) => error.code === 'invalid_or_expired_key')) {
    return 'Link potwierdzenia jest nieprawidłowy lub wygasł.'
  }
  if (payload.errors?.some((error) => error.param === 'code')) return 'Kod jest nieprawidłowy lub wygasł.'
  if (payload.errors?.some((error) => error.code === 'email_password_mismatch')) return 'Nieprawidłowy email lub hasło.'
  const fields = Object.entries(fieldNames).flatMap(([field, label]) => {
    if (!payload[field]) return []
    if (field === 'email' && /exists|already|unique/i.test(String(payload[field]))) {
      return ['Konto z tym adresem email już istnieje.']
    }
    return [`${label}: ${Array.isArray(payload[field]) ? payload[field].join(' ') : payload[field]}`]
  })
  return fields.join(' ') || 'Nie udało się wykonać operacji. Spróbuj ponownie.'
}

export const connectionError = 'Nie udało się nawiązać połączenia. Sprawdź sieć i spróbuj ponownie.'

export async function exchangeToken() {
  const { response, payload } = await postJson('/api/auth/token/exchange/')
  if (!response.ok || typeof payload.token !== 'string' || !payload.token.trim() || !payload.user) {
    throw new Error('Nie udało się zalogować. Sprawdź, czy konto ma potwierdzony email, i zaloguj się ponownie.')
  }
  sessionStorage.setItem('token', payload.token)
}

export async function logout() {
  try {
    await deleteJson('/_allauth/browser/v1/auth/session')
  } finally {
    sessionStorage.removeItem('token')
  }
}