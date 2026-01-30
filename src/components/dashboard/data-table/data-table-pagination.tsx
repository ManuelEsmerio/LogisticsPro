"use client"

import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Table } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"

interface DataTablePaginationProps<TData> {
  table: Table<TData>
}

export function DataTablePagination<TData>({
  table,
}: DataTablePaginationProps<TData>) {
  const pageIndex = table.getState().pagination.pageIndex;
  const pageCount = table.getPageCount();

  const getPageNumbers = () => {
    const totalPages = pageCount;
    const currentPage = pageIndex + 1;
    let pages: (number | string)[] = [];

    if (totalPages <= 5) {
      pages = Array.from({ length: totalPages }, (_, i) => i + 1);
    } else {
      if (currentPage <= 3) {
        pages = [1, 2, 3, '...', totalPages];
      } else if (currentPage > totalPages - 3) {
        pages = [1, '...', totalPages - 2, totalPages - 1, totalPages];
      } else {
        pages = [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
      }
    }
    return pages;
  };

  return (
    <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t flex items-center justify-between">
      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase">
          Mostrando {table.getRowModel().rows.length} de {table.getFilteredRowModel().rows.length} pedidos
      </span>
      <div className="flex items-center gap-2">
        <Button
            variant="outline"
            className="p-1 h-auto"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
        >
            <span className="sr-only">Ir a la página anterior</span>
            <ChevronLeft className="h-5 w-5" />
        </Button>
        {getPageNumbers().map((page, index) =>
            typeof page === 'number' ? (
                 <Button
                    key={index}
                    variant={pageIndex + 1 === page ? 'default' : 'ghost'}
                    className="size-8 text-xs font-bold p-0"
                    onClick={() => table.setPageIndex(page - 1)}
                 >
                    {page}
                 </Button>
            ) : (
                <span key={index} className="px-2 text-xs">...</span>
            )
        )}
        <Button
            variant="outline"
            className="p-1 h-auto"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
        >
            <span className="sr-only">Ir a la página siguiente</span>
            <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}
