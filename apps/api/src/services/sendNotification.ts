import { messaging } from "../lib/firebase.js";

type NotificationPayload = {
  title: string;
  body: string;
  imageUrl?: string;
};

export async function sendNotification(
  tokens: string[],
  notification: NotificationPayload
) {
  if (!tokens.length) return;

  const message = {
    notification: {
      title: notification.title,
      body: notification.body,
      ...(notification.imageUrl && { imageUrl: notification.imageUrl }),
    },
    tokens,
  };

  try {
    const response = await messaging.sendEachForMulticast(message);
    console.log("✅ Sent:", response.successCount, "successes");

    if (response.failureCount > 0) {
      const failed = response.responses
        .map((r, i) => (!r.success ? tokens[i] : null))
        .filter(Boolean);
      console.warn("⚠️ Failed tokens:", failed);
    }
    return response;
  } catch (err) {
    console.error("❌ Error sending FCM:", err);
    throw err;
  }
}
