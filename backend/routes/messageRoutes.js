const express = require("express");
const Message = require("../models/ChatModel");
const { protect } = require("../middlewares/authMiddleware");

const messageRouter = express.Router();

// Send a message
messageRouter.post("/", protect, async (req, res) => {
  try {
    const { content, groupId } = req.body;

    const message = await Message.create({
      content,
      sender: req.user._id,
      group: groupId,
    });

    const populateMessage = await Message.findById(message._id)
      .populate("sender", "username email")
      .populate("group", "name");

    res.status(201).json({ message: populateMessage });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get messages for a group
messageRouter.get("/:groupId", protect, async (req, res) => {
  try {
    const { groupId } = req.params;

    const messages = await Message.find({ group: groupId })
      .populate("sender", "username email")
      .sort({ createdAt: -1 });

    console.log("messages", messages);

    res.json(messages);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = messageRouter;
