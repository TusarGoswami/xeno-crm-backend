/**
 * Seed Data Script
 * Generates 100 realistic Indian customers and 2-3 orders each.
 * Run with: node src/seed/seedData.js
 *
 * Make sure MONGODB_URI is set in your .env file before running.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Customer = require('../models/Customer');
const Order = require('../models/Order');

// ─── Indian Names Pool ──────────────────────────────────────────────
const firstNames = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Reyansh', 'Sai', 'Arnav',
  'Dhruv', 'Kabir', 'Ananya', 'Diya', 'Myra', 'Aadhya', 'Isha', 'Saanvi',
  'Anika', 'Riya', 'Priya', 'Neha', 'Rohan', 'Karan', 'Rahul', 'Amit',
  'Suresh', 'Vikram', 'Pooja', 'Meera', 'Nisha', 'Kavya', 'Ishaan', 'Dev',
  'Yash', 'Raj', 'Manish', 'Sneha', 'Tanvi', 'Shreya', 'Kriti', 'Sakshi',
  'Harsh', 'Nikhil', 'Deepak', 'Gaurav', 'Siddharth', 'Tanya', 'Anjali',
  'Ritika', 'Simran', 'Divya',
];

const lastNames = [
  'Sharma', 'Verma', 'Gupta', 'Patel', 'Singh', 'Kumar', 'Reddy', 'Joshi',
  'Mehta', 'Shah', 'Nair', 'Iyer', 'Rao', 'Das', 'Mukherjee', 'Banerjee',
  'Chopra', 'Malhotra', 'Kapoor', 'Bhatia', 'Agarwal', 'Mishra', 'Pandey',
  'Tiwari', 'Deshmukh', 'Patil', 'Kulkarni', 'Chauhan', 'Thakur', 'Saxena',
];

// ─── Indian Cities ──────────────────────────────────────────────────
const cities = [
  'Mumbai', 'Delhi', 'Bangalore', 'Chennai',
  'Hyderabad', 'Pune', 'Kolkata', 'Jaipur',
];

// ─── Product Items Pool ─────────────────────────────────────────────
const products = [
  { name: 'Wireless Earbuds', price: 1299 },
  { name: 'Cotton Kurta', price: 899 },
  { name: 'Leather Wallet', price: 599 },
  { name: 'Running Shoes', price: 2499 },
  { name: 'Smartphone Case', price: 349 },
  { name: 'Organic Green Tea (100g)', price: 450 },
  { name: 'Stainless Steel Water Bottle', price: 699 },
  { name: 'Bluetooth Speaker', price: 1899 },
  { name: 'Yoga Mat', price: 799 },
  { name: 'Sunglasses', price: 1199 },
  { name: 'Backpack', price: 1499 },
  { name: 'Face Wash Combo', price: 549 },
  { name: 'Protein Powder (1kg)', price: 1899 },
  { name: 'Cotton Bedsheet Set', price: 1299 },
  { name: 'Kitchen Knife Set', price: 999 },
  { name: 'Scented Candle Set', price: 649 },
  { name: 'Hair Dryer', price: 1599 },
  { name: 'Notebook Diary', price: 249 },
  { name: 'USB-C Hub Adapter', price: 1799 },
  { name: 'Ethnic Saree', price: 2999 },
];

// ─── Utility Helpers ────────────────────────────────────────────────

/** Random integer between min and max (inclusive) */
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Pick a random element from an array */
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Generate an Indian phone number */
function generatePhone() {
  const prefixes = ['98', '99', '97', '96', '95', '94', '93', '91', '90', '88', '87', '86', '85'];
  return `+91${pickRandom(prefixes)}${String(randInt(10000000, 99999999))}`;
}

/** Generate a date between N and M days ago */
function daysAgo(minDays, maxDays) {
  const days = randInt(minDays, maxDays);
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

// ─── Tags Pool ──────────────────────────────────────────────────────
const tagOptions = [
  'loyal', 'new', 'vip', 'at-risk', 'bargain-hunter', 'frequent-buyer',
  'seasonal', 'premium', 'deal-seeker', 'referral',
];

function generateTags() {
  const count = randInt(1, 3);
  const tags = new Set();
  while (tags.size < count) {
    tags.add(pickRandom(tagOptions));
  }
  return [...tags];
}

// ─── Main Seed Function ─────────────────────────────────────────────

async function seed() {
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    console.log('🧹 Clearing existing customers and orders...');
    await Customer.deleteMany({});
    await Order.deleteMany({});

    const customers = [];
    const allOrders = [];

    console.log('👥 Generating 100 customers with orders...\n');

    for (let i = 0; i < 100; i++) {
      const firstName = pickRandom(firstNames);
      const lastName = pickRandom(lastNames);
      const name = `${firstName} ${lastName}`;
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randInt(1, 999)}@gmail.com`;
      const phone = generatePhone();
      const city = pickRandom(cities);

      // Channel distribution: 50% whatsapp, 30% sms, 20% email
      const channelRoll = Math.random();
      const channel = channelRoll < 0.5 ? 'whatsapp' : channelRoll < 0.8 ? 'sms' : 'email';

      const totalOrders = randInt(1, 20);
      const lastOrderDate = daysAgo(7, 120);
      const tags = generateTags();

      // Generate 2-3 orders for this customer
      const orderCount = randInt(2, 3);
      let totalSpend = 0;
      const customerOrders = [];

      for (let j = 0; j < orderCount; j++) {
        // Pick 1-3 random products for each order
        const itemCount = randInt(1, 3);
        const items = [];
        for (let k = 0; k < itemCount; k++) {
          items.push(pickRandom(products));
        }
        const amount = items.reduce((sum, item) => sum + item.price, 0);
        totalSpend += amount;

        customerOrders.push({
          amount,
          items,
          status: pickRandom(['completed', 'completed', 'completed', 'returned', 'pending']),
          createdAt: daysAgo(7, 180),
        });
      }

      // Ensure totalSpend is within ₹500-₹15000 range
      totalSpend = Math.max(500, Math.min(15000, totalSpend));

      const customer = {
        name,
        email,
        phone,
        channel,
        city,
        tags,
        totalSpend,
        totalOrders,
        lastOrderDate,
        createdAt: daysAgo(30, 365),
      };

      customers.push({ customer, orders: customerOrders });
    }

    // Insert customers first, then orders with correct customerIds
    for (const { customer, orders } of customers) {
      const savedCustomer = await Customer.create(customer);

      for (const order of orders) {
        allOrders.push({
          ...order,
          customerId: savedCustomer._id,
        });
      }
    }

    // Bulk insert all orders
    await Order.insertMany(allOrders);

    // Print summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  🌱 SEED DATA COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  👥 Customers created: ${customers.length}`);
    console.log(`  📦 Orders created:    ${allOrders.length}`);
    console.log('');

    // Show city distribution
    const cityDist = {};
    customers.forEach(({ customer }) => {
      cityDist[customer.city] = (cityDist[customer.city] || 0) + 1;
    });
    console.log('  📍 City Distribution:');
    Object.entries(cityDist)
      .sort((a, b) => b[1] - a[1])
      .forEach(([city, count]) => {
        console.log(`     ${city}: ${count}`);
      });

    // Show channel distribution
    const channelDist = {};
    customers.forEach(({ customer }) => {
      channelDist[customer.channel] = (channelDist[customer.channel] || 0) + 1;
    });
    console.log('');
    console.log('  📱 Channel Distribution:');
    Object.entries(channelDist).forEach(([ch, count]) => {
      console.log(`     ${ch}: ${count}`);
    });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Seed failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

seed();
