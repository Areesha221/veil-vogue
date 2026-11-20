import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const optionalProtect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) {
      // Invalid user reference; treat as unauthenticated for optional auth flows
      req.user = null;
    }
    return next();
  } catch (error) {
    // Invalid/expired token should not block guest flows
    req.user = null;
    return next();
  }
};
