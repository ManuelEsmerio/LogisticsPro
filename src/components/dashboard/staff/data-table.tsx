"use client";

import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  getFilteredRowModel
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTablePagination } from "@/components/dashboard/data-table/data-table-pagination";
import type { StaffMember } from "@/lib/definitions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

export function StaffDataTable<TData extends StaffMember, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
    const [globalFilter, setGlobalFilter] = React.useState('')
    const table = useReactTable({
        data,
        columns,
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        state: {
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
                        placeholder="Filtrar por nombre o cargo..."
                        value={globalFilter ?? ''}
                        onChange={e => setGlobalFilter(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-md text-sm focus:ring-2 focus:ring-primary"
                    />
                </div>
            </div>
            <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="text-xs px-4 py-1.5 h-auto bg-primary/10 text-primary border-primary/20 dark:bg-slate-700 dark:text-white font-bold">Rol: Todos <span className="material-symbols-outlined text-sm ml-2">expand_more</span></Button>
                <Button variant="outline" size="sm" className="text-xs px-4 py-1.5 h-auto">Estado: Activo <span className="material-symbols-outlined text-sm ml-2">expand_more</span></Button>
                <Button variant="outline" size="sm" className="text-xs px-4 py-1.5 h-auto">Turno: Mañana <span className="material-symbols-outlined text-sm ml-2">expand_more</span></Button>
                <div className="h-8 w-[1px] bg-border mx-1"></div>
                <Button variant="ghost" className="text-xs h-8 px-2 font-bold text-slate-500 hover:text-primary">Limpiar Filtros</Button>
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
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
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
