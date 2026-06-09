const mongoose = require('mongoose');

/**
 * Message Schema
 * Represents a single message sent to one customer as part of a campaign.
 * Tracks delivery status through the full lifecycle via statusHistory.
 *
 * Status hierarchy (used to prevent out-of-order callback issues):
 *   sent (0) < delivered (1) < opened (2) < read (3) < clicked (4)
 */

// Status hierarchy map — higher number = more advanced status
const STATUS_HIERARCHY = {
  sent: 0,
  delivered: 1,
  failed: 1,     // 'failed' is at the same level as 'delivered' (terminal state)
  opened: 2,
  read: 3,
  clicked: 4,
};

const messageSchema = new mongoose.Schema({
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    required: [true, 'Campaign ID is required'],
    index: true,
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'Customer ID is required'],
  },
  recipient: {
    type: String,
    required: [true, 'Recipient is required'],
  },
  content: {
    type: String,
    required: [true, 'Message content is required'],
  },
  channel: {
    type: String,
    enum: ['whatsapp', 'sms', 'email'],
    required: true,
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'failed', 'opened', 'read', 'clicked'],
    default: 'sent',
  },
  statusHistory: [
    {
      status: { type: String },
      timestamp: { type: Date, default: Date.now },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Static method to check if a status transition is valid (prevents out-of-order updates)
messageSchema.statics.STATUS_HIERARCHY = STATUS_HIERARCHY;

messageSchema.methods.canTransitionTo = function (newStatus) {
  const currentLevel = STATUS_HIERARCHY[this.status] || 0;
  const newLevel = STATUS_HIERARCHY[newStatus];

  // 'failed' is a terminal state — don't transition away from it
  if (this.status === 'failed') return false;

  // Only allow forward transitions (higher hierarchy level)
  return newLevel > currentLevel;
};

module.exports = mongoose.model('Message', messageSchema);
