const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const Order = require('../models/Order');

/**
 * GET /api/customers
 * Returns all customers, sorted by name.
 * Supports optional query params for basic filtering.
 */
router.get('/', async (req, res) => {
  try {
    const { city, channel, limit, search } = req.query;
    const query = {};

    if (city) query.city = new RegExp(`^${city}$`, 'i');
    if (channel) query.channel = channel.toLowerCase();
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { phone: new RegExp(search, 'i') },
      ];
    }

    const customers = await Customer.find(query)
      .sort({ name: 1 })
      .limit(Number(limit) || 200)
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
 * GET /api/customers/stats
 * Returns aggregate statistics for the dashboard.
 */
router.get('/stats', async (req, res) => {
  try {
    const totalCustomers = await Customer.countDocuments();
    const totalOrders = await Order.countDocuments();

    // City distribution
    const cityDist = await Customer.aggregate([
      { $group: { _id: '$city', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Channel distribution
    const channelDist = await Customer.aggregate([
      { $group: { _id: '$channel', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Spend stats
    const spendStats = await Customer.aggregate([
      {
        $group: {
          _id: null,
          avgSpend: { $avg: '$totalSpend' },
          totalRevenue: { $sum: '$totalSpend' },
          maxSpend: { $max: '$totalSpend' },
        },
      },
    ]);

    return res.json({
      success: true,
      stats: {
        totalCustomers,
        totalOrders,
        cityDistribution: cityDist.map((c) => ({ city: c._id, count: c.count })),
        channelDistribution: channelDist.map((c) => ({ channel: c._id, count: c.count })),
        avgSpend: Math.round(spendStats[0]?.avgSpend || 0),
        totalRevenue: spendStats[0]?.totalRevenue || 0,
        maxSpend: spendStats[0]?.maxSpend || 0,
      },
    });
  } catch (error) {
    console.error('❌ Fetch stats error:', error.message);
    return res.status(500).json({
      error: 'Failed to fetch customer stats',
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

    // Fetch their orders
    const orders = await Order.find({ customerId: customer._id })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, customer, orders });
  } catch (error) {
    console.error('❌ Fetch customer error:', error.message);
    return res.status(500).json({
      error: 'Failed to fetch customer',
      details: error.message,
    });
  }
});

/**
 * POST /api/customers
 * Creates a new customer. Supports both single and bulk ingestion.
 * Body: { customer: {...} } or { customers: [{...}, ...] }
 */
router.post('/', async (req, res) => {
  try {
    // Support bulk ingestion
    if (req.body.customers && Array.isArray(req.body.customers)) {
      const created = await Customer.insertMany(req.body.customers, {
        ordered: false, // continue on duplicate errors
      });
      console.log(`👥 Bulk ingested ${created.length} customers`);
      return res.status(201).json({
        success: true,
        count: created.length,
        customers: created,
      });
    }

    // Single customer creation
    const data = req.body.customer || req.body;
    const { name, email, phone } = data;

    if (!name || !email || !phone) {
      return res.status(400).json({
        error: 'Missing required fields: name, email, phone',
      });
    }

    const customer = await Customer.create(data);
    console.log(`👤 Customer created: ${customer.name}`);

    return res.status(201).json({
      success: true,
      customer,
    });
  } catch (error) {
    if (error.name === 'MongoBulkWriteError' || error.name === 'BulkWriteError' || error.writeErrors) {
      const insertedCount = error.result?.nInserted || error.insertedDocs?.length || 0;
      console.log(`👥 Bulk ingested ${insertedCount} customers with some duplicates skipped`);
      return res.status(201).json({
        success: true,
        count: insertedCount,
        customers: error.insertedDocs || [],
        warning: 'Some duplicate records were skipped',
        writeErrorsCount: error.writeErrors?.length || 0,
      });
    }
    console.error('❌ Create customer error:', error.message);
    return res.status(500).json({
      error: 'Failed to create customer',
      details: error.message,
    });
  }
});

/**
 * POST /api/customers/:id/orders
 * Creates a new order for a customer and updates their aggregate fields.
 */
router.post('/:id/orders', async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const { amount, items, status } = req.body;
    if (!amount || !items || items.length === 0) {
      return res.status(400).json({
        error: 'Missing required fields: amount, items (non-empty array)',
      });
    }

    // Create the order
    const order = await Order.create({
      customerId: customer._id,
      amount,
      items,
      status: status || 'completed',
    });

    // Update customer aggregate fields atomically
    await Customer.findByIdAndUpdate(customer._id, {
      $inc: { totalSpend: amount, totalOrders: 1 },
      $set: { lastOrderDate: new Date() },
    });

    console.log(`📦 Order created for ${customer.name}: ₹${amount}`);

    return res.status(201).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error('❌ Create order error:', error.message);
    return res.status(500).json({
      error: 'Failed to create order',
      details: error.message,
    });
  }
});

module.exports = router;
