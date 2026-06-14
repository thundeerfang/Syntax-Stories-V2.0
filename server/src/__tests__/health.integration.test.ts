import request from "supertest";
import app from "../app.js";
describe("GET /api/health", () => {
  it("returns 200 and success payload", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      message: "Server is running",
    });
    expect(typeof res.body.timestamp).toBe("string");
  });
});
describe("GET /api/health/storage", () => {
  it("returns storage status payload", async () => {
    const res = await request(app).get("/api/health/storage");
    expect([200, 503]).toContain(res.status);
    expect(res.body).toMatchObject({
      storage: {
        blocked: expect.any(Boolean),
      },
    });
    expect(res.body.storage).toHaveProperty("reason");
    expect(res.body.storage).toHaveProperty("mode");
  });
});
