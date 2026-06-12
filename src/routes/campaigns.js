const express = require('express');
const router = express.Router();
const axios = require('axios');
const Campaign = require('../models/Campaign');
const Message = require('../models/Message');
const Customer = require('../models/Customer');

// Helper to recover campaigns stuck in 'sending' status for too long (e.g. 2 minutes)
async function checkAndResolveStuckCampaigns() {
  try {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const stuckCampaigns = await Campaign.find({
      status: 'sending',
      createdAt: { $lt: twoMinutesAgo }
    });

    for (const campaign of stuckCampaigns) {
      const pendingCount = await Message.countDocuments({
        campaignId: campaign._id,
        status: 'sent'
      });

      if (pendingCount > 0) {
        await Message.updateMany(
          { campaignId: campaign._id, status: 'sent' },
          { 
            $set: { status: 'failed' },
            $push: { statusHistory: { status: 'failed', timestamp: new Date() } }
          }
        );

        await Campaign.findByIdAndUpdate(campaign._id, {
          $inc: { 'stats.failed': pendingCount },
          $set: { status: 'completed' }
        });
        console.log(`🔧 Recovered stuck campaign "${campaign.name}" by marking ${pendingCount} stuck messages as failed.`);
      } else {
        await Campaign.findByIdAndUpdate(campaign._id, {
          $set: { status: 'completed' }
        });
        console.log(`🔧 Recovered stuck campaign "${campaign.name}" by setting status to completed.`);
      }
    }
  } catch (error) {
    console.error('❌ Error recovering stuck campaigns:', error.message);
  }
}

/**
 * POST /api/campaigns/create
 * Creates a new campaign, generates one Message per customer,
 * and fires each message to the Channel Service for delivery.
 */
router.post('/create', async (req, res) => {
  try {
    const {
      name,
      prompt,
      segmentFilters,
      messageTemplate,
      channel,
      customerIds,
    } = req.body;

    // Validate required fields
    if (!name || !messageTemplate || !customerIds || customerIds.length === 0) {
      return res.status(400).json({
        error: 'Missing required fields: name, messageTemplate, customerIds',
      });
    }

    // 1. Create the Campaign document
    const campaign = await Campaign.create({
      name,
      naturalLanguagePrompt: prompt || '',
      segmentFilters: segmentFilters || {},
      audienceSize: customerIds.length,
      messageTemplate,
      channel: channel || 'whatsapp',
      status: 'sending',
      stats: {
        sent: customerIds.length,
        delivered: 0,
        failed: 0,
        opened: 0,
        clicked: 0,
      },
    });

    console.log(`🚀 Campaign "${name}" created with ${customerIds.length} recipients`);

    // 2. Fetch all target customers
    const customers = await Customer.find({ _id: { $in: customerIds } }).lean();

    // 3. Create Message documents and send to Channel Service
    const channelServiceUrl = process.env.CHANNEL_SERVICE_URL || 'http://localhost:4000';
    const messagePromises = customers.map(async (customer) => {
      // Determine recipient based on channel
      let recipient;
      switch (channel || customer.channel) {
        case 'email':
          recipient = customer.email;
          break;
        case 'sms':
        case 'whatsapp':
        case 'rcs':
        default:
          recipient = customer.phone;
          break;
      }

      // Personalize the message — replace {{name}} placeholder
      const personalizedContent = messageTemplate.replace(/\{\{name\}\}/gi, customer.name);

      // Create the Message document
      const message = await Message.create({
        campaignId: campaign._id,
        customerId: customer._id,
        recipient,
        content: personalizedContent,
        channel: channel || customer.channel,
        status: 'sent',
        statusHistory: [{ status: 'sent', timestamp: new Date() }],
      });

      // Fire to Channel Service (non-blocking — don't await the delivery)
      axios.post(`${channelServiceUrl}/send`, {
        messageId: message._id.toString(),
        recipient,
        content: personalizedContent,
        channel: channel || customer.channel,
      }).catch((err) => {
        console.error(`⚠️ Failed to send message ${message._id} to channel service:`, err.message);
      });

      return message;
    });

    // Wait for all Message documents to be created
    const messages = await Promise.all(messagePromises);

    console.log(`✅ ${messages.length} messages created and dispatched`);

    return res.status(201).json({
      success: true,
      campaign: {
        _id: campaign._id,
        name: campaign.name,
        audienceSize: campaign.audienceSize,
        status: campaign.status,
        stats: campaign.stats,
        createdAt: campaign.createdAt,
      },
    });
  } catch (error) {
    console.error('❌ Campaign creation error:', error.message);
    return res.status(500).json({
      error: 'Failed to create campaign',
      details: error.message,
    });
  }
});

/**
 * GET /api/campaigns
 * Returns all campaigns with their stats, sorted by newest first.
 */
router.get('/', async (req, res) => {
  try {
    await checkAndResolveStuckCampaigns();
    const campaigns = await Campaign.find()
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      campaigns,
    });
  } catch (error) {
    console.error('❌ Fetch campaigns error:', error.message);
    return res.status(500).json({
      error: 'Failed to fetch campaigns',
      details: error.message,
    });
  }
});

/**
 * GET /api/campaigns/:id
 * Returns a single campaign with its full message list for detailed stats view.
 */
router.get('/:id', async (req, res) => {
  try {
    await checkAndResolveStuckCampaigns();
    const campaign = await Campaign.findById(req.params.id).lean();

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Fetch all messages for this campaign with customer info
    const messages = await Message.find({ campaignId: campaign._id })
      .populate('customerId', 'name email phone city')
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      campaign,
      messages,
    });
  } catch (error) {
    console.error('❌ Fetch campaign detail error:', error.message);
    return res.status(500).json({
      error: 'Failed to fetch campaign details',
      details: error.message,
    });
  }
});

module.exports = router;
