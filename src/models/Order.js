const mongoose = require('mongoose');

/**
 * Order Schema
 * Represents a customer purchase order with line items and status tracking.
 */
const orderSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'Customer ID is required'],
    index: true,
  },
  amount: {
    type: Number,
    required: [true, 'Order amount is required'],
    min: 0,
  },
  items: [
    {
      name: { type: String, required: true },
      price: { type: Number, required: true, min: 0 },
    },
  ],
  status: {
    type: String,
    enum: ['completed', 'returned', 'pending'],
    default: 'completed',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Order', orderSchema);
