import { PROXY } from './config.js';
const SIGNIN_URL = `${PROXY}/api/auth/signin`;
const TOKEN_KEY  = 'z01_jwt';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUserId() {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.sub ?? payload['https://hasura.io/jwt/claims']?.['x-hasura-user-id'] ?? null;
  } catch {
    return null;
  }
}

export async function login(credential, password) {
  const encoded = btoa(`${credential}:${password}`);
  const res = await fetch(SIGNIN_URL, {
    method: 'POST',
    headers: { Authorization: `Basic ${encoded}` },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Login failed (${res.status})`);
  }

  // The endpoint returns the JWT as either a plain string or a JSON-quoted string
  const raw = await res.text();
  const token = raw.trim().replace(/^"|"$/g, '');
  if (!token || !token.includes('.')) throw new Error('Unexpected auth response');
  localStorage.setItem(TOKEN_KEY, token);
  return token;
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
}
