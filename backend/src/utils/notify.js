import Notification from '../models/Notification.js';
import { getIO } from '../sockets/index.js';

/**
 * Fire-and-forget by design: a notification failing to send should never
 * fail the action that triggered it (accepting a proposal must succeed even
 * if the notification write has a hiccup). Errors are logged, not thrown.
 */
export async function notify({ user, type, title, body = '', link = '' }) {
  try {
    const notification = await Notification.create({ user, type, title, body, link });

    const io = getIO();
    if (io) {
      io.to(`user:${user}`).emit('notification', {
        _id: notification._id,
        type,
        title,
        body,
        link,
        isRead: false,
        createdAt: notification.createdAt,
      });
    }

    return notification;
  } catch (err) {
    console.error('[notify] failed to create notification:', err.message);
    return null;
  }
}
