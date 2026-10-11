import { getApp, getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectDatabaseEmulator, getDatabase } from "firebase/database";

import { firebaseConfig } from "./config";

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const firebaseAuth = getAuth(app);
export const realtimeDatabase = getDatabase(app);

declare global {
  var __nflChainEmulatorsConnected: boolean | undefined;
}

if (
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true" &&
  !globalThis.__nflChainEmulatorsConnected
) {
  connectAuthEmulator(firebaseAuth, "http://127.0.0.1:9099", {
    disableWarnings: true,
  });
  connectDatabaseEmulator(realtimeDatabase, "127.0.0.1", 9000);
  globalThis.__nflChainEmulatorsConnected = true;
}
