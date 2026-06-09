const express = require('express');
const router = express.Router();
const { parsePrompt } = require('../services/gemini');

/**
 * POST /api/ai/parse
 * Takes a natural language campaign prompt from the frontend,
 * sends it to Gemini AI, and returns structured segment filters + message.
 */
router.post('/parse', async (req, res) => {
  try {
    const { prompt } = req.body;

    // Validate input
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return res.status(400).json({
        error: 'A non-empty "prompt" string is required',
      });
    }

    console.log(`🤖 Parsing prompt: "${prompt.substring(0, 80)}..."`);

    // Call Gemini to parse the natural language prompt
    const parsed = await parsePrompt(prompt.trim());

    console.log(`✅ Gemini extracted filters:`, JSON.stringify(parsed.segmentFilters));

    return res.json({
      success: true,
      data: parsed,
    });
  } catch (error) {
    console.error('❌ AI parse error:', error.message);
    return res.status(500).json({
      error: 'Failed to parse prompt with AI',
      details: error.message,
    });
  }
});

module.exports = router;
