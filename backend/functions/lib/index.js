"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendBookingReminders = exports.api = exports.app = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const firestore_1 = require("firebase-admin/firestore");
const cors = require("cors");
const express = require("express");
const types_1 = require("./types");
const taxonomy_1 = require("./taxonomy");
const notifications_1 = require("./notifications");
const geocoding_1 = require("./geocoding");
const travel_1 = require("./travel");
if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = admin.firestore();
// Several optional request fields (notes, photoUrl, review text, etc.) are represented as
// `undefined` rather than omitted; the Admin SDK rejects bare `undefined` values by default.
db.settings({ ignoreUndefinedProperties: true });
const app = express();
exports.app = app;
app.use(cors({ origin: true }));
app.use(express.json({ limit: '1mb' }));
/** Helpers */
function isNonEmptyString(v) {
    return typeof v === 'string' && v.trim().length > 0;
}
function badRequest(res, message) {
    return res.status(400).json({ error: message });
}
function forbidden(res, message) {
    return res.status(403).json({ error: message });
}
function asNumber(v) {
    if (typeof v === 'number' && Number.isFinite(v))
        return v;
    if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)))
        return Number(v);
    return null;
}
function nowTimestamps() {
    return {
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    };
}
function requireAuth(req, res) {
    var _a;
    const uid = (_a = req.user) === null || _a === void 0 ? void 0 : _a.uid;
    if (!uid) {
        res.status(401).json({ error: 'Unauthenticated' });
        return null;
    }
    return uid;
}
async function getUserRole(uid) {
    var _a;
    const snap = await db.collection('users').doc(uid).get();
    const role = snap.exists ? (_a = snap.data()) === null || _a === void 0 ? void 0 : _a.role : undefined;
    return role !== null && role !== void 0 ? role : 'client';
}
/** Admin is granted by directly editing a user's `role` field in Firestore — no self-service promotion. */
async function requireAdmin(req, res) {
    const uid = requireAuth(req, res);
    if (!uid)
        return null;
    const role = await getUserRole(uid);
    if (role !== 'admin') {
        forbidden(res, 'Admin access required');
        return null;
    }
    return uid;
}
/** Review doc IDs are booking IDs, so this doubles as "which of my bookings have I reviewed". */
async function getUserReviewedBookingIds(uid) {
    const snap = await db.collection('reviews').where('userId', '==', uid).limit(200).get();
    return new Set(snap.docs.map((d) => d.id));
}
/** Auth middleware */
const authenticateUser = async (req, res, next) => {
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
    }
    catch (err) {
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
    var _a, _b, _c;
    const uid = requireAuth(req, res);
    if (!uid)
        return;
    const doc = await db.collection('users').doc(uid).get();
    if (!doc.exists) {
        // Create a minimal profile if missing (common during early testing)
        const decoded = req.user;
        const profile = {
            id: uid,
            name: (_b = (_a = decoded.name) !== null && _a !== void 0 ? _a : decoded.email) !== null && _b !== void 0 ? _b : 'New user',
            email: (_c = decoded.email) !== null && _c !== void 0 ? _c : '',
            role: 'client',
            favourites: [],
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        };
        await db.collection('users').doc(uid).set(profile, { merge: true });
        res.status(200).json(profile);
        return;
    }
    res.status(200).json(Object.assign({ id: doc.id }, doc.data()));
});
/**
 * Public-safe view of any user (not just providers) — used for viewing an everyday poster's
 * profile, resolving a post author's display name, etc. Deliberately excludes private fields
 * (email, favourites, interests, pushToken) that `GET /users/me` returns for the owner only.
 */
app.get('/users/:id', async (req, res) => {
    const doc = await db.collection('users').doc(req.params.id).get();
    if (!doc.exists)
        return void res.status(404).json({ error: 'User not found' });
    const data = doc.data();
    const profile = {
        id: doc.id,
        name: data.name,
        photoUrl: data.photoUrl,
        role: data.role,
    };
    res.status(200).json(profile);
});
app.put('/users/me', authenticateUser, async (req, res) => {
    const uid = requireAuth(req, res);
    if (!uid)
        return;
    const body = req.body;
    const updates = {};
    if (body.name !== undefined) {
        if (!isNonEmptyString(body.name))
            return void badRequest(res, 'name must be a non-empty string');
        updates.name = body.name.trim();
    }
    if (body.photoUrl !== undefined) {
        if (!isNonEmptyString(body.photoUrl))
            return void badRequest(res, 'photoUrl must be a non-empty string');
        updates.photoUrl = body.photoUrl.trim();
    }
    if (body.pushToken !== undefined) {
        if (!isNonEmptyString(body.pushToken))
            return void badRequest(res, 'pushToken must be a non-empty string');
        updates.pushToken = body.pushToken.trim();
    }
    if (body.interests !== undefined) {
        const interests = body.interests;
        if (!interests || !Array.isArray(interests.categories) || !Array.isArray(interests.subcategories)) {
            return void badRequest(res, 'interests must be { categories: string[], subcategories: string[] }');
        }
        if (!interests.categories.every(taxonomy_1.isValidCategory)) {
            return void badRequest(res, 'interests.categories contains an unknown category');
        }
        if (!interests.subcategories.every((sub) => interests.categories.some((cat) => (0, taxonomy_1.isValidSubcategory)(cat, sub)))) {
            return void badRequest(res, 'interests.subcategories contains a value not under any selected category');
        }
        const hairTypes = Array.isArray(interests.hairTypes) ? interests.hairTypes : [];
        if (!hairTypes.every(taxonomy_1.isValidHairType)) {
            return void badRequest(res, 'interests.hairTypes contains an unknown hair type');
        }
        updates.interests = {
            categories: interests.categories.map(String),
            subcategories: interests.subcategories.map(String),
            hairTypes: hairTypes.map(String),
        };
    }
    if (Object.keys(updates).length === 0)
        return void badRequest(res, 'No valid fields to update');
    await db.collection('users').doc(uid).set(Object.assign(Object.assign({}, updates), nowTimestamps()), { merge: true });
    const doc = await db.collection('users').doc(uid).get();
    res.status(200).json(Object.assign({ id: doc.id }, doc.data()));
});
app.post('/users/me/favourites', authenticateUser, async (req, res) => {
    const uid = requireAuth(req, res);
    if (!uid)
        return;
    const body = req.body;
    if (!body || !isNonEmptyString(body.providerId))
        return void badRequest(res, 'providerId is required');
    if (body.action !== 'add' && body.action !== 'remove')
        return void badRequest(res, 'action must be add|remove');
    const providerId = body.providerId.trim();
    const providerSnap = await db.collection('providers').doc(providerId).get();
    if (!providerSnap.exists)
        return void badRequest(res, 'Provider not found');
    const update = body.action === 'add'
        ? { favourites: firestore_1.FieldValue.arrayUnion(providerId) }
        : { favourites: firestore_1.FieldValue.arrayRemove(providerId) };
    await db.collection('users').doc(uid).set(Object.assign(Object.assign({}, update), nowTimestamps()), { merge: true });
    const doc = await db.collection('users').doc(uid).get();
    res.status(200).json(Object.assign({ id: doc.id }, doc.data()));
});
/** Providers */
app.get('/providers', async (req, res) => {
    var _a;
    try {
        let query = db.collection('providers');
        const city = isNonEmptyString(req.query.city) ? String(req.query.city).trim() : null;
        const category = isNonEmptyString(req.query.category) ? String(req.query.category).trim() : null;
        const hairType = isNonEmptyString(req.query.hairType) ? String(req.query.hairType).trim() : null;
        const limit = (_a = asNumber(req.query.limit)) !== null && _a !== void 0 ? _a : 20;
        if (city)
            query = query.where('location.city', '==', city);
        // Firestore only allows one array-contains clause per query. If both are given, filter
        // categories server-side and hairType in-memory below (small, already city/category-scoped
        // result sets at this app's scale).
        if (category)
            query = query.where('categories', 'array-contains', category);
        else if (hairType)
            query = query.where('hairTypes', 'array-contains', hairType);
        query = query.limit(Math.min(Math.max(limit, 1), 50));
        const snap = await query.get();
        let items = snap.docs.map(d => (Object.assign({ id: d.id }, d.data())));
        if (category && hairType) {
            items = items.filter((p) => Array.isArray(p.hairTypes) && p.hairTypes.includes(hairType));
        }
        res.status(200).json(items);
    }
    catch (err) {
        console.error('GET /providers error:', err);
        res.status(500).json({ error: 'Failed to list providers' });
    }
});
app.get('/providers/:id', async (req, res) => {
    const id = req.params.id;
    const doc = await db.collection('providers').doc(id).get();
    if (!doc.exists)
        return void res.status(404).json({ error: 'Provider not found' });
    res.status(200).json(Object.assign({ id: doc.id }, doc.data()));
});
/**
 * Create/update the authenticated provider's public profile.
 * This intentionally uses `uid` as providerId.
 */
