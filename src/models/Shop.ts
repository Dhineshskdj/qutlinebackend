import mongoose, { Document, Schema } from "mongoose";

// Interface for populated user data
export interface PopulatedUser {
  _id: Schema.Types.ObjectId;
  username: string;
  userType: string;
}

export interface IShop extends Document {
  businessType: "Shop" | "Service"; // Added to distinguish between shop and service
  shopName: string;
  serviceCategory?: string; // Added for services
  serviceName?: string; // Added for services
  customServiceCategory?: string; // Added for custom service category
  ownerName: string;
  contactNumber: string;
  address: string;
  state: string;
  district: string;
  subDistrict: string;
  customDistrict?: string;
  customSubDistrict?: string;
  liveCount: number;
  coverImage?: string;
  services: Array<{
    name: string;
    price: number;
  }>;
  ownerId: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ShopSchema: Schema = new Schema(
  {
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
        validator: function (v: number) {
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
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    versionKey: false,
  }
);

// Create a text index for searching by shop name
ShopSchema.index({ shopName: "text" });
// Create compound index for filtering
ShopSchema.index({ district: 1, subDistrict: 1 });

export default mongoose.model<IShop>("Shop", ShopSchema);
