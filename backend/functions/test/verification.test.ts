import request = require("supertest");
import { app } from "../src/index";
import { createTestUser, authHeader } from "./helpers";

describe("POST /providers/me/verification", () => {
  it("rejects a documentUrl that doesn't point at the caller's own verification path", async () => {
    const provider = await createTestUser("provider");
    await request(app)
      .post("/providers/me")
      .set(...authHeader(provider))
      .send({
        name: "Test Locs",
        location: { city: "Manchester", lat: 53.4, lng: -2.2 },
        bio: "Test bio",
        categories: ["Hair"],
        services: [{ name: "Retwist", category: "Hair", price: 40, durationMins: 30 }],
      })
      .expect(200);

    const foreignPath = `https://storage.example/providers/someone-else-uid/verification/id.jpg`;
    const rejected = await request(app)
      .post("/providers/me/verification")
      .set(...authHeader(provider))
      .send({ documentUrl: foreignPath })
      .expect(400);
    expect(rejected.body.error).toMatch(/own verification upload path/i);

    const ownPath = `https://storage.example/providers/${provider.uid}/verification/id.jpg`;
    const accepted = await request(app)
      .post("/providers/me/verification")
      .set(...authHeader(provider))
      .send({ documentUrl: ownPath })
      .expect(200);
    expect(accepted.body.verificationStatus).toBe("pending");
    expect(accepted.body.verificationDocUrl).toBe(ownPath);
  });

  it("rejects submission before a provider profile exists", async () => {
    const provider = await createTestUser("provider");
    const ownPath = `https://storage.example/providers/${provider.uid}/verification/id.jpg`;
    const res = await request(app)
      .post("/providers/me/verification")
      .set(...authHeader(provider))
      .send({ documentUrl: ownPath })
      .expect(400);
    expect(res.body.error).toMatch(/create your provider profile/i);
  });
});
