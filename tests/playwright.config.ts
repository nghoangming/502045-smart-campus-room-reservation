import { defineConfig, devices } from '@playwright/test';

// Đọc tests/.env nếu có (Node >= 20.12). Không cần cài thêm thư viện dotenv.
try {
  (process as unknown as { loadEnvFile?: (p?: string) => void }).loadEnvFile?.('.env');
} catch {
  /* không có file .env thì dùng giá trị mặc định */
}

const WEB_PORT = process.env.WEB_PORT ?? '5173';
const BASE_URL = process.env.BASE_URL ?? `http://127.0.0.1:${WEB_PORT}`;
const API_URL = process.env.API_URL ?? 'http://localhost:8080';

export default defineConfig({
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'api-setup',
      testDir: './setup',
      use: { baseURL: API_URL },
    },
    {
      name: 'api',
      testDir: './api',
      dependencies: ['api-setup'],
      workers: 1,
      use: { baseURL: API_URL },
    },
    {
      name: 'e2e',
      testDir: './e2e',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: BASE_URL,
      },
    },
    {
      name: 'e2e-live',
      testDir: './e2e-live',
      workers: 1,
      use: { ...devices['Desktop Chrome'], baseURL: BASE_URL },
    },
  ],
  // Tự bật frontend (Next.js) khi chạy E2E. Đặt SKIP_WEB_SERVER=true nếu bạn tự chạy `npm run dev`
  // hoặc chỉ chạy API test (không cần frontend).
  webServer: process.env.SKIP_WEB_SERVER
    ? undefined
    : {
        command: `npm --prefix ../frontend run dev -- --hostname 127.0.0.1 --port ${WEB_PORT}`,
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
