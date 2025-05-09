"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const auth_1 = __importDefault(require("../middleware/auth")); // Import auth middleware
const router = express_1.default.Router();
// User Registration
router.post('/register', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { username, emailOrMobile, password, userType } = req.body;
        // Check if user already exists
        const existingUser = yield User_1.default.findOne({ $or: [{ emailOrMobile }, { username }] });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }
        // Create new user
        const user = new User_1.default({ username, emailOrMobile, password, userType });
        yield user.save();
        // Create JWT token
        const token = jsonwebtoken_1.default.sign({ userId: user._id, userType }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.status(201).json({ token, userId: user._id, userType });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
}));
// User Login
router.post('/login', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { emailOrMobile, password } = req.body;
        // Find user by email/mobile
        const user = yield User_1.default.findOne({ emailOrMobile });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        // Check password
        const isMatch = yield user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        // Create JWT token
        const token = jsonwebtoken_1.default.sign({ userId: user._id, userType: user.userType }, process.env.JWT_SECRET, { expiresIn: '1h' });
        // Include username and emailOrMobile in the response
        res.json({
            token,
            userId: user._id,
            userType: user.userType,
            username: user.username, // Added username
            emailOrMobile: user.emailOrMobile // Added emailOrMobile
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
}));
// Add a PUT endpoint to update user profile
router.put('/update', auth_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { username, emailOrMobile, password } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id; // Corrected to use 'id'
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        const updateData = {};
        if (username) {
            updateData.username = username;
        }
        if (emailOrMobile) {
            updateData.emailOrMobile = emailOrMobile;
        }
        if (password) {
            const salt = yield bcrypt_1.default.genSalt(10);
            updateData.password = yield bcrypt_1.default.hash(password, salt);
        }
        const updatedUser = yield User_1.default.findByIdAndUpdate(userId, updateData, {
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
    }
    catch (error) {
        console.error('Error updating user profile:', error);
        res.status(500).json({ message: 'Server error' });
    }
}));
exports.default = router;
