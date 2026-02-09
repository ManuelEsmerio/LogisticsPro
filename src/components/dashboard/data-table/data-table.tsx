"use client";

import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  getFilteredRowModel,
  SortingState,
  getSortedRowModel,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTablePagination } from "./data-table-pagination";
import type { Order } from "@/lib/definitions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  loadingText?: string;
  selectedId?: string | null;
  onRowClick?: (row: TData) => void;
}

export function DataTable<TData extends Order, TValue>({
  columns,
  data,
  isLoading = false,
  loadingText = "Cargando...",
  selectedId,
  onRowClick,
}: DataTableProps<TData, TValue>) {
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [globalFilter, setGlobalFilter] = React.useState('')
  const [dateFilter, setDateFilter] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<
    "all" | "pendiente" | "en_reparto" | "entregado" | "rechazado"
  >("all")
  const [slotFilter, setSlotFilter] = React.useState<
    "all" | "morning" | "afternoon" | "evening"
  >("all")

  const filteredData = React.useMemo(() => {
    return data.filter((order) => {
      if (statusFilter !== "all") {
        const deliveryStatus = order.deliveryStatus ?? "pendiente";
        if (deliveryStatus !== statusFilter) return false;
      }
      if (slotFilter !== "all") {
        if (order.deliveryTimeSlot !== slotFilter) return false;
      }
      if (!order.deliveryTime) return !dateFilter;
      const deliveryDate = new Date(order.deliveryTime);
      const yyyy = deliveryDate.getFullYear();
      const mm = String(deliveryDate.getMonth() + 1).padStart(2, "0");
      const dd = String(deliveryDate.getDate()).padStart(2, "0");
      if (dateFilter && `${yyyy}-${mm}-${dd}` !== dateFilter) return false;
      return true;
    });
  }, [data, dateFilter, statusFilter, slotFilter]);

    const table = useReactTable({
      data: filteredData,
        columns,
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        state: {
            sorting,
            globalFilter,
        },
    });

  return (
    <div className="w-full">
      <div className="p-4 border-b bg-slate-50 dark:bg-slate-800/50 flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px]">
                <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">search</span>
                    <Input
                        placeholder="Filtrar por nombre o ID..."
                        value={globalFilter ?? ''}
                        onChange={e => setGlobalFilter(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-md text-sm focus:ring-2 focus:ring-primary"
                    />
                </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900">
                <span className="text-muted-foreground">Fecha:</span>
                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="h-7 border-0 bg-transparent p-0 text-xs focus-visible:ring-0"
                  aria-label="Filtrar por fecha de envío"
                />
              </div>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
                <SelectTrigger className="h-8 px-2 text-xs w-[160px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Estado: Todos</SelectItem>
                  <SelectItem value="pendiente">Estado: Pendiente</SelectItem>
                  <SelectItem value="en_reparto">Estado: En reparto</SelectItem>
                  <SelectItem value="entregado">Estado: Entregado</SelectItem>
                  <SelectItem value="rechazado">Estado: Rechazado</SelectItem>
                </SelectContent>
              </Select>
              <Select value={slotFilter} onValueChange={(value) => setSlotFilter(value as any)}>
                <SelectTrigger className="h-8 px-2 text-xs w-[160px]">
                  <SelectValue placeholder="Ventana" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Ventana: Todas</SelectItem>
                  <SelectItem value="morning">Ventana: Mañana</SelectItem>
                  <SelectItem value="afternoon">Ventana: Tarde</SelectItem>
                  <SelectItem value="evening">Ventana: Noche</SelectItem>
                </SelectContent>
              </Select>
              <div className="h-8 w-[1px] bg-border mx-1"></div>
              <Button
                variant="ghost"
                className="text-xs h-8"
                onClick={() => {
                  setDateFilter("");
                  setGlobalFilter("");
                  setStatusFilter("all");
                  setSlotFilter("all");
                }}
              >
                Limpiar Filtros
              </Button>
            </div>
        </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-slate-50 dark:bg-slate-900/50 border-b">
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} className="px-6 py-3 text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-widest">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody className="divide-y divide-border">
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-sm text-muted-foreground">
                  {loadingText}
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={cn(
                    "hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer",
                    row.original.deliveryStatus === 'rechazado'
                      ? "bg-orange-50/60 dark:bg-orange-900/20"
                      : "",
                    selectedId && (row.original.id === selectedId || row.original.orderNumber === selectedId)
                      ? "bg-slate-50 dark:bg-slate-700/40"
                      : ""
                  )}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-6 py-4">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  Sin resultados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} />
    </div>
  );
}
