// expo-server-sdk ships an ESM-only build that Jest can't parse from node_modules. Tests never
// set a pushToken on test users, so sendPushNotification() always no-ops before touching this —
// this stub only exists to satisfy the import.
export interface ExpoPushMessage {
  to: string;
  sound?: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
}

export class Expo {
  static isExpoPushToken(_token: string): boolean {
    return false;
  }
  chunkPushNotifications(messages: ExpoPushMessage[]): ExpoPushMessage[][] {
    return [messages];
  }
  async sendPushNotificationsAsync(_chunk: ExpoPushMessage[]): Promise<Array<{ status: string }>> {
    return [];
  }
}
