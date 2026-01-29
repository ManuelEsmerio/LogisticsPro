"use client";

import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { useState, useEffect } from "react";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import type { Order } from "@/lib/definitions";
import { DataTableRowActions } from "./data-table-row-actions";
import { cn } from "@/lib/utils";

const DeliveryTypeCell = ({ row }: { row: any }) => {
  const type: Order['deliveryType'] = row.getValue("deliveryType");
  const variant = type === "delivery" ? "default" : "secondary";
  const label = type === 'delivery' ? 'envío' : 'recogida';
  return <Badge variant={variant} className="capitalize">{label}</Badge>;
};

const PaymentStatusCell = ({ row }: { row: any }) => {
  const status: Order['paymentStatus'] = row.getValue("paymentStatus");
  const label = status === 'paid' ? 'pagado' : 'pendiente';
  return (
    <div className="flex items-center space-x-2">
      <span className={cn(
        "h-2 w-2 rounded-full",
        status === "paid" ? "bg-green-500" : "bg-yellow-500"
      )} />
      <span className="capitalize">{label}</span>
    </div>
  );
};

const DeliveryTimeCell = ({ row }: { row: any }) => {
  const timeSlot: Order['deliveryTimeSlot'] = row.getValue("deliveryTimeSlot");
  const exactTime: Order['deliveryTime'] = row.original.deliveryTime;
  const [formattedDate, setFormattedDate] = useState("");

  useEffect(() => {
    if (exactTime) {
      // Use client-side rendering to format date and avoid hydration mismatch
      setFormattedDate(format(new Date(exactTime), "PPp"));
    }
  }, [exactTime]);

  if (timeSlot) {
    const timeSlotLabels = {
        morning: 'Mañana',
        afternoon: 'Tarde',
        evening: 'Noche'
    };
    return <span className="capitalize">{timeSlotLabels[timeSlot]}</span>;
  }
  if (exactTime) {
    return <span>{formattedDate}</span>;
  }
  return <span className="text-muted-foreground">N/A</span>;
};


export const columns: ColumnDef<Order>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Seleccionar todo"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Seleccionar fila"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "orderNumber",
    header: "Pedido #",
  },
  {
    accessorKey: "recipientName",
    header: "Destinatario",
  },
  {
    accessorKey: "address",
    header: "Dirección",
    cell: ({ row }) => <div className="max-w-[200px] truncate">{row.getValue("address")}</div>
  },
  {
    accessorKey: "deliveryType",
    header: "Tipo",
    cell: DeliveryTypeCell
  },
  {
    accessorKey: "paymentStatus",
    header: "Pago",
    cell: PaymentStatusCell
  },
  {
    accessorKey: "deliveryTimeSlot",
    header: "Hora de Entrega",
    cell: DeliveryTimeCell
  },
  {
    accessorKey: "createdAt",
    header: "Fecha de Creación",
    cell: ({ row }) => format(new Date(row.getValue("createdAt")), "PP"),
  },
  {
    id: "actions",
    cell: ({ row }) => <DataTableRowActions row={row} />,
  },
];
