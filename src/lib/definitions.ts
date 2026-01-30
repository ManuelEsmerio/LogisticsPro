import { z } from "zod";

export const orderSchema = z.object({
  id: z.string().optional(),
  orderNumber: z.string().min(1, "El número de pedido es obligatorio"),
  address: z.string().min(1, "La dirección es obligatoria"),
  recipientName: z.string().min(1, "El nombre del destinatario es obligatorio"),
  product: z.string().optional(),
  contactNumber: z.string().min(1, "El número de contacto es obligatorio"),
  deliveryType: z.enum(["delivery", "pickup"]),
  paymentStatus: z.enum(["paid", "due", "assigned"]),
  priority: z.enum(["Alta", "Media", "Baja"]),
  deliveryTimeType: z.enum(["timeslot", "exact_time"]),
  deliveryTimeSlot: z.enum(["morning", "afternoon", "evening"]).nullable(),
  deliveryTime: z.date().nullable(),
}).refine(data => {
    if (data.deliveryType === 'delivery' && data.deliveryTimeType === 'timeslot') {
      return data.deliveryTimeSlot !== null;
    }
    return true;
}, {
    message: "La franja horaria es obligatoria",
    path: ["deliveryTimeSlot"],
})
.refine(data => {
    if (data.deliveryType === 'delivery' && data.deliveryTimeType === 'exact_time') {
        return data.deliveryTime !== null;
    }
    return true;
}, {
    message: "La hora exacta es obligatoria",
    path: ["deliveryTime"],
});

export type OrderFormValues = z.infer<typeof orderSchema>;

export type Order = {
  id: string;
  orderNumber: string;
  address: string;
  recipientName: string;
  product: string;
  contactNumber: string;
  deliveryType: "delivery" | "pickup";
  paymentStatus: "paid" | "due" | "assigned";
  deliveryTimeSlot: 'morning' | 'afternoon' | 'evening' | null;
  deliveryTime: Date | null;
  latitude: number;
  longitude: number;
  createdAt: Date;
  priority: 'Alta' | 'Media' | 'Baja';
};

export type Waypoint = Pick<Order, 'orderNumber' | 'address' | 'latitude' | 'longitude'>;

export type ClusteredRoute = {
  timeSlot: 'morning' | 'afternoon' | 'evening';
  orders: Order[];
  distance: number;
  duration: string;
};

export const staffMemberSchema = z.object({
  id: z.string().optional(),
  firstName: z.string().min(1, "El nombre es obligatorio"),
  lastName: z.string().min(1, "El apellido es obligatorio"),
  email: z.string().email({ message: "Debe ser un correo electrónico válido." }),
  phone: z.string().min(1, "El teléfono es obligatorio."),
  role: z.enum(['Repartidor', 'Administrador', 'Florista Senior', 'Gerente']),
  vehicleType: z.enum(['ninguno', 'furgoneta', 'moto', 'bici']),
  licenseNumber: z.string().optional(),
  shift: z.string().min(1, "El horario es obligatorio"),
  avatarUrl: z.string().optional(),
});


export type StaffMemberFormValues = z.infer<typeof staffMemberSchema>;

export type StaffMember = {
  id: string;
  name: string;
  email: string;
  role: 'Repartidor' | 'Administrador' | 'Florista Senior' | 'Gerente';
  status: 'Activo' | 'Inactivo';
  shift: string;
  avatarUrl: string;
  createdAt: Date;
  phone: string;
  vehicleType: 'ninguno' | 'furgoneta' | 'moto' | 'bici';
  licenseNumber?: string;
};
