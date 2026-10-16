import { defineConfig, devices } from '@playwright/test';

// Đọc tests/.env nếu có (Node >= 20.12). Không cần cài thêm thư viện dotenv.
try {
  (process as unknown as { loadEnvFile?: (p?: string) => void }).loadEnvFile?.('.env');
} catch {
  /* không có file .env thì dùng giá trị mặc định */
}

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173';
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
      name: 'api',
      testDir: './api',
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
  ],
  // Tự bật frontend (Vite) khi chạy E2E. Đặt SKIP_WEB_SERVER=true nếu bạn tự chạy `npm run dev`
  // hoặc chỉ chạy API test (không cần frontend).
  webServer: process.env.SKIP_WEB_SERVER
    ? undefined
    : {
        command: 'npm --prefix ../frontend run dev -- --host 127.0.0.1 --port 5173',
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
