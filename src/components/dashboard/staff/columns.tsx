"use client";

import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";

import type { StaffMember } from "@/lib/definitions";
import { StaffDataTableRowActions } from "./row-actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const roleColors: Record<StaffMember['role'], string> = {
    'Repartidor': 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400',
    'Administrador': 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400',
    'Florista Senior': 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
    'Gerente': 'bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-400',
};


export const columns: ColumnDef<StaffMember>[] = [
  {
    accessorKey: "name",
    header: "Empleado",
    cell: ({ row }) => {
        const staff = row.original;
        return (
            <div className="flex items-center gap-3">
                <Avatar className="size-10">
                    <AvatarImage src={staff.avatarUrl} alt={staff.name} />
                    <AvatarFallback>{staff.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                    <span className="font-bold text-sm">{staff.name}</span>
                    <span className="text-xs text-muted-foreground">{staff.email}</span>
                </div>
            </div>
        )
    }
  },
  {
    accessorKey: "role",
    header: "Rol / Cargo",
    cell: ({ row }) => {
        const role = row.original.role;
        return (
            <span className={cn('px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider', roleColors[role])}>
                {role}
            </span>
        )
    }
  },
  {
    accessorKey: "createdAt",
    header: "Fecha Ingreso",
    cell: ({ row }) => format(new Date(row.getValue("createdAt")), "dd/MM/yyyy"),
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => {
        const status = row.original.status;
        const statusClass = status === 'Activo' 
            ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-500 border border-emerald-200 dark:border-emerald-800'
            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-600';
        return (
             <span className={cn('px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider', statusClass)}>
                {status}
            </span>
        )
    }
  },
  {
    accessorKey: "shift",
    header: "Turno"
  },
  {
    id: "actions",
    cell: ({ row }) => <StaffDataTableRowActions row={row} />,
  },
];
