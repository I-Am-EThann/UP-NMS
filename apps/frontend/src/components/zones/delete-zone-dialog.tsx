"use client";

import { AlertTriangle } from "lucide-react";
import { Zone } from "@/lib/types";
import { zoneAlertTotal } from "@/lib/stats";
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

interface DeleteZoneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zone: Zone | null;
  onDeleted?: () => void;
}

export function DeleteZoneDialog({
  open,
  onOpenChange,
  zone,
  onDeleted,
}: DeleteZoneDialogProps) {
  const { deleteZone } = useNetworkData();
  const { t } = useLocale();
  if (!zone) return null;

  const deviceCount = zone.switchCount + zone.accessPointCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-sev-critical" />
            <DialogTitle>{t.deleteZoneDialog.title(zone.name)}</DialogTitle>
          </div>
          <DialogDescription>
            {deviceCount > 0
              ? t.deleteZoneDialog.descriptionWithDevices(
                  deviceCount,
                  zoneAlertTotal(zone)
                )
              : t.deleteZoneDialog.descriptionSimple}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t.common.cancel}
          </Button>
          <Button
            variant="destructive"
            onClick={async () => {
              await deleteZone(zone.id);
              onOpenChange(false);
              onDeleted?.();
            }}
          >
            {t.deleteZoneDialog.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
