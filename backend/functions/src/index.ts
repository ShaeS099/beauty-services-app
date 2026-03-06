import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as cors from 'cors';
import * as express from 'express';
import type { RequestHandler } from 'express';
import {
  Booking,
  BookingStatus,
  CreateBookingRequest,
  FavouritesRequest,
  Provider,
  UpsertProviderRequest,
  UpdateBookingStatusRequest,
  UpdateUserRequest,
  User,
  UserRole
} from './types';

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '1mb' }));

/** Helpers */

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function badRequest(res: express.Response, message: string) {
  return res.status(400).json({ error: message });
}

function forbidden(res: express.Response, message: string) {
  return res.status(403).json({ error: message });
}

function asNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  return null;
}

function nowTimestamps() {
  return {
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
}

function requireAuth(req: express.Request, res: express.Response): string | null {
  const uid = req.user?.uid;
  if (!uid) {
    res.status(401).json({ error: 'Unauthenticated' });
    return null;
  }
  return uid;
}

async function getUserRole(uid: string): Promise<UserRole> {
  const snap = await db.collection('users').doc(uid).get();
  const role = snap.exists ? (snap.data()?.role as UserRole | undefined) : undefined;
  return role ?? 'client';
}

/** Auth middleware */
const authenticateUser: RequestHandler = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid Authorization header' });
      return;
    }

    const token = authHeader.split('Bearer ')[1];
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('Auth error:', err);
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }
};

/** Public */
app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'beautybooking-api' });
});

/** Users */

