import { z } from "zod";

export const orderSchema = z.object({
  id: z.string().optional(),
  orderNumber: z.string().min(1, "Order number is required"),
  address: z.string().min(1, "Address is required"),
  recipientName: z.string().min(1, "Recipient name is required"),
  contactNumber: z.string().min(1, "Contact number is required"),
  deliveryType: z.enum(["delivery", "pickup"]),
  paymentStatus: z.enum(["paid", "due"]),
  deliveryTimeType: z.enum(["timeslot", "exact_time"]),
  deliveryTimeSlot: z.enum(["morning", "afternoon", "evening"]).nullable(),
  deliveryTime: z.date().nullable(),
}).refine(data => {
    if (data.deliveryTimeType === 'timeslot') {
      return data.deliveryTimeSlot !== null;
    }
    return true;
}, {
    message: "Time slot is required",
    path: ["deliveryTimeSlot"],
})
.refine(data => {
    if (data.deliveryTimeType === 'exact_time') {
        return data.deliveryTime !== null;
    }
    return true;
}, {
    message: "Exact time is required",
    path: ["deliveryTime"],
});

export type OrderFormValues = z.infer<typeof orderSchema>;

export type Order = {
  id: string;
  orderNumber: string;
  address: string;
  recipientName: string;
  contactNumber: string;
  deliveryType: "delivery" | "pickup";
  paymentStatus: "paid" | "due";
  deliveryTimeSlot: 'morning' | 'afternoon' | 'evening' | null;
  deliveryTime: Date | null;
  latitude: number;
  longitude: number;
  createdAt: Date;
};

export type ClusteredRoute = {
  timeSlot: 'morning' | 'afternoon' | 'evening';
  orders: Pick<Order, 'orderNumber' | 'address' | 'latitude' | 'longitude'>[];
};

export const staffMemberSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone number is required"),
  vehicleId: z.string().min(1, "Vehicle ID is required"),
});

export type StaffMemberFormValues = z.infer<typeof staffMemberSchema>;

export type StaffMember = {
  id: string;
  name: string;
  phone: string;
  vehicleId: string;
  createdAt: Date;
};
