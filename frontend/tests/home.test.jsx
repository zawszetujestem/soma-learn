import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createEvent, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, MemoryRouter } from 'react-router-dom'
import App from '../src/App.jsx'

function renderHome(destination) {
  return render(<MemoryRouter initialEntries={['/']}><App />{destination && <Link to={destination}>Test navigation</Link>}</MemoryRouter>)
}

beforeEach(() => {
  sessionStorage.clear()
  document.cookie = 'csrftoken=test-csrf-token; path=/'
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  sessionStorage.clear()
  vi.unstubAllGlobals()
  document.cookie = 'csrftoken=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
})

describe('approved SOMA homepage', () => {
  it('renders the exact hero and a local, accessible typographic logo without a symbol', () => {
    renderHome()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Ogarnij egzamin. Krok po kroku.')
    const header = screen.getByRole('banner')
    const logo = within(header).getByRole('link', { name: 'SOMA Learn, strona główna' })
    expect(logo).toHaveAttribute('href', '/')
    const svg = logo.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect([...svg.querySelectorAll('text')].map((node) => node.textContent)).toEqual(['soma.', 'learn'])
    expect(svg.querySelector('.sl-logo-learn')).toHaveAttribute('x', '136')
    expect(svg.querySelector('path, circle, image, use')).toBeNull()
    expect(document.querySelector('.wordmark-symbol, .site-header, .site-footer')).toBeNull()
  })

  it('builds the home visual from separate tiles with a path of learning milestones', () => {
    renderHome()
    const home = document.querySelector('.sl-home')
    expect(home.querySelector('.sl-hero')).toHaveClass('sl-tile')
    expect(home.querySelectorAll('.sl-path.sl-tile')).toHaveLength(2)
    expect(home.querySelectorAll('.sl-step.sl-tile')).toHaveLength(4)
    expect(home.querySelectorAll('.sl-example.sl-tile')).toHaveLength(3)

    const path = home.querySelector('.sl-progress-path')
    expect(path).not.toBeNull()
    expect(path).toHaveAttribute('stroke-dasharray')
    expect(home.querySelectorAll('.sl-progress-stop')).toHaveLength(4)
    expect(home.querySelector('.sl-progress-check')).not.toBeNull()
  })

  it('keeps the approved header order and destinations and supports keyboard navigation', async () => {
    const user = userEvent.setup()
    renderHome()
    const nav = screen.getByRole('navigation', { name: 'Główna nawigacja' })
    const links = within(nav).getAllByRole('link')
    expect(links.map((link) => link.textContent)).toEqual(['Kursy', 'Jak działa SOMA?', 'O nas', 'Zaloguj się', 'Zacznij naukę'])
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/kursy', '#metoda', '#o-nas', '/logowanie', '/rejestracja'])
    await user.tab()
    expect(screen.getByRole('link', { name: 'Przejdź do treści' })).toHaveFocus()
    await user.tab()
    expect(within(screen.getByRole('banner')).getByRole('link', { name: 'SOMA Learn, strona główna' })).toHaveFocus()
    await user.tab()
    expect(links[0]).toHaveFocus()
  })

  it('presents ordered sections, planned matura and the reflective, adaptable SOMA method', () => {
    renderHome()
    const sections = [...screen.getByRole('main').querySelectorAll('section')]
    expect(sections.map((section) => section.id)).toEqual(['start', 'sciezki', 'metoda', 'przyklady', 'lekcja', 'o-nas', 'zacznij'])
    const paths = screen.getByRole('region', { name: 'Wybierz swój kierunek' })
    expect(within(paths).getByRole('heading', { name: 'Egzamin ósmoklasisty' })).toBeInTheDocument()
    const matura = within(paths).getByRole('article', { name: 'Matura' })
    expect(matura).toHaveTextContent('Planowana')
    expect(within(matura).queryByRole('link')).toBeNull()
    const method = screen.getByRole('region', { name: 'Jak działa SOMA?' })
    expect(within(method).getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual(['Cel', 'Plan', 'Mały krok', 'Postęp'])
    expect(method).toHaveTextContent(/refleksja/i)
    expect(method).toHaveTextContent(/dostosuj plan/i)
    expect(method).toHaveTextContent(/umiejętności/i)
    const about = screen.getByRole('region', { name: 'O nas' })
    expect(about).toHaveTextContent('Self-Organized Micro Agile')
    expect(about).toHaveTextContent(/samodzielność/i)
    expect(about).toHaveTextContent(/przerwa/i)
  })

  it('labels every example with scope and level, not as a priced or rated offer', () => {
    renderHome()
    const examples = screen.getByRole('region', { name: 'Małe kroki, konkretne tematy' })
    const cards = within(examples).getAllByRole('article')
    expect(cards).toHaveLength(3)
    for (const card of cards) {
      expect(card).toHaveTextContent('Przykład')
      expect(card).toHaveTextContent('Zakres')
      expect(card).toHaveTextContent('Poziom')
      expect(within(card).queryByRole('link')).toBeNull()
      expect(card).not.toHaveTextContent(/zł|ocena|★|kup/i)
    }
    expect(examples).toHaveTextContent(/nie stanowią oferty/i)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('shows only a clearly static lesson example with step, time and result', () => {
    renderHome()
    const preview = screen.getByRole('region', { name: 'Statyczny podgląd przykładowej lekcji' })
    expect(preview).toHaveTextContent('Krok')
    expect(preview).toHaveTextContent('Czas')
    expect(preview).toHaveTextContent('Rezultat')
    expect(preview).toHaveTextContent('10 minut')
    expect(preview).toHaveTextContent(/nie pokazuje Twoich danych/i)
    expect(preview.querySelector('button, a, input, progress, [role="progressbar"]')).toBeNull()
    expect(screen.queryByText(/dashboard|misja dnia|twoje postępy/i)).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('uses only existing routes or actual local sections for every CTA', async () => {
    const user = userEvent.setup()
    renderHome()
    for (const link of screen.getAllByRole('link')) {
      const href = link.getAttribute('href')
      expect(['/', '/kursy', '/logowanie', '/rejestracja'].includes(href) || href.startsWith('#')).toBe(true)
      if (href.startsWith('#')) expect(document.getElementById(href.slice(1))).not.toBeNull()
    }
    await user.click(screen.getByRole('link', { name: 'Odkryj kursy' }))
    expect(await screen.findByLabelText(/^email$/i)).toBeInTheDocument()
    expect(document.querySelector('.sl-home')).toBeNull()
    expect(document.querySelector('.site-header')).not.toBeNull()
  })

  it.each(['/logowanie', '/rejestracja', '/wzory', '/wzory/a', '/wzory/b', '/wzory/c', '/wzory/a/nested'])('removes the home shell after navigating to %s', async (path) => {
    const user = userEvent.setup()
    renderHome(path)
    await user.click(screen.getByRole('link', { name: 'Test navigation' }))
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(document.querySelector('.sl-home')).toBeNull()
    expect(document.querySelector('.app-shell .site-header')).not.toBeNull()
    if (path.startsWith('/wzory')) expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Tej strony tu nie ma.')
  })

  it('preserves logout failure and retry across the catalog-to-home header switch', async () => {
    sessionStorage.setItem('token', 'student-token')
    let attempt = 0
    vi.stubGlobal('fetch', vi.fn(async (url, options) => {
      if (options?.method === 'DELETE') {
        attempt += 1
        return { ok: false, status: attempt === 1 ? 500 : 401, json: async () => attempt === 1 ? {} : { meta: { is_authenticated: false } } }
      }
      return { ok: true, status: 200, json: async () => url === '/api/auth/me/' ? { id: 1, roles: ['student'] } : [] }
    }))
    const user = userEvent.setup()
    renderHome()
    await user.click(within(screen.getByRole('navigation', { name: 'Główna nawigacja' })).getByRole('link', { name: 'Kursy' }))
    await screen.findByRole('heading', { name: 'Kursy', level: 1 })
    await user.click(screen.getByRole('button', { name: 'Wyloguj' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/nie udało się potwierdzić wylogowania/i)
    expect(document.querySelector('.sl-home')).not.toBeNull()
    expect(sessionStorage.getItem('token')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Ponów wylogowanie' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Wylogowanie zostało potwierdzone.')
    expect(attempt).toBe(2)
  })

  it('removes the home shell when an authenticated user opens the empty catalog', async () => {
    sessionStorage.setItem('token', 'student-token')
    vi.stubGlobal('fetch', vi.fn(async (url) => ({
      ok: true, status: 200, json: async () => url === '/api/auth/me/' ? { id: 1, roles: ['student'] } : [],
    })))
    const user = userEvent.setup()
    renderHome()
    await user.click(within(screen.getByRole('navigation', { name: 'Główna nawigacja' })).getByRole('link', { name: 'Kursy' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Kursy' })).toBeInTheDocument()
    expect(document.querySelector('.sl-home')).toBeNull()
    expect(document.querySelector('.site-header')).not.toBeNull()
    expect(await screen.findByText('Brak kursów do wyświetlenia.')).toBeInTheDocument()
  })

  it('keeps the start-learning label but sends authenticated users to courses, not registration', async () => {
    sessionStorage.setItem('token', 'student-token')
    vi.stubGlobal('fetch', vi.fn(async (url) => ({
      ok: true, status: 200, json: async () => url === '/api/auth/me/' ? { id: 1, roles: ['student'] } : [],
    })))
    const user = userEvent.setup()
    renderHome()
    const startLearning = within(screen.getByRole('banner')).getByRole('link', { name: 'Zacznij naukę' })
    expect(startLearning).toHaveAttribute('href', '/kursy')
    expect(screen.queryByRole('link', { name: 'Utwórz konto' })).toBeNull()
    await user.click(startLearning)
    expect(await screen.findByRole('heading', { level: 1, name: 'Kursy' })).toBeInTheDocument()
    expect(await screen.findByText('Brak kursów do wyświetlenia.')).toBeInTheDocument()
  })

  it('scopes home tokens, font and responsive/accessibility rules without changing global fonts', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/home/home.css'), 'utf8')
    expect(css).toContain('.sl-home')
    expect(css).not.toMatch(/(^|\n)\s*(?:body|html|:root)\s*[{,]/)
    for (const color of ['#2936C8', '#C6E875', '#FF9377', '#F7F6F0', '#20243A']) expect(css).toContain(color)
    expect(css).toContain('Manrope Variable')
    expect(css).toContain('1200px')
    expect(css).toContain(':focus-visible')
    expect(css).toContain('prefers-reduced-motion')
    const fonts = readFileSync(resolve(process.cwd(), 'src/home/fonts.css'), 'utf8')
    expect(fonts).toContain('@fontsource-variable/manrope/files/manrope-latin-ext-wght-normal.woff2')
    expect(fonts).toContain('@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2')
    expect(fonts).toContain('font-display: swap')
    // Every style-rule selector stays under the home root, even after navigation.
    for (const selector of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{/g)) {
      if (selector[1].trim().startsWith('@')) continue
      for (const part of selector[1].split(',')) {
        expect(part.trim()).toMatch(/^\.sl-home(?:\b|[ .:*])/)
      }
    }
  })

  it('uses AA contrast for normal text on all colored surfaces', () => {
    function luminance(hex) {
      const rgb = hex.match(/[a-f\d]{2}/gi).map((value) => parseInt(value, 16) / 255)
        .map((value) => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
      return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722
    }
    for (const [foreground, background] of [
      ['#20243A', '#F7F6F0'], ['#20243A', '#C6E875'], ['#20243A', '#FF9377'],
      ['#20243A', '#FFFFFF'], ['#FFFFFF', '#2936C8'], ['#FFFFFF', '#20243A'],
      ['#2936C8', '#F7F6F0'], ['#2936C8', '#FFFFFF'],
    ]) {
      const levels = [luminance(foreground), luminance(background)].sort((a, b) => b - a)
      expect((levels[0] + .05) / (levels[1] + .05)).toBeGreaterThanOrEqual(4.5)
    }
  })

  it.each([true, false])('leaves local anchors to native navigation (reduced motion: %s)', (reducedMotion) => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: reducedMotion })))
    renderHome()
    for (const link of screen.getAllByRole('link').filter((link) => link.getAttribute('href').startsWith('#'))) {
      const target = document.getElementById(link.getAttribute('href').slice(1))
      target.scrollIntoView = vi.fn()
      // JSDOM does not implement native fragment focus/scroll. Verify that the
      // activation's default action (also used by Enter) is not cancelled.
      const event = createEvent.click(link, { button: 0, bubbles: true, cancelable: true })
      expect(fireEvent(link, event)).toBe(true)
      expect(event.defaultPrevented).toBe(false)
      expect(target.scrollIntoView).not.toHaveBeenCalled()
    }
  })

  it('disables native smooth scrolling globally in reduced-motion CSS', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8')
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{\s*\*,\s*\*::before,\s*\*::after\s*\{[^}]*scroll-behavior:\s*auto\s*!important;/)
  })

  it('retains logout busy, local clearing, server-error retry and confirmed status', async () => {
    sessionStorage.setItem('token', 'student-token')
    let finish
    const pending = new Promise((resolve) => { finish = resolve })
    const fetchMock = vi.fn().mockReturnValueOnce(pending).mockResolvedValueOnce({
      status: 401, ok: false, json: async () => ({ meta: { is_authenticated: false } }),
    })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    renderHome()
    const nav = screen.getByRole('navigation', { name: 'Główna nawigacja' })
    expect(within(nav).queryByRole('link', { name: 'Zaloguj się' })).toBeNull()
    await user.click(within(nav).getByRole('button', { name: 'Wyloguj' }))
    expect(screen.getByRole('button', { name: 'Wylogowywanie…' })).toBeDisabled()
    await act(async () => finish({ status: 500, ok: false, json: async () => ({}) }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/nie udało się potwierdzić wylogowania/i)
    expect(sessionStorage.getItem('token')).toBeNull()
    expect(screen.getByRole('link', { name: 'Zaloguj się' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Ponów wylogowanie' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Wylogowanie zostało potwierdzone.')
    expect(screen.queryByRole('alert')).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0]).toEqual(['/_allauth/browser/v1/auth/session', expect.objectContaining({
      method: 'DELETE', credentials: 'include', headers: expect.objectContaining({ 'X-CSRFToken': 'test-csrf-token' }),
    })])
  })
})
