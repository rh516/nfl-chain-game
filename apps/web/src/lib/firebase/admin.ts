import "server-only";

import {
  cert,
  getApp,
  getApps,
  initializeApp,
} from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import { getAuth } from "firebase-admin/auth";

const projectId = process.env.GCLOUD_PROJECT;
const databaseURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
const usesEmulators =
  process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true";

if (!projectId || !databaseURL) {
  throw new Error("Missing required Firebase Admin configuration.");
}

function getServiceAccountCredential() {
  const rawServiceAccount =
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (!rawServiceAccount) {
    throw new Error(
      "Missing FIREBASE_SERVICE_ACCOUNT_JSON for Firebase Admin.",
    );
  }

  try {
    return cert(JSON.parse(rawServiceAccount));
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is invalid JSON.");
  }
}

const adminApp =
  getApps().length === 0
    ? initializeApp(
        usesEmulators
          ? { projectId, databaseURL }
          : {
              projectId,
              databaseURL,
              credential: getServiceAccountCredential(),
            },
      )
    : getApp();

export const adminRealtimeDatabase = getDatabase(adminApp);
export const adminAuth = getAuth(adminApp);