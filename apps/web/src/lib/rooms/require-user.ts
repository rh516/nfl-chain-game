import "server-only";

import type { DecodedIdToken } from "firebase-admin/auth";
import { adminAuth } from "@/lib/firebase/admin";

export class AuthenticationError extends Error {
  constructor() {
    super("Authentication required.");
    this.name = "AuthenticationError";
  }
}

function getIdToken(request: Request) {
  const authorization = request.headers.get("authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  const idToken = match?.[1]?.trim();

  if (!idToken) {
    throw new AuthenticationError();
  }

  return idToken;
}

export async function requireUser(
  request: Request,
): Promise<DecodedIdToken> {
  const idToken = getIdToken(request);

  try {
    return await adminAuth.verifyIdToken(idToken);
  } 
  catch {
    throw new AuthenticationError();
  }
}