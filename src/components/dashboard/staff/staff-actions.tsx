"use client";

import { Button } from "@/components/ui/button";
import { StaffFormDialog } from "@/components/dashboard/staff/staff-form-dialog";

export function StaffActions() {
  return (
    <div className="flex gap-2">
      <Button variant="outline" className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 shadow-sm font-bold">
        <span className="material-symbols-outlined text-lg">download</span> Exportar
      </Button>
      <StaffFormDialog>
        <Button variant="default" className="bg-primary text-primary-foreground shadow-md font-bold">
          <span className="material-symbols-outlined text-lg">person_add</span> Nuevo Personal
        </Button>
      </StaffFormDialog>
    </div>
  );
}
