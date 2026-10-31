import { APIRequestContext, APIResponse, expect } from '@playwright/test';

export const API_PREFIX = '/api/v1';

export async function getJson<T = unknown>(
  request: APIRequestContext,
  path: string,
  headers: Record<string, string> = {},
): Promise<{ res: APIResponse; body: T }> {
  const res = await request.get(`${API_PREFIX}${path}`, { headers });
  const body = (await res.json().catch(() => null)) as T;
  return { res, body };
}

export async function postJson<T = unknown>(
  request: APIRequestContext,
  path: string,
  data: unknown,
  headers: Record<string, string> = {},
): Promise<{ res: APIResponse; body: T }> {
  const res = await request.post(`${API_PREFIX}${path}`, { data, headers });
  const body = (await res.json().catch(() => null)) as T;
  return { res, body };
}

export async function putJson<T = unknown>(
  request: APIRequestContext,
  path: string,
  data: unknown,
  headers: Record<string, string> = {},
): Promise<{ res: APIResponse; body: T }> {
  const res = await request.put(`${API_PREFIX}${path}`, { data, headers });
  const body = (await res.json().catch(() => null)) as T;
  return { res, body };
}

export async function patchJson<T = unknown>(
  request: APIRequestContext,
  path: string,
  data?: unknown,
  headers: Record<string, string> = {},
): Promise<{ res: APIResponse; body: T }> {
  const res = await request.patch(`${API_PREFIX}${path}`, { data, headers });
  const body = (await res.json().catch(() => null)) as T;
  return { res, body };
}

export async function deleteJson<T = unknown>(
  request: APIRequestContext,
  path: string,
  headers: Record<string, string> = {},
): Promise<{ res: APIResponse; body: T }> {
  const res = await request.delete(`${API_PREFIX}${path}`, { headers });
  const body = (await res.json().catch(() => null)) as T;
  return { res, body };
}

/** Lấy id phòng đầu tiên từ GET /rooms để các test không hard-code id. */
export async function firstRoomId(request: APIRequestContext): Promise<string> {
  const { res, body } = await getJson<Array<{ id: string | number }>>(request, '/rooms');
  expect(res.status()).toBe(200);
  expect(body.length).toBeGreaterThan(0);
  return String(body[0].id);
}

/** Ngày YYYY-MM-DD cách hôm nay `offsetDays` ngày. */
export function isoDate(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}
