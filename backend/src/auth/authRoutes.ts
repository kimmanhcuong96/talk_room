import { Router } from "express";
import { HttpError } from "../errors/httpError.js";
import { issueAppJwt, verifyAppJwt } from "./jwt.js";
import { verifyGoogleIdToken } from "./providers/googleProvider.js";
import { findUserById, upsertGoogleUser } from "../users/userRepository.js";

export const authRouter = Router();

authRouter.post("/google", async (request, response, next) => {
  try {
    const idToken = typeof request.body?.idToken === "string" ? request.body.idToken : "";

    if (!idToken) {
      throw new HttpError(400, "idToken is required.");
    }

    const googleProfile = await verifyGoogleIdToken(idToken);
    const user = await upsertGoogleUser(googleProfile);
    const token = issueAppJwt(user);

    response.json({ token, user });
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

    response.json({ user });
  } catch (error) {
    next(error);
  }
});
