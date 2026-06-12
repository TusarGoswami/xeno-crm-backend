const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Gemini AI Service
 * Uses Google's Gemini 1.5 Flash model to parse natural language campaign
 * descriptions into structured segment filters and draft messages.
 */

// Initialize the Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

/**
 * System prompt that instructs Gemini to return structured JSON.
 * We enforce strict output format so the CRM can reliably parse the response.
 */
const SYSTEM_PROMPT = `You are an AI assistant for a marketing CRM platform called "Campaign Copilot".

Your job is to parse a marketer's natural language campaign description and extract:
1. Customer segment filters for querying a database
2. A campaign name
3. A personalized message draft for the target audience
4. A brief reasoning explaining the segment

You MUST respond with ONLY a valid JSON object (no markdown, no code fences, no explanation outside the JSON).

The JSON must have this exact structure:
{
  "segmentFilters": {
    "minTotalSpend": null or number (minimum total spending in ₹),
    "maxTotalSpend": null or number (maximum total spending in ₹),
    "minTotalOrders": null or number (minimum number of orders),
    "daysSinceLastOrder": null or number (customers who haven't ordered in this many days),
    "city": null or string (city name, capitalize first letter e.g. "Mumbai"),
    "channel": null or "whatsapp" or "sms" or "email" or "rcs" (preferred communication channel)
  },
  "campaignName": "A short, catchy campaign name",
  "suggestedMessage": "A personalized, friendly marketing message for this audience. Use ₹ for currency. Keep it under 160 characters for SMS compatibility. Make it engaging and include a clear call-to-action.",
  "reasoning": "One sentence explaining which customers this targets and why."
}

Rules:
- Set a filter to null if the marketer didn't mention it
- For "daysSinceLastOrder", extract the number of days of inactivity mentioned
- For spend filters, extract the ₹ amount mentioned
- The suggestedMessage should feel personal, warm, and include the brand tone
- If the channel is mentioned (WhatsApp, SMS, email, RCS), set it; otherwise leave null
- Always respond with valid JSON only — no extra text`;

/**
 * Local rule-based parser as a fallback when Gemini API is rate-limited or quota is exceeded.
 */
function fallbackParse(prompt) {
  const segmentFilters = {
    minTotalSpend: null,
    maxTotalSpend: null,
    minTotalOrders: null,
    daysSinceLastOrder: null,
    city: null,
    channel: null
  };

  const lowerPrompt = prompt.toLowerCase();

  // Spend filters (e.g. "spent over ₹1500", "spend > 1500")
  const spendOverMatch = prompt.match(/(?:spent over|spend >|spend over|spend more than)\s*(?:₹|rs\.?|)?\s*(\d+)/i);
  if (spendOverMatch) {
    segmentFilters.minTotalSpend = parseInt(spendOverMatch[1], 10);
  }
  const spendUnderMatch = prompt.match(/(?:spent under|spend <|spent less than)\s*(?:₹|rs\.?|)?\s*(\d+)/i);
  if (spendUnderMatch) {
    segmentFilters.maxTotalSpend = parseInt(spendUnderMatch[1], 10);
  }

  // Days since last order (e.g. "haven't bought in 60 days", "inactive for 60 days")
  const daysMatch = prompt.match(/(?:haven't bought in|no order in|inactive for|last|within)\s*(\d+)\s*(?:days|day)/i);
  if (daysMatch) {
    segmentFilters.daysSinceLastOrder = parseInt(daysMatch[1], 10);
  } else {
    // simpler match for any number of days
    const simpleDaysMatch = prompt.match(/(\d+)\s*days?/i);
    if (simpleDaysMatch && !spendOverMatch && !spendUnderMatch) {
      segmentFilters.daysSinceLastOrder = parseInt(simpleDaysMatch[1], 10);
    }
  }

  // Orders count (e.g. "at least 3 orders", "orders > 3")
  const ordersMatch = prompt.match(/(?:min|at least|more than|orders >|orders >=)\s*(\d+)\s*(?:orders|order|purchases)/i);
  if (ordersMatch) {
    segmentFilters.minTotalOrders = parseInt(ordersMatch[1], 10);
  }

  // Channel preferred
  if (lowerPrompt.includes('whatsapp')) {
    segmentFilters.channel = 'whatsapp';
  } else if (lowerPrompt.includes('sms')) {
    segmentFilters.channel = 'sms';
  } else if (lowerPrompt.includes('email')) {
    segmentFilters.channel = 'email';
  } else if (lowerPrompt.includes('rcs')) {
    segmentFilters.channel = 'rcs';
  }

  // City (matches standard seeded Indian cities)
  const cities = ['Mumbai', 'Delhi', 'Pune', 'Kolkata', 'Bangalore', 'Chennai', 'Jaipur', 'Hyderabad'];
  for (const city of cities) {
    if (lowerPrompt.includes(city.toLowerCase())) {
      segmentFilters.city = city;
      break;
    }
  }

  // Generate a catchy campaign name
  let campaignName = 'Custom Campaign';
  if (segmentFilters.daysSinceLastOrder) {
    campaignName = `Win-back Inactive ${segmentFilters.daysSinceLastOrder} Days`;
  } else if (segmentFilters.minTotalSpend) {
    campaignName = `High Spenders (>₹${segmentFilters.minTotalSpend})`;
  }

  // Suggested message draft
  let suggestedMessage = 'Hello! We missed you. Check out our latest collection and get a special discount on your next order!';
  if (segmentFilters.channel === 'whatsapp') {
    suggestedMessage = 'Hey! We noticed you haven\'t visited us lately. Here is a special 15% off coupon code: WINBACK15 just for you! 🌟';
  } else if (segmentFilters.channel === 'sms') {
    suggestedMessage = 'Hey! We miss you. Use code WINBACK15 for 15% off your next order at Campaign Copilot. Shop now!';
  } else if (segmentFilters.channel === 'email') {
    suggestedMessage = 'Hi there, We noticed it has been a while since your last purchase. We would love to welcome you back with a special 15% discount. Use code WINBACK15 at checkout!';
  } else if (segmentFilters.channel === 'rcs') {
    suggestedMessage = 'Hey! We noticed it\'s been a while. Tap to check out our new arrivals and enjoy a special 15% discount code: WINBACK15! 📱✨';
  }

  return {
    segmentFilters,
    campaignName,
    suggestedMessage,
    reasoning: 'Parsed via Local rule-based parser (Gemini API fallback due to rate limits).'
  };
}

/**
 * Parse a natural language campaign prompt using Gemini AI.
 * @param {string} prompt - The marketer's natural language description
 * @returns {Object} Parsed campaign data with segmentFilters, campaignName, suggestedMessage, reasoning
 */
async function parsePrompt(prompt) {
  try {
    const result = await model.generateContent([
      SYSTEM_PROMPT,
      `\nMarketer's request: "${prompt}"`,
    ]);

    const response = result.response;
    const text = response.text();

    // Clean the response — strip markdown code fences if Gemini adds them
    let cleaned = text.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3);
    }
    cleaned = cleaned.trim();

    // Parse the JSON response
    const parsed = JSON.parse(cleaned);

    // Validate required fields exist
    if (!parsed.segmentFilters || !parsed.campaignName || !parsed.suggestedMessage) {
      throw new Error('Gemini response missing required fields');
    }

    return parsed;
  } catch (error) {
    console.warn('⚠️ Gemini API failed (using local fallback parser):', error.message);
    // Fall back to regex parsing so the application flow doesn't break
    return fallbackParse(prompt);
  }
}

module.exports = { parsePrompt };
