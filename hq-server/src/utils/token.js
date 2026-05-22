const jwt = require('jsonwebtoken');

/**
 * Sign a JWT token for a user
 * @param {Object} user - Mongoose User document
 * @returns {string} signed JWT token
 */
const signToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      clinicId: user.clinicId,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

module.exports = { signToken };
