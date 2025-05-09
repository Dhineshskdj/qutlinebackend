"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const auth_1 = __importDefault(require("../middleware/auth"));
const Appointment_1 = __importStar(require("../models/Appointment"));
const Shop_1 = __importDefault(require("../models/Shop"));
const router = express_1.default.Router();
// Add a new function to calculate live count based on appointments
const calculateLiveCount = (shopId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of today
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1); // Start of tomorrow
        // Count confirmed appointments for today
        const confirmedCount = yield Appointment_1.default.countDocuments({
            shopId,
            status: Appointment_1.AppointmentStatus.CONFIRMED,
            appointmentDate: {
                $gte: today,
                $lt: tomorrow,
            },
        });
        return confirmedCount;
    }
    catch (error) {
        console.error(`Error calculating live count for shop ${shopId}:`, error);
        return 0; // Return 0 in case of error
    }
});
// Update the shop's liveCount field with the calculated value
const updateShopLiveCount = (shopId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const count = yield calculateLiveCount(shopId);
        yield Shop_1.default.findByIdAndUpdate(shopId, {
            liveCount: count,
            updatedAt: new Date(), // Update the timestamp
        });
        return count;
    }
    catch (error) {
        console.error(`Error updating live count for shop ${shopId}:`, error);
        return null;
    }
});
// @route   POST /api/appointments
// @desc    Create a new appointment
// @access  Private (Customer only)
router.post("/", auth_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Only customers can book appointments
        if (!req.user || req.user.userType !== "Customer") {
            return res
                .status(403)
                .json({ msg: "Only customers can book appointments" });
        }
        const { shopId, customerName, customerMobile, appointmentDate, appointmentTime, services, totalAmount, notes, } = req.body;
        // Validate required fields
        if (!shopId ||
            !customerName ||
            !customerMobile ||
            !appointmentDate ||
            !appointmentTime ||
            !services ||
            totalAmount === undefined) {
            return res
                .status(400)
                .json({ msg: "Please provide all required fields" });
        }
        // Validate mobile number
        if (!/^\d{10}$/.test(customerMobile)) {
            return res
                .status(400)
                .json({ msg: "Please provide a valid 10-digit mobile number" });
        }
        // Check if shop exists
        const shop = yield Shop_1.default.findById(shopId);
        if (!shop) {
            return res.status(404).json({ msg: "Shop not found" });
        }
        // Create new appointment
        const newAppointment = new Appointment_1.default({
            shopId,
            customerId: req.user.id,
            customerName,
            customerMobile,
            appointmentDate: new Date(appointmentDate),
            appointmentTime,
            services,
            totalAmount,
            status: Appointment_1.AppointmentStatus.PENDING,
            notes: notes || "",
        });
        const appointment = yield newAppointment.save();
        // Update live count for the shop
        yield updateShopLiveCount(shopId);
        res.json(appointment);
    }
    catch (err) {
        console.error("Error creating appointment:", err);
        res.status(500).send("Server error");
    }
}));
// @route   GET /api/appointments/customer
// @desc    Get all appointments for the logged-in customer
// @access  Private (Customer only)
router.get("/customer", auth_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Only customers can access their appointments
        if (!req.user || req.user.userType !== "Customer") {
            return res.status(403).json({ msg: "Access denied" });
        }
        const appointments = yield Appointment_1.default.find({ customerId: req.user.id })
            .sort({ appointmentDate: -1 })
            .populate("shopId", "shopName address district subDistrict contactNumber");
        res.json(appointments);
    }
    catch (err) {
        console.error("Error fetching customer appointments:", err);
        res.status(500).send("Server error");
    }
}));
// @route   GET /api/appointments/shop/:shopId
// @desc    Get all appointments for a shop
// @access  Private (Shop owner only)
router.get("/shop/:shopId", auth_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Only shop owners can access shop appointments
        if (!req.user || req.user.userType !== "Shop Owner") {
            return res.status(403).json({ msg: "Access denied" });
        }
        const { shopId } = req.params;
        // Verify shop exists and belongs to this owner
        const shop = yield Shop_1.default.findOne({
            _id: shopId,
            ownerId: req.user.id,
        });
        if (!shop) {
            return res
                .status(404)
                .json({ msg: "Shop not found or you do not have permission" });
        }
        const appointments = yield Appointment_1.default.find({ shopId }).sort({
            appointmentDate: 1,
            appointmentTime: 1,
        });
        res.json(appointments);
    }
    catch (err) {
        console.error("Error fetching shop appointments:", err);
        res.status(500).send("Server error");
    }
}));
// @route   GET /api/appointments/:id
// @desc    Get a specific appointment by ID
// @access  Private (Appointment's customer or shop owner)
router.get("/:id", auth_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const appointment = yield Appointment_1.default.findById(req.params.id).populate("shopId", "shopName address district subDistrict contactNumber services");
        if (!appointment) {
            return res.status(404).json({ msg: "Appointment not found" });
        }
        // Ensure req.user exists
        if (!req.user) {
            return res.status(403).json({ msg: "Access denied" });
        }
        // Check if user has permission to view this appointment
        if ((req.user.userType === "Customer" &&
            appointment.customerId.toString() !== req.user.id) ||
            req.user.userType === "Shop Owner") {
            // If shop owner, verify they own this shop
            const shop = yield Shop_1.default.findOne({
                _id: appointment.shopId,
                ownerId: req.user.id,
            });
            if (!shop) {
                return res.status(403).json({ msg: "Access denied" });
            }
        }
        res.json(appointment);
    }
    catch (err) {
        console.error("Error fetching appointment:", err);
        res.status(500).send("Server error");
    }
}));
// @route   PUT /api/appointments/:id/status
// @desc    Update appointment status (for shop owners)
// @access  Private (Shop owner only)
router.put("/:id/status", auth_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Only shop owners can update appointment status
        if (!req.user || req.user.userType !== "Shop Owner") {
            return res.status(403).json({ msg: "Access denied" });
        }
        const { status } = req.body;
        if (!Object.values(Appointment_1.AppointmentStatus).includes(status)) {
            return res.status(400).json({ msg: "Invalid status value" });
        }
        const appointment = yield Appointment_1.default.findById(req.params.id);
        if (!appointment) {
            return res.status(404).json({ msg: "Appointment not found" });
        }
        // Verify shop owner owns this shop
        const shop = yield Shop_1.default.findOne({
            _id: appointment.shopId,
            ownerId: req.user.id,
        });
        if (!shop) {
            return res.status(403).json({ msg: "Access denied" });
        }
        // Update status
        appointment.status = status;
        yield appointment.save();
        // Update live count for the shop
        yield updateShopLiveCount(appointment.shopId.toString());
        res.json(appointment);
    }
    catch (err) {
        console.error("Error updating appointment status:", err);
        res.status(500).send("Server error");
    }
}));
// @route   DELETE /api/appointments/:id
// @desc    Cancel an appointment (customer can cancel, shop owner can delete)
// @access  Private (Customer or Shop owner)
router.delete("/:id", auth_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        console.log("Attempting to delete appointment:", req.params.id);
        console.log("User ID:", (_a = req.user) === null || _a === void 0 ? void 0 : _a.id);
        console.log("User Type:", (_b = req.user) === null || _b === void 0 ? void 0 : _b.userType);
        const appointment = yield Appointment_1.default.findById(req.params.id);
        if (!appointment) {
            console.log("Appointment not found");
            return res.status(404).json({ msg: "Appointment not found" });
        }
        console.log("Appointment found:", appointment._id);
        console.log("Appointment customerId:", appointment.customerId);
        // Ensure req.user exists
        if (!req.user) {
            console.log("No user in request");
            return res.status(403).json({ msg: "Access denied" });
        }
        // Check permissions
        if (req.user.userType === "Customer") {
            // Customer can only delete their own appointments
            const customerIdStr = appointment.customerId.toString();
            const requestUserIdStr = req.user.id.toString();
            console.log("Comparing IDs:", customerIdStr, requestUserIdStr);
            if (customerIdStr !== requestUserIdStr) {
                console.log("Customer ID mismatch");
                return res
                    .status(403)
                    .json({ msg: "Access denied - not your appointment" });
            }
            // Allow customers to fully delete their appointments
            console.log("Deleting appointment as customer");
            yield appointment.deleteOne();
            // Update live count for the shop
            yield updateShopLiveCount(appointment.shopId.toString());
            return res.json({ msg: "Appointment deleted" });
        }
        else if (req.user.userType === "Shop Owner") {
            // Shop owner can delete any appointment for their shop
            const shop = yield Shop_1.default.findOne({
                _id: appointment.shopId,
                ownerId: req.user.id,
            });
            if (!shop) {
                console.log("Shop owner does not own this shop");
                return res.status(403).json({ msg: "Access denied - not your shop" });
            }
            // Shop owners can fully delete the appointment
            console.log("Deleting appointment as shop owner");
            yield appointment.deleteOne();
            // Update live count for the shop
            yield updateShopLiveCount(appointment.shopId.toString());
            return res.json({ msg: "Appointment deleted" });
        }
        // If user type is neither customer nor shop owner
        console.log("Unrecognized user type:", req.user.userType);
        return res.status(403).json({ msg: "Access denied - invalid user type" });
    }
    catch (err) {
        console.error("Error deleting appointment:", err);
        res.status(500).send("Server error");
    }
}));
// @route   GET /api/appointments/update-shop-counts
// @desc    Update live counts for all shops (admin only)
// @access  Private (Admin only)
router.get("/update-shop-counts", auth_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Only admin should be able to trigger this
        if (!req.user || req.user.userType !== "Admin") {
            return res.status(403).json({ msg: "Access denied - Admin only" });
        }
        // Get all shops
        const shops = yield Shop_1.default.find({}).select("_id");
        // Update live count for each shop
        const results = yield Promise.all(shops.map((shop) => __awaiter(void 0, void 0, void 0, function* () {
            // Add proper type assertion to fix the 'unknown' type error
            const shopId = shop._id.toString();
            const count = yield updateShopLiveCount(shopId);
            return { shopId: shop._id, newCount: count };
        })));
        res.json({
            message: "All shop counts updated successfully",
            updated: results.length,
            results,
        });
    }
    catch (err) {
        console.error("Error updating all shop counts:", err);
        res.status(500).send("Server error");
    }
}));
// Fix for module.exports compatibility
module.exports = router;
exports.default = router;
