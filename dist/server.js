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
const express_1 = __importDefault(require("express")); // Added Request, Response
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose")); // Import mongoose for shutdown
const db_1 = __importDefault(require("./config/db"));
const shops_1 = __importDefault(require("./routes/shops"));
const auth_1 = __importDefault(require("./routes/auth")); // Import auth routes
// Load environment variables from .env file
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
// Configure CORS options - Allow frontend origin
const corsOptions = {
    origin: process.env.CLIENT_ORIGIN || "http://localhost:3000", // Default to common React dev port
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"], // Added PATCH, OPTIONS
    allowedHeaders: ["Content-Type", "Authorization"], // Allow Authorization header
};
// Setup Socket.IO server with CORS
const io = new socket_io_1.Server(server, {
    cors: corsOptions,
});
// Connect to MongoDB Database
(0, db_1.default)();
// --- Middleware ---
app.use((0, cors_1.default)(corsOptions)); // Enable CORS for Express routes
app.use(express_1.default.json()); // Middleware to parse JSON request bodies
// --- API Routes ---
app.use("/api/auth", auth_1.default); // Mount authentication routes
app.use("/api/shops", shops_1.default); // Mount shop-related routes (includes user update now)
app.use("/api/appointments", require("./routes/appointments")); // Mount appointment routes
// --- Basic Root Route ---
app.get("/", (req, res) => {
    // Added types
    res.send("QutLine API is alive and running!");
});
// --- Socket.IO Event Handling ---
io.on("connection", (socket) => {
    console.log(`[Socket.IO] User connected: ${socket.id}`);
    // Handle client disconnection
    socket.on("disconnect", (reason) => {
        console.log(`[Socket.IO] User disconnected: ${socket.id}. Reason: ${reason}`);
    });
    // Handle connection errors
    socket.on("connect_error", (err) => {
        console.error(`[Socket.IO] Connection error for socket ${socket.id}: ${err.message}`);
    });
});
// --- Server Startup ---
const PORT = process.env.PORT || 5001; // Use port from .env
server.listen(PORT, () => console.log(`Server listening actively on http://localhost:${PORT}`));
// --- Graceful Shutdown Handling (Existing logic retained) ---
const signals = ["SIGINT", "SIGTERM", "SIGQUIT"];
signals.forEach((signal) => {
    process.on(signal, () => __awaiter(void 0, void 0, void 0, function* () {
        console.log(`\nReceived ${signal}. Shutting down gracefully...`);
        io.close(() => {
            console.log("[Socket.IO] Server closed.");
        });
        // Use mongoose.connection.close()
        yield mongoose_1.default.connection.close(false); // false = don't force close immediately
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
    }));
});
// --- Global Error Handling (Existing logic retained) ---
process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
});
process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception thrown:", error);
    process.exit(1);
});
