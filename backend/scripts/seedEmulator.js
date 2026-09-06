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

// Optional: real hair/beauty photos and videos from Pexels' free API instead of generic
// picsum.photos placeholders and a single stock clip. Get a free key at pexels.com/api and run
// this script with PEXELS_API_KEY=xxxxx node scripts/seedEmulator.js — without a key, seeding
// falls back to the placeholder media exactly as before (nothing breaks either way).
const PEXELS_API_KEY = process.env.PEXELS_API_KEY;

/** Best-effort: returns a Pexels photo URL for `query`, or null (caller falls back to picsum). */
async function fetchPexelsPhoto(query) {
  if (!PEXELS_API_KEY) return null;
  try {
    const res = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=portrait`, {
      headers: { Authorization: PEXELS_API_KEY },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.photos?.[0]?.src?.portrait ?? data.photos?.[0]?.src?.large ?? null;
  } catch (err) {
    console.warn(`Pexels photo fetch failed for "${query}":`, err.message);
    return null;
  }
}

/** Best-effort: returns { mediaUrl, thumbnailUrl } for `query` from Pexels' video search, or
 * null. Picks the smallest mp4 rendition (>=480px wide) so the seeded clip stays quick to load —
 * matches the project's existing preference for short, light demo video over the full-res one. */
async function fetchPexelsVideo(query) {
  if (!PEXELS_API_KEY) return null;
  try {
    const res = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=1`, {
      headers: { Authorization: PEXELS_API_KEY },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const video = data.videos?.[0];
    if (!video) return null;
    const files = (video.video_files || [])
      .filter((f) => f.file_type === 'video/mp4' && f.width >= 480)
      .sort((a, b) => a.width - b.width);
    const file = files[0] ?? video.video_files?.[0];
    if (!file) return null;
    return { mediaUrl: file.link, thumbnailUrl: video.image };
  } catch (err) {
    console.warn(`Pexels video fetch failed for "${query}":`, err.message);
    return null;
  }
}

if (admin.apps.length === 0) {
  admin.initializeApp({ projectId: PROJECT_ID });
}

const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

/** Deletes every doc in `collectionName`. Used to clear `posts` before reseeding, since dev
 * emulators are long-lived and can pick up unrelated stray docs over time (e.g. from running the
 * backend test suite directly against a running dev emulator instead of an ephemeral
 * `firebase emulators:exec` one) — a full wipe-then-reseed keeps the collection exactly matching
 * what this script defines, rather than merge-accumulating on top of whatever's already there. */
async function wipeCollection(collectionName) {
  const snap = await db.collection(collectionName).get();
  if (snap.empty) return;
  const batch = db.batch();
  snap.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  console.log(`  cleared ${snap.size} existing doc(s) from "${collectionName}"`);
}

async function sampleProvider(id, city, lat, lng, name, categories, hairTypes, verificationStatus, photoQuery, services) {
  const photoUrl = (await fetchPexelsPhoto(photoQuery)) ?? '';
  return {
    id,
    name,
    photoUrl,
    location: { city, lat, lng },
    bio: `${name} – experienced beauty professional in ${city}.`,
    categories,
    hairTypes,
    verificationStatus,
    services,
    availability: {
      monday: [{ start: '09:00', end: '17:00' }],
      tuesday: [{ start: '09:00', end: '17:00' }],
      wednesday: [{ start: '09:00', end: '17:00' }],
      thursday: [{ start: '09:00', end: '17:00' }],
      friday: [{ start: '09:00', end: '17:00' }],
    },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
}

// Review doc IDs are booking IDs (one review per booking) — these seed against fake
// booking IDs since the emulator's demo client never actually booked+completed these.
function sampleReview(bookingId, providerId, userName, rating, text) {
  return {
    id: bookingId,
    bookingId,
    userId: 'client_demo',
    userName,
    providerId,
    rating,
    text,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };
}

// A short (~10s, ~1MB) clip used as the last-resort fallback for feed videos when no
// PEXELS_API_KEY is set. The previous URL (Google's commondatastorage/gtv-videos-bucket) now
// 403s — that bucket appears to no longer be publicly readable — so this points at
// test-videos.co.uk's mirror of the same "Big Buck Bunny" sample clip instead.
const SAMPLE_VIDEO_URL = 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4';

/**
 * Two distinct kinds of post, matching the app's posting flow:
 *  - Gallery photo (mediaType "image"): tagged with a category, shows in Discover + the
 *    provider's portfolio. `category`/`subcategory` are required for this kind.
 *  - Feed video (mediaType "video"): TikTok-style, shows in For You. No category needed.
 * `query` is the real Pexels search term (e.g. "box braids") used when a key is configured;
 * `seed` keeps the picsum fallback deterministic when it isn't.
 */
async function galleryPost(id, providerId, category, subcategory, seed, hairTypes, query) {
  const mediaUrl = (await fetchPexelsPhoto(query)) ?? `https://picsum.photos/seed/${seed}/800/1000`;
  return {
    id,
    providerId,
    mediaType: 'image',
    mediaUrl,
    caption: `${subcategory ?? category} inspo from this studio ✨`,
    category,
    subcategory,
    hairTypes,
    likeCount: Math.floor(Math.random() * 40),
    saveCount: Math.floor(Math.random() * 15),
    commentCount: 0,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
}

async function feedPost(id, providerId, seed, caption, query) {
  const pexels = await fetchPexelsVideo(query);
  const mediaUrl = pexels?.mediaUrl ?? SAMPLE_VIDEO_URL;
  // Real uploads generate an actual video-frame thumbnail (see CreatePostScreen); seeding
  // bypasses that upload flow, so a video post here gets either Pexels' own thumbnail or a
  // stand-in picsum image instead.
  const thumbnailUrl = pexels?.thumbnailUrl ?? `https://picsum.photos/seed/${seed}-thumb/800/1000`;
  return {
    id,
    providerId,
    mediaType: 'video',
    mediaUrl,
    thumbnailUrl,
    caption,
    likeCount: Math.floor(Math.random() * 60),
    saveCount: Math.floor(Math.random() * 20),
    commentCount: 0,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
}

async function main() {
  if (!PEXELS_API_KEY) {
    console.log('ℹ️  No PEXELS_API_KEY set — using picsum.photos placeholders. Get a free key at pexels.com/api and re-run with PEXELS_API_KEY=xxxxx node scripts/seedEmulator.js for real hair/beauty media.');
  }

  await wipeCollection('posts');

  const providers = await Promise.all([
    sampleProvider('provider_1', 'London', 51.5072, -0.1276, 'Aisha Styles', ['Hair', 'Styling'], ['4A', '4B', 'Braids'], 'verified', 'hairdresser portrait', [
      { name: 'Classic haircut', price: 25, category: 'Hair', durationMins: 30 },
      { name: 'Silk press', price: 45, category: 'Styling', durationMins: 60 },
    ]),
    sampleProvider('provider_2', 'London', 51.5090, -0.1180, 'Maya Nails', ['Nails'], undefined, undefined, 'nail technician portrait', [
      { name: 'Full set nails', price: 40, category: 'Nails', durationMins: 60 },
      { name: 'Gel manicure', price: 28, category: 'Nails', durationMins: 45 },
    ]),
    sampleProvider('provider_3', 'Birmingham', 52.4862, -1.8904, 'Noor Beauty', ['Hair', 'Esthetics', 'Waxing'], ['3C', 'Locs', 'Natural'], 'pending', 'beautician portrait', [
      { name: 'Facial treatment', price: 55, category: 'Esthetics', durationMins: 50 },
      { name: 'Eyebrow wax', price: 15, category: 'Waxing', durationMins: 20 },
    ]),
    sampleProvider('provider_4', 'Manchester', 53.4808, -2.2426, 'Zara Glam', ['Makeup', 'Bridal'], undefined, 'verified', 'makeup artist portrait', [
      { name: 'Glam makeup', price: 60, category: 'Makeup', durationMins: 60 },
      { name: 'Bridal trial', price: 90, category: 'Bridal', durationMins: 90 },
    ]),
    sampleProvider('provider_5', 'London', 51.5155, -0.0922, 'Kwame Cuts', ['Barber'], undefined, 'verified', 'barber portrait', [
      { name: 'Skin fade', price: 22, category: 'Barber', durationMins: 30 },
      { name: 'Beard trim', price: 12, category: 'Barber', durationMins: 15 },
    ]),
  ]);

  for (const p of providers) {
    await db.collection('providers').doc(p.id).set(p, { merge: true });
  }

  const reviewsByProvider = {
    provider_1: [
      sampleReview('seed_booking_1a', 'provider_1', 'Chloe M.', 5, 'Amazing braids, so gentle and precise!'),
      sampleReview('seed_booking_1b', 'provider_1', 'Tia R.', 4, 'Lovely result, arrived a little late.'),
      sampleReview('seed_booking_1c', 'provider_1', 'Nia B.', 5, 'Best blowout I have had, booking again.'),
    ],
    provider_2: [
      sampleReview('seed_booking_2a', 'provider_2', 'Jasmine K.', 5, 'Nail art was stunning and lasted weeks.'),
      sampleReview('seed_booking_2b', 'provider_2', 'Ronke A.', 4, 'Great gel set, will be back.'),
    ],
    provider_3: [
      sampleReview('seed_booking_3a', 'provider_3', 'Grace O.', 5, 'Professional and friendly, highly recommend.'),
    ],
    provider_4: [
      sampleReview('seed_booking_4a', 'provider_4', 'Priya S.', 5, 'Flawless glam, my makeup lasted all night.'),
    ],
    provider_5: [
      sampleReview('seed_booking_5a', 'provider_5', 'Marcus D.', 5, 'Cleanest fade in the city, no question.'),
    ],
  };

  for (const [providerId, reviews] of Object.entries(reviewsByProvider)) {
    for (const review of reviews) {
      await db.collection('reviews').doc(review.id).set(review, { merge: true });
    }
    const average = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    await db
      .collection('providers')
      .doc(providerId)
      .set({ ratings: { average, count: reviews.length } }, { merge: true });
  }

  // Gallery photos: several per service category (not just one), so Discover feels alive and
  // every category chip (Hair, Nails, Makeup, Barber, Esthetics, Styling, Bridal, Waxing) has a
  // real, browsable grid rather than one or two lonely tiles.
  const galleryPosts = await Promise.all([
    // Hair (provider_1 x4, provider_3 x2)
    galleryPost('post_1', 'provider_1', 'Hair', 'Braids', 'aisha-braids-1', ['4A', '4B', 'Braids'], 'box braids hairstyle'),
    galleryPost('post_2', 'provider_1', 'Hair', 'Color & Highlights', 'aisha-color-1', undefined, 'hair coloring highlights'),
    galleryPost('post_3', 'provider_1', 'Hair', 'Cut & Trim', 'aisha-cut-1', undefined, 'hair salon haircut'),
    galleryPost('post_4', 'provider_1', 'Hair', 'Relaxer', 'aisha-relaxer-1', undefined, 'natural afro hair'),
    galleryPost('post_5', 'provider_3', 'Hair', 'Extensions', 'noor-extensions-1', undefined, 'hair extensions salon'),
    galleryPost('post_6', 'provider_3', 'Hair', 'Locs', 'noor-locs-1', ['Locs', 'Natural'], 'locs hairstyle'),
    // Styling (provider_1 x3)
    galleryPost('post_7', 'provider_1', 'Styling', 'Blow Dry', 'aisha-blowdry-1', undefined, 'hair blow dry salon'),
    galleryPost('post_8', 'provider_1', 'Styling', 'Updo', 'aisha-updo-1', undefined, 'updo hairstyle'),
    galleryPost('post_9', 'provider_1', 'Styling', 'Silk Press', 'aisha-silkpress-1', undefined, 'silk press hair'),
    // Nails (provider_2 x5)
    galleryPost('post_10', 'provider_2', 'Nails', 'Nail Art', 'maya-nailart-1', undefined, 'nail art design'),
    galleryPost('post_11', 'provider_2', 'Nails', 'Acrylics', 'maya-acrylics-1', undefined, 'acrylic nails'),
    galleryPost('post_12', 'provider_2', 'Nails', 'Gel', 'maya-gel-1', undefined, 'gel manicure'),
    galleryPost('post_13', 'provider_2', 'Nails', 'Pedicure', 'maya-pedicure-1', undefined, 'nail salon pedicure'),
    galleryPost('post_14', 'provider_2', 'Nails', 'Dip Powder', 'maya-dip-1', undefined, 'colorful nail art'),
    // Esthetics (provider_3 x3)
    galleryPost('post_15', 'provider_3', 'Esthetics', 'Facial', 'noor-facial-1', undefined, 'facial spa treatment'),
    galleryPost('post_16', 'provider_3', 'Esthetics', 'Lash Lift', 'noor-lash-1', undefined, 'lash lift beauty'),
    galleryPost('post_17', 'provider_3', 'Esthetics', 'Brow Lamination', 'noor-brow-lam-1', undefined, 'eyebrow lamination beauty'),
    // Waxing (provider_3 x3)
    galleryPost('post_18', 'provider_3', 'Waxing', 'Eyebrows', 'noor-brows-1', undefined, 'eyebrow shaping wax'),
    galleryPost('post_19', 'provider_3', 'Waxing', 'Full Face', 'noor-fullface-1', undefined, 'brow threading salon'),
    galleryPost('post_20', 'provider_3', 'Waxing', 'Legs', 'noor-legs-1', undefined, 'beauty waxing salon'),
    // Makeup (provider_4 x4)
    galleryPost('post_21', 'provider_4', 'Makeup', 'Glam', 'zara-glam-1', undefined, 'glam makeup look'),
    galleryPost('post_22', 'provider_4', 'Makeup', 'Everyday', 'zara-everyday-1', undefined, 'everyday makeup'),
    galleryPost('post_23', 'provider_4', 'Makeup', 'Editorial', 'zara-editorial-1', undefined, 'editorial makeup art'),
    galleryPost('post_24', 'provider_4', 'Makeup', 'Special FX', 'zara-fx-1', undefined, 'makeup artist applying'),
    // Bridal (provider_4 x3)
    galleryPost('post_25', 'provider_4', 'Bridal', 'Makeup Trial', 'zara-bridal-makeup-1', undefined, 'bridal makeup'),
    galleryPost('post_26', 'provider_4', 'Bridal', 'Hair Trial', 'zara-bridal-hair-1', undefined, 'bridal hair updo'),
    galleryPost('post_27', 'provider_4', 'Bridal', 'Day-Of Styling', 'zara-bridal-day-1', undefined, 'wedding hairstyle'),
    // Barber (provider_5 x4)
    galleryPost('post_28', 'provider_5', 'Barber', 'Fade', 'kwame-fade-1', undefined, 'barber fade haircut'),
    galleryPost('post_29', 'provider_5', 'Barber', 'Beard Trim', 'kwame-beard-1', undefined, 'beard trim barbershop'),
    galleryPost('post_30', 'provider_5', 'Barber', 'Line Up', 'kwame-lineup-1', undefined, 'mens haircut lineup'),
    galleryPost('post_31', 'provider_5', 'Barber', 'Hot Towel Shave', 'kwame-shave-1', undefined, 'barbershop haircut'),
  ]);

  // Feed videos: TikTok-style, no category — two per provider so For You has enough real
  // vertical video content to scroll through, kept entirely separate from the gallery above.
  const feedPosts = await Promise.all([
    feedPost('post_v1', 'provider_1', 'aisha-blowout-vid', 'Blowout transformation ✨', 'hair blowout styling'),
    feedPost('post_v2', 'provider_1', 'aisha-transform-vid', 'Start to finish transformation', 'hair transformation salon'),
    feedPost('post_v3', 'provider_2', 'maya-nailart-vid', 'Nail art from start to finish 💅', 'nail art process'),
    feedPost('post_v4', 'provider_2', 'maya-manicure-vid', 'Manicure process, up close', 'manicure process video'),
    feedPost('post_v5', 'provider_3', 'noor-facial-vid', 'Facial routine for glowing skin', 'facial skincare routine'),
    feedPost('post_v6', 'provider_3', 'noor-haircare-vid', 'Natural hair wash day routine', 'natural hair wash routine'),
    feedPost('post_v7', 'provider_4', 'zara-makeup-vid', 'Full glam transformation', 'makeup transformation'),
    feedPost('post_v8', 'provider_4', 'zara-bridal-vid', 'Bridal makeup application', 'bridal makeup application'),
    feedPost('post_v9', 'provider_5', 'kwame-fade-vid', 'Fresh fade, start to finish', 'barber haircut fade'),
    feedPost('post_v10', 'provider_5', 'kwame-beard-vid', 'Beard grooming session', 'beard grooming barbershop'),
  ]);

  for (const post of [...galleryPosts, ...feedPosts]) {
    await db.collection('posts').doc(post.id).set(post);
  }

  // Example client user doc (you'll normally create users via Firebase Auth).
  // Seeded with sample onboarding-quiz interests so the personalized feed has signal to rank on.
  await db.collection('users').doc('client_demo').set(
    {
      id: 'client_demo',
      name: 'Demo Client',
      email: 'demo@example.com',
      role: 'client',
      favourites: [],
      interests: {
        categories: ['Hair', 'Nails'],
        subcategories: ['Braids', 'Nail Art'],
        hairTypes: ['4A', '4B'],
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  console.log(`✅ Seeded emulator with ${providers.length} providers, ${galleryPosts.length} gallery photos, ${feedPosts.length} feed videos + demo client.`);
  console.log(`Project: ${PROJECT_ID}`);
  console.log(`Firestore emulator: ${FIRESTORE_EMULATOR_HOST}`);
}

main().catch((e) => {
  console.error('❌ Seed failed:', e);
  process.exit(1);
});
