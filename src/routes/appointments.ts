import express, { Request, Response } from "express";
import auth from "../middleware/auth";
import Appointment, {
  AppointmentStatus,
  IAppointment,
} from "../models/Appointment";
import Shop from "../models/Shop";
import mongoose from "mongoose";

const router = express.Router();

// Add a new function to calculate live count based on appointments
const calculateLiveCount = async (shopId: string) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1); // Start of tomorrow

    // Count confirmed appointments for today
    const confirmedCount = await Appointment.countDocuments({
      shopId,
      status: AppointmentStatus.CONFIRMED,
      appointmentDate: {
        $gte: today,
        $lt: tomorrow,
      },
    });

    return confirmedCount;
  } catch (error) {
    console.error(`Error calculating live count for shop ${shopId}:`, error);
    return 0; // Return 0 in case of error
  }
};

// Update the shop's liveCount field with the calculated value
const updateShopLiveCount = async (shopId: string) => {
  try {
    const count = await calculateLiveCount(shopId);

    await Shop.findByIdAndUpdate(shopId, {
      liveCount: count,
      updatedAt: new Date(), // Update the timestamp
    });

    return count;
  } catch (error) {
    console.error(`Error updating live count for shop ${shopId}:`, error);
    return null;
  }
};

// @route   POST /api/appointments
// @desc    Create a new appointment
// @access  Private (Customer only)
router.post("/", auth, async (req: Request, res: Response) => {
  try {
    // Only customers can book appointments
    if (!req.user || req.user.userType !== "Customer") {
      return res
        .status(403)
        .json({ msg: "Only customers can book appointments" });
    }

    const {
      shopId,
      customerName,
      customerMobile,
      appointmentDate,
      appointmentTime,
      services,
      totalAmount,
      notes,
    } = req.body;

    // Validate required fields
    if (
      !shopId ||
      !customerName ||
      !customerMobile ||
      !appointmentDate ||
      !appointmentTime ||
      !services ||
      totalAmount === undefined
    ) {
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
    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({ msg: "Shop not found" });
    }

    // Create new appointment
    const newAppointment = new Appointment({
      shopId,
      customerId: req.user.id,
      customerName,
      customerMobile,
      appointmentDate: new Date(appointmentDate),
      appointmentTime,
      services,
      totalAmount,
      status: AppointmentStatus.PENDING,
      notes: notes || "",
    });

    const appointment = await newAppointment.save();

    // Update live count for the shop
    await updateShopLiveCount(shopId);

    res.json(appointment);
  } catch (err) {
    console.error("Error creating appointment:", err);
    res.status(500).send("Server error");
  }
});

// @route   GET /api/appointments/customer
// @desc    Get all appointments for the logged-in customer
// @access  Private (Customer only)
router.get("/customer", auth, async (req: Request, res: Response) => {
  try {
    // Only customers can access their appointments
    if (!req.user || req.user.userType !== "Customer") {
      return res.status(403).json({ msg: "Access denied" });
    }

    const appointments = await Appointment.find({ customerId: req.user.id })
      .sort({ appointmentDate: -1 })
      .populate(
        "shopId",
        "shopName address district subDistrict contactNumber"
      );

    res.json(appointments);
  } catch (err) {
    console.error("Error fetching customer appointments:", err);
    res.status(500).send("Server error");
  }
});

// @route   GET /api/appointments/shop/:shopId
// @desc    Get all appointments for a shop
// @access  Private (Shop owner only)
router.get("/shop/:shopId", auth, async (req: Request, res: Response) => {
  try {
    // Only shop owners can access shop appointments
    if (!req.user || req.user.userType !== "Shop Owner") {
      return res.status(403).json({ msg: "Access denied" });
    }

    const { shopId } = req.params;

    // Verify shop exists and belongs to this owner
    const shop = await Shop.findOne({
      _id: shopId,
      ownerId: req.user.id,
    });

    if (!shop) {
      return res
        .status(404)
        .json({ msg: "Shop not found or you do not have permission" });
    }

    const appointments = await Appointment.find({ shopId }).sort({
      appointmentDate: 1,
      appointmentTime: 1,
    });

    res.json(appointments);
  } catch (err) {
    console.error("Error fetching shop appointments:", err);
    res.status(500).send("Server error");
  }
});

