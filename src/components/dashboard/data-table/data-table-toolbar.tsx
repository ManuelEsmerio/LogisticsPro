"use client"

import { Table } from "@tanstack/react-table"
import { OrderFormDialog } from "../order-form-dialog"
import type { Order } from "@/lib/definitions"

interface DataTableToolbarProps<TData> {
  table: Table<TData>
}

export function DataTableToolbar<TData extends Order>({
  table,
}: DataTableToolbarProps<TData>) {

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        {/* Input for filtering can be added here */}
      </div>
      <div className="flex items-center space-x-2">
        <OrderFormDialog>
            <span className="hidden sm:inline">Crear Pedido</span>
        </OrderFormDialog>
      </div>
    </div>
  )
}
