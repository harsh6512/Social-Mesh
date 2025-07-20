import { admin,messaging } from "../lib/firebase.js";
import { prisma } from '../db/index.js'

type NotificationPayload = {
  type: "Follow" | "Like" | "Comment" | "Quick_Connect" | "Direct_Message";
  message: string;
  senderId: number;
  recipientId: number;
  imageUrl?: string;
  postId?: number
};

export async function sendNotification(
  tokens: string[],
  notification: NotificationPayload
) {
  try {
    const message = tokens.length>0
      ? {
        notification: {
          title: notification.type,//sending type of notification as title
          body: notification.message,
          ...(notification.imageUrl && { imageUrl: notification.imageUrl }),
        },
        tokens
      }
      : null;

    const [pushResult, dbResult] = await Promise.all([
      message ? messaging.sendEachForMulticast(message) : Promise.resolve(null),
      prisma.notification.create({
        data: {
          type: notification.type,
          senderId: notification.senderId,
          recipientId: notification.recipientId,
          postId: notification.postId,
          message: notification.message,
        },
      })
    ]);

    if (pushResult) {
      console.log("✅ Push Sent:", pushResult.successCount, "successes");

      if (pushResult.failureCount > 0) {
        const failed = pushResult.responses
          .map((r: admin.messaging.SendResponse, i: number) => (!r.success ? tokens[i] : null))
          .filter(Boolean);
        console.warn("⚠️ Failed tokens:", failed);
      }
    }

    return {pushResult, dbResult}
  } catch (err) {
    console.error("❌ Error in sending or saving notification:", err);
    throw err;
  }
}