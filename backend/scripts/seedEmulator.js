/**
 * Seed the Firestore **emulator** with sample providers and a sample client user doc.
 *
 * Usage:
 * 1) Start emulators from `backend/`:
 *    firebase emulators:start
 * 2) In another terminal:
 *    node scripts/seedEmulator.js
 *
 * This script targets the emulator by setting FIRESTORE_EMULATOR_HOST.
 */
const admin = require('firebase-admin');

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'demo-beautybooking';
const FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
process.env.FIRESTORE_EMULATOR_HOST = FIRESTORE_EMULATOR_HOST;

if (admin.apps.length === 0) {
  admin.initializeApp({ projectId: PROJECT_ID });
}

const db = admin.firestore();

function sampleProvider(id, city, lat, lng, name, categories) {
  return {
    id,
    name,
    photoUrl: '',
    location: { city, lat, lng },
    bio: `${name} – experienced beauty professional in ${city}.`,
    categories,
    services: [
      { name: 'Classic haircut', price: 25, category: 'Hair', durationMins: 30 },
      { name: 'Full set nails', price: 40, category: 'Nails', durationMins: 60 },
    ],
    availability: {
      monday: [{ start: '09:00', end: '17:00' }],
      tuesday: [{ start: '09:00', end: '17:00' }],
      wednesday: [{ start: '09:00', end: '17:00' }],
      thursday: [{ start: '09:00', end: '17:00' }],
      friday: [{ start: '09:00', end: '17:00' }],
    },
    ratings: { average: 4.7, count: 128 },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
}

async function main() {
  const providers = [
    sampleProvider('provider_1', 'London', 51.5072, -0.1276, 'Aisha Styles', ['Hair']),
    sampleProvider('provider_2', 'London', 51.5090, -0.1180, 'Maya Nails', ['Nails']),
    sampleProvider('provider_3', 'Birmingham', 52.4862, -1.8904, 'Noor Beauty', ['Hair', 'Nails']),
  ];

  for (const p of providers) {
    await db.collection('providers').doc(p.id).set(p, { merge: true });
  }

  // Example client user doc (you'll normally create users via Firebase Auth)
  await db.collection('users').doc('client_demo').set(
    {
      id: 'client_demo',
      name: 'Demo Client',
      email: 'demo@example.com',
      role: 'client',
      favourites: [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  console.log('✅ Seeded emulator with sample providers + demo client.');
  console.log(`Project: ${PROJECT_ID}`);
  console.log(`Firestore emulator: ${FIRESTORE_EMULATOR_HOST}`);
}

main().catch((e) => {
  console.error('❌ Seed failed:', e);
  process.exit(1);
});
