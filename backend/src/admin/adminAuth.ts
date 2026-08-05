import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../errors/httpError.js";
import { verifyAdminJwt } from "./adminJwt.js";
import { findAdminById } from "./adminRepository.js";
import type { AdminProfile } from "./adminTypes.js";

type AdminRequest = Request & { admin?: AdminProfile };

export async function requireAdmin(request: Request, _response: Response, next: NextFunction) {
  try {
    const authorization = request.header("authorization") ?? "";
    const [scheme, token] = authorization.split(" ");
    if (scheme !== "Bearer" || !token) {
      throw new HttpError(401, "Admin authentication token is required.");
    }
    const { adminId } = verifyAdminJwt(token);
    const admin = await findAdminById(adminId);
    if (!admin || admin.status !== "active") {
      throw new HttpError(401, "Admin account is unavailable.");
    }
    (request as AdminRequest).admin = admin;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireOwner(request: Request, _response: Response, next: NextFunction) {
  const admin = (request as AdminRequest).admin;
  if (!admin || admin.role !== "owner") {
    next(new HttpError(403, "Owner permission is required."));
    return;
  }
  next();
}

export function getRequestAdmin(request: Request) {
  const admin = (request as AdminRequest).admin;
  if (!admin) {
    throw new HttpError(401, "Admin authentication is required.");
  }
  return admin;
}
