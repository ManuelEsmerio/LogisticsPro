"use client"

import { Table } from "@tanstack/react-table"
import { StaffFormDialog } from "./staff-form-dialog"
import type { StaffMember } from "@/lib/definitions"

interface DataTableToolbarProps<TData> {
  table: Table<TData>
}

export function StaffDataTableToolbar<TData extends StaffMember>({
  table,
}: DataTableToolbarProps<TData>) {

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        {/* Input for filtering can be added here */}
      </div>
      <div className="flex items-center space-x-2">
        <StaffFormDialog>
            <span className="hidden sm:inline">Create Staff</span>
        </StaffFormDialog>
      </div>
    </div>
  )
}
