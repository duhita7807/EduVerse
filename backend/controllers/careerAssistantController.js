const Student = require("../models/Student");
const Analytics = require("../models/Analytics");
const ChatConversation = require("../models/ChatConversation");
const { asyncHandler } = require("../middleware/errorHandler");
const careerAssistantService = require("../services/careerAssistantService");

const MAX_MESSAGE_LENGTH = 2000;

/** Trims and validates a free-text message field shared by chat/interview. */
const validateMessage = (message) => {
  if (typeof message !== "string" || !message.trim()) {
    const err = new Error("Message cannot be empty.");
    err.statusCode = 400;
    throw err;
  }
  if (message.trim().length > MAX_MESSAGE_LENGTH) {
    const err = new Error(`Message is too long (max ${MAX_MESSAGE_LENGTH} characters).`);
    err.statusCode = 400;
    throw err;
  }
  return message.trim();
};

/**
 * Loads an existing conversation owned by the student, or starts a new one
 * in memory (not yet saved) if no conversationId was given.
 */
const loadOrCreateConversation = async (studentId, conversationId, defaultTitle) => {
  if (conversationId) {
    const convo = await ChatConversation.findOne({ _id: conversationId, userId: studentId });
    if (!convo) {
      const err = new Error("Conversation not found.");
      err.statusCode = 404;
      throw err;
    }
    return convo;
  }
  return new ChatConversation({ userId: studentId, title: defaultTitle, messages: [] });
};

/**
 * Shared pipeline for every AI-driven endpoint: load student + latest
 * analytics for context, append the user's message, call the AI service,
 * append + persist the assistant's reply, return both to the client.
 */
const runAssistantTurn = async ({ studentId, conversationId, userMessage, mode, defaultTitle }) => {
  const student = await Student.findById(studentId);
  if (!student) {
    const err = new Error("Student profile not found.");
    err.statusCode = 404;
    throw err;
  }

  const latestAnalytics = await Analytics.findOne({ userId: studentId });
  const conversation = await loadOrCreateConversation(studentId, conversationId, defaultTitle);

  conversation.messages.push({ role: "user", content: userMessage, mode, timestamp: new Date() });

  const reply = await careerAssistantService.getAssistantReply({
    student,
    latestAnalytics,
    history: conversation.messages.map((m) => ({ role: m.role, content: m.content })),
    mode,
  });

  conversation.messages.push({
    role: "assistant",
    content: reply.message,
    suggestedActions: reply.suggestedActions,
    roadmapSteps: reply.roadmapSteps,
    mode,
    timestamp: new Date(),
  });

  // Auto-title a brand-new conversation from the student's first message.
  if (!conversationId && conversation.title === defaultTitle) {
    conversation.title = userMessage.length > 60 ? `${userMessage.slice(0, 57)}...` : userMessage;
  }

  await conversation.save();

  return { conversation, reply };
};

/**
 * @route   POST /api/career-assistant/chat
 * @desc    Free-form career/skills/placement question
 * @access  Private
 * @body    { message, conversationId? }
 */
const chat = asyncHandler(async (req, res) => {
  const message = validateMessage(req.body.message);
  const { conversation, reply } = await runAssistantTurn({
    studentId: req.student._id,
    conversationId: req.body.conversationId,
    userMessage: message,
    mode: "chat",
    defaultTitle: "New conversation",
  });

  res.json({
    success: true,
    data: {
      message: reply.message,
      suggestedActions: reply.suggestedActions,
      conversationId: conversation._id,
      title: conversation.title,
    },
  });
});

/**
 * @route   POST /api/career-assistant/interview
 * @desc    Mock interview mode — one question at a time with feedback
 * @access  Private
 * @body    { message, conversationId? }
 */
