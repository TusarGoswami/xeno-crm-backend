const mongoose = require('mongoose');

/**
 * Campaign Schema
 * Represents a marketing campaign created via the AI chat interface.
 * Stores the original natural language prompt, the AI-extracted filters,
 * the message template, and live delivery statistics.
 */
const campaignSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Campaign name is required'],
    trim: true,
  },
  naturalLanguagePrompt: {
    type: String,
    required: [true, 'Natural language prompt is required'],
  },
  segmentFilters: {
    type: Object,
    default: {},
  },
  audienceSize: {
    type: Number,
    default: 0,
    min: 0,
  },
  messageTemplate: {
    type: String,
    required: [true, 'Message template is required'],
  },
  channel: {
    type: String,
    enum: ['whatsapp', 'sms', 'email'],
    default: 'whatsapp',
  },
  status: {
    type: String,
    enum: ['draft', 'sending', 'completed'],
    default: 'draft',
  },
  stats: {
    sent: { type: Number, default: 0 },
    delivered: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    opened: { type: Number, default: 0 },
    clicked: { type: Number, default: 0 },
    converted: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Campaign', campaignSchema);
