import jwt from 'jsonwebtoken';

// Make sure to use the same secret key as in your userController
const JWT_SECRET = 'your-super-secret-key-for-now';

export const protect = (req, res, next) => {
  let token;

  // Check if the authorization header exists and starts with 'Bearer'
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from the 'Bearer [token]' header
      token = req.headers.authorization.split(' ')[1];

      // Verify the token is valid
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Attach the user's ID from the token to the request object
      // so the next function (the controller) can use it.
      req.user = { id: decoded.id };

      // Move on to the next function in the chain
      next();
    } catch (error) {
      console.error('Token verification failed:', error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};
