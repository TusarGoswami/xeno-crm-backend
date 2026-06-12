const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Campaign = require('../models/Campaign');
const Customer = require('../models/Customer');
const Order = require('../models/Order');

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

    const validStatuses = ['sent', 'delivered', 'failed', 'opened', 'read', 'clicked', 'converted'];
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
    // We increment the new status counter and backfill any intermediate skipped states
    const statsUpdate = {};

    if (status === 'failed') {
      statsUpdate['stats.failed'] = 1;
    } else {
      const STATUS_ORDER = ['sent', 'delivered', 'opened', 'read', 'clicked', 'converted'];
      const TRACKED_STATS = ['delivered', 'opened', 'clicked', 'converted'];

      const prevIndex = STATUS_ORDER.indexOf(previousStatus);
      const newIndex = STATUS_ORDER.indexOf(status);

      if (prevIndex !== -1 && newIndex !== -1 && newIndex > prevIndex) {
        for (let i = prevIndex + 1; i <= newIndex; i++) {
          const s = STATUS_ORDER[i];
          if (TRACKED_STATS.includes(s)) {
            statsUpdate[`stats.${s}`] = 1;
          }
        }
      } else {
        if (TRACKED_STATS.includes(status)) {
          statsUpdate[`stats.${status}`] = 1;
        }
      }
    }

    if (status === 'converted') {
      // Simulate an order from the conversion
      const amount = Math.floor(Math.random() * 2500) + 500; // ₹500 - ₹3000
      
      const mockProducts = [
        { name: 'Wireless Earbuds', price: 1299 },
        { name: 'Cotton Kurta', price: 899 },
        { name: 'Running Shoes', price: 2499 },
        { name: 'Bluetooth Speaker', price: 1899 },
        { name: 'Leather Wallet', price: 599 },
        { name: 'Organic Green Tea (100g)', price: 450 }
      ];
      
      const item = mockProducts[Math.floor(Math.random() * mockProducts.length)];
      
      try {
        await Order.create({
          customerId: message.customerId,
          campaignId: message.campaignId,
          amount,
          items: [{ name: item.name, price: amount }],
          status: 'completed'
        });
        
        await Customer.findByIdAndUpdate(message.customerId, {
          $inc: { totalSpend: amount, totalOrders: 1 },
          $set: { lastOrderDate: new Date() }
        });
        
        statsUpdate['stats.revenue'] = amount;
        console.log(`💰 Simulating conversion order of ₹${amount} for Customer ${message.customerId}`);
      } catch (err) {
        console.error('⚠️ Conversion order simulation failed:', err.message);
      }
    }

    // Use atomic $inc to safely handle concurrent callbacks
    await Campaign.findByIdAndUpdate(message.campaignId, {
      $inc: statsUpdate,
    });

    console.log(`📨 Message ${messageId}: ${previousStatus} → ${status}`);

    // Check if all messages in this campaign have reached a terminal state
    // We query the DB for actual message statuses instead of using stat counters,
    // because counters can double-count (a message going delivered→opened increments both).
    const campaign = await Campaign.findById(message.campaignId).lean();
    if (campaign && campaign.status !== 'completed') {
      // Count messages still in 'sent' status (haven't received any callback yet)
      const pendingCount = await Message.countDocuments({
        campaignId: message.campaignId,
        status: 'sent',
      });

      // If no messages are still pending, all have reached a terminal state
      if (pendingCount === 0) {
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
