import { APIRequestContext, expect } from '@playwright/test';
import { apiUsers } from '../fixtures/users';
import { API_PREFIX } from './api';

const tokens = new Map<string, Promise<string>>();

export async function tokenFor(request: APIRequestContext, account: { email: string; password: string }): Promise<string> {
  let token = tokens.get(account.email);
  if (!token) {
    token = request.post(`${API_PREFIX}/auth/login`, { data: account }).then(async (response) => {
      expect(response.status(), `login for ${account.email}`).toBe(200);
      const body = await response.json() as { accessToken: string };
      expect(body.accessToken).toBeTruthy();
      return body.accessToken;
    });
    tokens.set(account.email, token);
  }
  return token;
}

export async function authHeaders(request: APIRequestContext, account: { email: string; password: string }) {
  return { Authorization: `Bearer ${await tokenFor(request, account)}` };
}

export const adminHeaders = (request: APIRequestContext) => authHeaders(request, apiUsers.admin);
export const studentHeaders = (request: APIRequestContext) => authHeaders(request, apiUsers.student);
