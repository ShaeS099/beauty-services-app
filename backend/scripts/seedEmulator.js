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

async function sampleProvider(id, city, lat, lng, name, categories, hairTypes, verificationStatus, photoQuery) {
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

// A handful of image posts per provider (deterministic picsum.photos seeds) plus one
// well-known public sample video, so the Discover/For You feeds have something to show.
// A short (~10s, ~1MB) clip. The previous URL (Google's commondatastorage/gtv-videos-bucket)
// now 403s — that bucket appears to no longer be publicly readable — so this points at
// test-videos.co.uk's mirror of the same "Big Buck Bunny" sample clip instead.
const SAMPLE_VIDEO_URL = 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4';

/** `query` is the real search term (e.g. "box braids") used against Pexels when a key is
 * configured; `seed` keeps the picsum fallback deterministic when it isn't. */
async function samplePost(id, providerId, category, subcategory, seed, mediaType = 'image', hairTypes, query) {
  let mediaUrl;
  let thumbnailUrl;

  if (mediaType === 'video') {
    const pexels = await fetchPexelsVideo(query ?? category);
    mediaUrl = pexels?.mediaUrl ?? SAMPLE_VIDEO_URL;
    thumbnailUrl = pexels?.thumbnailUrl ?? `https://picsum.photos/seed/${seed}-thumb/800/1000`;
  } else {
    mediaUrl = (await fetchPexelsPhoto(query ?? category)) ?? `https://picsum.photos/seed/${seed}/800/1000`;
  }

  return {
    id,
    providerId,
    mediaType,
    mediaUrl,
    // Real uploads generate an actual video-frame thumbnail (see CreatePostScreen); seeding
    // bypasses that upload flow, so a video post here gets either Pexels' own thumbnail or a
    // stand-in picsum image instead.
    thumbnailUrl,
    caption: `${category} inspo from this studio ✨`,
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

async function main() {
  if (!PEXELS_API_KEY) {
    console.log('ℹ️  No PEXELS_API_KEY set — using picsum.photos placeholders. Get a free key at pexels.com/api and re-run with PEXELS_API_KEY=xxxxx node scripts/seedEmulator.js for real hair/beauty media.');
  }

  const providers = await Promise.all([
    sampleProvider('provider_1', 'London', 51.5072, -0.1276, 'Aisha Styles', ['Hair'], ['4A', '4B', 'Braids'], 'verified', 'hairdresser portrait'),
    sampleProvider('provider_2', 'London', 51.5090, -0.1180, 'Maya Nails', ['Nails'], undefined, undefined, 'nail technician portrait'),
    sampleProvider('provider_3', 'Birmingham', 52.4862, -1.8904, 'Noor Beauty', ['Hair', 'Nails'], ['3C', 'Locs', 'Natural'], 'pending', 'beautician portrait'),
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

  const posts = await Promise.all([
    samplePost('post_1', 'provider_1', 'Hair', 'Braids', 'aisha-braids-1', 'image', ['4A', '4B', 'Braids'], 'box braids hairstyle'),
    samplePost('post_2', 'provider_1', 'Hair', 'Color & Highlights', 'aisha-color-1', 'image', undefined, 'hair coloring highlights'),
    samplePost('post_3', 'provider_1', 'Hair', 'Blowout', 'aisha-blowout-1', 'video', undefined, 'hair blowout styling'),
    samplePost('post_4', 'provider_2', 'Nails', 'Nail Art', 'maya-nailart-1', 'image', undefined, 'nail art design'),
    samplePost('post_5', 'provider_2', 'Nails', 'Acrylics', 'maya-acrylics-1', 'image', undefined, 'acrylic nails'),
    samplePost('post_6', 'provider_3', 'Hair', 'Extensions', 'noor-extensions-1', 'image', undefined, 'hair extensions'),
    samplePost('post_7', 'provider_3', 'Nails', 'Gel', 'noor-gel-1', 'image', undefined, 'gel nails manicure'),
  ]);

  for (const post of posts) {
    await db.collection('posts').doc(post.id).set(post, { merge: true });
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

  console.log('✅ Seeded emulator with sample providers, posts + demo client.');
  console.log(`Project: ${PROJECT_ID}`);
  console.log(`Firestore emulator: ${FIRESTORE_EMULATOR_HOST}`);
}

main().catch((e) => {
  console.error('❌ Seed failed:', e);
  process.exit(1);
});