app.post('/providers/me', authenticateUser, async (req, res) => {
    var _a;
    const uid = requireAuth(req, res);
    if (!uid)
        return;
    const role = await getUserRole(uid);
    if (role !== 'provider') {
        // allow user to "become" a provider during MVP
        await db.collection('users').doc(uid).set(Object.assign({ role: 'provider' }, nowTimestamps()), { merge: true });
    }
    const body = req.body;
    if (!body || !isNonEmptyString(body.name))
        return void badRequest(res, 'name is required');
    if (!body.location || !isNonEmptyString(body.location.city))
        return void badRequest(res, 'location.city is required');
    const lat = asNumber(body.location.lat);
    const lng = asNumber(body.location.lng);
    if (lat === null || lng === null)
        return void badRequest(res, 'location.lat and location.lng must be numbers');
    if (!isNonEmptyString(body.bio))
        return void badRequest(res, 'bio is required');
    if (!Array.isArray(body.categories) || body.categories.length === 0)
        return void badRequest(res, 'categories must be a non-empty array');
    if (!Array.isArray(body.services) || body.services.length === 0)
        return void badRequest(res, 'services must be a non-empty array');
    // Validate services
    for (const s of body.services) {
        if (!isNonEmptyString(s.name))
            return void badRequest(res, 'service.name must be a non-empty string');
        if (!isNonEmptyString(s.category))
            return void badRequest(res, 'service.category must be a non-empty string');
        const price = asNumber(s.price);
        const dur = asNumber(s.durationMins);
        if (price === null || price < 0)
            return void badRequest(res, 'service.price must be a non-negative number');
        if (dur === null || dur <= 0)
            return void badRequest(res, 'service.durationMins must be a positive number');
    }
    // Validate hair types
    if (body.hairTypes !== undefined) {
        if (!Array.isArray(body.hairTypes) || !body.hairTypes.every(taxonomy_1.isValidHairType)) {
            return void badRequest(res, 'hairTypes contains an unknown hair type');
        }
    }
    // Validate availability
    const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (body.availability !== undefined) {
        if (typeof body.availability !== 'object' || body.availability === null) {
            return void badRequest(res, 'availability must be an object keyed by weekday');
        }
        for (const day of types_1.WEEKDAY_KEYS) {
            const slots = body.availability[day];
            if (slots === undefined)
                continue;
            if (!Array.isArray(slots))
                return void badRequest(res, `availability.${day} must be an array`);
            for (const s of slots) {
                if (!s || !TIME_RE.test(s.start) || !TIME_RE.test(s.end) || s.start >= s.end) {
                    return void badRequest(res, `availability.${day} has an invalid time slot (expected "HH:MM" with start < end)`);
                }
            }
        }
    }
    const provider = {
        id: uid,
        name: body.name.trim(),
        photoUrl: (_a = body.photoUrl) === null || _a === void 0 ? void 0 : _a.trim(),
        location: { city: body.location.city.trim(), lat, lng },
        bio: body.bio.trim(),
        categories: body.categories.map(String),
        services: body.services.map(s => {
            var _a, _b;
            return ({
                name: String(s.name).trim(),
                price: (_a = asNumber(s.price)) !== null && _a !== void 0 ? _a : 0,
                category: String(s.category).trim(),
                durationMins: (_b = asNumber(s.durationMins)) !== null && _b !== void 0 ? _b : 0,
            });
        }),
        availability: body.availability,
        hairTypes: body.hairTypes,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    };
    // Set createdAt only if missing
    const ref = db.collection('providers').doc(uid);
    await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) {
            tx.set(ref, Object.assign(Object.assign({}, provider), { createdAt: firestore_1.FieldValue.serverTimestamp() }), { merge: true });
        }
        else {
            tx.set(ref, provider, { merge: true });
        }
    });
    const fresh = await ref.get();
    res.status(200).json(Object.assign({ id: fresh.id }, fresh.data()));
});
/**
 * Self-attested identity verification: provider uploads an ID photo to a private Storage path
 * and submits its URL here. No automated checking — status starts 'pending' and is reviewed by
 * an admin via the endpoints below.
 */
