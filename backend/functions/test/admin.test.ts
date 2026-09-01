import request = require("supertest");
import * as admin from "firebase-admin";
import { app } from "../src/index";
import { createTestUser, authHeader } from "./helpers";

async function promoteToAdmin(uid: string): Promise<void> {
  await admin.firestore().collection("users").doc(uid).set({ role: "admin" }, { merge: true });
}

describe("Admin verification review", () => {
  it("rejects non-admins from the review queue and review action", async () => {
    const nonAdmin = await createTestUser("plain");
    await request(app).get("/admin/verifications").set(...authHeader(nonAdmin)).expect(403);
    await request(app)
      .patch("/admin/providers/someProviderId/verification")
      .set(...authHeader(nonAdmin))
      .send({ status: "verified" })
      .expect(403);
  });

  it("lists pending submissions and lets an admin approve or reject them", async () => {
    const provider = await createTestUser("provider");
    const admin_ = await createTestUser("admin");
    await promoteToAdmin(admin_.uid);

    await request(app)
      .post("/providers/me")
      .set(...authHeader(provider))
      .send({
        name: "Queue Test Salon",
        location: { city: "Bristol", lat: 51.45, lng: -2.58 },
        bio: "Test bio",
        categories: ["Hair"],
        services: [{ name: "Twist Out", category: "Hair", price: 45, durationMins: 40 }],
      })
      .expect(200);

    const docUrl = `https://storage.example/providers/${provider.uid}/verification/id.jpg`;
    await request(app)
      .post("/providers/me/verification")
      .set(...authHeader(provider))
      .send({ documentUrl: docUrl })
      .expect(200);

    const queue = await request(app)
      .get("/admin/verifications")
      .set(...authHeader(admin_))
      .expect(200);
    expect(queue.body.some((p: { id: string }) => p.id === provider.uid)).toBe(true);

    const rejectedByPlainAdmin = await request(app)
      .patch(`/admin/providers/${provider.uid}/verification`)
      .set(...authHeader(admin_))
      .send({ status: "not-a-real-status" })
      .expect(400);
    expect(rejectedByPlainAdmin.body.error).toMatch(/verified.*rejected/i);

    const approved = await request(app)
      .patch(`/admin/providers/${provider.uid}/verification`)
      .set(...authHeader(admin_))
      .send({ status: "verified" })
      .expect(200);
    expect(approved.body.verificationStatus).toBe("verified");

    const queueAfter = await request(app)
      .get("/admin/verifications")
      .set(...authHeader(admin_))
      .expect(200);
    expect(queueAfter.body.some((p: { id: string }) => p.id === provider.uid)).toBe(false);
  });

  it("404s reviewing a provider that doesn't exist", async () => {
    const admin_ = await createTestUser("admin");
    await promoteToAdmin(admin_.uid);
    await request(app)
      .patch("/admin/providers/nonexistent-provider/verification")
      .set(...authHeader(admin_))
      .send({ status: "verified" })
      .expect(404);
  });
});
