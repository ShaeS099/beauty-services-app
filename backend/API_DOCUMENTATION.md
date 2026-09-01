# BeautyBooking API (MVP)

Base: `/api`

## Public
- `GET /health` – returns `{ ok: true }`
- `GET /providers` – list providers (optional query: `city`, `category`, `limit`)
- `GET /providers/:id` – provider details
- `GET /providers/:id/posts` – a business's portfolio posts
- `GET /posts/:id/comments` – comments on a post

## Authenticated (Firebase ID token required)
Send header: `Authorization: Bearer <ID_TOKEN>`

- `GET /users/me` – get (or auto-create) current user profile
- `PUT /users/me` – update profile (name/photoUrl/interests)
- `POST /users/me/favourites` – `{ providerId, action: "add"|"remove" }`

- `POST /providers/me` – upsert provider profile (becomes provider during MVP)

- `POST /bookings` – create booking
- `GET /bookings` – list bookings for current user/provider (optional `status`)
- `PATCH /bookings/:id/status` – update booking status

- `GET /posts/feed` – personalized feed. `?mode=foryou` (default, ranked by quiz interests + engagement) or `?mode=discover` (filtered to quiz categories, sorted by popularity). Optional `limit`.
- `GET /posts/saved` – posts the current user has saved
- `POST /posts/:id/like` / `DELETE /posts/:id/like`
- `POST /posts/:id/save` / `DELETE /posts/:id/save`
- `POST /posts/:id/comments` – `{ text }`

## Notes
- During MVP, `POST /providers/me` will set the user role to `provider` if needed.
- Bookings are private to the booking's user and provider.
- `interests` (`{ categories: string[], subcategories: string[] }`) comes from the onboarding quiz and drives feed personalization — see `functions/src/taxonomy.ts` for the allowed category/subcategory values.
- There is no "create post" endpoint yet — portfolio posts are seeded directly into Firestore (`scripts/seedEmulator.js`). The posting/upload flow is intentionally deferred to a follow-up pass.
