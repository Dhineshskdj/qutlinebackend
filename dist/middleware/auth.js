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
exports.auth = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User")); // Assuming IUser is exported from User model
// Auth middleware function
const auth = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // Get token from header
        const token = (_a = req.header("Authorization")) === null || _a === void 0 ? void 0 : _a.replace("Bearer ", "");
        if (!token) {
            // Allow unauthenticated access for GET requests, but protect others
            if (req.method === "GET") {
                return next(); // Allow GET requests without token
            }
            return res
                .status(401)
                .json({ message: "No token, authorization denied" });
        }
        // Verify token
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET); // Ensure JWT_SECRET is set in .env
        // Find user by ID from token payload
        const user = yield User_1.default.findById(decoded.userId).select("-password"); // Exclude password
        if (!user) {
            // If token is valid but user doesn't exist (e.g., deleted user)
            return res
                .status(401)
                .json({ message: "User not found, authorization denied" });
        }
        // Attach user and token to request object
        req.user = {
            id: user._id,
            userType: user.userType,
        };
        next(); // Proceed to the next middleware or route handler
    }
    catch (error) {
        console.error("Auth middleware error:", error.message);
        // Handle specific JWT errors (e.g., expired token)
        if (error.name === "JsonWebTokenError") {
            return res
                .status(401)
                .json({ message: "Invalid token, authorization denied" });
        }
        if (error.name === "TokenExpiredError") {
            return res
                .status(401)
                .json({ message: "Token expired, authorization denied" });
        }
        // Generic error for other issues
        res.status(401).json({ message: "Authentication failed" });
    }
});
exports.auth = auth;
exports.default = exports.auth;
