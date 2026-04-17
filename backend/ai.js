// ai.js — AI helper and chat!
// This file uses Google Gemini (free) to answer questions and give advice.

const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { protect } = require('./auth'); // Use our new auth.js

// 1. SETUP — This part connects to Google's AI
let model = null;
function getAI() {
  if (model) return model;
  const key = process.env.GEMINI_API_KEY;

  // IMPORTANT: Only return the model if we have a valid key
  if (!key || key === '' || key.includes('your_gemini_api_key')) {
    console.log('⚠️ AI Key missing or placeholder used in .env');
    return null;
  }

  try {
    const genAI = new GoogleGenerativeAI(key);
    // Use gemini-flash-latest which is common for free tier usage
    model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    return model;
  } catch (err) {
    console.error('❌ Failed to initialize Gemini model:', err);
    return null;
  }
}

// 2. LOGIC — Ask AI for a dispute suggestion
async function getAISuggestion(text, type) {
  try {
    const ai = getAI();
    if (!ai) return 'AI not configured.';
    const prompt = `You are an insurance advisor.\nDispute Type: ${type}\nDetails: ${text}\nGive a 3-step recommendation under 150 words.`;
    const result = await ai.generateContent(prompt);
    return result.response.text();
  } catch (err) {
    console.error('❌ AI Suggestion Error:', err.message);
    return 'Could not generate suggestion at this time.';
  }
}

// 3. LOGIC — General AI Chat
async function chatWithAI(message, context) {
  try {
    const ai = getAI();
    if (!ai) return 'AI helper is not configured. Please add your GEMINI_API_KEY to the .env file.';

    const prompt = `You are a helpful assistant for "On The Spot".\nContext: ${context}\nUser: ${message}`;
    const result = await ai.generateContent(prompt);
    return result.response.text();
  } catch (err) {
    console.error('❌ AI Chat Error:', err.message);
    return "I'm sorry, I'm having trouble connecting to my AI brain right now.";
  }
}

// 4. ROUTE — The URL the frontend calls to chat
router.post('/chat', protect, async function (req, res) {
  try {
    const reply = await chatWithAI(req.body.message, req.body.context || '');
    res.json({ success: true, reply });
  } catch (err) {
    res.status(500).json({ success: false, message: 'AI error: ' + err.message });
  }
});

// 5. ROUTE — Check if AI is ready
router.get('/health', function (req, res) {
  const ready = !!getAI();
  res.json({
    success: true,
    aiReady: ready,
    message: ready ? 'AI is ready!' : 'Add GEMINI_API_KEY to .env to use AI features.'
  });
});

module.exports = { router, getAISuggestion, chatWithAI };
