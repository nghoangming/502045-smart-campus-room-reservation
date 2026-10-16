import { test } from '@playwright/test';

/**
 * Nhóm test cho endpoint/tính năng CHƯA được M2/M1 implement.
 * Mặc định bị skip để CI không đỏ. Khi endpoint xong:
 *   - chạy local:  RUN_PENDING=true npm run test:api
 *   - hoặc bỏ `pending` và dùng test.describe thường.
 */
export const pending =
  process.env.RUN_PENDING === 'true' ? test.describe : test.describe.skip;