app.get('/users/me', authenticateUser, async (req, res) => {
  const uid = requireAuth(req, res);
  if (!uid) return;

  const doc = await db.collection('users').doc(uid).get();
  if (!doc.exists) {
    // Create a minimal profile if missing (common during early testing)
    const decoded = req.user!;
    const profile: User = {
      id: uid,
      name: decoded.name ?? decoded.email ?? 'New user',
      email: decoded.email ?? '',
      role: 'client',
      favourites: [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await db.collection('users').doc(uid).set(profile, { merge: true });
    res.status(200).json(profile);
    return;
  }

  res.status(200).json({ id: doc.id, ...doc.data() });
});

app.put('/users/me', authenticateUser, async (req, res) => {
  const uid = requireAuth(req, res);
  if (!uid) return;

  const body = req.body as UpdateUserRequest;
  const updates: Partial<User> = {};

  if (body.name !== undefined) {
    if (!isNonEmptyString(body.name)) return void badRequest(res, 'name must be a non-empty string');
    updates.name = body.name.trim();
  }
  if (body.photoUrl !== undefined) {
    if (!isNonEmptyString(body.photoUrl)) return void badRequest(res, 'photoUrl must be a non-empty string');
    updates.photoUrl = body.photoUrl.trim();
  }

  if (Object.keys(updates).length === 0) return void badRequest(res, 'No valid fields to update');

  await db.collection('users').doc(uid).set({ ...updates, ...nowTimestamps() }, { merge: true });
  const doc = await db.collection('users').doc(uid).get();
  res.status(200).json({ id: doc.id, ...doc.data() });
});

app.post('/users/me/favourites', authenticateUser, async (req, res) => {
  const uid = requireAuth(req, res);
  if (!uid) return;

  const body = req.body as FavouritesRequest;
  if (!body || !isNonEmptyString(body.providerId)) return void badRequest(res, 'providerId is required');
  if (body.action !== 'add' && body.action !== 'remove') return void badRequest(res, 'action must be add|remove');

  const providerId = body.providerId.trim();
  const providerSnap = await db.collection('providers').doc(providerId).get();
  if (!providerSnap.exists) return void badRequest(res, 'Provider not found');

  const update =
    body.action === 'add'
      ? { favourites: admin.firestore.FieldValue.arrayUnion(providerId) }
      : { favourites: admin.firestore.FieldValue.arrayRemove(providerId) };

  await db.collection('users').doc(uid).set({ ...update, ...nowTimestamps() }, { merge: true });
  const doc = await db.collection('users').doc(uid).get();
  res.status(200).json({ id: doc.id, ...doc.data() });
});

/** Providers */

app.get('/providers', async (req, res) => {
  try {
    let query: FirebaseFirestore.Query = db.collection('providers');

    const city = isNonEmptyString(req.query.city) ? String(req.query.city).trim() : null;
    const category = isNonEmptyString(req.query.category) ? String(req.query.category).trim() : null;
    const limit = asNumber(req.query.limit) ?? 20;

    if (city) query = query.where('location.city', '==', city);
    if (category) query = query.where('categories', 'array-contains', category);

    query = query.limit(Math.min(Math.max(limit, 1), 50));

    const snap = await query.get();
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.status(200).json(items);
  } catch (err) {
    console.error('GET /providers error:', err);
    res.status(500).json({ error: 'Failed to list providers' });
  }
});

app.get('/providers/:id', async (req, res) => {
  const id = req.params.id;
  const doc = await db.collection('providers').doc(id).get();
  if (!doc.exists) return void res.status(404).json({ error: 'Provider not found' });
  res.status(200).json({ id: doc.id, ...doc.data() });
});

/**
 * Create/update the authenticated provider's public profile.
 * This intentionally uses `uid` as providerId.
 */
app.post('/providers/me', authenticateUser, async (req, res) => {
  const uid = requireAuth(req, res);
  if (!uid) return;

  const role = await getUserRole(uid);
  if (role !== 'provider') {
    // allow user to "become" a provider during MVP
    await db.collection('users').doc(uid).set({ role: 'provider', ...nowTimestamps() }, { merge: true });
  }

  const body = req.body as UpsertProviderRequest;

  if (!body || !isNonEmptyString(body.name)) return void badRequest(res, 'name is required');
  if (!body.location || !isNonEmptyString(body.location.city)) return void badRequest(res, 'location.city is required');
  const lat = asNumber(body.location.lat);
  const lng = asNumber(body.location.lng);
  if (lat === null || lng === null) return void badRequest(res, 'location.lat and location.lng must be numbers');
  if (!isNonEmptyString(body.bio)) return void badRequest(res, 'bio is required');
  if (!Array.isArray(body.categories) || body.categories.length === 0) return void badRequest(res, 'categories must be a non-empty array');
  if (!Array.isArray(body.services) || body.services.length === 0) return void badRequest(res, 'services must be a non-empty array');

  // Validate services
  for (const s of body.services) {
    if (!isNonEmptyString(s.name)) return void badRequest(res, 'service.name must be a non-empty string');
    if (!isNonEmptyString(s.category)) return void badRequest(res, 'service.category must be a non-empty string');
    const price = asNumber(s.price);
    const dur = asNumber(s.durationMins);
    if (price === null || price < 0) return void badRequest(res, 'service.price must be a non-negative number');
    if (dur === null || dur <= 0) return void badRequest(res, 'service.durationMins must be a positive number');
  }

  const provider: Provider = {
    id: uid,
    name: body.name.trim(),
    photoUrl: body.photoUrl?.trim(),
    location: { city: body.location.city.trim(), lat, lng },
    bio: body.bio.trim(),
    categories: body.categories.map(String),
    services: body.services.map(s => ({
      name: String(s.name).trim(),
      price: asNumber(s.price) ?? 0,
      category: String(s.category).trim(),
      durationMins: asNumber(s.durationMins) ?? 0,
    })),
    availability: body.availability,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  // Set createdAt only if missing
  const ref = db.collection('providers').doc(uid);
  await db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      tx.set(ref, { ...provider, createdAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    } else {
      tx.set(ref, provider, { merge: true });
    }
  });

  const fresh = await ref.get();
  res.status(200).json({ id: fresh.id, ...fresh.data() });
});

/** Bookings */

app.post('/bookings', authenticateUser, async (req, res) => {
  const uid = requireAuth(req, res);
  if (!uid) return;

  const body = req.body as CreateBookingRequest;

  if (!body || !isNonEmptyString(body.providerId)) return void badRequest(res, 'providerId is required');
  if (!body.service || !isNonEmptyString(body.service.name)) return void badRequest(res, 'service is required');
  if (!isNonEmptyString(body.date)) return void badRequest(res, 'date is required (ISO string)');

  // Ensure provider exists
  const providerId = body.providerId.trim();
  const providerSnap = await db.collection('providers').doc(providerId).get();
  if (!providerSnap.exists) return void badRequest(res, 'Provider not found');

  const service = body.service;
  const price = asNumber(service.price);
  const dur = asNumber(service.durationMins);
  if (!isNonEmptyString(service.category)) return void badRequest(res, 'service.category is required');
  if (price === null || price < 0) return void badRequest(res, 'service.price must be a non-negative number');
  if (dur === null || dur <= 0) return void badRequest(res, 'service.durationMins must be a positive number');

  const bookingData: Omit<Booking, 'id'> = {
    userId: uid,
    providerId,
    service: {
      name: String(service.name).trim(),
      category: String(service.category).trim(),
      price,
      durationMins: dur,
    },
    date: body.date,
    notes: isNonEmptyString(body.notes) ? body.notes.trim() : undefined,
    status: 'pending',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const ref = await db.collection('bookings').add(bookingData);
  const created = await ref.get();
  res.status(201).json({ id: created.id, ...created.data() });
});

app.get('/bookings', authenticateUser, async (req, res) => {
  const uid = requireAuth(req, res);
  if (!uid) return;

  try {
    const role = await getUserRole(uid);
    let query: FirebaseFirestore.Query = db.collection('bookings');

    if (role === 'provider') {
      query = query.where('providerId', '==', uid);
    } else {
      query = query.where('userId', '==', uid);
    }

    // optional status filter
    const status = isNonEmptyString(req.query.status) ? (String(req.query.status).trim() as BookingStatus) : null;
    if (status) query = query.where('status', '==', status);

    query = query.orderBy('date', 'desc').limit(50);

    const snap = await query.get();
    res.status(200).json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (err) {
    console.error('GET /bookings error:', err);
    res.status(500).json({ error: 'Failed to list bookings' });
  }
});

app.patch('/bookings/:id/status', authenticateUser, async (req, res) => {
  const uid = requireAuth(req, res);
  if (!uid) return;

  const bookingId = req.params.id;
  const body = req.body as UpdateBookingStatusRequest;
  if (!body || !isNonEmptyString(body.status)) return void badRequest(res, 'status is required');

  const status = body.status as BookingStatus;
  if (!['pending', 'confirmed', 'completed', 'cancelled'].includes(status)) {
    return void badRequest(res, 'Invalid status');
  }

  const ref = db.collection('bookings').doc(bookingId);
  const snap = await ref.get();
  if (!snap.exists) return void res.status(404).json({ error: 'Booking not found' });

  const data = snap.data()!;
  const canEdit = data.userId === uid || data.providerId === uid;
  if (!canEdit) return void forbidden(res, 'Not allowed to update this booking');

  await ref.set({ status, ...nowTimestamps() }, { merge: true });
  const updated = await ref.get();
  res.status(200).json({ id: updated.id, ...updated.data() });
});

/** Export HTTPS function */
export const api = functions.https.onRequest(app);
