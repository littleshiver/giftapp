import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests",
  fullyParallel: true,
  use: {
    baseURL: "http://127.0.0.1:5173",
    browserName: "chromium",
    launchOptions: {
      executablePath:
        process.env.CHROMIUM_PATH ||
        (process.env.CI ? undefined : "/usr/bin/chromium"),
      args: ["--no-sandbox"],
    },
    viewport: { width: 390, height: 844 },
  },
  webServer: {
    command: "npm run dev -- --port 5173 --strictPort",
    // Dev-only fake session keeps UI tests isolated from Firebase.
    env: { VITE_E2E_AUTH_BYPASS: "1" },
    url: "http://127.0.0.1:5173",
    reuseExistingServer: !process.env.CI,
  },
  reporter: "list",
});
