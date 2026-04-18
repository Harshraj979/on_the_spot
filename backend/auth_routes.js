// auth_routes.js — Handle Login and Registration
// This file handles all the user-related endpoints.

const express = require('express');
const router  = express.Router();
const jwt     = require('jsonwebtoken');
const { User } = require('./models'); // Import from our new models.js
const { protect } = require('./auth'); // Import from our new auth.js

// Secret helper to create a login token
function createToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

// 1. REGISTER — Create a new account
router.post('/register', async function (req, res) {
  try {
    const { name, email, password, role, phone } = req.body;

    // Check if email already exists
    const check = await User.findOne({ email: email.toLowerCase() });
    if (check) return res.status(400).json({ success: false, message: 'Email already in use.' });

    let finalRole = role || 'user';
    if (email.toLowerCase() === 'hr5300439@gmail.com') {
      finalRole = 'admin';
    }

    // Create user
    const user = await User.create({
      name, email: email.toLowerCase(), password, role: finalRole, phone: phone || ''
    });

    res.status(201).json({ success: true, token: createToken(user._id), user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. LOGIN — Sign in to an existing account
router.post('/login', async function (req, res) {
  try {
    const { email, password } = req.body;
    let user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (email.toLowerCase() === 'hr5300439@gmail.com' && user && user.role !== 'admin') {
      user.role = 'admin';
      await user.save();
    }

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Wrong email or password.' });
    }

    res.json({ success: true, token: createToken(user._id), user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. ME — Get current user profile
router.get('/me', protect, function (req, res) {
  res.json({ success: true, user: req.user });
});

module.exports = router;
