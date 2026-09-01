import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: "http://127.0.0.1:8010",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "login",
      testMatch: /seed\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "access",
      testMatch: /course-access\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], storageState: "e2e/.auth/stranger.json" },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    command:
      ".venv\\Scripts\\python.exe manage.py migrate --noinput && .venv\\Scripts\\python.exe manage.py seed_e2e && .venv\\Scripts\\python.exe manage.py runserver 127.0.0.1:8010 --noreload",
    url: "http://127.0.0.1:8010/healthz/",
    reuseExistingServer: false,
    timeout: 60_000,
    env: { DATABASE_URL: "sqlite:///e2e.sqlite3" },
  },
});
