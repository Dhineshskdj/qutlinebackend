import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User, { IUser } from "../models/User"; // Assuming IUser is exported from User model

// Auth middleware function
export const auth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from header
    const token = req.header("Authorization")?.replace("Bearer ", "");

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
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
      userType: string;
    }; // Ensure JWT_SECRET is set in .env

    // Find user by ID from token payload
    const user = await User.findById(decoded.userId).select("-password"); // Exclude password

    if (!user) {
      // If token is valid but user doesn't exist (e.g., deleted user)
      return res
        .status(401)
        .json({ message: "User not found, authorization denied" });
    }

    // Attach user and token to request object
    req.user = {
      id: user._id as string,
      userType: user.userType,
    };

    next(); // Proceed to the next middleware or route handler
  } catch (error: any) {
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
};

export default auth;
