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
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const ShopSchema = new mongoose_1.Schema({
    businessType: {
        type: String,
        enum: ["Shop", "Service"],
        default: "Shop",
        required: true,
    },
    shopName: { type: String, required: true, trim: true },
    serviceCategory: { type: String, required: false, trim: true }, // Added for services
    serviceName: { type: String, required: false, trim: true }, // Added for services
    customServiceCategory: { type: String, required: false, trim: true }, // Added for custom service category
    ownerName: { type: String, required: true, trim: true },
    contactNumber: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    district: { type: String, required: true, trim: true },
    subDistrict: { type: String, required: true, trim: true },
    customDistrict: { type: String, required: false, trim: true },
    customSubDistrict: { type: String, required: false, trim: true },
    liveCount: {
        type: Number,
        default: 0,
        required: true,
        // Add custom validator to allow zero values
        validate: {
            validator: function (v) {
                return v !== undefined && v !== null;
            },
            message: "Live Count is required",
        },
    },
    coverImage: { type: String, required: false, default: "" },
    services: [
        {
            name: { type: String, required: true, trim: true },
            price: { type: Number, required: true },
        },
    ],
    ownerId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    versionKey: false,
});
// Create a text index for searching by shop name
ShopSchema.index({ shopName: "text" });
// Create compound index for filtering
ShopSchema.index({ district: 1, subDistrict: 1 });
exports.default = mongoose_1.default.model("Shop", ShopSchema);
