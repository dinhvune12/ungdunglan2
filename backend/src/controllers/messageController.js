import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import {
  emitNewMessage,
  updateConversationAfterCreateMessage,
} from "../utils/messageHelper.js";
import { io } from "../socket/index.js";
import { uploadImageFromBuffer } from "../middlewares/uploadMiddleware.js";

export const sendDirectMessage = async (req, res) => {
  try {
    const { recipientId, content, conversationId } = req.body;
    const senderId = req.user._id;

    let conversation;

    if (!content) {
      return res.status(400).json({ message: "Thiếu nội dung" });
    }

    if (conversationId) {
      conversation = await Conversation.findById(conversationId);
    }

    if (!conversation) {
      conversation = await Conversation.create({
        type: "direct",
        participants: [
          { userId: senderId, joinedAt: new Date() },
          { userId: recipientId, joinedAt: new Date() },
        ],
        lastMessageAt: new Date(),
        unreadCounts: new Map(),
      });
    }

    const message = await Message.create({
      conversationId: conversation._id,
      senderId,
      content,
    });

    updateConversationAfterCreateMessage(conversation, message, senderId);

    await conversation.save();

    emitNewMessage(io, conversation, message);

    return res.status(201).json({ message });
  } catch (error) {
    console.error("Lỗi xảy ra khi gửi tin nhắn trực tiếp", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const sendGroupMessage = async (req, res) => {
  try {
    const { conversationId, content } = req.body;
    const senderId = req.user._id;
    const conversation = req.conversation;

    if (!content) {
      return res.status(400).json("Thiếu nội dung");
    }

    const message = await Message.create({
      conversationId,
      senderId,
      content,
    });

    updateConversationAfterCreateMessage(conversation, message, senderId);

    await conversation.save();
    emitNewMessage(io, conversation, message);

    return res.status(201).json({ message });
  } catch (error) {
    console.error("Lỗi xảy ra khi gửi tin nhắn nhóm", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const uploadMessageImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Không có ảnh được gửi" });
    }

    const result = await uploadImageFromBuffer(req.file.buffer, {
      folder: "moji_chat/messages",
    });

    return res.status(200).json({ imageUrl: result.secure_url });
  } catch (error) {
    console.error("Lỗi khi upload ảnh tin nhắn", error);
    return res.status(500).json({ message: "Lỗi khi upload ảnh" });
  }
};

export const sendPublicMessage = async (req, res) => {
  try {
    const { recipientId, recipientUsername, content } = req.body;
    const senderId = process.env.PUBLIC_SENDER_ID;

    if (!content || content.trim() === "") {
      return res.status(400).json({ message: "Nội dung tin nhắn không được để trống" });
    }

    if (!recipientId && !recipientUsername) {
      return res
        .status(400)
        .json({ message: "Cần cung cấp recipientId hoặc recipientUsername" });
    }

    let recipient = null;

    if (recipientId) {
      recipient = await User.findById(recipientId).select(
        "_id displayName username avatarUrl email"
      );
    } else if (recipientUsername) {
      recipient = await User.findOne({ username: recipientUsername }).select(
        "_id displayName username avatarUrl email"
      );
    }

    if (!recipient) {
      return res.status(404).json({ message: "Người nhận không tồn tại" });
    }

    const sender = await User.findById(senderId).select(
      "_id displayName username avatarUrl email"
    );

    if (!sender) {
      return res.status(404).json({ message: "Người gửi (PUBLIC_SENDER) không tồn tại" });
    }

    // Kiểm tra hai người đã là bạn chưa
    const Friend = (await import("../models/Friend.js")).default;
    let userA = senderId.toString();
    let userB = recipient._id.toString();
    if (userA > userB) {
      [userA, userB] = [userB, userA];
    }

    const isFriend = await Friend.findOne({ userA, userB });
    if (!isFriend) {
      return res.status(403).json({
        message: "Người gửi và người nhận chưa là bạn bè",
      });
    }

    // Tạo hoặc lấy conversation
    let conversation = await Conversation.findOne({
      type: "direct",
      participants: {
        $all: [
          { $elemMatch: { userId: senderId } },
          { $elemMatch: { userId: recipient._id } },
        ],
      },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        type: "direct",
        participants: [
          { userId: senderId, joinedAt: new Date() },
          { userId: recipient._id, joinedAt: new Date() },
        ],
        lastMessageAt: new Date(),
        unreadCounts: new Map(),
      });
    }

    // Tạo message
    const message = await Message.create({
      conversationId: conversation._id,
      senderId,
      content,
    });

    updateConversationAfterCreateMessage(conversation, message, senderId);
    await conversation.save();

    emitNewMessage(io, conversation, message);

    return res.status(201).json({
      message: "Tin nhắn đã được gửi thành công",
      data: {
        sender: {
          _id: sender._id,
          displayName: sender.displayName,
          username: sender.username,
          avatarUrl: sender.avatarUrl,
          email: sender.email,
        },
        recipient: {
          _id: recipient._id,
          displayName: recipient.displayName,
          username: recipient.username,
          avatarUrl: recipient.avatarUrl,
          email: recipient.email,
        },
        message: {
          _id: message._id,
          content: message.content,
          createdAt: message.createdAt,
        },
        conversationId: conversation._id,
      },
    });
  } catch (error) {
    console.error("Lỗi khi gửi public message", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};
