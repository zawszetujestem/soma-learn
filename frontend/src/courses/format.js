export function formatNumber(value) {
  return String(Number(value)).replace('.', ',')
}

export function formatPercent(value) {
  return `${formatNumber(Math.round(Number(value) * 10) / 10)}%`
}

export function formatHours(value) {
  return `${formatNumber(value)} h`
}

export const approvalLabels = {
  pending: 'Oczekuje na zatwierdzenie',
  approved: 'Zatwierdzony',
  rejected: 'Odrzucony',
}

export const visibilityLabels = {
  public: 'Publiczny',
  private: 'Prywatny',
}

export function formatDateTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('pl-PL', { dateStyle: 'medium', timeStyle: 'short' })
}

export const instanceStatusLabels = {
  active: 'Aktywna',
  closed: 'Zamknięta',
}

export const taskStatusLabels = {
  todo: 'Do zrobienia',
  in_progress: 'W trakcie',
  done: 'Gotowe',
}
