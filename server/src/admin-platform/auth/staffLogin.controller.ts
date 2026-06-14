import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { UserModel } from "../../models/User.js";
import { AdminUserModel } from "../rbac/models/AdminUser.js";
import { respondWithSessionAfterEmailAuth } from "../../services/authLogin.service.js";
import { incrementIamMetric } from "../iam/iamMetrics.service.js";
export async function staffLogin(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body as {
      email: string;
      password: string;
    };
    const emailNorm = String(email ?? "")
      .trim()
      .toLowerCase();
    const adminRow = await AdminUserModel.findOne({ email: emailNorm }).select(
      "+passwordHash",
    );
    if (adminRow) {
      if (!adminRow.isActive) {
        void incrementIamMetric("staff_login_failure");
        res
          .status(401)
          .json({ success: false, message: "Invalid email or password." });
        return;
      }
      const okAdmin = await bcrypt.compare(password, adminRow.passwordHash);
      if (!okAdmin) {
        void incrementIamMetric("staff_login_failure");
        res
          .status(401)
          .json({ success: false, message: "Invalid email or password." });
        return;
      }
      const user = await UserModel.findById(adminRow.userId).select(
        "+twoFactorSecret",
      );
      if (!user) {
        void incrementIamMetric("staff_login_failure");
        res
          .status(401)
          .json({ success: false, message: "Invalid email or password." });
        return;
      }
      const needsSetup = user.twoFactorEnabled && !user.twoFactorSecret;
      const has2fa = user.twoFactorEnabled && !!user.twoFactorSecret;
      void incrementIamMetric("staff_login_success");
      await respondWithSessionAfterEmailAuth(req, res, user, false, {
        loginSource: has2fa ? undefined : "staff_password",
        responseExtras: needsSetup
          ? { twoFactorSetupRequired: true }
          : undefined,
      });
      return;
    }
    const user = await UserModel.findOne({ email: emailNorm }).select(
      "+staffPasswordHash",
    );
    if (
      !user?.staffRole ||
      (user.staffRole !== "editor" && user.staffRole !== "admin")
    ) {
      void incrementIamMetric("staff_login_failure");
      res
        .status(401)
        .json({ success: false, message: "Invalid email or password." });
      return;
    }
    const hash = user.staffPasswordHash;
    if (!hash) {
      void incrementIamMetric("staff_login_failure");
      res
        .status(401)
        .json({ success: false, message: "Invalid email or password." });
      return;
    }
    const ok = await bcrypt.compare(password, hash);
    if (!ok) {
      void incrementIamMetric("staff_login_failure");
      res
        .status(401)
        .json({ success: false, message: "Invalid email or password." });
      return;
    }
    void incrementIamMetric("staff_login_success");
    await respondWithSessionAfterEmailAuth(req, res, user, false, {
      loginSource: "staff_password",
    });
  } catch (e) {
    console.error("[staffLogin]", e);
    res
      .status(500)
      .json({ success: false, message: "Internal Server Error 💀" });
  }
}
