import request = require("supertest");
import { app } from "../src/index";
import { createTestUser, authHeader } from "./helpers";

jest.mock("../src/geocoding", () => ({ geocodeAddress: jest.fn().mockResolvedValue(null) }));

async function makeProvider(name: string) {
  const provider = await createTestUser("provider");
  await request(app)
    .post("/providers/me")
    .set(...authHeader(provider))
    .send({
      name,
      location: { city: "Leeds", lat: 53.8, lng: -1.5 },
      bio: "Test bio",
      categories: ["Hair"],
      services: [{ name: "Twists", category: "Hair", price: 60, durationMins: 90 }],
    })
    .expect(200);
  return provider;
}

describe("Follow", () => {
  it("follows and unfollows a provider, updating both counters", async () => {
    const provider = await makeProvider("Follow Test Salon");
    const client = await createTestUser("client");

    const statusBefore = await request(app)
      .get(`/providers/${provider.uid}/follow-status`)
      .set(...authHeader(client))
      .expect(200);
    expect(statusBefore.body.following).toBe(false);

    await request(app)
      .post(`/providers/${provider.uid}/follow`)
      .set(...authHeader(client))
      .expect(200);

    const providerAfterFollow = await request(app).get(`/providers/${provider.uid}`).expect(200);
    expect(providerAfterFollow.body.followerCount).toBe(1);

    const clientStats = await request(app)
      .get("/users/me/stats")
      .set(...authHeader(client))
      .expect(200);
    expect(clientStats.body.followingCount).toBe(1);
    expect(clientStats.body.followerCount).toBeUndefined();

    // Following again is idempotent — doesn't double the counter.
    await request(app)
      .post(`/providers/${provider.uid}/follow`)
      .set(...authHeader(client))
      .expect(200);
    const providerStillOne = await request(app).get(`/providers/${provider.uid}`).expect(200);
    expect(providerStillOne.body.followerCount).toBe(1);

    await request(app)
      .delete(`/providers/${provider.uid}/follow`)
      .set(...authHeader(client))
      .expect(200);

    const statusAfterUnfollow = await request(app)
      .get(`/providers/${provider.uid}/follow-status`)
      .set(...authHeader(client))
      .expect(200);
    expect(statusAfterUnfollow.body.following).toBe(false);

    const providerAfterUnfollow = await request(app).get(`/providers/${provider.uid}`).expect(200);
    expect(providerAfterUnfollow.body.followerCount).toBe(0);
  });

  it("rejects following yourself and following a nonexistent provider", async () => {
    const provider = await makeProvider("Self Follow Salon");
    await request(app)
      .post(`/providers/${provider.uid}/follow`)
      .set(...authHeader(provider))
      .expect(400);

    const client = await createTestUser("client");
    await request(app)
      .post("/providers/does-not-exist/follow")
      .set(...authHeader(client))
      .expect(404);
  });

  it("reports followerCount and rating in stats for a provider's own profile", async () => {
    const provider = await makeProvider("Stats Salon");
    const stats = await request(app)
      .get("/users/me/stats")
      .set(...authHeader(provider))
      .expect(200);
    expect(stats.body.followerCount).toBe(0);
    expect(stats.body.followingCount).toBe(0);
    expect(stats.body.totalLikes).toBe(0);
  });
});
