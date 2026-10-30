// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')
// Like docker-config.test.js, run only in a repository checkout, not the frontend container.
const hasRepository = existsSync(new URL('../../docker-compose.yml', import.meta.url))

// Inspect the existing two-space Compose block layout without a YAML dependency.
const block = (text, name, indent) => {
  const spaces = ' '.repeat(indent)
  const header = new RegExp(`^${spaces}${name}:[^\\n]*\\n`, 'm')
  const match = header.exec(text)
  if (!match) throw new Error(`Missing Compose block: ${name}`)
  const rest = text.slice(match.index + match[0].length)
  const end = rest.search(new RegExp(`^ {0,${indent}}\\S`, 'm'))
  return end === -1 ? rest : rest.slice(0, end)
}

const mediaRoot = '/var/lib/soma/private-media'

describe.skipIf(!hasRepository)('private course media configuration (repository checkout)', () => {
  it('declares a persistent named volume', () => {
    const volumes = block(read('docker-compose.yml'), 'volumes', 0)
    expect(volumes).toMatch(/^  private-course-media:\s*$/m)
    expect(volumes).not.toMatch(/^    (?:external|driver_opts):/m)
  })

  it('mounts writable storage and sets the backend storage root', () => {
    const backend = block(block(read('docker-compose.yml'), 'services', 0), 'backend', 2)
    expect(block(backend, 'volumes', 4)).toMatch(/^      - private-course-media:\/var\/lib\/soma\/private-media\s*$/m)
    expect(block(backend, 'environment', 4)).toMatch(/^      PRIVATE_MEDIA_ROOT: \/var\/lib\/soma\/private-media\s*$/m)
    expect(backend).not.toMatch(/MEDIA_URL:/)
  })

  it('keeps private storage outside the backend source bind mount', () => {
    const backend = block(block(read('docker-compose.yml'), 'services', 0), 'backend', 2)
    const mounts = block(backend, 'volumes', 4)
    expect(mounts).toContain('./backend:/app')
    expect(mediaRoot.startsWith('/app/')).toBe(false)
    expect(mounts).not.toMatch(/-\s+[^\n]+:\/(?:var(?:\/lib(?:\/soma)?)?)?\s*$/m)
  })

  it('never shares private storage with frontend or any other service', () => {
    const services = block(read('docker-compose.yml'), 'services', 0)
    const names = [...services.matchAll(/^  ([\w-]+):/gm)].map((match) => match[1])
    expect(names).toContain('backend')
    expect(names).toContain('frontend')
    for (const name of names.filter((name) => name !== 'backend')) {
      const service = block(services, name, 2)
      expect(service).not.toContain('private-course-media')
      expect(service).not.toContain(mediaRoot)
      expect(service).not.toMatch(/private_media|PRIVATE_MEDIA_ROOT|volumes_from:/)
    }
  })

  it('excludes the local fallback from Git and backend build context', () => {
    expect(read('.gitignore').split(/\r?\n/)).toContain('/backend/private_media/')
    expect(read('backend/.dockerignore').split(/\r?\n/)).toContain('private_media/')
  })
})
