// utils/getDeviceToken.ts

import { initMessaging } from "./firebase-client";

export async function getDeviceToken(): Promise<string | null> {
  try {
    const token = await initMessaging(); // Already handles requestPermission + getToken
    return token || null;
  } catch (err) {
    console.error("Failed to get device token:", err);
    return null;
  }
}
