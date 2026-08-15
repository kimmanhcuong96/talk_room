import { Router, type Request } from "express";
import { HttpError } from "../errors/httpError.js";
import { issueAppJwt, verifyAppJwt } from "./jwt.js";
import { verifyGoogleIdToken } from "./providers/googleProvider.js";
import { findUserById, upsertGoogleUser } from "../users/userRepository.js";
import { activateAdminIfEligible, findActiveAdminForUser } from "../admin/adminRepository.js";
import { issueAdminJwt } from "../admin/adminJwt.js";
import { getRewardSummary } from "../rewards/rewardRepository.js";
import { createVerificationRequest, getMyVerificationRequest } from "../users/verificationRequestRepository.js";

export const authRouter = Router();

function requireApplicationUser(request: Request) {
  const authorization = request.header("authorization") ?? "";
  const [scheme, token] = authorization.split(" ");
  if (scheme !== "Bearer" || !token) throw new HttpError(401, "Authentication token is required.");
  return verifyAppJwt(token).userId;
}

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

authRouter.get("/verification-request", async (request, response, next) => {
  try {
    response.json({ request: await getMyVerificationRequest(requireApplicationUser(request)) });
  } catch (error) { next(error); }
});

authRouter.post("/verification-request", async (request, response, next) => {
  try {
    const message = typeof request.body?.message === "string" ? request.body.message.trim() : "";
    const communityCommitment = request.body?.communityCommitment === true;
    if (message.length < 1 || message.length > 2_000) throw new HttpError(400, "The request message is required and must be no longer than 2000 characters.");
    if (!communityCommitment) throw new HttpError(400, "Community commitment is required.");
    response.status(201).json({ request: await createVerificationRequest(requireApplicationUser(request), message, communityCommitment) });
  } catch (error) { next(error); }
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
