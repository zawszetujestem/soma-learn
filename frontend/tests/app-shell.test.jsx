import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from '../src/App.jsx'

const file = (path) => resolve(process.cwd(), path)
function renderAt(path) {
  return render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>)
}
beforeEach(() => {
  sessionStorage.clear()
  document.cookie = 'csrftoken=test-csrf-token; path=/'
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404, json: async () => ({ message: 'Nie znaleziono.' }) })))
})
afterEach(() => {
  sessionStorage.clear()
  vi.unstubAllGlobals()
  document.cookie = 'csrftoken=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
})

describe('production tile shell', () => {
  it.each([
    '/logowanie', '/logowanie/reset-hasla', '/logowanie/google/callback',
    '/rejestracja', '/potwierdzenie-email', '/potwierdzenie-email/key', '/nie-ma',
    '/kursy', '/kursy/1', '/kursy/instancje/1', '/kursy/dolacz/token',
    '/kursy/moje', '/kursy/moje/nowy', '/kursy/moje/1',
    '/kursy/moje/1/wersje/2/edytuj', '/kursy/podglad/1/wersje/2', '/course-moderation/',
  ])('uses the same accessible logo and landmarks on %s (including guards)', async (path) => {
    renderAt(path)
    const header = screen.getByRole('banner')
    const footer = screen.getByRole('contentinfo')
    expect(header.closest('.app-shell')).not.toBeNull()
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(document.querySelector('.sl-home')).toBeNull()
    for (const landmark of [header, footer]) {
      const logo = within(landmark).getByRole('link', { name: 'SOMA Learn, strona główna' })
      expect(logo).toHaveAttribute('href', '/')
      const svg = logo.querySelector('svg')
      expect(svg).toHaveAttribute('aria-hidden', 'true')
      expect(svg.querySelectorAll('text')).toHaveLength(2)
      expect(svg.querySelector('.sl-logo-learn')).toHaveAttribute('x', '136')
      expect(svg.querySelector('path, circle, image, use')).toBeNull()
    }
  })

  it('preserves production nav order, active state, destinations and keyboard focus', async () => {
    renderAt('/logowanie')
    const user = userEvent.setup()
    const nav = screen.getByRole('navigation', { name: 'Główna nawigacja' })
    const links = within(nav).getAllByRole('link')
    expect(links.map(link => link.getAttribute('href'))).toEqual(['/#metoda', '/kursy', '/logowanie'])
    expect(links[2]).toHaveClass('is-active')
    expect(links[2]).toHaveAttribute('aria-current', 'page')
    await user.tab()
    expect(within(screen.getByRole('banner')).getByRole('link', { name: 'SOMA Learn, strona główna' })).toHaveFocus()
    await user.tab()
    expect(links[0]).toHaveFocus()
  })

  it('loads shell overrides after base styles in the actual entrypoint', () => {
    const entrypoint = readFileSync(file('src/main.jsx'), 'utf8')
    const stylesheets = [...entrypoint.matchAll(/import\s+['"](\.\/[^'"]+\.css)['"]/g)].map(match => match[1])
    expect(stylesheets).toEqual(['./styles.css', './app-shell.css'])
    expect(readFileSync(file('src/App.jsx'), 'utf8')).not.toMatch(/import\s+['"]\.\/app-shell\.css['"]/)
  })

  it('uses scoped tokens and real wrapping, never hiding overflow', () => {
    const path = file('src/app-shell.css')
    expect(existsSync(path)).toBe(true)
    const css = readFileSync(path, 'utf8')
    expect(css).toContain("'Manrope Variable'")
    for (const color of ['#F7F6F0', '#2936C8', '#C6E875', '#FF9377', '#20243A', '#e8ebff']) expect(css).toContain(color)
    for (const token of ['--paper:', '--ink:', '--forest:', '--leaf:', '--display:']) expect(css).toContain(token)
    expect(css).toMatch(/overflow:\s*visible/)
    expect(css).not.toMatch(/overflow(?:-x)?:\s*(hidden|clip)/)
    expect(css).toContain('overflow-wrap: anywhere')
    expect(css).toContain('flex-wrap: wrap')
    expect(css).toContain('minmax(0, 1fr)')
    expect(css).toContain('1200px')
    expect(css).toContain('20px')
    expect(css).toContain('24px')
    expect(css).toContain(':focus-visible')
    expect(css).toContain('prefers-reduced-motion')
    for (const match of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{/g)) {
      if (match[1].trim().startsWith('@')) continue
      for (const selector of match[1].trim().split(/,(?![^(]*\))/)) expect(selector.trim()).toMatch(/^\.app-shell(?:\s|$|:)/)
    }
  })

  it('retains production version preview and only the production fonts', () => {
    expect(existsSync(file('src/courses/VersionPreviewPage.jsx'))).toBe(true)
    const app = readFileSync(file('src/App.jsx'), 'utf8')
    expect(app).not.toMatch(/Suspense|lazy/)
    const { dependencies } = JSON.parse(readFileSync(file('package.json'), 'utf8'))
    for (const font of ['@fontsource-variable/quicksand', '@fontsource-variable/fredoka', '@fontsource-variable/nunito', '@fontsource/lilita-one']) expect(dependencies).not.toHaveProperty(font)
    for (const font of ['@fontsource-variable/dm-sans', '@fontsource-variable/fraunces', '@fontsource-variable/manrope']) expect(dependencies).toHaveProperty(font)
  })
})
