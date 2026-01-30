"use client";

import { ColumnDef, Row } from "@tanstack/react-table";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

import type { Order } from "@/lib/definitions";
import { DataTableRowActions } from "./data-table-row-actions";

const PaymentStatusCell = ({ row }: { row: Row<Order> }) => {
  const status: Order['paymentStatus'] = row.getValue("paymentStatus");
  
  const statusConfig = {
    due: { label: 'Pendiente', className: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-500' },
    assigned: { label: 'Asignado', className: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400' },
    paid: { label: 'Entregado', className: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-500 border border-emerald-200 dark:border-emerald-800' },
  };

  const config = statusConfig[status] || statusConfig.due;

  return (
    <span className={cn('px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider', config.className)}>
      {config.label}
    </span>
  );
};

const PriorityCell = ({ row }: { row: Row<Order> }) => {
  const priority: Order['priority'] = row.getValue("priority");

  if (priority === 'Alta') {
    return (
        <div className="flex items-center gap-1 text-red-600">
            <span className="material-symbols-outlined fill-1 text-base">error</span>
            <span className="text-[10px] font-black uppercase">Alta</span>
        </div>
    );
  }
  if (priority === 'Media') {
    return (
        <div className="flex items-center gap-1 text-slate-500">
            <span className="material-symbols-outlined text-base">remove</span>
            <span className="text-[10px] font-bold uppercase">Media</span>
        </div>
    );
  }
  return (
    <div className="flex items-center gap-1 text-slate-400">
        <span className="material-symbols-outlined text-base">expand_more</span>
        <span className="text-[10px] font-bold uppercase">Baja</span>
    </div>
  );
}

const DeliveryTimeCell = ({ row }: { row: Row<Order> }) => {
  const timeSlot: Order['deliveryTimeSlot'] = row.original.deliveryTimeSlot;
  const exactTime: Order['deliveryTime'] = row.original.deliveryTime;
  const [formattedDate, setFormattedDate] = useState("");

  useEffect(() => {
    if (exactTime) {
      setFormattedDate(format(new Date(exactTime), "PPp"));
    }
  }, [exactTime]);

  if (timeSlot) {
    const timeSlotLabels = {
        morning: '09:00 - 12:00',
        afternoon: '13:00 - 17:00',
        evening: '18:00 - 21:00'
    };
    return <span className="font-medium">{timeSlotLabels[timeSlot]}</span>;
  }
  if (exactTime) {
    return <span className="font-medium">{formattedDate}</span>;
  }
  return <span className="text-muted-foreground">N/A</span>;
};


export const columns: ColumnDef<Order>[] = [
  {
    accessorKey: "orderNumber",
    header: "ID Pedido",
    cell: ({ row }) => <div className="font-mono text-sm font-bold text-primary dark:text-slate-300">{row.getValue("orderNumber")}</div>,
  },
  {
    accessorKey: "recipientName",
    header: "Destinatario",
    cell: ({ row }) => (
        <div className="flex flex-col">
            <span className="font-bold text-sm">{row.getValue("recipientName")}</span>
            <span className="text-xs text-muted-foreground">{row.original.product}</span>
        </div>
    ),
  },
  {
    accessorKey: "address",
    header: "Zona/Distrito",
    cell: ({ row }) => (
        <span className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
            <span className="material-symbols-outlined text-sm">location_on</span>
            {row.getValue("address")}
        </span>
    )
  },
  {
    accessorKey: "deliveryTimeSlot",
    header: "Ventana de Entrega",
    cell: DeliveryTimeCell
  },
  {
    accessorKey: "paymentStatus",
    header: "Estado",
    cell: PaymentStatusCell
  },
  {
    accessorKey: "priority",
    header: "Prioridad",
    cell: PriorityCell,
  },
  {
    id: "actions",
    cell: ({ row }) => <DataTableRowActions row={row} />,
  },
];
