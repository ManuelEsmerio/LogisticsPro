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
  return <Badge variant={variant} className="capitalize">{type}</Badge>;
};

const PaymentStatusCell = ({ row }: { row: any }) => {
  const status: Order['paymentStatus'] = row.getValue("paymentStatus");
  return (
    <div className="flex items-center space-x-2">
      <span className={cn(
        "h-2 w-2 rounded-full",
        status === "paid" ? "bg-green-500" : "bg-yellow-500"
      )} />
      <span className="capitalize">{status}</span>
    </div>
  );
};

const DeliveryTimeCell = ({ row }: { row: any }) => {
  const timeSlot: Order['deliveryTimeSlot'] = row.getValue("deliveryTimeSlot");
  const exactTime: Order['deliveryTime'] = row.original.deliveryTime;
  const [formattedDate, setFormattedDate] = useState("");

  useEffect(() => {
    if (exactTime) {
      setFormattedDate(format(new Date(exactTime), "PPp"));
    }
  }, [exactTime]);

  if (timeSlot) {
    return <span className="capitalize">{timeSlot}</span>;
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
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "orderNumber",
    header: "Order #",
  },
  {
    accessorKey: "recipientName",
    header: "Recipient",
  },
  {
    accessorKey: "address",
    header: "Address",
    cell: ({ row }) => <div className="max-w-[200px] truncate">{row.getValue("address")}</div>
  },
  {
    accessorKey: "deliveryType",
    header: "Type",
    cell: DeliveryTypeCell
  },
  {
    accessorKey: "paymentStatus",
    header: "Payment",
    cell: PaymentStatusCell
  },
  {
    accessorKey: "deliveryTimeSlot",
    header: "Delivery Time",
    cell: DeliveryTimeCell
  },
  {
    accessorKey: "createdAt",
    header: "Created At",
    cell: ({ row }) => format(new Date(row.getValue("createdAt")), "PP"),
  },
  {
    id: "actions",
    cell: ({ row }) => <DataTableRowActions row={row} />,
  },
];
