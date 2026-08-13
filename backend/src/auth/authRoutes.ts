import { Router } from "express";
import { HttpError } from "../errors/httpError.js";
import { issueAppJwt, verifyAppJwt } from "./jwt.js";
import { verifyGoogleIdToken } from "./providers/googleProvider.js";
import { findUserById, upsertGoogleUser } from "../users/userRepository.js";
import { activateAdminIfEligible, findActiveAdminForUser } from "../admin/adminRepository.js";
import { issueAdminJwt } from "../admin/adminJwt.js";
import { getRewardSummary } from "../rewards/rewardRepository.js";

export const authRouter = Router();

authRouter.post("/google", async (request, response, next) => {
  try {
    const idToken = typeof request.body?.idToken === "string" ? request.body.idToken : "";

    if (!idToken) {
      throw new HttpError(400, "idToken is required.");
    }

    const googleProfile = await verifyGoogleIdToken(idToken);
    const rawReferralCode = typeof request.body?.referralCode === "string" ? request.body.referralCode.trim().toLowerCase() : "";
    const referralCode = /^[a-z0-9]{8,12}$/.test(rawReferralCode) ? rawReferralCode : undefined;
    const user = await upsertGoogleUser(googleProfile, referralCode);
    const token = issueAppJwt(user);
    const admin = await activateAdminIfEligible(googleProfile);
    const adminSession = admin ? { token: issueAdminJwt(admin), admin } : null;

    response.json({ token, user, adminSession });
  } catch (error) {
    next(error);
  }
});

authRouter.get("/rewards", async (request, response, next) => {
  try {
    const authorization = request.header("authorization") ?? "";
    const [scheme, token] = authorization.split(" ");
    if (scheme !== "Bearer" || !token) throw new HttpError(401, "Authentication token is required.");
    const { userId } = verifyAppJwt(token);
    response.json(await getRewardSummary(userId));
  } catch (error) {
    next(error);
  }
});

authRouter.get("/me", async (request, response, next) => {
  try {
    const authorization = request.header("authorization") ?? "";
    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) {
      throw new HttpError(401, "Authentication token is required.");
    }

    const { userId } = verifyAppJwt(token);
    const user = await findUserById(userId);

    if (!user) {
      throw new HttpError(401, "User no longer exists.");
    }

    const admin = await findActiveAdminForUser(user);
    const adminSession = admin ? { token: issueAdminJwt(admin), admin } : null;
    response.json({ token: issueAppJwt(user), user, adminSession });
  } catch (error) {
    next(error);
  }
});
