"use client"

import { Row } from "@tanstack/react-table"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { StaffFormDialog } from "./staff-form-dialog"
import { StaffMember } from "@/lib/definitions"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { deleteStaffAction } from "@/lib/actions"
import { useToast } from "@/hooks/use-toast"

interface DataTableRowActionsProps<TData> {
  row: Row<TData>
}

export function StaffDataTableRowActions<TData extends StaffMember>({
  row,
}: DataTableRowActionsProps<TData>) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    const result = await deleteStaffAction(row.original.id);
    if (result.message) {
      toast({ title: "Éxito", description: result.message });
    } else {
      toast({ variant: "destructive", title: "Error", description: result.message });
    }
    setIsDeleteDialogOpen(false);
  }

  return (
    <>
      <div className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-md text-slate-500 w-auto h-auto"
            >
              <span className="material-symbols-outlined text-lg">more_vert</span>
              <span className="sr-only">Abrir menú</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[160px]">
            <StaffFormDialog staffMember={row.original} isEditMode>
              <span className="w-full text-left">Editar</span>
            </StaffFormDialog>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-destructive focus:text-destructive">
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="flex flex-col items-center text-center">
           <div className="mb-6 flex items-center justify-center size-20 rounded-full bg-coral-soft/20 text-destructive">
            <span className="material-symbols-outlined !text-5xl">warning</span>
          </div>
          <AlertDialogHeader className="text-center flex flex-col items-center">
            <AlertDialogTitle className="text-2xl md:text-3xl font-bold tracking-tight">
              ¿Estás seguro de eliminar este registro?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
                <div className="bg-silk-gray dark:bg-background-dark/50 px-6 py-3 rounded-xl my-8 w-full">
                  <p className="text-slate-custom dark:text-gray-300 text-lg font-medium leading-normal">
                    {row.original.name}
                  </p>
                  <p className="text-slate-custom/60 dark:text-gray-500 text-sm mt-1 uppercase tracking-wider font-bold">
                    {row.original.role}
                  </p>
                </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-4 w-full justify-center">
            <AlertDialogCancel asChild>
              <Button variant="secondary" className="flex-1 min-w-[160px] cursor-pointer rounded-full h-14 px-6 bg-slate-custom hover:bg-slate-700 text-white text-base font-bold">
                No, mantener
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
               <Button variant="destructive" onClick={handleDelete} className="flex-1 min-w-[160px] cursor-pointer rounded-full h-14 px-6 text-base font-bold">
                Sí, eliminar
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
          <p className="mt-8 text-slate-custom/50 dark:text-gray-500 text-xs font-medium uppercase tracking-[0.1em]">
            Esta acción no se puede deshacer
          </p>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