app.post('/providers/me/verification', authenticateUser, async (req, res) => {
    const uid = requireAuth(req, res);
    if (!uid)
        return;
    const body = req.body;
    if (!body || !isNonEmptyString(body.documentUrl))
        return void badRequest(res, 'documentUrl is required');
    if (!body.documentUrl.includes(`/providers%2F${uid}%2Fverification%2F`) && !body.documentUrl.includes(`/providers/${uid}/verification/`)) {
        return void badRequest(res, "documentUrl must point to this provider's own verification upload path");
    }
    const ref = db.collection('providers').doc(uid);
    const snap = await ref.get();
    if (!snap.exists)
        return void badRequest(res, 'Create your provider profile before submitting verification');
    await ref.set(Object.assign({ verificationStatus: 'pending', verificationDocUrl: body.documentUrl, verificationSubmittedAt: firestore_1.FieldValue.serverTimestamp() }, nowTimestamps()), { merge: true });
    const fresh = await ref.get();
    res.status(200).json(Object.assign({ id: fresh.id }, fresh.data()));
});
/**
 * Admin review queue. Admin status itself is granted by directly editing a user's `role` field
 * in Firestore (no self-service promotion, no separate admin auth system) — everything past that
 * point is a normal authenticated+role-checked endpoint like any other.
 */
