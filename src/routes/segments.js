const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');

/**
 * POST /api/segments/preview
 * Takes AI-extracted segmentFilters and dynamically builds a MongoDB query
 * to find matching customers. Returns the matching customers and count.
 *
 * Filter fields (all optional — null means "don't filter"):
 *   - minTotalSpend: customers who spent >= this amount
 *   - maxTotalSpend: customers who spent <= this amount
 *   - minTotalOrders: customers with >= this many orders
 *   - daysSinceLastOrder: customers who haven't ordered in this many days
 *   - city: exact city match (case-insensitive)
 *   - channel: preferred communication channel
 */
router.post('/preview', async (req, res) => {
  try {
    const filters = req.body.segmentFilters || req.body;

    // Build MongoDB query dynamically — only include non-null filters
    const query = {};

    // Spend filters
    if (filters.minTotalSpend != null) {
      query.totalSpend = query.totalSpend || {};
      query.totalSpend.$gte = Number(filters.minTotalSpend);
    }
    if (filters.maxTotalSpend != null) {
      query.totalSpend = query.totalSpend || {};
      query.totalSpend.$lte = Number(filters.maxTotalSpend);
    }

    // Order count filter
    if (filters.minTotalOrders != null) {
      query.totalOrders = { $gte: Number(filters.minTotalOrders) };
    }

    // Inactivity filter — find customers whose last order was N+ days ago
    if (filters.daysSinceLastOrder != null) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - Number(filters.daysSinceLastOrder));
      query.lastOrderDate = { $lte: cutoffDate };
    }

    // City filter (case-insensitive regex match)
    if (filters.city != null && filters.city.trim() !== '') {
      query.city = new RegExp(`^${filters.city.trim()}$`, 'i');
    }

    // Channel filter
    if (filters.channel != null && filters.channel.trim() !== '') {
      query.channel = filters.channel.trim().toLowerCase();
    }

    console.log('🔍 Segment query:', JSON.stringify(query, null, 2));

    // Execute query — return selected fields for the preview list
    const customers = await Customer.find(query)
      .select('name email phone city channel totalSpend totalOrders lastOrderDate')
      .sort({ totalSpend: -1 })
      .lean();

    console.log(`✅ Found ${customers.length} matching customers`);

    return res.json({
      success: true,
      count: customers.length,
      customers,
    });
  } catch (error) {
    console.error('❌ Segment preview error:', error.message);
    return res.status(500).json({
      error: 'Failed to query customer segment',
      details: error.message,
    });
  }
});

module.exports = router;
