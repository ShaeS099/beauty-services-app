import request = require("supertest");
import { app } from "../src/index";
import { createTestUser, authHeader } from "./helpers";

// Keeps this suite hermetic — no real network calls to Nominatim. These addresses don't need to
// geocode for double-booking-prevention behavior; see travel-buffer.test.ts for the geocoded case.
jest.mock("../src/geocoding", () => ({ geocodeAddress: jest.fn().mockResolvedValue(null) }));

describe("POST /bookings — double-booking prevention", () => {
  it("rejects a booking that overlaps an existing pending/confirmed booking for the same provider", async () => {
    const provider = await createTestUser("provider");
    const clientA = await createTestUser("clientA");
    const clientB = await createTestUser("clientB");

    await request(app)
      .post("/providers/me")
      .set(...authHeader(provider))
      .send({
        name: "Test Braider",
        location: { city: "London", lat: 51.5, lng: -0.1 },
        bio: "Test bio",
        categories: ["Hair"],
        services: [{ name: "Box Braids", category: "Hair", price: 80, durationMins: 60 }],
      })
      .expect(200);

    const start = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const service = { name: "Box Braids", category: "Hair", price: 80, durationMins: 60 };

    const first = await request(app)
      .post("/bookings")
      .set(...authHeader(clientA))
      .send({ providerId: provider.uid, service, date: start, clientAddress: "1 Test St" })
      .expect(201);
    expect(first.body.status).toBe("pending");

    const overlapStart = new Date(new Date(start).getTime() + 30 * 60 * 1000).toISOString();
    const overlapping = await request(app)
      .post("/bookings")
      .set(...authHeader(clientB))
      .send({ providerId: provider.uid, service, date: overlapStart, clientAddress: "2 Test St" })
      .expect(409);
    expect(overlapping.body.error).toMatch(/no longer available/i);

    const nonOverlapStart = new Date(new Date(start).getTime() + 60 * 60 * 1000).toISOString();
    const second = await request(app)
      .post("/bookings")
      .set(...authHeader(clientB))
      .send({ providerId: provider.uid, service, date: nonOverlapStart, clientAddress: "2 Test St" })
      .expect(201);
    expect(second.body.status).toBe("pending");
  });

  it("rejects unauthenticated requests", async () => {
    await request(app)
      .post("/bookings")
      .send({ providerId: "x", service: {}, date: "2030-01-01T00:00:00.000Z", clientAddress: "x" })
      .expect(401);
  });
});
