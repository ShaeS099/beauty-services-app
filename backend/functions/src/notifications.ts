import { Expo, ExpoPushMessage } from 'expo-server-sdk';

const expo = new Expo();

/**
 * Best-effort push send. Never throws — a failed/missing push token must not break the
 * booking/message/review write it's attached to.
 */
export async function sendPushNotification(
  pushToken: string | undefined,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  if (!pushToken || !Expo.isExpoPushToken(pushToken)) return;

  const message: ExpoPushMessage = { to: pushToken, sound: 'default', title, body, data };

  try {
    const chunks = expo.chunkPushNotifications([message]);
    for (const chunk of chunks) {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      for (const ticket of tickets) {
        if (ticket.status === 'error') {
          console.error('Push notification error:', ticket.message, ticket.details);
        }
      }
    }
  } catch (err) {
    console.error('sendPushNotification failed:', err);
  }
}
