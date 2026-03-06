import { auth } from './firebase';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || '';

async function getIdToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return await user.getIdToken();
}

export async function apiGet(path: string, requiresAuth = false) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (requiresAuth) {
    const token = await getIdToken();
    if (!token) throw new Error('Not signed in');
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE_URL}${path}`, { headers });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || `Request failed: ${res.status}`);
  return json;
}

export async function apiPost(path: string, body: unknown, requiresAuth = false) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (requiresAuth) {
    const token = await getIdToken();
    if (!token) throw new Error('Not signed in');
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || `Request failed: ${res.status}`);
  return json;
}
