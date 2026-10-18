import "client-only";

import {
  browserLocalPersistence,
  setPersistence,
  signInAnonymously,
  type User,
} from "firebase/auth";

import { firebaseAuth } from "@/lib/firebase/client";

async function initializeAnonymousUser(): Promise<User> {
  await setPersistence(
    firebaseAuth,
    browserLocalPersistence,
  );

  await firebaseAuth.authStateReady();

  if (firebaseAuth.currentUser) {
    return firebaseAuth.currentUser;
  }

  const credential = await signInAnonymously(firebaseAuth);

  return credential.user;
}

let anonymousUserPromise: Promise<User> | undefined;

export function getOrCreateAnonymousUser(): Promise<User> {
  if (!anonymousUserPromise) {
    anonymousUserPromise =
      initializeAnonymousUser().catch((error: unknown) => {
        anonymousUserPromise = undefined;
        throw error;
      });
  }

  return anonymousUserPromise;
}