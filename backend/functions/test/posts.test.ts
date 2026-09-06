import request = require("supertest");
import { app } from "../src/index";
import { createTestUser, authHeader } from "./helpers";

jest.mock("../src/geocoding", () => ({ geocodeAddress: jest.fn().mockResolvedValue(null) }));

describe("POST /posts — open to all users; gallery photos vs feed videos", () => {
  it("lets a plain client (no provider profile) post a feed video without a category", async () => {
    const client = await createTestUser("client");
    const mediaUrl = `https://storage.example/providers/${client.uid}/posts/1.mp4`;

    const res = await request(app)
      .post("/posts")
      .set(...authHeader(client))
      .send({ mediaUrl, mediaType: "video", caption: "just a regular day" })
      .expect(201);

    expect(res.body.providerId).toBe(client.uid);
    expect(res.body.category).toBeUndefined();
  });

  it("rejects a gallery photo (mediaType image) with no category", async () => {
    const client = await createTestUser("client");
    const mediaUrl = `https://storage.example/providers/${client.uid}/posts/no-category.jpg`;

    await request(app)
      .post("/posts")
      .set(...authHeader(client))
      .send({ mediaUrl, mediaType: "image", caption: "no category" })
      .expect(400);
  });

  it("still requires a valid category when one is given, and rejects a subcategory without a category", async () => {
    const client = await createTestUser("client");
    const mediaUrl = `https://storage.example/providers/${client.uid}/posts/2.jpg`;

    await request(app)
      .post("/posts")
      .set(...authHeader(client))
      .send({ mediaUrl, mediaType: "image", category: "NotARealCategory" })
      .expect(400);

    await request(app)
      .post("/posts")
      .set(...authHeader(client))
      .send({ mediaUrl, mediaType: "video", subcategory: "Braids" })
      .expect(400);
  });

  it("still supports category posts for an actual provider (portfolio use case)", async () => {
    const provider = await createTestUser("provider");
    await request(app)
      .post("/providers/me")
      .set(...authHeader(provider))
      .send({
        name: "Category Post Salon",
        location: { city: "Bristol", lat: 51.45, lng: -2.58 },
        bio: "Test bio",
        categories: ["Hair"],
        services: [{ name: "Cut", category: "Hair", price: 40, durationMins: 30 }],
      })
      .expect(200);

    const mediaUrl = `https://storage.example/providers/${provider.uid}/posts/1.jpg`;
    const res = await request(app)
      .post("/posts")
      .set(...authHeader(provider))
      .send({ mediaUrl, mediaType: "image", category: "Hair", subcategory: "Braids" })
      .expect(201);

    expect(res.body.category).toBe("Hair");
    expect(res.body.subcategory).toBe("Braids");
  });

  it("rejects a mediaUrl that doesn't point at the caller's own upload path", async () => {
    const client = await createTestUser("client");
    const foreignUrl = "https://storage.example/providers/someone-else/posts/1.jpg";
    await request(app)
      .post("/posts")
      .set(...authHeader(client))
      .send({ mediaUrl: foreignUrl, mediaType: "image" })
      .expect(400);
  });

  it("accepts a video post with a thumbnailUrl under the caller's own path, and rejects a foreign one", async () => {
    const client = await createTestUser("client");
    const mediaUrl = `https://storage.example/providers/${client.uid}/posts/vid.mp4`;
    const ownThumb = `https://storage.example/providers/${client.uid}/posts/vid-thumb.jpg`;

    const res = await request(app)
      .post("/posts")
      .set(...authHeader(client))
      .send({ mediaUrl, mediaType: "video", thumbnailUrl: ownThumb })
      .expect(201);
    expect(res.body.thumbnailUrl).toBe(ownThumb);

    const foreignThumb = "https://storage.example/providers/someone-else/posts/vid-thumb.jpg";
    await request(app)
      .post("/posts")
      .set(...authHeader(client))
      .send({ mediaUrl, mediaType: "video", thumbnailUrl: foreignThumb })
      .expect(400);
  });
});
