import { afterEach, describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import { COURSE_OPEN, COURSE_PUBLIC, INSTANCE_OWN, STUDENT, mockApi, ok, renderApp, resetTestEnv, sessionAs } from './helpers.jsx'

afterEach(resetTestEnv)

const card = (title) => screen.getByRole('heading', { name: title }).closest('article')

describe('wiele aktywnych kursów jednocześnie', () => {
  it('aktywna instancja blokuje dołączenie tylko do tego samego kursu', async () => {
    mockApi({
      ...sessionAs(STUDENT),
      'GET /api/courses/': ok([COURSE_PUBLIC, COURSE_OPEN]),
      'GET /api/instances/': ok([INSTANCE_OWN]),
    })
    renderApp('/kursy')

    await screen.findByRole('heading', { name: COURSE_PUBLIC.title })
    expect(within(card(COURSE_PUBLIC.title)).getByRole('button', { name: /dołącz/i })).toBeEnabled()
    const open = card(COURSE_OPEN.title)
    expect(within(open).getByRole('button', { name: /dołącz/i })).toBeDisabled()
    expect(within(open).getByText(/uczysz się już tego kursu/i)).toBeInTheDocument()
    expect(within(open).getByRole('link', { name: /przejdź do swojej instancji/i })).toHaveAttribute('href', '/kursy/instancje/11')
    expect(screen.queryByText(/masz już aktywny kurs/i)).toBeNull()
  })

  it('instancja mentora ani zamknięta instancja nie blokują dołączenia', async () => {
    mockApi({
      ...sessionAs(STUDENT),
      'GET /api/courses/': ok([COURSE_OPEN]),
      'GET /api/instances/': ok([{ ...INSTANCE_OWN, student: 99, mentor: STUDENT.id }, { ...INSTANCE_OWN, id: 15, status: 'closed' }]),
    })
    renderApp('/kursy')

    await screen.findByRole('heading', { name: COURSE_OPEN.title })
    expect(screen.getByRole('button', { name: /dołącz/i })).toBeEnabled()
  })

  it('szczegóły innego kursu pozwalają dołączyć mimo aktywnego kursu', async () => {
    mockApi({
      ...sessionAs(STUDENT),
      'GET /api/courses/1/': ok(COURSE_PUBLIC),
      'GET /api/instances/': ok([INSTANCE_OWN]),
    })
    renderApp('/kursy/1')

    expect(await screen.findByRole('button', { name: /dołącz/i })).toBeEnabled()
    expect(screen.queryByText(/masz już aktywny kurs/i)).toBeNull()
  })

  it('szczegóły kursu z aktywną instancją kierują do tablicy', async () => {
    mockApi({
      ...sessionAs(STUDENT),
      'GET /api/courses/2/': ok(COURSE_OPEN),
      'GET /api/instances/': ok([INSTANCE_OWN]),
    })
    renderApp('/kursy/2')

    expect(await screen.findByRole('button', { name: /dołącz/i })).toBeDisabled()
    expect(screen.getByText(/uczysz się już tego kursu/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /przejdź do swojej instancji/i })).toHaveAttribute('href', '/kursy/instancje/11')
  })
})