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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose")); // Import Schema
const Shop_1 = __importDefault(require("../models/Shop"));
const auth_1 = __importDefault(require("../middleware/auth")); // Import auth middleware
const User_1 = __importDefault(require("../models/User")); // Import User model for population
const router = express_1.default.Router();
// Apply auth middleware to routes that require authentication (POST, PUT, PATCH, DELETE)
// GET requests can remain public based on the middleware logic
// @route   POST api/shops/register
// @desc    Register a new shop
// @access  Protected
router.post("/register", auth_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    // Destructure required fields and new fields from request body
    const { businessType, shopName, serviceCategory, serviceName, customServiceCategory, ownerName, contactNumber, address, state, district, subDistrict, customDistrict, customSubDistrict, services, coverImage, } = req.body;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id; // Get user ID from authenticated request
    if (!userId) {
        // This check might be redundant if auth middleware strictly enforces token presence for POST
        return res.status(401).json({ msg: "User not authenticated" });
    }
    try {
        // Basic validation for required fields based on business type
        if (!businessType) {
            return res.status(400).json({ msg: "Business type is required" });
        }
        // Common required fields for both Shop and Service
        if (!ownerName ||
            !contactNumber ||
            !address ||
            !state ||
            !district ||
            !subDistrict) {
            return res
                .status(400)
                .json({ msg: "Please provide all required details" });
        }
        // Business type specific validation
        if (businessType === "Shop" && !shopName) {
            return res.status(400).json({ msg: "Shop name is required" });
        }
        if (businessType === "Service") {
            if (!serviceCategory) {
                return res.status(400).json({ msg: "Service category is required" });
            }
            if (serviceCategory === "Other" && !customServiceCategory) {
                return res
                    .status(400)
                    .json({
                    msg: "Custom service category is required when selecting 'Other'",
                });
            }
            if (!serviceName) {
                return res.status(400).json({ msg: "Service name is required" });
            }
        }
        // Log the services being received to debug
        console.log("Services received:", services);
        // Create shop object manually with all fields explicitly defined
        const shopData = {
            businessType: businessType || "Shop", // Default to Shop if not specified
            shopName: businessType === "Service" ? serviceName || "" : shopName,
            serviceCategory: businessType === "Service"
                ? serviceCategory === "Other"
                    ? customServiceCategory
                    : serviceCategory
                : undefined,
            serviceName: businessType === "Service" ? serviceName : undefined,
            customServiceCategory: businessType === "Service" && serviceCategory === "Other"
                ? customServiceCategory
                : undefined,
            ownerName,
            contactNumber,
            address,
            state,
            district,
            subDistrict,
            customDistrict,
            customSubDistrict,
            ownerId: userId
                ? new mongoose_1.default.Types.ObjectId(userId.toString())
                : undefined,
            services: Array.isArray(services) ? services : [],
            coverImage: coverImage || "", // Ensure coverImage is never undefined or null
            liveCount: 0, // Explicitly set default liveCount
        };
        console.log("Shop data prepared:", shopData);
        // Create new Shop instance with our prepared data
        const newShop = new Shop_1.default(shopData);
        console.log("Shop to save:", Object.assign(Object.assign({}, newShop.toObject()), { services: newShop.services }));
        const savedShop = yield newShop.save();
        res.status(201).json(savedShop);
    }
    catch (err) {
        console.error("Shop registration error:", err.message);
        if (err.name === "ValidationError") {
            return res.status(400).json({ msg: `Validation Error: ${err.message}` });
        }
        res.status(500).json({ msg: "Server error during shop registration" });
    }
}));
// @route   PUT api/shops/update/:id
// @desc    Update shop details
// @access  Protected
router.put("/update/:id", auth_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { id } = req.params;
    const updateData = req.body;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!userId) {
        return res.status(401).json({ msg: "User not authenticated" });
    }
    try {
        // First get the shop with its current __v value and other fields
        const shopToUpdate = yield Shop_1.default.findById(id);
        if (!shopToUpdate) {
            return res.status(404).json({ msg: "Shop not found" });
        }
        // Create a direct update object to avoid validation issues
        // Use $set to only update fields that are provided
        const updateObject = { $set: {} };
        // Set all provided fields in updateData
        Object.keys(updateData).forEach((key) => {
            // Special handling for liveCount to accept zero values
            if (key === "liveCount" && updateData[key] !== undefined) {
                updateObject.$set[key] = updateData[key];
            }
            // Handle other fields normally
            else if (updateData[key] !== undefined) {
                updateObject.$set[key] = updateData[key];
            }
        });
        // Ensure liveCount is properly handled (set to current value if not provided)
        if (updateObject.$set.liveCount === undefined) {
            updateObject.$set.liveCount = shopToUpdate.liveCount || 0;
        }
        console.log("Update object:", updateObject);
        // Use findOneAndUpdate with bypass document validation
        const updatedShop = yield Shop_1.default.findOneAndUpdate({ _id: id }, updateObject, {
            new: true, // Return updated document
            runValidators: false, // Skip validation
            upsert: false, // Don't create if not exists
            timestamps: true, // Update timestamps
            validateBeforeSave: false, // Skip validation before save
        });
        if (!updatedShop) {
            return res.status(404).json({ msg: "Failed to update shop" });
        }
        res.json(updatedShop);
    }
    catch (err) {
        console.error("Shop update error:", err.message);
        if (err.name === "CastError") {
            return res.status(400).json({ msg: "Invalid Shop ID format" });
        }
        if (err.name === "ValidationError") {
            return res.status(400).json({ msg: `Validation Error: ${err.message}` });
        }
        res.status(500).json({ msg: "Server error during shop update" });
    }
}));
// @route   GET api/shops
// @desc    Get shops with filtering and static options
// @access  Public (Auth middleware allows GET without token)
router.get("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { state, district, subDistrict, search } = req.query;
    const filterQuery = {};
    if (state)
        filterQuery.state = state;
    if (district)
        filterQuery.district = district;
    if (subDistrict)
        filterQuery.subDistrict = subDistrict;
    if (search) {
        // Ensure search string is properly handled for text index
        filterQuery.$text = { $search: search };
    }
    // Static filter options
    const statesList = [
        "Andhra Pradesh",
        "Arunachal Pradesh",
        "Assam",
        "Bihar",
        "Chhattisgarh",
        "Goa",
        "Gujarat",
        "Haryana",
        "Himachal Pradesh",
        "Jharkhand",
        "Karnataka",
        "Kerala",
        "Madhya Pradesh",
        "Maharashtra",
        "Manipur",
        "Meghalaya",
        "Mizoram",
        "Nagaland",
        "Odisha",
        "Punjab",
        "Rajasthan",
        "Sikkim",
        "Tamil Nadu",
        "Telangana",
        "Tripura",
        "Uttar Pradesh",
        "Uttarakhand",
        "West Bengal",
        "Andaman and Nicobar Islands",
        "Chandigarh",
        "Dadra and Nagar Haveli and Daman and Diu",
        "Delhi",
        "Jammu and Kashmir",
        "Ladakh",
        "Lakshadweep",
        "Puducherry",
    ];
    const districtsList = [
        "Ariyalur",
        "Chengalpattu",
        "Chennai",
        "Coimbatore",
        "Cuddalore",
        "Dharmapuri",
        "Dindigul",
        "Erode",
        "Kallakurichi",
        "Kanchipuram",
        "Kanyakumari",
        "Karur",
        "Krishnagiri",
        "Madurai",
        "Mayiladuthurai",
        "Nagapattinam",
        "Namakkal",
        "Nilgiris",
        "Perambalur",
        "Pudukkottai",
        "Ramanathapuram",
        "Ranipet",
        "Salem",
        "Sivaganga",
        "Tenkasi",
        "Thanjavur",
        "Theni",
        "Thiruvallur",
        "Thiruvarur",
        "Thoothukudi",
        "Tiruchirappalli",
        "Tirunelveli",
        "Tirupathur",
        "Tiruppur",
        "Tiruvannamalai",
        "Vellore",
        "Viluppuram",
        "Virudhunagar",
        "Puducherry",
        "Karaikal",
        "Mahe",
        "Yanam",
    ];
    const subDistrictsMap = {
        Ariyalur: ["Ariyalur", "Udayarpalayam", "Sendurai"],
        Chengalpattu: ["Chengalpattu", "Madurantakam", "Tambaram", "Thiruporur"],
        Chennai: [
            "Fort-Tondiarpet",
            "Perambur-Purasawalkam",
            "Egmore-Nungambakkam",
            "Mambalam-Guindy",
            "Mylapore-Triplicane",
        ],
        Coimbatore: [
            "Coimbatore North",
            "Coimbatore South",
            "Mettupalayam",
            "Pollachi",
            "Sulur",
        ],
        Cuddalore: ["Cuddalore", "Chidambaram", "Panruti", "Virudhachalam"],
        Dharmapuri: ["Dharmapuri", "Harur", "Palacode", "Pappireddipatti"],
        Dindigul: ["Dindigul", "Palani", "Oddanchatram", "Nilakottai"],
        Erode: ["Erode", "Bhavani", "Gobichettipalayam", "Sathyamangalam"],
        Kallakurichi: ["Kallakurichi", "Chinnasalem", "Sankarapuram", "Ulundurpet"],
        Kanchipuram: ["Kanchipuram", "Sriperumbudur", "Uthiramerur"],
        Kanyakumari: ["Agastheeswaram", "Thovalai", "Vilavancode", "Kalkulam"],
        Karur: ["Karur", "Kulithalai", "Krishnarayapuram"],
        Krishnagiri: ["Krishnagiri", "Hosur", "Denkanikottai", "Uthangarai"],
        Madurai: [
            "Madurai North",
            "Madurai South",
            "Melur",
            "Thirumangalam",
            "Usilampatti",
        ],
        Mayiladuthurai: ["Mayiladuthurai", "Sirkazhi", "Tharangambadi", "Kuthalam"],
        Nagapattinam: ["Nagapattinam", "Kilvelur", "Vedaranyam"],
        Namakkal: ["Namakkal", "Rasipuram", "Tiruchengode", "Paramathi-Velur"],
        Nilgiris: ["Udhagamandalam", "Coonoor", "Gudalur", "Kotagiri"],
        Perambalur: ["Perambalur", "Kunnam", "Veppanthattai"],
        Pudukkottai: ["Pudukkottai", "Aranthangi", "Alangudi", "Iluppur"],
        Ramanathapuram: [
            "Ramanathapuram",
            "Paramakudi",
            "Rameswaram",
            "Tiruvadanai",
        ],
        Ranipet: ["Ranipet", "Arcot", "Walajapet", "Sholinghur"],
        Salem: ["Salem", "Attur", "Mettur", "Omalur"],
        Sivaganga: ["Sivaganga", "Karaikudi", "Manamadurai", "Tirupathur"],
        Tenkasi: ["Tenkasi", "Sankarankovil", "Kadayanallur", "Shencottai"],
        Thanjavur: ["Thanjavur", "Kumbakonam", "Pattukkottai", "Orathanadu"],
        Theni: ["Theni", "Periyakulam", "Bodinayakanur", "Uthamapalayam"],
        Thiruvallur: ["Thiruvallur", "Ponneri", "Gummidipoondi", "Ambattur"],
        Thiruvarur: ["Thiruvarur", "Mannargudi", "Nannilam", "Kodavasal"],
        Thoothukudi: ["Thoothukudi", "Tiruchendur", "Kovilpatti", "Ettayapuram"],
        Tiruchirappalli: ["Tiruchirappalli", "Srirangam", "Lalgudi", "Musiri"],
        Tirunelveli: [
            "Tirunelveli",
            "Palayamkottai",
            "Ambasamudram",
            "Sankarankovil",
        ],
        Tirupathur: ["Tirupathur", "Vaniyambadi", "Ambur", "Natrampalli"],
        Tiruppur: ["Tiruppur", "Avinashi", "Udumalaipettai", "Dharapuram"],
        Tiruvannamalai: ["Tiruvannamalai", "Arani", "Chengam", "Polur"],
        Vellore: ["Vellore", "Gudiyatham", "Katpadi", "Vaniyambadi"],
        Viluppuram: ["Viluppuram", "Tindivanam", "Gingee", "Kallakurichi"],
        Virudhunagar: ["Virudhunagar", "Sivakasi", "Aruppukkottai", "Rajapalayam"],
        Puducherry: ["Puducherry", "Oulgaret", "Villianur", "Bahour"],
        Karaikal: ["Karaikal", "Thirunallar", "Nedungadu", "Kottucherry"],
        Mahe: ["Mahe"],
        Yanam: ["Yanam"],
    };
    try {
        const shops = yield Shop_1.default.find(filterQuery)
            .sort(search ? { score: { $meta: "textScore" } } : { createdAt: -1 })
            .select("-__v") // Exclude __v
            .exec();
        res.json({
            shops,
            filterOptions: {
                states: statesList,
                districts: districtsList,
                subDistricts: subDistrictsMap,
            },
        });
    }
    catch (err) {
        console.error("Error fetching shops:", err.message);
        // Handle potential errors, like invalid text search syntax or fallback
        if (err.name === "MongoError" && search) {
            console.error("Text search failed, attempting fetch without search term.");
            try {
                delete filterQuery.$text;
                const fallbackShops = yield Shop_1.default.find(filterQuery)
                    .sort({ createdAt: -1 })
                    .select("-__v")
                    .exec();
                res.json({
                    shops: fallbackShops,
                    filterOptions: {
                        states: statesList,
                        districts: districtsList,
                        subDistricts: subDistrictsMap,
                    },
                });
            }
            catch (fallbackErr) {
                console.error("Fallback shop fetch error:", fallbackErr.message);
                res.status(500).json({ msg: "Server error while fetching shops" });
            }
        }
        else {
            res.status(500).json({ msg: "Server error while fetching shops" });
        }
    }
}));
// Completely separate the owner shops endpoint
// @route   GET api/shops/my-shops
// @desc    Get shops owned by the logged-in user
// @access  Protected
router.get("/my-shops", auth_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!userId) {
        console.error("Unauthorized access attempt to /my-shops");
        return res.status(401).json({ msg: "User not authenticated" });
    }
    try {
        console.log(`Fetching shops for owner: ${userId}`);
        const ownedShops = yield Shop_1.default.find({ ownerId: userId })
            .sort({ createdAt: -1 })
            .select("-__v");
        if (!ownedShops || ownedShops.length === 0) {
            console.log(`No shops found for owner: ${userId}`);
            return res.json([]);
        }
        console.log(`Found ${ownedShops.length} shops for owner: ${userId}`);
        res.json(ownedShops);
    }
    catch (err) {
        console.error("Error fetching owned shops:", err);
        res.status(500).json({
            msg: "Failed to load your shops",
            error: process.env.NODE_ENV === "development" ? err.message : undefined,
        });
    }
}));
// @route   GET api/shops/:id
// @desc    Get a single shop by ID
// @access  Protected (owner or admin)
router.get("/:id", auth_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { id } = req.params;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    // Prevent route conflict with /my-shops
    if (id === "my-shops") {
        return res.status(400).json({ msg: "Invalid shop ID" });
    }
    if (!userId) {
        return res.status(401).json({ msg: "User not authenticated" });
    }
    try {
        // Validate ID format first
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ msg: "Invalid shop ID format" });
        }
        const shop = yield Shop_1.default.findById(id).populate("ownerId", "username");
        if (!shop) {
            return res.status(404).json({ msg: "Shop not found" });
        }
        // Optional: Add authorization check if needed
        // if (shop.ownerId.toString() !== userId.toString() && req.user.userType !== 'Admin') {
        //     return res.status(403).json({ msg: 'Not authorized to view this shop' });
        // }
        res.json(shop);
    }
    catch (err) {
        console.error("Error fetching shop:", err.message);
        if (err.name === "CastError") {
            return res.status(400).json({ msg: "Invalid Shop ID format" });
        }
        res.status(500).json({ msg: "Server error while fetching shop" });
    }
}));
// Add User Profile Update Route
// @route   PUT api/user/update
// @desc    Update logged-in user's profile details
// @access  Protected
router.put("/user/update", auth_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { username, emailOrMobile, password } = req.body;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!userId) {
        return res.status(401).json({ msg: "User not authenticated" });
    }
    try {
        const user = yield User_1.default.findById(userId);
        if (!user) {
            return res.status(404).json({ msg: "User not found" });
        }
        // Update fields if provided
        if (username)
            user.username = username;
        if (emailOrMobile)
            user.emailOrMobile = emailOrMobile;
        if (password) {
            // Re-hash password if changed
            user.password = password; // The pre-save hook in User model will handle hashing
        }
        // Add validation for uniqueness if username or email/mobile changed
        if (username || emailOrMobile) {
            const existingUser = yield User_1.default.findOne({
                $or: [{ username }, { emailOrMobile }],
                _id: { $ne: userId }, // Exclude the current user from the check
            });
            if (existingUser) {
                return res
                    .status(400)
                    .json({ msg: "Username or Email/Mobile already taken" });
            }
        }
        const updatedUser = yield user.save();
        // Create a response object excluding the password
        const _b = updatedUser.toObject(), { password: removedPassword } = _b, userResponse = __rest(_b, ["password"]);
        res.json(userResponse);
    }
    catch (err) {
        console.error("User update error:", err.message);
        if (err.name === "ValidationError") {
            return res.status(400).json({ msg: `Validation Error: ${err.message}` });
        }
        res.status(500).json({ msg: "Server error during user update" });
    }
}));
exports.default = router;
