import request = require("supertest");
import { app } from "../src/index";
import { createTestUser, authHeader } from "./helpers";

describe("Public user profile", () => {
  it("exposes only safe fields via GET /users/:id, and 404s for a missing user", async () => {
    const user = await createTestUser("client");
    // Bootstraps the Firestore user doc, same as a real client's first authenticated request.
    await request(app).get("/users/me").set(...authHeader(user)).expect(200);

    const res = await request(app).get(`/users/${user.uid}`).expect(200);
    expect(res.body).toMatchObject({ id: user.uid, role: "client" });
    expect(res.body.email).toBeUndefined();
    expect(res.body.favourites).toBeUndefined();
    expect(res.body.pushToken).toBeUndefined();

    await request(app).get("/users/nonexistent-uid").expect(404);
  });

  it("returns stats for any user via GET /users/:id/stats without requiring auth", async () => {
    const user = await createTestUser("client");
    await request(app).get("/users/me").set(...authHeader(user)).expect(200);

    const res = await request(app).get(`/users/${user.uid}/stats`).expect(200);
    expect(res.body).toEqual({ followingCount: 0, totalLikes: 0 });
  });
});
