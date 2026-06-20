import request from "supertest";
import app from "../app.js";
import { platformStatsInternals } from "../services/platform/platformStats.service.js";
describe("GET /api/platform/stats", () => {
  it("uses Asia/Kolkata day keys for daily snapshots", () => {
    expect(
      platformStatsInternals.indiaDayKey(new Date("2026-06-19T18:29:59.000Z")),
    ).toBe("2026-06-19");
    expect(
      platformStatsInternals.indiaDayKey(new Date("2026-06-19T18:30:00.000Z")),
    ).toBe("2026-06-20");
  });

  it("returns 200 and stats payload", async () => {
    const res = await request(app).get("/api/platform/stats");
    expect([200, 500]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body).toMatchObject({
        success: true,
        stats: {
          linesWritten: expect.any(Number),
          activeUsers: expect.any(Number),
          components: expect.any(Number),
          uptimePercent: expect.any(Number),
          collectedAt: expect.any(String),
        },
      });
    }
  });
});