app.get('/admin/verifications', authenticateUser, async (req, res) => {
    const uid = await requireAdmin(req, res);
    if (!uid)
        return;
    const snap = await db
        .collection('providers')
        .where('verificationStatus', '==', 'pending')
        .orderBy('verificationSubmittedAt', 'asc')
        .get();
    res.status(200).json(snap.docs.map((d) => (Object.assign({ id: d.id }, d.data()))));
});
app.patch('/admin/providers/:id/verification', authenticateUser, async (req, res) => {
    var _a;
    const uid = await requireAdmin(req, res);
    if (!uid)
        return;
    const body = req.body;
    if (!body || !['verified', 'rejected'].includes(body.status)) {
        return void badRequest(res, "status must be 'verified' or 'rejected'");
    }
    const providerId = req.params.id;
    const ref = db.collection('providers').doc(providerId);
    const snap = await ref.get();
    if (!snap.exists)
        return void res.status(404).json({ error: 'Provider not found' });
    await ref.set(Object.assign({ verificationStatus: body.status }, nowTimestamps()), { merge: true });
    const providerUserSnap = await db.collection('users').doc(providerId).get();
    const providerToken = (_a = providerUserSnap.data()) === null || _a === void 0 ? void 0 : _a.pushToken;
    await (0, notifications_1.sendPushNotification)(providerToken, body.status === 'verified' ? 'Verification approved' : 'Verification rejected', body.status === 'verified'
        ? "You're now a verified provider."
        : 'Your verification submission was rejected. You can resubmit from your provider profile.', { type: 'verification_reviewed', status: body.status });
    const fresh = await ref.get();
    res.status(200).json(Object.assign({ id: fresh.id }, fresh.data()));
});
/** Bookings */
app.post('/bookings', authenticateUser, async (req, res) => {
    var _a;
    const uid = requireAuth(req, res);
    if (!uid)
        return;
    const body = req.body;
    if (!body || !isNonEmptyString(body.providerId))
        return void badRequest(res, 'providerId is required');
    if (!body.service || !isNonEmptyString(body.service.name))
        return void badRequest(res, 'service is required');
    if (!isNonEmptyString(body.date))
        return void badRequest(res, 'date is required (ISO string)');
    if (!isNonEmptyString(body.clientAddress))
        return void badRequest(res, 'clientAddress is required');
    // Ensure provider exists
    const providerId = body.providerId.trim();
    const providerSnap = await db.collection('providers').doc(providerId).get();
    if (!providerSnap.exists)
        return void badRequest(res, 'Provider not found');
    const service = body.service;
    const price = asNumber(service.price);
    const dur = asNumber(service.durationMins);
    if (!isNonEmptyString(service.category))
        return void badRequest(res, 'service.category is required');
    if (price === null || price < 0)
        return void badRequest(res, 'service.price must be a non-negative number');
    if (dur === null || dur <= 0)
        return void badRequest(res, 'service.durationMins must be a positive number');
    const startMs = new Date(body.date).getTime();
    if (Number.isNaN(startMs))
        return void badRequest(res, 'date must be a valid ISO string');
    const endMs = startMs + dur * 60000;
    const clientAddress = body.clientAddress.trim();
    // Best-effort and outside the transaction (it's a network call; transactions may retry).
    const clientGeo = await (0, geocoding_1.geocodeAddress)(clientAddress);
    const bookingData = {
        userId: uid,
        providerId,
        service: {
            name: String(service.name).trim(),
            category: String(service.category).trim(),
            price,
            durationMins: dur,
        },
        date: body.date,
        clientAddress,
        clientLat: clientGeo === null || clientGeo === void 0 ? void 0 : clientGeo.lat,
        clientLng: clientGeo === null || clientGeo === void 0 ? void 0 : clientGeo.lng,
        notes: isNonEmptyString(body.notes) ? body.notes.trim() : undefined,
        status: 'pending',
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    };
    const ref = db.collection('bookings').doc();
    try {
        const outcome = await db.runTransaction(async (tx) => {
            const conflictQuery = db
                .collection('bookings')
                .where('providerId', '==', providerId)
                .where('status', 'in', ['pending', 'confirmed']);
            const existingSnap = await tx.get(conflictQuery);
            const hasOverlap = existingSnap.docs.some((d) => {
                var _a, _b;
                const b = d.data();
                const bStart = new Date(b.date).getTime();
                const bEnd = bStart + ((_b = (_a = b.service) === null || _a === void 0 ? void 0 : _a.durationMins) !== null && _b !== void 0 ? _b : 0) * 60000;
                // Exact time overlap — always rejected regardless of location.
                if (bStart < endMs && bEnd > startMs)
                    return true;
                // Distance-aware travel buffer — only enforced when both bookings have geocoded
                // addresses; otherwise this pair falls back to exact-overlap-only, same as before.
                if (clientGeo && b.clientLat != null && b.clientLng != null) {
                    const distanceKm = (0, travel_1.haversineKm)(clientGeo, { lat: b.clientLat, lng: b.clientLng });
                    const bufferMs = (0, travel_1.estimateTravelBufferMinutes)(distanceKm) * 60000;
                    const gapMs = bStart >= endMs ? bStart - endMs : startMs - bEnd;
                    if (gapMs < bufferMs)
                        return true;
                }
                return false;
            });
            if (hasOverlap)
                return { ok: false };
            tx.set(ref, bookingData);
            return { ok: true };
        });
        if (!outcome.ok) {
            res.status(409).json({ error: 'That time is no longer available for this provider. Please pick a different time.' });
            return;
        }
        const created = await ref.get();
        const providerUserSnap = await db.collection('users').doc(providerId).get();
        const providerToken = (_a = providerUserSnap.data()) === null || _a === void 0 ? void 0 : _a.pushToken;
        await (0, notifications_1.sendPushNotification)(providerToken, 'New booking request', `New request for ${bookingData.service.name}`, { type: 'booking_created', bookingId: ref.id });
        res.status(201).json(Object.assign({ id: created.id }, created.data()));
    }
    catch (err) {
        console.error('POST /bookings error:', err);
        res.status(500).json({ error: 'Failed to create booking' });
    }
});
app.get('/bookings', authenticateUser, async (req, res) => {
    const uid = requireAuth(req, res);
    if (!uid)
        return;
    try {
        const role = await getUserRole(uid);
        let query = db.collection('bookings');
        if (role === 'provider') {
            query = query.where('providerId', '==', uid);
        }
        else {
            query = query.where('userId', '==', uid);
        }
        // optional status filter
        const status = isNonEmptyString(req.query.status) ? String(req.query.status).trim() : null;
        if (status)
            query = query.where('status', '==', status);
        query = query.orderBy('date', 'desc').limit(50);
        const snap = await query.get();
        if (role === 'provider') {
            const uniqueUserIds = Array.from(new Set(snap.docs.map((d) => d.data().userId)));
            const userDocs = uniqueUserIds.length > 0
                ? await db.getAll(...uniqueUserIds.map((id) => db.collection('users').doc(id)))
                : [];
            const namesById = new Map(userDocs.filter((d) => d.exists).map((d) => { var _a, _b; return [d.id, (_b = (_a = d.data()) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : 'Client']; }));
            res.status(200).json(snap.docs.map((d) => { var _a; return (Object.assign(Object.assign({ id: d.id }, d.data()), { userName: (_a = namesById.get(d.data().userId)) !== null && _a !== void 0 ? _a : 'Client' })); }));
            return;
        }
        const reviewedIds = await getUserReviewedBookingIds(uid);
        res.status(200).json(snap.docs.map((d) => (Object.assign(Object.assign({ id: d.id }, d.data()), { hasReview: reviewedIds.has(d.id) }))));
    }
    catch (err) {
        console.error('GET /bookings error:', err);
        res.status(500).json({ error: 'Failed to list bookings' });
    }
});
app.patch('/bookings/:id/status', authenticateUser, async (req, res) => {
    var _a, _b, _c;
    const uid = requireAuth(req, res);
    if (!uid)
        return;
    const bookingId = req.params.id;
    const body = req.body;
    if (!body || !isNonEmptyString(body.status))
        return void badRequest(res, 'status is required');
    const status = body.status;
    if (!['pending', 'confirmed', 'completed', 'cancelled'].includes(status)) {
        return void badRequest(res, 'Invalid status');
    }
    const ref = db.collection('bookings').doc(bookingId);
    const snap = await ref.get();
    if (!snap.exists)
        return void res.status(404).json({ error: 'Booking not found' });
    const data = snap.data();
    const canEdit = data.userId === uid || data.providerId === uid;
    if (!canEdit)
        return void forbidden(res, 'Not allowed to update this booking');
    await ref.set(Object.assign({ status }, nowTimestamps()), { merge: true });
    const updated = await ref.get();
    if (status === 'confirmed' || status === 'cancelled') {
        const clientSnap = await db.collection('users').doc(data.userId).get();
        const clientToken = (_a = clientSnap.data()) === null || _a === void 0 ? void 0 : _a.pushToken;
        await (0, notifications_1.sendPushNotification)(clientToken, status === 'confirmed' ? 'Booking confirmed' : 'Booking cancelled', `Your booking for ${(_c = (_b = data.service) === null || _b === void 0 ? void 0 : _b.name) !== null && _c !== void 0 ? _c : 'your appointment'} was ${status}.`, { type: 'booking_status', bookingId, status });
    }
    res.status(200).json(Object.assign({ id: updated.id }, updated.data()));
});
/** Chat */
app.post('/bookings/:id/messages', authenticateUser, async (req, res) => {
    var _a, _b, _c;
    const uid = requireAuth(req, res);
    if (!uid)
        return;
    const bookingId = req.params.id;
    const body = req.body;
    if (!body || !isNonEmptyString(body.text))
        return void badRequest(res, 'text is required');
    const bookingRef = db.collection('bookings').doc(bookingId);
    const bookingSnap = await bookingRef.get();
    if (!bookingSnap.exists)
        return void res.status(404).json({ error: 'Booking not found' });
    const booking = bookingSnap.data();
    const canMessage = booking.userId === uid || booking.providerId === uid;
    if (!canMessage)
        return void forbidden(res, 'Not allowed to message on this booking');
    const senderSnap = await db.collection('users').doc(uid).get();
    const senderName = (_b = (_a = senderSnap.data()) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : 'User';
    const text = body.text.trim().slice(0, 1000);
    const message = {
        bookingId,
        senderId: uid,
        senderName,
        text,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
    };
    const ref = await db.collection('chats').doc(bookingId).collection('messages').add(message);
    const created = await ref.get();
    const otherUid = booking.userId === uid ? booking.providerId : booking.userId;
    const otherSnap = await db.collection('users').doc(otherUid).get();
    const otherToken = (_c = otherSnap.data()) === null || _c === void 0 ? void 0 : _c.pushToken;
    await (0, notifications_1.sendPushNotification)(otherToken, senderName, text, { type: 'chat_message', bookingId });
    res.status(201).json(Object.assign({ id: created.id }, created.data()));
});
/** Reviews */
app.post('/bookings/:id/review', authenticateUser, async (req, res) => {
    var _a;
    const uid = requireAuth(req, res);
    if (!uid)
        return;
    const bookingId = req.params.id;
    const body = req.body;
    const rating = asNumber(body.rating);
    if (rating === null || !Number.isInteger(rating) || rating < 1 || rating > 5) {
        return void badRequest(res, 'rating must be an integer between 1 and 5');
    }
    const text = isNonEmptyString(body.text) ? body.text.trim().slice(0, 500) : undefined;
    const bookingRef = db.collection('bookings').doc(bookingId);
    const reviewRef = db.collection('reviews').doc(bookingId);
    try {
        const outcome = await db.runTransaction(async (tx) => {
            var _a, _b, _c, _d;
            const [bookingSnap, reviewSnap] = await Promise.all([tx.get(bookingRef), tx.get(reviewRef)]);
            if (!bookingSnap.exists)
                return { ok: false, code: 404, message: 'Booking not found' };
            const booking = bookingSnap.data();
            if (booking.userId !== uid)
                return { ok: false, code: 403, message: 'Not allowed to review this booking' };
            if (booking.status !== 'completed')
                return { ok: false, code: 400, message: 'Only completed bookings can be reviewed' };
            if (reviewSnap.exists)
                return { ok: false, code: 409, message: 'You already reviewed this booking' };
            const providerRef = db.collection('providers').doc(booking.providerId);
            const userRef = db.collection('users').doc(uid);
            const [providerSnap, userSnap] = await Promise.all([tx.get(providerRef), tx.get(userRef)]);
            if (!providerSnap.exists)
                return { ok: false, code: 404, message: 'Provider not found' };
            const current = (_b = (_a = providerSnap.data()) === null || _a === void 0 ? void 0 : _a.ratings) !== null && _b !== void 0 ? _b : { average: 0, count: 0 };
            const nextCount = current.count + 1;
            const nextAverage = (current.average * current.count + rating) / nextCount;
            const userName = (_d = (_c = userSnap.data()) === null || _c === void 0 ? void 0 : _c.name) !== null && _d !== void 0 ? _d : 'User';
            const review = {
                bookingId,
                userId: uid,
                userName,
                providerId: booking.providerId,
                rating,
                text,
                createdAt: firestore_1.FieldValue.serverTimestamp(),
            };
            tx.set(reviewRef, review);
            tx.update(providerRef, Object.assign({ ratings: { average: nextAverage, count: nextCount } }, nowTimestamps()));
            return { ok: true, providerId: booking.providerId, userName, rating };
        });
        if (!outcome.ok) {
            res.status(outcome.code).json({ error: outcome.message });
            return;
        }
        const created = await reviewRef.get();
        const providerUserSnap = await db.collection('users').doc(outcome.providerId).get();
        const providerToken = (_a = providerUserSnap.data()) === null || _a === void 0 ? void 0 : _a.pushToken;
        await (0, notifications_1.sendPushNotification)(providerToken, 'New review', `${outcome.userName} left you a ${outcome.rating}-star review.`, { type: 'new_review', bookingId, providerId: outcome.providerId });
        res.status(201).json(Object.assign({ id: created.id }, created.data()));
    }
    catch (err) {
        console.error('POST /bookings/:id/review error:', err);
        res.status(500).json({ error: 'Failed to submit review' });
    }
});
app.get('/providers/:id/reviews', async (req, res) => {
    try {
        const snap = await db
            .collection('reviews')
            .where('providerId', '==', req.params.id)
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();
        res.status(200).json(snap.docs.map((d) => (Object.assign({ id: d.id }, d.data()))));
    }
    catch (err) {
        console.error('GET /providers/:id/reviews error:', err);
        res.status(500).json({ error: 'Failed to load reviews' });
    }
});
/**
 * Follow — a public, social-facing relationship distinct from Favourites (which stays a
 * private, booking-oriented bookmark). Doc ID is `${followerId}_${providerId}`, so
 * following/unfollowing is a plain existence check rather than a query.
 */
app.post('/providers/:id/follow', authenticateUser, async (req, res) => {
    const uid = requireAuth(req, res);
    if (!uid)
        return;
    const providerId = req.params.id;
    if (uid === providerId)
        return void badRequest(res, "You can't follow yourself");
    const providerRef = db.collection('providers').doc(providerId);
    const followRef = db.collection('follows').doc(`${uid}_${providerId}`);
    try {
        await db.runTransaction(async (tx) => {
            const [providerSnap, followSnap] = await Promise.all([tx.get(providerRef), tx.get(followRef)]);
            if (!providerSnap.exists)
                throw new Error('NOT_FOUND');
            if (followSnap.exists)
                return; // already following — idempotent
            tx.set(followRef, { followerId: uid, providerId, createdAt: firestore_1.FieldValue.serverTimestamp() });
            tx.set(providerRef, { followerCount: firestore_1.FieldValue.increment(1) }, { merge: true });
            tx.set(db.collection('users').doc(uid), { followingCount: firestore_1.FieldValue.increment(1) }, { merge: true });
        });
        res.status(200).json({ following: true });
    }
    catch (err) {
        if (err instanceof Error && err.message === 'NOT_FOUND') {
            return void res.status(404).json({ error: 'Provider not found' });
        }
        console.error('POST /providers/:id/follow error:', err);
        res.status(500).json({ error: 'Failed to follow provider' });
    }
});
app.delete('/providers/:id/follow', authenticateUser, async (req, res) => {
    const uid = requireAuth(req, res);
    if (!uid)
        return;
    const providerId = req.params.id;
    const providerRef = db.collection('providers').doc(providerId);
    const followRef = db.collection('follows').doc(`${uid}_${providerId}`);
    try {
        await db.runTransaction(async (tx) => {
            const followSnap = await tx.get(followRef);
            if (!followSnap.exists)
                return; // already not following — idempotent
            tx.delete(followRef);
            tx.set(providerRef, { followerCount: firestore_1.FieldValue.increment(-1) }, { merge: true });
            tx.set(db.collection('users').doc(uid), { followingCount: firestore_1.FieldValue.increment(-1) }, { merge: true });
        });
        res.status(200).json({ following: false });
    }
    catch (err) {
        console.error('DELETE /providers/:id/follow error:', err);
        res.status(500).json({ error: 'Failed to unfollow provider' });
    }
});
app.get('/providers/:id/follow-status', authenticateUser, async (req, res) => {
    const uid = requireAuth(req, res);
    if (!uid)
        return;
    const followSnap = await db.collection('follows').doc(`${uid}_${req.params.id}`).get();
    res.status(200).json({ following: followSnap.exists });
});
/**
 * Stats for the authenticated user's own profile: how many providers they follow, how many
 * likes their posts have collectively received, and — only when they're a provider —
 * their follower count and rating.
 */
async function computeUserStats(uid) {
    var _a, _b, _c;
    const [userSnap, providerSnap, postsSnap] = await Promise.all([
        db.collection('users').doc(uid).get(),
        db.collection('providers').doc(uid).get(),
        db.collection('posts').where('providerId', '==', uid).limit(500).get(),
    ]);
    const totalLikes = postsSnap.docs.reduce((sum, d) => sum + (Number(d.data().likeCount) || 0), 0);
    const stats = {
        followingCount: Number((_a = userSnap.data()) === null || _a === void 0 ? void 0 : _a.followingCount) || 0,
        totalLikes,
    };
    if (providerSnap.exists) {
        stats.followerCount = Number((_b = providerSnap.data()) === null || _b === void 0 ? void 0 : _b.followerCount) || 0;
        stats.rating = (_c = providerSnap.data()) === null || _c === void 0 ? void 0 : _c.ratings;
    }
    return stats;
}
app.get('/users/me/stats', authenticateUser, async (req, res) => {
    const uid = requireAuth(req, res);
    if (!uid)
        return;
    try {
        res.status(200).json(await computeUserStats(uid));
    }
    catch (err) {
        console.error('GET /users/me/stats error:', err);
        res.status(500).json({ error: 'Failed to load stats' });
    }
});
/** Same stats, for viewing any user's public profile — not privacy-sensitive (mirrors the
 * follower/post counts any social app shows on a public profile). */
app.get('/users/:id/stats', async (req, res) => {
    try {
        res.status(200).json(await computeUserStats(req.params.id));
    }
    catch (err) {
        console.error('GET /users/:id/stats error:', err);
        res.status(500).json({ error: 'Failed to load stats' });
    }
});
/** `likedByMe`/`savedByMe` are derived per-request, not stored on the post document. */
async function getUserEngagementSets(uid) {
    const [likesSnap, savesSnap] = await Promise.all([
        db.collection('postLikes').where('userId', '==', uid).limit(500).get(),
        db.collection('postSaves').where('userId', '==', uid).limit(500).get(),
    ]);
    return {
        likedPostIds: new Set(likesSnap.docs.map((d) => d.data().postId)),
        savedPostIds: new Set(savesSnap.docs.map((d) => d.data().postId)),
    };
}
function annotatePost(post, sets) {
    return Object.assign(Object.assign({}, post), { likedByMe: sets.likedPostIds.has(post.id), savedByMe: sets.savedPostIds.has(post.id) });
}
async function computeUserWeights(uid, sets) {
    var _a, _b;
    const weights = {};
    const bump = (key, amount) => {
        var _a;
        weights[key] = ((_a = weights[key]) !== null && _a !== void 0 ? _a : 0) + amount;
    };
    const [userSnap, bookingsSnap] = await Promise.all([
        db.collection('users').doc(uid).get(),
        db.collection('bookings').where('userId', '==', uid).limit(200).get(),
    ]);
    const interests = (_a = userSnap.data()) === null || _a === void 0 ? void 0 : _a.interests;
    if (interests) {
        interests.categories.forEach((c) => bump(`cat:${c}`, 3));
        interests.subcategories.forEach((s) => bump(`sub:${s}`, 3));
        ((_b = interests.hairTypes) !== null && _b !== void 0 ? _b : []).forEach((h) => bump(`hairType:${h}`, 3));
    }
    bookingsSnap.docs.forEach((doc) => {
        var _a;
        const category = (_a = doc.data().service) === null || _a === void 0 ? void 0 : _a.category;
        if (isNonEmptyString(category))
            bump(`cat:${category}`, 4);
    });
    const uniquePostIds = Array.from(new Set([...sets.likedPostIds, ...sets.savedPostIds]));
    if (uniquePostIds.length > 0) {
        const postDocs = await db.getAll(...uniquePostIds.map((id) => db.collection('posts').doc(id)));
        postDocs.forEach((doc) => {
            var _a;
            if (!doc.exists)
                return;
            const data = doc.data();
            const amount = (sets.likedPostIds.has(doc.id) ? 2 : 0) + (sets.savedPostIds.has(doc.id) ? 3 : 0);
            if (amount > 0) {
                bump(`cat:${data.category}`, amount);
                if (data.subcategory)
                    bump(`sub:${data.subcategory}`, amount);
                ((_a = data.hairTypes) !== null && _a !== void 0 ? _a : []).forEach((h) => bump(`hairType:${h}`, amount));
            }
        });
    }
    return weights;
}
function scorePost(post, weights) {
    var _a, _b, _c;
    let score = ((_a = weights[`cat:${post.category}`]) !== null && _a !== void 0 ? _a : 0) + (post.subcategory ? (_b = weights[`sub:${post.subcategory}`]) !== null && _b !== void 0 ? _b : 0 : 0);
    score += ((_c = post.hairTypes) !== null && _c !== void 0 ? _c : []).reduce((sum, h) => { var _a; return sum + ((_a = weights[`hairType:${h}`]) !== null && _a !== void 0 ? _a : 0); }, 0);
    score += Math.log(1 + post.likeCount) * 0.5;
    return score;
}
/**
 * Personalized feed.
 * mode=discover (professional gallery, Pinterest-style): gallery photos only (mediaType
 *   "image" + category), filtered to the user's selected categories, sorted by popularity.
 * mode=foryou (default; content feed, TikTok-style): feed videos only (mediaType "video"),
 *   ranked by the user's quiz interests + engagement history.
 * These are deliberately disjoint pools — a gallery photo never appears in For You and a feed
 * video never appears in Discover.
 */
app.get('/posts/feed', authenticateUser, async (req, res) => {
    var _a, _b, _c;
    const uid = requireAuth(req, res);
    if (!uid)
        return;
    try {
        const mode = req.query.mode === 'discover' ? 'discover' : 'foryou';
        const limit = Math.min(Math.max((_a = asNumber(req.query.limit)) !== null && _a !== void 0 ? _a : 30, 1), 50);
        const [poolSnap, sets] = await Promise.all([
            db.collection('posts').orderBy('createdAt', 'desc').limit(200).get(),
            getUserEngagementSets(uid),
        ]);
        const posts = poolSnap.docs.map((d) => (Object.assign({ id: d.id }, d.data())));
        if (mode === 'discover') {
            const galleryPosts = posts.filter((p) => p.mediaType === 'image' && !!p.category);
            const userSnap = await db.collection('users').doc(uid).get();
            const interests = (_b = userSnap.data()) === null || _b === void 0 ? void 0 : _b.interests;
            const categories = (_c = interests === null || interests === void 0 ? void 0 : interests.categories) !== null && _c !== void 0 ? _c : [];
            // Quiz interests bias the default sort order (interest-matching photos surface first) but
            // never hide a category outright — the on-screen category chips are the actual filter, and
            // every category must stay browsable regardless of what was picked at onboarding.
            const sorted = galleryPosts.sort((a, b) => {
                const aMatch = categories.includes(a.category) ? 1 : 0;
                const bMatch = categories.includes(b.category) ? 1 : 0;
                return aMatch !== bMatch ? bMatch - aMatch : b.likeCount - a.likeCount;
            });
            res.status(200).json(sorted.slice(0, limit).map((p) => annotatePost(p, sets)));
            return;
        }
        const feedPosts = posts.filter((p) => p.mediaType === 'video');
        const weights = await computeUserWeights(uid, sets);
        const sorted = feedPosts
            .map((post) => ({ post, score: scorePost(post, weights) }))
            .sort((a, b) => b.score - a.score)
            .map((entry) => entry.post);
        res.status(200).json(sorted.slice(0, limit).map((p) => annotatePost(p, sets)));
    }
    catch (err) {
        console.error('GET /posts/feed error:', err);
        res.status(500).json({ error: 'Failed to load feed' });
    }
});
app.get('/posts/saved', authenticateUser, async (req, res) => {
    const uid = requireAuth(req, res);
    if (!uid)
        return;
    try {
        const sets = await getUserEngagementSets(uid);
        const postIds = Array.from(sets.savedPostIds);
        if (postIds.length === 0) {
            res.status(200).json([]);
            return;
        }
        const postDocs = await db.getAll(...postIds.map((id) => db.collection('posts').doc(id)));
        const posts = postDocs.filter((d) => d.exists).map((d) => (Object.assign({ id: d.id }, d.data())));
        res.status(200).json(posts.map((p) => annotatePost(p, sets)));
    }
    catch (err) {
        console.error('GET /posts/saved error:', err);
        res.status(500).json({ error: 'Failed to load saved posts' });
    }
});
app.get('/posts/:id', authenticateUser, async (req, res) => {
    const uid = requireAuth(req, res);
    if (!uid)
        return;
    try {
        const doc = await db.collection('posts').doc(req.params.id).get();
        if (!doc.exists)
            return void res.status(404).json({ error: 'Post not found' });
        const sets = await getUserEngagementSets(uid);
        res.status(200).json(annotatePost(Object.assign({ id: doc.id }, doc.data()), sets));
    }
    catch (err) {
        console.error('GET /posts/:id error:', err);
        res.status(500).json({ error: 'Failed to load post' });
    }
});
/** A business's own portfolio posts (public, like the provider profile itself). */
app.get('/providers/:id/posts', async (req, res) => {
    try {
        const snap = await db
            .collection('posts')
            .where('providerId', '==', req.params.id)
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();
        const posts = snap.docs.map((d) => (Object.assign({ id: d.id }, d.data())));
        const authHeader = req.headers.authorization;
        if (authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith('Bearer ')) {
            try {
                const decoded = await admin.auth().verifyIdToken(authHeader.split('Bearer ')[1]);
                const sets = await getUserEngagementSets(decoded.uid);
                res.status(200).json(posts.map((p) => annotatePost(p, sets)));
                return;
            }
            catch (_a) {
                // Fall through and return unannotated posts for an invalid/expired token.
            }
        }
        res.status(200).json(posts);
    }
    catch (err) {
        console.error('GET /providers/:id/posts error:', err);
        res.status(500).json({ error: 'Failed to load posts' });
    }
});
/**
 * Any signed-in user can post — not just providers. `category` is required for provider
 * portfolio posts (it drives Discover/search filtering) but optional for everyday posts; when
 * omitted, the post simply doesn't get a category-match score boost in the feed algorithms.
 */
app.post('/posts', authenticateUser, async (req, res) => {
    const uid = requireAuth(req, res);
    if (!uid)
        return;
    const body = req.body;
    if (!isNonEmptyString(body.mediaUrl))
        return void badRequest(res, 'mediaUrl is required');
    if (!body.mediaUrl.includes(`/providers%2F${uid}%2Fposts%2F`) && !body.mediaUrl.includes(`/providers/${uid}/posts/`)) {
        return void badRequest(res, "mediaUrl must point to this user's own upload path");
    }
    if (body.mediaType !== 'image' && body.mediaType !== 'video')
        return void badRequest(res, 'mediaType must be image|video');
    if (body.thumbnailUrl !== undefined) {
        if (!isNonEmptyString(body.thumbnailUrl))
            return void badRequest(res, 'thumbnailUrl must be a non-empty string');
        if (!body.thumbnailUrl.includes(`/providers%2F${uid}%2Fposts%2F`) && !body.thumbnailUrl.includes(`/providers/${uid}/posts/`)) {
            return void badRequest(res, "thumbnailUrl must point to this user's own upload path");
        }
    }
    // Two distinct posting destinations: a gallery photo (tagged by category, shows in Discover
    // and the provider's portfolio) or a feed video (TikTok-style, shows in For You). A photo
    // with no category has nowhere to surface, so it's rejected rather than left orphaned.
    if (body.mediaType === 'image' && !body.category)
        return void badRequest(res, 'category is required for a gallery photo');
    if (body.category !== undefined && !(0, taxonomy_1.isValidCategory)(body.category))
        return void badRequest(res, 'category is invalid');
    if (body.subcategory !== undefined) {
        if (!body.category)
            return void badRequest(res, 'subcategory requires a category');
        if (!(0, taxonomy_1.isValidSubcategory)(body.category, body.subcategory))
            return void badRequest(res, 'subcategory does not belong to category');
    }
    if (body.hairTypes !== undefined && (!Array.isArray(body.hairTypes) || !body.hairTypes.every(taxonomy_1.isValidHairType))) {
        return void badRequest(res, 'hairTypes contains an unknown hair type');
    }
    const post = {
        providerId: uid,
        mediaUrl: body.mediaUrl,
        mediaType: body.mediaType,
        thumbnailUrl: body.thumbnailUrl,
        caption: isNonEmptyString(body.caption) ? body.caption.trim().slice(0, 500) : undefined,
        category: body.category,
        subcategory: body.subcategory,
        hairTypes: body.hairTypes,
        likeCount: 0,
        saveCount: 0,
        commentCount: 0,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    };
    const ref = await db.collection('posts').add(post);
    const created = await ref.get();
    res.status(201).json(Object.assign({ id: created.id }, created.data()));
});
app.delete('/posts/:id', authenticateUser, async (req, res) => {
    var _a;
    const uid = requireAuth(req, res);
    if (!uid)
        return;
    const ref = db.collection('posts').doc(req.params.id);
    const snap = await ref.get();
    if (!snap.exists)
        return void res.status(404).json({ error: 'Post not found' });
    if (((_a = snap.data()) === null || _a === void 0 ? void 0 : _a.providerId) !== uid)
        return void forbidden(res, 'Not allowed to delete this post');
    await ref.delete();
    res.status(200).json({ deleted: true });
});
/** Toggle a like/save row + a denormalized counter on the post, keyed by `${postId}_${uid}` so it's idempotent. */
async function setEngagement(collectionName, countField, postId, uid, add) {
    const postRef = db.collection('posts').doc(postId);
    const engagementRef = db.collection(collectionName).doc(`${postId}_${uid}`);
    return db.runTransaction(async (tx) => {
        const [postSnap, engagementSnap] = await Promise.all([tx.get(postRef), tx.get(engagementRef)]);
        if (!postSnap.exists)
            return { ok: false, message: 'Post not found' };
        const alreadyExists = engagementSnap.exists;
        if (add === alreadyExists)
            return { ok: true };
        if (add) {
            tx.set(engagementRef, { postId, userId: uid, createdAt: firestore_1.FieldValue.serverTimestamp() });
            tx.update(postRef, { [countField]: firestore_1.FieldValue.increment(1) });
        }
        else {
            tx.delete(engagementRef);
            tx.update(postRef, { [countField]: firestore_1.FieldValue.increment(-1) });
        }
        return { ok: true };
    });
}
app.post('/posts/:id/like', authenticateUser, async (req, res) => {
    const uid = requireAuth(req, res);
    if (!uid)
        return;
    const result = await setEngagement('postLikes', 'likeCount', req.params.id, uid, true);
    if (!result.ok)
        return void res.status(404).json({ error: result.message });
    res.status(200).json({ liked: true });
});
app.delete('/posts/:id/like', authenticateUser, async (req, res) => {
    const uid = requireAuth(req, res);
    if (!uid)
        return;
    const result = await setEngagement('postLikes', 'likeCount', req.params.id, uid, false);
    if (!result.ok)
        return void res.status(404).json({ error: result.message });
    res.status(200).json({ liked: false });
});
app.post('/posts/:id/save', authenticateUser, async (req, res) => {
    const uid = requireAuth(req, res);
    if (!uid)
        return;
    const result = await setEngagement('postSaves', 'saveCount', req.params.id, uid, true);
    if (!result.ok)
        return void res.status(404).json({ error: result.message });
    res.status(200).json({ saved: true });
});
app.delete('/posts/:id/save', authenticateUser, async (req, res) => {
    const uid = requireAuth(req, res);
    if (!uid)
        return;
    const result = await setEngagement('postSaves', 'saveCount', req.params.id, uid, false);
    if (!result.ok)
        return void res.status(404).json({ error: result.message });
    res.status(200).json({ saved: false });
});
/** Comments */
app.get('/posts/:id/comments', async (req, res) => {
    try {
        const snap = await db
            .collection('postComments')
            .where('postId', '==', req.params.id)
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();
        res.status(200).json(snap.docs.map((d) => (Object.assign({ id: d.id }, d.data()))));
    }
    catch (err) {
        console.error('GET /posts/:id/comments error:', err);
        res.status(500).json({ error: 'Failed to load comments' });
    }
});
app.post('/posts/:id/comments', authenticateUser, async (req, res) => {
    var _a, _b;
    const uid = requireAuth(req, res);
    if (!uid)
        return;
    const postId = req.params.id;
    const body = req.body;
    if (!body || !isNonEmptyString(body.text))
        return void badRequest(res, 'text is required');
    const postRef = db.collection('posts').doc(postId);
    const postSnap = await postRef.get();
    if (!postSnap.exists)
        return void res.status(404).json({ error: 'Post not found' });
    const userSnap = await db.collection('users').doc(uid).get();
    const userName = (_b = (_a = userSnap.data()) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : 'User';
    const comment = {
        postId,
        userId: uid,
        userName,
        text: body.text.trim().slice(0, 500),
        createdAt: firestore_1.FieldValue.serverTimestamp(),
    };
    const [ref] = await Promise.all([
        db.collection('postComments').add(comment),
        postRef.update({ commentCount: firestore_1.FieldValue.increment(1) }),
    ]);
    const created = await ref.get();
    res.status(201).json(Object.assign({ id: created.id }, created.data()));
});
/** Export HTTPS function */
exports.api = functions.https.onRequest(app);
/**
 * Booking reminders (24h and 1h before an appointment).
 *
 * NOT DEPLOYED as part of this work — Cloud Scheduler (which this depends on) requires the
 * Blaze plan. `firebase deploy --only functions` will attempt to deploy this function too;
 * deploying anything after this point means either upgrading to Blaze first or scoping the
 * deploy to exclude it (`firebase deploy --only functions:api`).
 *
 * Testable against the emulator without a real schedule: trigger it on demand via the
 * Emulator UI (Functions tab → sendBookingReminders → "Trigger now") or
 * `curl -X POST http://127.0.0.1:5001/<project>/us-central1/sendBookingReminders`.
 */
async function sendReminderBatch(now, windowMs, flagField, title) {
    var _a, _b, _c;
    const windowStart = now + windowMs - 15 * 60 * 1000;
    const windowEnd = now + windowMs;
    const snap = await db.collection('bookings').where('status', '==', 'confirmed').get();
    for (const doc of snap.docs) {
        const booking = doc.data();
        if (booking[flagField])
            continue;
        const bookingTime = new Date(booking.date).getTime();
        if (Number.isNaN(bookingTime) || bookingTime < windowStart || bookingTime > windowEnd)
            continue;
        const clientSnap = await db.collection('users').doc(booking.userId).get();
        const clientToken = (_a = clientSnap.data()) === null || _a === void 0 ? void 0 : _a.pushToken;
        await (0, notifications_1.sendPushNotification)(clientToken, title, `${(_c = (_b = booking.service) === null || _b === void 0 ? void 0 : _b.name) !== null && _c !== void 0 ? _c : 'Your appointment'} — don't forget!`, { type: 'booking_reminder', bookingId: doc.id });
        await doc.ref.update({ [flagField]: true });
    }
}
exports.sendBookingReminders = functions.pubsub.schedule('every 15 minutes').onRun(async () => {
    const now = Date.now();
    await sendReminderBatch(now, 24 * 60 * 60 * 1000, 'remindedAt24h', 'Appointment tomorrow');
    await sendReminderBatch(now, 60 * 60 * 1000, 'remindedAt1h', 'Appointment in 1 hour');
});
//# sourceMappingURL=index.js.map