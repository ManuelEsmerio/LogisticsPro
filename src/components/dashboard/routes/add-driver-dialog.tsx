'use client';

import { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { StaffMember } from '@/lib/definitions';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface AddDriverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allDrivers: StaffMember[];
  displayedDrivers: StaffMember[];
  onAddDrivers: (drivers: StaffMember[]) => void;
}

export function AddDriverDialog({ open, onOpenChange, allDrivers, displayedDrivers, onAddDrivers }: AddDriverDialogProps) {
  const [selectedDriverIds, setSelectedDriverIds] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');

  const displayedDriverIds = useMemo(() => new Set(displayedDrivers.map(d => d.id)), [displayedDrivers]);
  
  const availableDrivers = useMemo(() => {
    return allDrivers
      .filter(d => !displayedDriverIds.has(d.id))
      .filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [allDrivers, displayedDriverIds, searchTerm]);

  const handleSelectDriver = (driverId: string, checked: boolean) => {
    setSelectedDriverIds(prev => ({ ...prev, [driverId]: checked }));
  };

  const handleSubmit = () => {
    const driversToAdd = allDrivers.filter(driver => selectedDriverIds[driver.id]);
    onAddDrivers(driversToAdd);
    setSelectedDriverIds({});
    setSearchTerm('');
    onOpenChange(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setSelectedDriverIds({});
      setSearchTerm('');
    }
    onOpenChange(isOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>Añadir Transportistas a la Vista</DialogTitle>
          <DialogDescription>
            Selecciona los transportistas que deseas añadir al panel de asignación.
          </DialogDescription>
        </DialogHeader>
        <div className="px-6 pb-2">
            <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">search</span>
                <Input 
                    placeholder="Buscar transportista..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                />
            </div>
        </div>
        <div className="px-2">
          <ScrollArea className="h-72">
            <div className="space-y-1 p-4">
              {availableDrivers.length > 0 ? availableDrivers.map(driver => (
                <div key={driver.id} className={cn("flex items-center space-x-4 p-2 rounded-md hover:bg-muted", driver.status === 'Inactivo' && 'opacity-50')}>
                  <Checkbox
                    id={`driver-${driver.id}`}
                    checked={!!selectedDriverIds[driver.id]}
                    onCheckedChange={(checked) => handleSelectDriver(driver.id, !!checked)}
                    disabled={driver.status === 'Inactivo'}
                  />
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={driver.avatarUrl} alt={driver.name} />
                    <AvatarFallback>{driver.name.slice(0,2)}</AvatarFallback>
                  </Avatar>
                  <Label htmlFor={`driver-${driver.id}`} className={cn("flex-1 cursor-pointer", driver.status === 'Inactivo' && 'cursor-not-allowed')}>
                    <p className="font-semibold">{driver.name}</p>
                    <p className="text-xs text-muted-foreground">{driver.status} - {driver.vehicleType !== 'ninguno' ? driver.vehicleType : 'Sin vehículo'}</p>
                  </Label>
                </div>
              )) : (
                <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
                    <p>No se encontraron transportistas.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
        <DialogFooter className="px-6 py-4 bg-muted/50">
          <Button variant="ghost" onClick={() => handleOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={Object.values(selectedDriverIds).every(v => !v)}>
            Añadir Seleccionados
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
