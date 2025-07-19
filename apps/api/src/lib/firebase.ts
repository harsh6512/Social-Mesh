import admin from 'firebase-admin';
import type { Messaging } from 'firebase-admin/messaging';
import { ENV } from "../constants/env.js";

if (!admin.apps.length) {
  const firebaseAdminConfig = JSON.parse(ENV.FIREBASE_ADMIN_API!);
  
  admin.initializeApp({
    credential: admin.credential.cert(firebaseAdminConfig),
  });
}

const messaging: Messaging = admin.messaging();
export { admin, messaging };