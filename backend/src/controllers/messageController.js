import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { getIO } from '../sockets/index.js';
import { notify } from '../utils/notify.js';

function assertParticipant(conversation, userId) {
  if (!conversation.participants.some((p) => String(p) === String(userId))) {
    throw new ApiError(403, 'Not a participant in this conversation');
  }
}

export const startOrGetConversation = asyncHandler(async (req, res) => {
  const { recipientId, gigId } = req.body;
  if (String(recipientId) === String(req.user._id)) throw new ApiError(400, "Can't message yourself");

  const recipient = await User.findById(recipientId);
  if (!recipient) throw new ApiError(404, 'User not found');

  let conversation = await Conversation.findOne({
    participants: { $all: [req.user._id, recipientId], $size: 2 },
    gig: gigId || null,
  });

  if (!conversation) {
    conversation = await Conversation.create({
      participants: [req.user._id, recipientId],
      gig: gigId || null,
    });
  }

  res.status(200).json(new ApiResponse(200, { conversation }));
});

export const listMyConversations = asyncHandler(async (req, res) => {
  const conversations = await Conversation.find({ participants: req.user._id })
    .sort({ lastMessageAt: -1 })
    .populate('participants', 'name avatarUrl')
    .populate('gig', 'title');

  res.json(new ApiResponse(200, { conversations }));
});

export const getMessages = asyncHandler(async (req, res) => {
  const conversation = await Conversation.findById(req.params.conversationId);
  if (!conversation) throw new ApiError(404, 'Conversation not found');
  assertParticipant(conversation, req.user._id);

  const messages = await Message.find({ conversation: conversation._id })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('sender', 'name avatarUrl');

  res.json(new ApiResponse(200, { messages: messages.reverse() }));
});

export const sendMessage = asyncHandler(async (req, res) => {
  const conversation = await Conversation.findById(req.params.conversationId);
  if (!conversation) throw new ApiError(404, 'Conversation not found');
  assertParticipant(conversation, req.user._id);

  const { text, attachments } = req.body;
  if (!text.trim() && attachments.length === 0) throw new ApiError(400, 'Message cannot be empty');

  const message = await Message.create({
    conversation: conversation._id,
    sender: req.user._id,
    text,
    attachments,
    readBy: [req.user._id],
  });

  conversation.lastMessageText = text.slice(0, 140);
  conversation.lastMessageAt = new Date();
  await conversation.save();

  const populated = await message.populate('sender', 'name avatarUrl');

  const io = getIO();
  if (io) io.to(`conversation:${conversation._id}`).emit('new_message', populated);

  const recipientId = conversation.participants.find((p) => String(p) !== String(req.user._id));
  if (recipientId) {
    await notify({
      user: recipientId,
      type: 'new_message',
      title: `New message from ${req.user.name}`,
      body: text.slice(0, 100),
      link: `/messages/${conversation._id}`,
    });
  }

  res.status(201).json(new ApiResponse(201, { message: populated }));
});
