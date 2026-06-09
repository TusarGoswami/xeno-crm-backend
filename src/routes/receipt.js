const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Campaign = require('../models/Campaign');

/**
 * POST /api/receipt
 * CRITICAL ENDPOINT — Called by the Channel Service to report delivery status.
 *
 * Handles:
 * - Updating individual message status
 * - Appending to statusHistory for audit trail
 * - Incrementing the correct campaign stat counter
 * - Out-of-order callback protection via status hierarchy
 * - Concurrent callback safety via atomic MongoDB operations
 *
 * Status hierarchy: sent (0) < delivered (1) < opened (2) < read (3) < clicked (4)
 * 'failed' is a terminal state at level 1.
 */
router.post('/', async (req, res) => {
  try {
    const { messageId, status, timestamp } = req.body;

    // Validate input
    if (!messageId || !status) {
      return res.status(400).json({
        error: 'Missing required fields: messageId, status',
      });
    }

    const validStatuses = ['sent', 'delivered', 'failed', 'opened', 'read', 'clicked'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status: "${status}". Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    // Find the message
    const message = await Message.findById(messageId);
    if (!message) {
      console.warn(`⚠️ Receipt for unknown message: ${messageId}`);
      return res.status(404).json({ error: 'Message not found' });
    }

    // Check if this status transition is valid (prevents out-of-order issues)
    if (!message.canTransitionTo(status)) {
      console.log(`⏭️ Skipping out-of-order callback: ${message.status} → ${status} for message ${messageId}`);
      return res.json({
        success: true,
        skipped: true,
        reason: `Current status "${message.status}" is already at or beyond "${status}"`,
      });
    }

    const previousStatus = message.status;

    // Update message status and append to history
    message.status = status;
    message.statusHistory.push({
      status,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
    });
    await message.save();

    // Build the atomic campaign stats update
    // We increment the new status counter
    const statsUpdate = {};
    statsUpdate[`stats.${status}`] = 1;

    // Use atomic $inc to safely handle concurrent callbacks
    await Campaign.findByIdAndUpdate(message.campaignId, {
      $inc: statsUpdate,
    });

    console.log(`📨 Message ${messageId}: ${previousStatus} → ${status}`);

    // Check if all messages in this campaign have reached a terminal state
    // (delivered, failed, opened, read, clicked) — if so, mark campaign as completed
    const campaign = await Campaign.findById(message.campaignId).lean();
    if (campaign) {
      const totalTerminal = campaign.stats.delivered + campaign.stats.failed +
                            campaign.stats.opened + campaign.stats.clicked;
      // Note: opened/clicked messages were already counted as delivered,
      // so we check if sent count matches delivered + failed
      if (campaign.stats.delivered + campaign.stats.failed >= campaign.audienceSize) {
        await Campaign.findByIdAndUpdate(message.campaignId, {
          status: 'completed',
        });
        console.log(`🏁 Campaign "${campaign.name}" marked as completed`);
      }
    }

    return res.json({ success: true, messageId, status });
  } catch (error) {
    console.error('❌ Receipt processing error:', error.message);
    return res.status(500).json({
      error: 'Failed to process delivery receipt',
      details: error.message,
    });
  }
});

module.exports = router;
