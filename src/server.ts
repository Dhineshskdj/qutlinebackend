import express, { Express, Request, Response } from "express"; // Added Request, Response
import http from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose"; // Import mongoose for shutdown
import connectDB from "./config/db";
import shopRoutes from "./routes/shops";
import authRoutes from "./routes/auth"; // Import auth routes
import Shop, { IShop } from "./models/Shop"; // Import the Mongoose Shop model AND IShop interface

// Load environment variables from .env file
dotenv.config();

const app: Express = express();
const server = http.createServer(app);

// Configure CORS options - Allow frontend origin
const corsOptions = {
  origin: process.env.CLIENT_ORIGIN || "http://localhost:3000", // Default to common React dev port
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"], // Added PATCH, OPTIONS
  allowedHeaders: ["Content-Type", "Authorization"], // Allow Authorization header
};

// Setup Socket.IO server with CORS
const io = new SocketIOServer(server, {
  cors: corsOptions,
});

// Connect to MongoDB Database
connectDB();

// --- Middleware ---
app.use(cors(corsOptions)); // Enable CORS for Express routes
app.use(express.json()); // Middleware to parse JSON request bodies

// --- API Routes ---
app.use("/api/auth", authRoutes); // Mount authentication routes
app.use("/api/shops", shopRoutes); // Mount shop-related routes (includes user update now)
app.use("/api/appointments", require("./routes/appointments")); // Mount appointment routes

// --- Basic Root Route ---
app.get("/", (req: Request, res: Response) => {
  // Added types
  res.send("QutLine API is alive and running!");
});

// --- Socket.IO Event Handling ---
io.on("connection", (socket: Socket) => {
  console.log(`[Socket.IO] User connected: ${socket.id}`);

  // Handle client disconnection
  socket.on("disconnect", (reason: string) => {
    console.log(
      `[Socket.IO] User disconnected: ${socket.id}. Reason: ${reason}`
    );
  });

  // Handle connection errors
  socket.on("connect_error", (err) => {
    console.error(
      `[Socket.IO] Connection error for socket ${socket.id}: ${err.message}`
    );
  });
});

// --- Server Startup ---
const PORT = process.env.PORT || 5001; // Use port from .env
server.listen(PORT, () =>
  console.log(`Server listening actively on http://localhost:${PORT}`)
);

// --- Graceful Shutdown Handling (Existing logic retained) ---
const signals = ["SIGINT", "SIGTERM", "SIGQUIT"];
signals.forEach((signal) => {
  process.on(signal, async () => {
    console.log(`\nReceived ${signal}. Shutting down gracefully...`);
    io.close(() => {
      console.log("[Socket.IO] Server closed.");
    });
    // Use mongoose.connection.close()
    await mongoose.connection.close(false); // false = don't force close immediately
    console.log("[MongoDB] Connection closed.");
    server.close(() => {
      console.log("[HTTP] Server closed.");
      process.exit(0); // Exit cleanly
    });

    // Force shutdown if graceful shutdown takes too long
    setTimeout(() => {
      console.error("Graceful shutdown timed out. Forcing exit.");
      process.exit(1);
    }, 10000); // 10 seconds timeout
  });
});

// --- Global Error Handling (Existing logic retained) ---
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception thrown:", error);
  process.exit(1);
});
