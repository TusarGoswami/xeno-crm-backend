const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');

/**
 * GET /api/customers
 * Returns all customers, sorted by name.
 * Supports optional query params for basic filtering.
 */
router.get('/', async (req, res) => {
  try {
    const { city, channel, limit } = req.query;
    const query = {};

    if (city) query.city = new RegExp(`^${city}$`, 'i');
    if (channel) query.channel = channel.toLowerCase();

    const customers = await Customer.find(query)
      .sort({ name: 1 })
      .limit(Number(limit) || 100)
      .lean();

    return res.json({
      success: true,
      count: customers.length,
      customers,
    });
  } catch (error) {
    console.error('❌ Fetch customers error:', error.message);
    return res.status(500).json({
      error: 'Failed to fetch customers',
      details: error.message,
    });
  }
});

/**
 * GET /api/customers/:id
 * Returns a single customer by ID.
 */
router.get('/:id', async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id).lean();

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    return res.json({ success: true, customer });
  } catch (error) {
    console.error('❌ Fetch customer error:', error.message);
    return res.status(500).json({
      error: 'Failed to fetch customer',
      details: error.message,
    });
  }
});

module.exports = router;
