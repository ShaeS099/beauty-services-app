# BeautyBooking API (MVP)

Base: `/api`

## Public
- `GET /health` – returns `{ ok: true }`
- `GET /providers` – list providers (optional query: `city`, `category`, `limit`)
- `GET /providers/:id` – provider details

## Authenticated (Firebase ID token required)
Send header: `Authorization: Bearer <ID_TOKEN>`

- `GET /users/me` – get (or auto-create) current user profile
- `PUT /users/me` – update profile (name/photoUrl)
- `POST /users/me/favourites` – `{ providerId, action: "add"|"remove" }`

- `POST /providers/me` – upsert provider profile (becomes provider during MVP)

- `POST /bookings` – create booking
- `GET /bookings` – list bookings for current user/provider (optional `status`)
- `PATCH /bookings/:id/status` – update booking status

## Notes
- During MVP, `POST /providers/me` will set the user role to `provider` if needed.
- Bookings are private to the booking's user and provider.
