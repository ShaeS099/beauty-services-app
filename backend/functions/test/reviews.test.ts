import request = require("supertest");
import { app } from "../src/index";
import { createTestUser, authHeader } from "./helpers";

// Keeps this suite hermetic — no real network calls to Nominatim.
jest.mock("../src/geocoding", () => ({ geocodeAddress: jest.fn().mockResolvedValue(null) }));

describe("POST /bookings/:id/review", () => {
  it("only allows a review once the booking is completed, and only once per booking", async () => {
    const provider = await createTestUser("provider");
    const client = await createTestUser("client");

    await request(app)
      .post("/providers/me")
      .set(...authHeader(provider))
      .send({
        name: "Test Stylist",
        location: { city: "London", lat: 51.5, lng: -0.1 },
        bio: "Test bio",
        categories: ["Hair"],
        services: [{ name: "Silk Press", category: "Hair", price: 50, durationMins: 45 }],
      })
      .expect(200);

    const booking = await request(app)
      .post("/bookings")
      .set(...authHeader(client))
      .send({
        providerId: provider.uid,
        service: { name: "Silk Press", category: "Hair", price: 50, durationMins: 45 },
        date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        clientAddress: "1 Test St",
      })
      .expect(201);
    const bookingId = booking.body.id;

    const tooEarly = await request(app)
      .post(`/bookings/${bookingId}/review`)
      .set(...authHeader(client))
      .send({ rating: 5 })
      .expect(400);
    expect(tooEarly.body.error).toMatch(/completed/i);

    await request(app)
      .patch(`/bookings/${bookingId}/status`)
      .set(...authHeader(client))
      .send({ status: "completed" })
      .expect(200);

    const review = await request(app)
      .post(`/bookings/${bookingId}/review`)
      .set(...authHeader(client))
      .send({ rating: 5, text: "Lovely work" })
      .expect(201);
    expect(review.body.rating).toBe(5);

    const duplicate = await request(app)
      .post(`/bookings/${bookingId}/review`)
      .set(...authHeader(client))
      .send({ rating: 4 })
      .expect(409);
    expect(duplicate.body.error).toMatch(/already reviewed/i);
  });

  it("rejects an out-of-range rating", async () => {
    const client = await createTestUser("client");
    await request(app)
      .post("/bookings/nonexistent/review")
      .set(...authHeader(client))
      .send({ rating: 7 })
      .expect(400);
  });
});
