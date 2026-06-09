const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Gemini AI Service
 * Uses Google's Gemini 1.5 Flash model to parse natural language campaign
 * descriptions into structured segment filters and draft messages.
 */

// Initialize the Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

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
    "channel": null or "whatsapp" or "sms" or "email" (preferred communication channel)
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
- If the channel is mentioned (WhatsApp, SMS, email), set it; otherwise leave null
- Always respond with valid JSON only — no extra text`;

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
    console.error('❌ Gemini parsing error:', error.message);
    throw new Error(`Failed to parse campaign prompt: ${error.message}`);
  }
}

module.exports = { parsePrompt };
