const mongoose = require('mongoose');

/**
 * Customer Schema
 * Represents a CRM customer with contact info, purchase history metrics,
 * and preferred communication channel.
 */
const customerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
  },
  channel: {
    type: String,
    enum: ['whatsapp', 'sms', 'email'],
    default: 'whatsapp',
  },
  city: {
    type: String,
    trim: true,
  },
  tags: {
    type: [String],
    default: [],
  },
  totalSpend: {
    type: Number,
    default: 0,
    min: 0,
  },
  totalOrders: {
    type: Number,
    default: 0,
    min: 0,
  },
  lastOrderDate: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index on fields commonly used in segment filters for fast queries
customerSchema.index({ totalSpend: 1 });
customerSchema.index({ totalOrders: 1 });
customerSchema.index({ lastOrderDate: 1 });
customerSchema.index({ city: 1 });
customerSchema.index({ channel: 1 });

module.exports = mongoose.model('Customer', customerSchema);
