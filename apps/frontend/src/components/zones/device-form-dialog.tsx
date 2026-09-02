"use client";

import * as React from "react";
import { ImagePlus, Loader2, Router, Wifi, X } from "lucide-react";
import { useNetworkData } from "@/lib/network-data-context";
import { useLocale } from "@/lib/i18n/locale-context";
import { apiFetch } from "@/lib/api-client";
import { Device, DeviceKind } from "@/lib/types";
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

interface DeviceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: DeviceKind;
  zoneId: string;
  device?: Device | null; // present => edit mode
}

export function DeviceFormDialog({
  open,
  onOpenChange,
  kind,
  zoneId,
  device = null,
}: DeviceFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DeviceForm
          key={open ? device?.id ?? "new" : "closed"}
          kind={kind}
          zoneId={zoneId}
          device={device}
          onOpenChange={onOpenChange}
        />
      </DialogContent>
    </Dialog>
  );
}

function DeviceForm({
  kind,
  zoneId,
  device,
  onOpenChange,
}: {
  kind: DeviceKind;
  zoneId: string;
  device: Device | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { addDevice, updateDevice } = useNetworkData();
  const { t } = useLocale();
  const kindLabel = t.kinds[kind];
  const [name, setName] = React.useState(device?.name ?? "");
  const [ipAddress, setIpAddress] = React.useState(device?.ipAddress ?? "");
  const [brand, setBrand] = React.useState(device?.brand ?? "");
  const [model, setModel] = React.useState(device?.model ?? "");
  const [snmpCommunity, setSnmpCommunity] = React.useState(device?.snmpCommunity ?? "");
  const [lat, setLat] = React.useState(device?.mapPosition?.lat?.toString() ?? "");
  const [lng, setLng] = React.useState(device?.mapPosition?.lng?.toString() ?? "");
  const [imageUrl, setImageUrl] = React.useState<string | undefined>(device?.imageUrl);
  const [isUploadingImage, setIsUploadingImage] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorCode, setErrorCode] = React.useState<
    "nameRequired" | "ipRequired" | "ipDuplicate" | "generic" | null
  >(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const { url } = await apiFetch<{ url: string }>("/uploads/device-image", {
        method: "POST",
        body: form,
      });
      setImageUrl(url);
    } catch {
      setErrorCode("generic");
    } finally {
      setIsUploadingImage(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrorCode(null);
    setIsSubmitting(true);

    const mapPosition =
      lat.trim() && lng.trim()
        ? { lat: parseFloat(lat), lng: parseFloat(lng) }
        : undefined;

    const result = device
      ? await updateDevice(device.id, { name, ipAddress, brand, model, snmpCommunity, imageUrl, mapPosition })
      : await addDevice({
          zoneId,
          kind,
          name,
          ipAddress,
          brand,
          model,
          snmpCommunity,
          imageUrl,
          mapPosition,
          status: "online",
          severity: "normal",
          cpuUsagePercent: 0,
          memoryUsagePercent: 0,
          ...(kind === "switch"
            ? { ports: [] }
            : { connectedClients: 0, bandwidthUsagePercent: 0, trafficInMbps: 0, trafficOutMbps: 0 }),
        });

    setIsSubmitting(false);

    if (!result.ok) {
      setErrorCode(result.errorCode ?? "generic");
      return;
    }
    onOpenChange(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>
          {device ? t.deviceForm.editTitle(kindLabel) : t.deviceForm.addTitle(kindLabel)}
        </DialogTitle>
      </DialogHeader>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploadingImage}
          className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-dashed border-border-strong bg-brand-50 text-brand-700 transition-colors hover:bg-brand-100 disabled:opacity-60"
        >
          {isUploadingImage ? (
            <Loader2 className="size-5 animate-spin" />
          ) : imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- remote MinIO URL, not a local static asset
            <img src={imageUrl} alt="" className="size-full object-cover" />
          ) : kind === "switch" ? (
            <Router className="size-6" />
          ) : (
            <Wifi className="size-6" />
          )}
        </button>
        <div className="flex flex-col gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isUploadingImage}
            onClick={() => fileInputRef.current?.click()}
          >
            <ImagePlus className="size-4" />
            {imageUrl ? t.deviceForm.changeImage : t.deviceForm.uploadImage}
          </Button>
          {imageUrl && (
            <button
              type="button"
              onClick={() => setImageUrl(undefined)}
              className="flex items-center gap-1 text-xs text-ink-400 hover:text-sev-critical"
            >
              <X className="size-3" />
              {t.deviceForm.removeImage}
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageChange}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1.5">
          <Label htmlFor="device-name">{t.deviceForm.nameLabel}</Label>
          <Input
            id="device-name"
            placeholder={kind === "switch" ? "e.g. SW-ENG-CORE-1" : "e.g. AP-ENG-101"}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            required
          />
        </div>

        <div className="col-span-2 space-y-1.5">
          <Label htmlFor="device-ip">{t.deviceForm.ipLabel}</Label>
          <Input
            id="device-ip"
            placeholder="10.10.1.1"
            value={ipAddress}
            onChange={(e) => setIpAddress(e.target.value)}
            className="font-mono"
            required
          />
        </div>

        <div className="col-span-2 space-y-1.5">
          <Label htmlFor="device-snmp-community">{t.deviceForm.snmpCommunityLabel}</Label>
          <Input
            id="device-snmp-community"
            placeholder="public"
            value={snmpCommunity}
            onChange={(e) => setSnmpCommunity(e.target.value)}
            className="font-mono"
          />
          <p className="text-[11px] text-ink-400">{t.deviceForm.snmpCommunityHint}</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="device-brand">{t.deviceForm.brandLabel}</Label>
          <Input
            id="device-brand"
            placeholder="Cisco"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="device-model">{t.deviceForm.modelLabel}</Label>
          <Input
            id="device-model"
            placeholder="Catalyst 9200"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="device-lat">{t.deviceForm.latLabel}</Label>
          <Input
            id="device-lat"
            placeholder="19.0333"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            className="font-mono"
            inputMode="decimal"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="device-lng">{t.deviceForm.lngLabel}</Label>
          <Input
            id="device-lng"
            placeholder="99.9022"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            className="font-mono"
            inputMode="decimal"
          />
        </div>
      </div>
      <p className="-mt-2 text-[11px] text-ink-400">{t.deviceForm.mapHint}</p>

      {errorCode && (
        <p className="text-xs text-sev-critical">{t.deviceForm.errors[errorCode]}</p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          {t.common.cancel}
        </Button>
        <Button type="submit" disabled={isSubmitting || isUploadingImage}>
          {isSubmitting && <Loader2 className="size-4 animate-spin" />}
          {device ? t.deviceForm.saveButton : t.deviceForm.addButton}
        </Button>
      </DialogFooter>
    </form>
  );
}
