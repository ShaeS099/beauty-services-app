import request = require("supertest");
import { app } from "../src/index";
import { haversineKm, estimateTravelBufferMinutes } from "../src/travel";
import { createTestUser, authHeader } from "./helpers";

// Fixed coordinates so the required travel buffer is computed deterministically (not hitting
// the real Nominatim service — see geocoding.ts for why that would be flaky/rate-limited here).
const ADDRESS_NEAR_A = "12 Near Street";
const ADDRESS_NEAR_B = "40 Near Street"; // ~350m from A — clamps to the 10-minute minimum buffer
const ADDRESS_FAR = "1 Far Away Road"; // ~160km from A — clamps to the 90-minute maximum buffer

const COORDS: Record<string, { lat: number; lng: number }> = {
  [ADDRESS_NEAR_A]: { lat: 51.5074, lng: -0.1278 },
  [ADDRESS_NEAR_B]: { lat: 51.5104, lng: -0.1278 },
  [ADDRESS_FAR]: { lat: 52.4862, lng: -1.8904 },
};

jest.mock("../src/geocoding", () => ({
  geocodeAddress: jest.fn((address: string) => Promise.resolve(COORDS[address] ?? null)),
}));

describe("POST /bookings — distance-aware travel buffer", () => {
  const nearBufferMin = estimateTravelBufferMinutes(haversineKm(COORDS[ADDRESS_NEAR_A], COORDS[ADDRESS_NEAR_B]));
  const farBufferMin = estimateTravelBufferMinutes(haversineKm(COORDS[ADDRESS_NEAR_A], COORDS[ADDRESS_FAR]));

  it("computes the expected clamp boundaries for the fixture coordinates", () => {
    expect(nearBufferMin).toBe(10);
    expect(farBufferMin).toBe(90);
  });

  it("rejects a non-overlapping booking whose gap is shorter than the geocoded travel buffer", async () => {
    const provider = await createTestUser("provider");
    const clientA = await createTestUser("clientA");
    const clientB = await createTestUser("clientB");

    await request(app)
      .post("/providers/me")
      .set(...authHeader(provider))
      .send({
        name: "Travel Buffer Salon",
        location: { city: "London", lat: 51.5, lng: -0.1 },
        bio: "Test bio",
        categories: ["Hair"],
        services: [{ name: "Cut", category: "Hair", price: 40, durationMins: 30 }],
      })
      .expect(200);

    const service = { name: "Cut", category: "Hair", price: 40, durationMins: 30 };
    const start = new Date(Date.now() + 24 * 60 * 60 * 1000);
    start.setSeconds(0, 0);

    const first = await request(app)
      .post("/bookings")
      .set(...authHeader(clientA))
      .send({ providerId: provider.uid, service, date: start.toISOString(), clientAddress: ADDRESS_NEAR_A })
      .expect(201);
    expect(first.body.clientLat).toBeCloseTo(COORDS[ADDRESS_NEAR_A].lat);

    // First booking ends at start+30min. Start the second booking (gap - 1 minute) after that —
    // too soon given the required travel buffer, even though the time ranges don't overlap.
    const tooSoonStart = new Date(start.getTime() + 30 * 60 * 1000 + (nearBufferMin - 1) * 60 * 1000);
    const rejected = await request(app)
      .post("/bookings")
      .set(...authHeader(clientB))
      .send({ providerId: provider.uid, service, date: tooSoonStart.toISOString(), clientAddress: ADDRESS_NEAR_B })
      .expect(409);
    expect(rejected.body.error).toMatch(/no longer available/i);

    // Exactly the required buffer (plus a minute of slack) later, it succeeds.
    const okStart = new Date(start.getTime() + 30 * 60 * 1000 + (nearBufferMin + 1) * 60 * 1000);
    const accepted = await request(app)
      .post("/bookings")
      .set(...authHeader(clientB))
      .send({ providerId: provider.uid, service, date: okStart.toISOString(), clientAddress: ADDRESS_NEAR_B })
      .expect(201);
    expect(accepted.body.status).toBe("pending");
  });

  it("requires a much larger gap when the two addresses are far apart", async () => {
    const provider = await createTestUser("provider");
    const clientA = await createTestUser("clientA");
    const clientB = await createTestUser("clientB");

    await request(app)
      .post("/providers/me")
      .set(...authHeader(provider))
      .send({
        name: "Far Travel Salon",
        location: { city: "London", lat: 51.5, lng: -0.1 },
        bio: "Test bio",
        categories: ["Hair"],
        services: [{ name: "Cut", category: "Hair", price: 40, durationMins: 30 }],
      })
      .expect(200);

    const service = { name: "Cut", category: "Hair", price: 40, durationMins: 30 };
    const start = new Date(Date.now() + 25 * 60 * 60 * 1000);
    start.setSeconds(0, 0);

    await request(app)
      .post("/bookings")
      .set(...authHeader(clientA))
      .send({ providerId: provider.uid, service, date: start.toISOString(), clientAddress: ADDRESS_NEAR_A })
      .expect(201);

    // A gap that would be plenty for the "near" pair is nowhere near enough for the far one.
    const insufficientGapStart = new Date(start.getTime() + 30 * 60 * 1000 + (farBufferMin - 5) * 60 * 1000);
    const rejected = await request(app)
      .post("/bookings")
      .set(...authHeader(clientB))
      .send({ providerId: provider.uid, service, date: insufficientGapStart.toISOString(), clientAddress: ADDRESS_FAR })
      .expect(409);
    expect(rejected.body.error).toMatch(/no longer available/i);
  });
});
