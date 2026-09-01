"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPushNotification = sendPushNotification;
const expo_server_sdk_1 = require("expo-server-sdk");
const expo = new expo_server_sdk_1.Expo();
/**
 * Best-effort push send. Never throws — a failed/missing push token must not break the
 * booking/message/review write it's attached to.
 */
async function sendPushNotification(pushToken, title, body, data) {
    if (!pushToken || !expo_server_sdk_1.Expo.isExpoPushToken(pushToken))
        return;
    const message = { to: pushToken, sound: 'default', title, body, data };
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
    }
    catch (err) {
        console.error('sendPushNotification failed:', err);
    }
}
//# sourceMappingURL=notifications.js.map