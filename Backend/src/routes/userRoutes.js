import express from 'express';
import { registerUser, loginUser } from '../controller/userController.js';

const router = express.Router();

router.get("/", (req, res) => {
  res.status(200).json({ message: "User API is working!" });
});

// --- User API Endpoints ---

// POST /api/users/register
// Register a new user
router.post('/register', registerUser);

// POST /api/users/login
// Log in an existing user
router.post('/login', loginUser);

export default router;