const interview = asyncHandler(async (req, res) => {
  const message = validateMessage(req.body.message);
  const { conversation, reply } = await runAssistantTurn({
    studentId: req.student._id,
    conversationId: req.body.conversationId,
    userMessage: message,
    mode: "interview",
    defaultTitle: "Mock interview",
  });

  res.json({
    success: true,
    data: {
      message: reply.message,
      suggestedActions: reply.suggestedActions,
      conversationId: conversation._id,
      title: conversation.title,
    },
  });
});

/**
 * @route   POST /api/career-assistant/roadmap
 * @desc    Generates a stage-by-stage career roadmap
 * @access  Private
 * @body    { conversationId?, targetRole? }
 */
const roadmap = asyncHandler(async (req, res) => {
  const targetRole = typeof req.body.targetRole === "string" ? req.body.targetRole.trim() : "";
  const userMessage = targetRole
    ? `Create my career roadmap towards becoming a ${targetRole}.`
    : "Create my career roadmap based on my current profile.";

  const { conversation, reply } = await runAssistantTurn({
    studentId: req.student._id,
    conversationId: req.body.conversationId,
    userMessage,
    mode: "roadmap",
    defaultTitle: "Career roadmap",
  });

  res.json({
    success: true,
    data: {
      message: reply.message,
      suggestedActions: reply.suggestedActions,
      roadmapSteps: reply.roadmapSteps,
      conversationId: conversation._id,
      title: conversation.title,
    },
  });
});

/**
 * @route   POST /api/career-assistant/learning-plan
 * @desc    Generates a learning plan for a specific skill/topic
 * @access  Private
 * @body    { topic, conversationId? }
 */
const learningPlan = asyncHandler(async (req, res) => {
  const topic = validateMessage(req.body.topic);
  const userMessage = `Create a learning plan to help me learn: ${topic}`;

  const { conversation, reply } = await runAssistantTurn({
    studentId: req.student._id,
    conversationId: req.body.conversationId,
    userMessage,
    mode: "learning-plan",
    defaultTitle: `Learning plan: ${topic.slice(0, 40)}`,
  });

  res.json({
    success: true,
    data: {
      message: reply.message,
      suggestedActions: reply.suggestedActions,
      conversationId: conversation._id,
      title: conversation.title,
    },
  });
});

/**
 * @route   GET /api/career-assistant/history
 * @desc    List the student's conversations (summary only — id, title, updatedAt)
 * @access  Private
 */
const listHistory = asyncHandler(async (req, res) => {
  const conversations = await ChatConversation.find({ userId: req.student._id })
    .select("_id title updatedAt createdAt")
    .sort({ updatedAt: -1 })
    .limit(50);

  res.json({ success: true, data: { conversations } });
});

/**
 * @route   GET /api/career-assistant/history/:id
 * @desc    Get one full conversation (all messages)
 * @access  Private
 */
const getConversation = asyncHandler(async (req, res) => {
  const conversation = await ChatConversation.findOne({ _id: req.params.id, userId: req.student._id });
  if (!conversation) {
    return res.status(404).json({ success: false, message: "Conversation not found." });
  }
  res.json({ success: true, data: { conversation } });
});

/**
 * @route   DELETE /api/career-assistant/history/:id
 * @desc    Delete one conversation
 * @access  Private
 */
const deleteConversation = asyncHandler(async (req, res) => {
  const result = await ChatConversation.deleteOne({ _id: req.params.id, userId: req.student._id });
  if (result.deletedCount === 0) {
    return res.status(404).json({ success: false, message: "Conversation not found." });
  }
  res.json({ success: true, message: "Conversation deleted." });
});

/**
 * @route   DELETE /api/career-assistant/history
 * @desc    Delete ALL of the student's conversations
 * @access  Private
 */
const clearHistory = asyncHandler(async (req, res) => {
  await ChatConversation.deleteMany({ userId: req.student._id });
  res.json({ success: true, message: "All conversations cleared." });
});

module.exports = {
  chat,
  interview,
  roadmap,
  learningPlan,
  listHistory,
  getConversation,
  deleteConversation,
  clearHistory,
};
