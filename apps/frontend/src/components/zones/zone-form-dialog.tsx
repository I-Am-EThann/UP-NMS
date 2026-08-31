"use client";

import * as React from "react";
import { useNetworkData } from "@/lib/network-data-context";
import { useLocale } from "@/lib/i18n/locale-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ZoneFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  zoneId?: string;
  initialName?: string;
}

export function ZoneFormDialog({
  open,
  onOpenChange,
  mode,
  zoneId,
  initialName = "",
}: ZoneFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* Keying on `open` remounts the form each time the dialog opens,
            so it always starts from a fresh `initialName` without an effect. */}
        <ZoneForm
          key={open ? `${mode}-${zoneId ?? "new"}` : "closed"}
          mode={mode}
          zoneId={zoneId}
          initialName={initialName}
          onOpenChange={onOpenChange}
        />
      </DialogContent>
    </Dialog>
  );
}

function ZoneForm({
  mode,
  zoneId,
  initialName,
  onOpenChange,
}: {
  mode: "create" | "edit";
  zoneId?: string;
  initialName: string;
  onOpenChange: (open: boolean) => void;
}) {
  const { addZone, renameZone } = useNetworkData();
  const { t } = useLocale();
  const [name, setName] = React.useState(initialName);
  const [errorCode, setErrorCode] = React.useState<
    "required" | "duplicate" | "generic" | null
  >(null);

  const [isSubmitting, setIsSubmitting] = React.useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    const result =
      mode === "create" ? await addZone(name) : await renameZone(zoneId!, name);
    setIsSubmitting(false);

    if (!result.ok) {
      setErrorCode(result.errorCode ?? "generic");
      return;
    }
    onOpenChange(false);
  }

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{mode === "create" ? t.zoneForm.addTitle : t.zoneForm.editTitle}</DialogTitle>
      </DialogHeader>

      <div className="space-y-1.5">
        <Label htmlFor="zone-name">{t.zoneForm.nameLabel}</Label>
        <Input
          id="zone-name"
          placeholder={t.zoneForm.namePlaceholder}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          required
        />
        {errorCode && (
          <p className="text-xs text-sev-critical">{t.zoneForm.errors[errorCode]}</p>
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          {t.common.cancel}
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {mode === "create" ? t.zoneForm.addButton : t.zoneForm.saveButton}
        </Button>
      </DialogFooter>
    </form>
  );
}
