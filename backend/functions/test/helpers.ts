const AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9099";

interface TestUser {
  uid: string;
  idToken: string;
}

let counter = 0;

/** Creates a fresh user directly against the Auth emulator's REST API and returns a real ID token. */
export async function createTestUser(label: string): Promise<TestUser> {
  counter += 1;
  const email = `${label}-${Date.now()}-${counter}@example.test`;
  const res = await fetch(
    `http://${AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "password123", returnSecureToken: true }),
    }
  );
  if (!res.ok) {
    throw new Error(`Auth emulator signUp failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { localId: string; idToken: string };
  return { uid: data.localId, idToken: data.idToken };
}

export function authHeader(user: TestUser): [string, string] {
  return ["Authorization", `Bearer ${user.idToken}`];
}
