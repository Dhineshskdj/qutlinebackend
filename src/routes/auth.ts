import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { Request, Response } from 'express';
import auth from '../middleware/auth'; // Import auth middleware

const router = express.Router();

// User Registration
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, emailOrMobile, password, userType } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ emailOrMobile }, { username }] });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user
    const user = new User({ username, emailOrMobile, password, userType });
    await user.save();

    // Create JWT token
    const token = jwt.sign(
      { userId: user._id, userType },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    res.status(201).json({ token, userId: user._id, userType });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// User Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { emailOrMobile, password } = req.body;

    // Find user by email/mobile
    const user = await User.findOne({ emailOrMobile });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Create JWT token
    const token = jwt.sign(
      { userId: user._id, userType: user.userType },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    // Include username and emailOrMobile in the response
    res.json({
      token,
      userId: user._id,
      userType: user.userType,
      username: user.username, // Added username
      emailOrMobile: user.emailOrMobile // Added emailOrMobile
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add a PUT endpoint to update user profile
router.put('/update', auth, async (req: Request, res: Response) => {
  try {
    const { username, emailOrMobile, password } = req.body;
    const userId = req.user?.id; // Corrected to use 'id'

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const updateData: any = {};

    if (username) {
      updateData.username = username;
    }

    if (emailOrMobile) {
      updateData.emailOrMobile = emailOrMobile;
    }

    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
    });

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      userId: updatedUser._id,
      username: updatedUser.username,
      emailOrMobile: updatedUser.emailOrMobile,
      userType: updatedUser.userType,
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
