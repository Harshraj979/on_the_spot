// auth.js — Handles checking if a user is logged in
// This is used to "protect" certain pages so only logged-in users can see them.

const jwt  = require('jsonwebtoken');
const { User } = require('./models'); // Import User from our new flat models.js

// This function checks for a "Token" in the request headers
// If the token is valid, it lets the user through.
async function protect(req, res, next) {
  try {
    let token = null;

    // Check if the frontend sent an Authorization header: "Bearer <token>"
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Please log in first.' });
    }

    // Verify the token (makes sure it hasn't been tampered with)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find the user who owns this token
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found.' });
    }

    // Attach the user to the request object so routes can use it (e.g., req.user.name)
    req.user = user;
    next(); // Move to the next step

  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid or expired login session.' });
  }
}

// This function checks if the user has a specific role (e.g., "admin")
function checkRole() {
  const allowedRoles = Array.from(arguments);

  return function (req, res, next) {
    if (!req.user || allowedRoles.indexOf(req.user.role) === -1) {
      return res.status(403).json({ success: false, message: 'You do not have permission for this.' });
    }
    next();
  };
}

module.exports = { protect, checkRole };
