const express = require("express");
const Group = require("../models/GroupModel");
const { protect, isAdmin } = require("../middlewares/authMiddleware");

const groupRouter = express.Router();

// Create a new group
groupRouter.post("/", protect, isAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;

    const group = await Group.create({
      name,
      description,
      admin: req.user._id,
      members: [req.user._id],
    });

    const populateGroup = await Group.findById(group._id)
      .populate("admin", "username email")
      .populate("members", "username email");

    res.status(201).json({ populateGroup });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get all groups
groupRouter.get("/", protect, async (req, res) => {
  try {
    const groups = await Group.find()
      .populate("admin", "username email")
      .populate("members", "username email");
    res.json(groups);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

//Jion a group
groupRouter.post("/:groupId/join", protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if user is already a member
    if (group.members.includes(req.user._id)) {
      return res
        .status(400)
        .json({ message: "Already a member of this group" });
    }

    // Add user to group
    group.members.push(req.user._id);
    await group.save();

    res.json({ message: "Joined the group successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get a specific group by ID
groupRouter.get("/:id", protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate("admin", "username email")
      .populate("members", "username email");
    if (group) {
      res.json(group);
    } else {
      res.status(404).json({ message: "Group not found" });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = groupRouter;
