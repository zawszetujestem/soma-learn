import { readFileSync } from 'node:fs'
import { afterEach, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import LessonContentModal from '../../src/courses/LessonContentModal.jsx'

const styles = []
afterEach(() => {
  styles.splice(0).forEach(style => style.remove())
})

it('keeps the portal overlay independent of shell layout when shell CSS loads last', () => {
  // Apply real styles in production order; assert computed styles, not CSS text.
  // jsdom cannot verify viewport media queries or full-screen dialog geometry.
  for (const path of ['src/courses/lesson-cycle-board.css', 'src/styles.css', 'src/app-shell.css']) {
    const style = document.createElement('style')
    style.textContent = readFileSync(path, 'utf8')
    document.head.append(style)
    styles.push(style)
  }
  render(<LessonContentModal lesson={{ title: 'Lekcja' }} onClose={vi.fn()} />)
  const backdrop = screen.getByRole('dialog', { name: 'Lekcja' }).parentElement
  const computed = getComputedStyle(backdrop)

  expect(computed.backgroundColor).toBe('rgba(16, 37, 48, 0.6)')
  expect(computed.position).toBe('fixed')
  expect(computed.display).toBe('flex')
  expect(computed.flexDirection).toBe('row')
  expect(computed.alignItems).toBe('center')
  expect(computed.justifyContent).toBe('center')
  expect(computed.padding).toBe('16px')
  expect(computed.gap).toBe('0px')
  expect(computed.minHeight).toBe('0px')
})
