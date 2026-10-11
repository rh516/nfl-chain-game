import "server-only";

import { getApp, getApps, initializeApp } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import { getAuth } from "firebase-admin/auth";

const projectId = process.env.GCLOUD_PROJECT ?? "demo-nfl-chain";

const adminApp =
  getApps().length === 0
    ? initializeApp({
        projectId,
        databaseURL:
          process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ??
          "https://demo-nfl-chain-default-rtdb.firebaseio.com",
      })
    : getApp();

export const adminRealtimeDatabase = getDatabase(adminApp);
export const adminAuth = getAuth(adminApp);