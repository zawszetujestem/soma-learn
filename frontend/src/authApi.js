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

function validationMessage(field, value) {
  const text = (Array.isArray(value) ? value : [value]).map(String).join(' ').toLowerCase()
  if (field === 'email') {
    if (/already|exists|unique|registered/.test(text)) return 'Konto z tym adresem email już istnieje.'
    return 'Podaj poprawny adres email.'
  }
  if (field === 'password') {
    if (/too common|common password/.test(text)) return 'Hasło jest zbyt popularne. Wybierz mniej oczywiste hasło.'
    if (/entirely numeric|only contain.*number/.test(text)) return 'Hasło nie może składać się wyłącznie z cyfr.'
    if (/too similar/.test(text)) return 'Hasło jest zbyt podobne do innych danych. Wybierz inne.'
    if (/too short|at least \d+ character/.test(text)) return 'Hasło jest za krótkie. Wybierz dłuższe hasło.'
    return 'Hasło nie spełnia wymagań. Wybierz inne hasło.'
  }
  if (field === 'specialization') return 'Podaj specjalizację mentora.'
  if (field === 'role') return 'Wybierz prawidłowy typ konta.'
  if (/required|may not be blank|this field is required/.test(text)) return `Pole „${fieldNames[field]}” jest wymagane.`
  return `Sprawdź pole „${fieldNames[field]}”.`
}

export function responseError(response, payload) {
  if (response.status === 429) return 'Zbyt wiele prób. Odczekaj chwilę i spróbuj ponownie.'
  if (response.status >= 500) return 'Błąd serwera. Spróbuj ponownie później.'
  if (response.status === 403) {
    return typeof payload.message === 'string' && payload.message.trim()
      ? payload.message
      : 'Nie udało się potwierdzić żądania. Odśwież stronę i spróbuj ponownie.'
  }
  if (response.status === 409) {
    return typeof payload.message === 'string' && payload.message.trim()
      ? payload.message
      : 'Sesja logowania uległa zmianie. Zaloguj się ponownie.'
  }
  if (payload.errors?.some((error) => error.code === 'invalid_or_expired_key')) {
    return 'Link potwierdzenia jest nieprawidłowy lub wygasł.'
  }
  if (payload.errors?.some((error) => error.param === 'code' || ['incorrect_code', 'invalid_or_expired_code'].includes(error.code))) {
    return 'Kod jest nieprawidłowy lub wygasł.'
  }
  if (payload.errors?.some((error) => error.code === 'email_password_mismatch')) return 'Nieprawidłowy email lub hasło.'
  const fields = Object.entries(fieldNames).flatMap(([field, label]) => {
    if (!payload[field]) return []
    return [validationMessage(field, payload[field])]
  })
  if (fields.length) return fields.join(' ')
  if (typeof payload.message === 'string' && payload.message.trim()) return payload.message
  if (response.status === 401) return 'Nie udało się potwierdzić logowania. Zaloguj się ponownie.'
  return 'Nie udało się wykonać operacji. Sprawdź dane i spróbuj ponownie.'
}

export const connectionError = 'Nie udało się nawiązać połączenia. Sprawdź sieć i spróbuj ponownie.'

export async function exchangeToken() {
  const { response, payload } = await postJson('/api/auth/token/exchange/')
  if (!response.ok || typeof payload.token !== 'string' || !payload.token.trim() || !payload.user) {
    throw new Error('Nie udało się zalogować. Sprawdź, czy konto ma potwierdzony email, i zaloguj się ponownie.')
  }
  sessionStorage.setItem('token', payload.token)
}

export const logoutUnconfirmedError = 'Nie udało się potwierdzić wylogowania. Sesja może nadal być aktywna. Jeśli przeglądarka była zapamiętana, zachowa zaufanie do końca pierwotnego okresu 24 godzin. Ponów wylogowanie.'

export async function logout() {
  try {
    const { response, payload } = await deleteJson('/_allauth/browser/v1/auth/session')
    // Allauth answers a successful logout with 401 and meta.is_authenticated === false.
    if (![200, 401].includes(response.status) || payload.meta?.is_authenticated !== false) {
      throw new Error(logoutUnconfirmedError)
    }
  } finally {
    sessionStorage.removeItem('token')
  }
}