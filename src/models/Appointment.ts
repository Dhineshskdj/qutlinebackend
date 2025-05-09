import mongoose, { Document, Schema } from "mongoose";

// Define the appointment status enum
export enum AppointmentStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

// Define the interface for the Appointment document
export interface IAppointment extends Document {
  shopId: Schema.Types.ObjectId;
  customerId: Schema.Types.ObjectId;
  customerName: string;
  customerMobile: string;
  appointmentDate: Date;
  appointmentTime: string;
  services: Array<{
    name: string;
    price: number;
  }>;
  totalAmount: number;
  status: AppointmentStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Create the Appointment schema
const AppointmentSchema: Schema = new Schema(
  {
    shopId: {
      type: Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    customerMobile: {
      type: String,
      required: true,
      trim: true,
      match: /^\d{10}$/, // Validate 10-digit phone numbers
    },
    appointmentDate: {
      type: Date,
      required: true,
    },
    appointmentTime: {
      type: String,
      required: true,
      trim: true,
    },
    services: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        price: {
          type: Number,
          required: true,
        },
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(AppointmentStatus),
      default: AppointmentStatus.PENDING,
      required: true,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Create indices for common queries
AppointmentSchema.index({ appointmentDate: 1 });
AppointmentSchema.index({ status: 1 });
AppointmentSchema.index({ customerId: 1, status: 1 });
AppointmentSchema.index({ shopId: 1, status: 1 });

export default mongoose.model<IAppointment>("Appointment", AppointmentSchema);
