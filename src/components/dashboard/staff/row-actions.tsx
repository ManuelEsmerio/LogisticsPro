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
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { deleteStaff } from "@/lib/data"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

interface DataTableRowActionsProps<TData> {
  row: Row<TData>
}

export function StaffDataTableRowActions<TData extends StaffMember>({
  row,
}: DataTableRowActionsProps<TData>) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const staffId = row.original.id ?? (row.original as StaffMember & { _id?: string })._id;
  const staffMember = staffId ? { ...row.original, id: staffId } : row.original;

  const handleDelete = async () => {
    setIsDeleteDialogOpen(false);
    setIsDeleting(true);
    try {
      if (!staffId) {
        throw new Error("Missing staff id");
      }
      const ok = await deleteStaff(staffId);
      if (!ok) {
        throw new Error("Failed to delete staff");
      }
      toast({ title: "Éxito", description: "Miembro del personal eliminado." });
      window.dispatchEvent(new Event("staff:updated"));
      router.refresh();
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Error de base de datos: No se pudo eliminar al miembro del personal." });
    } finally {
      setIsDeleting(false);
    }
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
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                setTimeout(() => setIsEditDialogOpen(true), 0);
              }}
            >
              Editar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                setTimeout(() => setIsDeleteDialogOpen(true), 0);
              }}
              className="text-destructive focus:text-destructive"
            >
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <StaffFormDialog
        staffMember={staffMember}
        isEditMode
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        showTrigger={false}
        preventOutsideClose
      >
        <span className="sr-only">Editar</span>
      </StaffFormDialog>

      <Dialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open);
          if (!open) {
            setIsDeleting(false);
          }
        }}
        modal={false}
      >
        <DialogContent className="flex flex-col items-center text-center" showOverlay={false}>
          <div className="mb-6 flex items-center justify-center size-20 rounded-full bg-coral-soft/20 text-destructive">
            <span className="material-symbols-outlined !text-5xl">warning</span>
          </div>
          <DialogHeader className="text-center flex flex-col items-center">
            <DialogTitle className="text-2xl md:text-3xl font-bold tracking-tight">
              ¿Estás seguro de eliminar este registro?
            </DialogTitle>
          </DialogHeader>
          <div className="bg-silk-gray dark:bg-background-dark/50 px-6 py-4 rounded-xl mt-5 mb-6 w-full flex flex-col gap-1">
            <p className="text-slate-custom dark:text-gray-300 text-lg font-medium leading-normal">
              {row.original.name}
            </p>
            <p className="text-slate-custom/60 dark:text-gray-500 text-sm uppercase tracking-wider font-bold">
              {row.original.role}
            </p>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-6 w-full justify-center pt-2">
            <DialogClose asChild>
              <Button
                variant="secondary"
                disabled={isDeleting}
                className="flex-1 min-w-[160px] cursor-pointer rounded-full h-14 px-6 bg-slate-custom hover:bg-slate-700 text-white text-base font-bold"
              >
                No, mantener
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex-1 min-w-[160px] cursor-pointer rounded-full h-14 px-6 text-base font-bold"
            >
              Sí, eliminar
            </Button>
          </DialogFooter>
          <p className="mt-8 text-slate-custom/50 dark:text-gray-500 text-xs font-medium uppercase tracking-[0.1em]">
            Esta acción no se puede deshacer
          </p>
        </DialogContent>
      </Dialog>
    </>
  )
}
