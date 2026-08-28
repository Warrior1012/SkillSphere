import { Server } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt.js';
import { env } from '../config/env.js';
import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import { isDbConnected } from '../config/db.js';

let io = null;

export function getIO() {
  return io;
}

export function initSockets(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: env.CLIENT_URL, credentials: true },
  });

  // Reject the connection before it's established if the token is missing
  // or invalid — same bar as the REST `protect` middleware, just for sockets.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Not authenticated'));
    try {
      const decoded = verifyAccessToken(token);
      if (decoded.type !== 'access') return next(new Error('Invalid token type'));
      socket.userId = decoded.sub;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    // Every connected user gets a personal room — this is how `notify()`
    // pushes notifications without the client subscribing to anything.
    socket.join(`user:${socket.userId}`);

    socket.on('join_conversation', async (conversationId) => {
      if (!isDbConnected()) return;
      const convo = await Conversation.findById(conversationId);
      if (!convo || !convo.participants.some((p) => String(p) === socket.userId)) {
        return; // silently ignore — not a participant, not their conversation
      }
      socket.join(`conversation:${conversationId}`);
    });

    socket.on('typing', ({ conversationId }) => {
      socket.to(`conversation:${conversationId}`).emit('user_typing', { userId: socket.userId, conversationId });
    });

    socket.on('stop_typing', ({ conversationId }) => {
      socket.to(`conversation:${conversationId}`).emit('user_stop_typing', { userId: socket.userId, conversationId });
    });

    socket.on('mark_read', async ({ conversationId, messageIds }) => {
      if (!isDbConnected() || !Array.isArray(messageIds) || messageIds.length === 0) return;
      await Message.updateMany(
        { _id: { $in: messageIds }, conversation: conversationId },
        { $addToSet: { readBy: socket.userId } }
      );
      socket.to(`conversation:${conversationId}`).emit('messages_read', { conversationId, messageIds, readBy: socket.userId });
    });
  });

  return io;
}
