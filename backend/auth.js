
const jwt = require('jsonwebtoken');
const { User } = require('./models');

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

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find the user who owns this token
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found.' });
    }

    req.user = user;
    next();

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
