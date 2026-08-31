"use client";

import { AlertTriangle } from "lucide-react";
import { Device } from "@/lib/types";
import { useNetworkData } from "@/lib/network-data-context";
import { useLocale } from "@/lib/i18n/locale-context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DeleteDeviceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  device: Device | null;
  onDeleted?: () => void;
}

export function DeleteDeviceDialog({
  open,
  onOpenChange,
  device,
  onDeleted,
}: DeleteDeviceDialogProps) {
  const { deleteDevice } = useNetworkData();
  const { t } = useLocale();
  if (!device) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-sev-critical" />
            <DialogTitle>{t.deleteDeviceDialog.title(device.name)}</DialogTitle>
          </div>
          <DialogDescription>{t.deleteDeviceDialog.description}</DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t.common.cancel}
          </Button>
          <Button
            variant="destructive"
            onClick={async () => {
              await deleteDevice(device.id);
              onOpenChange(false);
              onDeleted?.();
            }}
          >
            {t.deleteDeviceDialog.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
