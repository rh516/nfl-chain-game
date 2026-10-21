const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const databaseURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

if (!apiKey || !authDomain || !databaseURL || !projectId) {
  throw new Error("Missing required Firebase configuration.");
}

export const firebaseConfig = {
  apiKey,
  authDomain,
  databaseURL,
  projectId,
};
