"use client";

import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";

import { Checkbox } from "@/components/ui/checkbox";
import type { StaffMember } from "@/lib/definitions";
import { StaffDataTableRowActions } from "./row-actions";

export const columns: ColumnDef<StaffMember>[] = [
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
    accessorKey: "name",
    header: "Nombre",
  },
  {
    accessorKey: "createdAt",
    header: "Fecha de Creación",
    cell: ({ row }) => format(new Date(row.getValue("createdAt")), "PP"),
  },
  {
    id: "actions",
    cell: ({ row }) => <StaffDataTableRowActions row={row} />,
  },
];