// @route   GET /api/appointments/:id
// @desc    Get a specific appointment by ID
// @access  Private (Appointment's customer or shop owner)
router.get("/:id", auth, async (req: Request, res: Response) => {
  try {
    const appointment = await Appointment.findById(req.params.id).populate(
      "shopId",
      "shopName address district subDistrict contactNumber services"
    );

    if (!appointment) {
      return res.status(404).json({ msg: "Appointment not found" });
    }

    // Ensure req.user exists
    if (!req.user) {
      return res.status(403).json({ msg: "Access denied" });
    }

    // Check if user has permission to view this appointment
    if (
      (req.user.userType === "Customer" &&
        appointment.customerId.toString() !== req.user.id) ||
      req.user.userType === "Shop Owner"
    ) {
      // If shop owner, verify they own this shop
      const shop = await Shop.findOne({
        _id: appointment.shopId,
        ownerId: req.user.id,
      });

      if (!shop) {
        return res.status(403).json({ msg: "Access denied" });
      }
    }

    res.json(appointment);
  } catch (err) {
    console.error("Error fetching appointment:", err);
    res.status(500).send("Server error");
  }
});

// @route   PUT /api/appointments/:id/status
// @desc    Update appointment status (for shop owners)
// @access  Private (Shop owner only)
router.put("/:id/status", auth, async (req: Request, res: Response) => {
  try {
    // Only shop owners can update appointment status
    if (!req.user || req.user.userType !== "Shop Owner") {
      return res.status(403).json({ msg: "Access denied" });
    }

    const { status } = req.body;

    if (
      !Object.values(AppointmentStatus).includes(status as AppointmentStatus)
    ) {
      return res.status(400).json({ msg: "Invalid status value" });
    }

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ msg: "Appointment not found" });
    }

    // Verify shop owner owns this shop
    const shop = await Shop.findOne({
      _id: appointment.shopId,
      ownerId: req.user.id,
    });

    if (!shop) {
      return res.status(403).json({ msg: "Access denied" });
    }

    // Update status
    appointment.status = status as AppointmentStatus;
    await appointment.save();

    // Update live count for the shop
    await updateShopLiveCount(appointment.shopId.toString());

    res.json(appointment);
  } catch (err) {
    console.error("Error updating appointment status:", err);
    res.status(500).send("Server error");
  }
});

// @route   DELETE /api/appointments/:id
// @desc    Cancel an appointment (customer can cancel, shop owner can delete)
// @access  Private (Customer or Shop owner)
router.delete("/:id", auth, async (req: Request, res: Response) => {
  try {
    console.log("Attempting to delete appointment:", req.params.id);
    console.log("User ID:", req.user?.id);
    console.log("User Type:", req.user?.userType);

    const appointment = await Appointment.findById(req.params.id);

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
      await appointment.deleteOne();

      // Update live count for the shop
      await updateShopLiveCount(appointment.shopId.toString());

      return res.json({ msg: "Appointment deleted" });
    } else if (req.user.userType === "Shop Owner") {
      // Shop owner can delete any appointment for their shop
      const shop = await Shop.findOne({
        _id: appointment.shopId,
        ownerId: req.user.id,
      });

      if (!shop) {
        console.log("Shop owner does not own this shop");
        return res.status(403).json({ msg: "Access denied - not your shop" });
      }

      // Shop owners can fully delete the appointment
      console.log("Deleting appointment as shop owner");
      await appointment.deleteOne();

      // Update live count for the shop
      await updateShopLiveCount(appointment.shopId.toString());

      return res.json({ msg: "Appointment deleted" });
    }

    // If user type is neither customer nor shop owner
    console.log("Unrecognized user type:", req.user.userType);
    return res.status(403).json({ msg: "Access denied - invalid user type" });
  } catch (err) {
    console.error("Error deleting appointment:", err);
    res.status(500).send("Server error");
  }
});

// @route   GET /api/appointments/update-shop-counts
// @desc    Update live counts for all shops (admin only)
// @access  Private (Admin only)
router.get("/update-shop-counts", auth, async (req: Request, res: Response) => {
  try {
    // Only admin should be able to trigger this
    if (!req.user || req.user.userType !== "Admin") {
      return res.status(403).json({ msg: "Access denied - Admin only" });
    }

    // Get all shops
    const shops = await Shop.find({}).select("_id");

    // Update live count for each shop
    const results = await Promise.all(
      shops.map(async (shop) => {
        // Add proper type assertion to fix the 'unknown' type error
        const shopId = (shop._id as mongoose.Types.ObjectId).toString();
        const count = await updateShopLiveCount(shopId);
        return { shopId: shop._id, newCount: count };
      })
    );

    res.json({
      message: "All shop counts updated successfully",
      updated: results.length,
      results,
    });
  } catch (err) {
    console.error("Error updating all shop counts:", err);
    res.status(500).send("Server error");
  }
});

// Fix for module.exports compatibility
module.exports = router;
export default router;
