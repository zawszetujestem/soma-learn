// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const root = fileURLToPath(new URL('../../', import.meta.url))
const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')
// The frontend container deliberately receives neither the repository nor Docker's socket.
const hasRepository = existsSync(`${root}/docker-compose.yml`)

describe.skipIf(!hasRepository)('local Docker configuration (repository checkout)', () => {
  it('uses a distinct project and persistent PostgreSQL 18 data directory', () => {
    const compose = read('docker-compose.yml')
    expect(compose).toMatch(/^name: soma-learn-local-dev$/m)
    expect(compose).toContain('postgres:18-alpine')
    expect(compose).toContain('pg18-data:/var/lib/postgresql')
    expect(compose).not.toContain('postgres-data')
    expect(compose).toContain('pg_isready')
  })

  it('isolates inherited env, disables Google and uses local SMTP', () => {
    const compose = read('docker-compose.yml')
    for (const setting of [
      'DEBUG: "true"', 'USE_SQLITE: "false"', 'DATABASE_URL: ""',
      'POSTGRES_HOST: db', 'EMAIL_HOST: mailpit', 'EMAIL_PORT: "1025"',
      'EMAIL_USE_TLS: "false"', 'EMAIL_HOST_USER: ""', 'EMAIL_HOST_PASSWORD: ""',
      'GOOGLE_CLIENT_ID: ""', 'GOOGLE_CLIENT_SECRET: ""',
      'http://localhost:5174,http://127.0.0.1:5174',
    ]) expect(compose).toContain(setting)
    expect(compose).not.toMatch(/env_file:/)
    // $${...} is a container-shell variable, not Compose interpolation.
    for (const match of compose.matchAll(/(?<!\$)\$\{([^}:]+)/g)) {
      expect(match[1]).toMatch(/^DOCKER_/)
    }
  })

  it('keeps ports loopback-only, runs migrations and supports hot reload', () => {
    const compose = read('docker-compose.yml')
    for (const port of ['8001', '5174', '1027', '8027']) {
      expect(compose).toContain(`127.0.0.1:${port}:`)
    }
    expect(compose).not.toMatch(/5432:5432/)
    expect(compose).toContain('python manage.py migrate --noinput && python manage.py runserver 0.0.0.0:8001')
    expect(compose).not.toContain('createsuperuser')
    expect(compose).not.toContain('createcachetable')
    expect(compose).toContain('./backend:/app')
    expect(compose).toContain('./frontend:/app')
    expect(compose).toContain('frontend-node-modules:/app/node_modules')
    expect(compose).toContain('service_healthy')
    expect(read('frontend/vite.config.js')).toContain('usePolling:')
  })

  it('builds with requested runtimes and locked dependencies', () => {
    expect(read('backend/Dockerfile')).toContain('FROM python:3.14-slim')
    expect(read('backend/Dockerfile')).toContain('pip install --no-cache-dir -r requirements.txt')
    expect(read('frontend/Dockerfile')).toContain('FROM node:24-slim')
    expect(read('frontend/Dockerfile')).toContain('npm ci')
    expect(read('backend/requirements.txt')).toContain('django-allauth[headless,socialaccount]==65.21.0')
  })

  it('excludes secrets, databases, dependency trees and caches from build contexts', () => {
    for (const path of ['backend/.dockerignore', 'frontend/.dockerignore']) {
      const ignore = read(path)
      for (const pattern of ['.env', '.env.*', '*.sqlite3', 'node_modules', '__pycache__', '.git']) {
        expect(ignore.split(/\r?\n/)).toContain(pattern)
      }
    }
    const example = read('.env.docker.example')
    expect(example).toContain('DOCKER_SUPERUSER_EMAIL=')
    expect(example).toContain('DOCKER_SUPERUSER_PASSWORD=')
    expect(read('.gitignore').split(/\r?\n/)).toContain('.env.docker')
  })
})

describe.skipIf(process.env.DOCKER_CONFIG_CLI !== '1' || !hasRepository)('Docker CLI contract (host opt-in)', () => {
  it('renders the isolated topology despite unrelated host environment', () => {
    const config = JSON.parse(execFileSync('docker', ['compose', 'config', '--format', 'json'], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, DATABASE_URL: 'postgres://invalid.invalid/remote', POSTGRES_HOST: 'invalid.invalid',
        GOOGLE_CLIENT_ID: 'must-not-inherit', EMAIL_HOST: 'invalid.invalid', SUPERUSER_EMAIL: 'wrong@example.test' },
    }))
    expect(config.name).toBe('soma-learn-local-dev')
    expect(Object.keys(config.services).sort()).toEqual(['backend', 'db', 'frontend', 'mailpit'])
    expect(config.services.db.ports ?? []).toEqual([])
    for (const service of Object.values(config.services)) {
      for (const port of service.ports ?? []) expect(port.host_ip).toBe('127.0.0.1')
    }
    const env = config.services.backend.environment
    expect(env.DATABASE_URL).toBe('')
    expect(env.POSTGRES_HOST).toBe('db')
    expect(env.EMAIL_HOST).toBe('mailpit')
    expect(env.GOOGLE_CLIENT_ID).toBe('')
    expect(env.SUPERUSER_EMAIL).not.toBe('wrong@example.test')
    expect(config.volumes['pg18-data'].name).toBe('soma-learn-local-dev-pg18-data')
  })
})
