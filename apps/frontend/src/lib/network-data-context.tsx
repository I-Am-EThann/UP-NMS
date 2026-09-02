"use client";

import * as React from "react";
import { toast } from "sonner";
import { AlertItem, Device, Zone } from "@/lib/types";
import { useLocale } from "@/lib/i18n/locale-context";
import { apiFetch, ApiError } from "@/lib/api-client";
import {
  BackendAlert,
  BackendDevice,
  deviceKindToBackend,
  deviceToWritePayload,
  mapAlert,
  mapDevice,
} from "@/lib/api-mappers";

type ZoneErrorCode = "required" | "duplicate";
type DeviceErrorCode = "nameRequired" | "ipRequired" | "ipDuplicate";

interface NetworkDataContextValue {
  zones: Zone[];
  devices: Device[];
  alerts: AlertItem[];
  isLoading: boolean;
  addZone: (name: string) => Promise<{ ok: boolean; errorCode?: ZoneErrorCode }>;
  renameZone: (
    zoneId: string,
    name: string
  ) => Promise<{ ok: boolean; errorCode?: ZoneErrorCode }>;
  deleteZone: (zoneId: string) => Promise<void>;
  addDevice: (
    input: Omit<Device, "id" | "lastUpdate">
  ) => Promise<{ ok: boolean; errorCode?: DeviceErrorCode }>;
  updateDevice: (
    deviceId: string,
    input: Partial<Omit<Device, "id" | "zoneId" | "kind">>
  ) => Promise<{ ok: boolean; errorCode?: DeviceErrorCode }>;
  deleteDevice: (deviceId: string) => Promise<void>;
}

const NetworkDataContext = React.createContext<NetworkDataContextValue | undefined>(
  undefined
);

export function NetworkDataProvider({ children }: { children: React.ReactNode }) {
  const [zones, setZones] = React.useState<Zone[]>([]);
  const [devices, setDevices] = React.useState<Device[]>([]);
  const [alerts, setAlerts] = React.useState<AlertItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const { t } = useLocale();

  const refetchAll = React.useCallback(async () => {
    const zonesData = await apiFetch<Zone[]>("/zones");
    const [deviceLists, alertsData] = await Promise.all([
      Promise.all(
        zonesData.map((z) => apiFetch<BackendDevice[]>(`/zones/${z.id}/devices`))
      ),
      apiFetch<BackendAlert[]>("/alerts"),
    ]);
    setZones(zonesData);
    setDevices(deviceLists.flat().map(mapDevice));
    setAlerts(alertsData.map(mapAlert));
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    // Fetching on mount inherently calls setState from the resolved promise
    // — there's no external system to "subscribe" to here, this genuinely
    // is the one-time initial data load.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refetchAll()
      .catch((error: unknown) => {
        console.error("Failed to load network data:", error);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch once on mount; refetchAll is stable
  }, []);

  const addZone = React.useCallback<NetworkDataContextValue["addZone"]>(
    async (name) => {
      try {
        const zone = await apiFetch<Zone>("/zones", {
          method: "POST",
          body: { name: name.trim() },
        });
        setZones((prev) => [...prev, zone]);
        toast.success(t.zoneToasts.added(zone.name));
        return { ok: true };
      } catch (error) {
        if (error instanceof ApiError) {
          if (error.status === 409) return { ok: false, errorCode: "duplicate" };
          if (error.status === 400) return { ok: false, errorCode: "required" };
        }
        return { ok: false };
      }
    },
    [t]
  );

  const renameZone = React.useCallback<NetworkDataContextValue["renameZone"]>(
    async (zoneId, name) => {
      try {
        const zone = await apiFetch<Zone>(`/zones/${zoneId}`, {
          method: "PATCH",
          body: { name: name.trim() },
        });
        setZones((prev) => prev.map((z) => (z.id === zoneId ? zone : z)));
        toast.success(t.zoneToasts.renamed);
        return { ok: true };
      } catch (error) {
        if (error instanceof ApiError) {
          if (error.status === 409) return { ok: false, errorCode: "duplicate" };
          if (error.status === 400) return { ok: false, errorCode: "required" };
        }
        return { ok: false };
      }
    },
    [t]
  );

  const deleteZone = React.useCallback<NetworkDataContextValue["deleteZone"]>(
    async (zoneId) => {
      const zone = zones.find((z) => z.id === zoneId);
      await apiFetch(`/zones/${zoneId}`, { method: "DELETE" });
      setZones((prev) => prev.filter((z) => z.id !== zoneId));
      setDevices((prev) => prev.filter((d) => d.zoneId !== zoneId));
      setAlerts((prev) => prev.filter((a) => a.zoneId !== zoneId));
      if (zone) toast.success(t.zoneToasts.deleted(zone.name));
    },
    [zones, t]
  );

  const addDevice = React.useCallback<NetworkDataContextValue["addDevice"]>(
    async (input) => {
      try {
        const payload = deviceToWritePayload(input);
        const device = await apiFetch<BackendDevice>(
          `/zones/${input.zoneId}/devices`,
          {
            method: "POST",
            body: { kind: deviceKindToBackend(input.kind), ...payload },
          }
        );
        const mapped = mapDevice(device);
        setDevices((prev) => [...prev, mapped]);
        toast.success(t.zoneToasts.deviceAdded(mapped.name));
        return { ok: true };
      } catch (error) {
        if (error instanceof ApiError) {
          if (error.status === 409) return { ok: false, errorCode: "ipDuplicate" };
          if (error.status === 400) return { ok: false, errorCode: "nameRequired" };
        }
        return { ok: false };
      }
    },
    [t]
  );

  const updateDevice = React.useCallback<NetworkDataContextValue["updateDevice"]>(
    async (deviceId, input) => {
      try {
        const payload = deviceToWritePayload({
          name: input.name ?? "",
          ipAddress: input.ipAddress ?? "",
          brand: input.brand ?? "",
          model: input.model ?? "",
          snmpCommunity: input.snmpCommunity,
          imageUrl: input.imageUrl,
          mapPosition: input.mapPosition,
        });
        // Only send fields the caller actually provided.
        const body: Record<string, unknown> = {};
        if (input.name !== undefined) body.name = payload.name;
        if (input.ipAddress !== undefined) body.ipAddress = payload.ipAddress;
        if (input.brand !== undefined) body.brand = payload.brand;
        if (input.model !== undefined) body.model = payload.model;
        if (input.snmpCommunity !== undefined) body.snmpCommunity = payload.snmpCommunity;
        if (input.imageUrl !== undefined) body.imageUrl = payload.imageUrl;
        if (input.mapPosition !== undefined) {
          body.mapLat = payload.mapLat;
          body.mapLng = payload.mapLng;
        }

        const device = await apiFetch<BackendDevice>(`/devices/${deviceId}`, {
          method: "PATCH",
          body,
        });
        const mapped = mapDevice(device);
        setDevices((prev) => prev.map((d) => (d.id === deviceId ? mapped : d)));
        toast.success(t.zoneToasts.deviceUpdated);
        return { ok: true };
      } catch (error) {
        if (error instanceof ApiError) {
          if (error.status === 409) return { ok: false, errorCode: "ipDuplicate" };
          if (error.status === 400) return { ok: false, errorCode: "nameRequired" };
        }
        return { ok: false };
      }
    },
    [t]
  );

  const deleteDevice = React.useCallback<NetworkDataContextValue["deleteDevice"]>(
    async (deviceId) => {
      const device = devices.find((d) => d.id === deviceId);
      await apiFetch(`/devices/${deviceId}`, { method: "DELETE" });
      setDevices((prev) => prev.filter((d) => d.id !== deviceId));
      if (device) toast.success(t.zoneToasts.deviceDeleted(device.name));
    },
    [devices, t]
  );

  const value = React.useMemo(
    () => ({
      zones,
      devices,
      alerts,
      isLoading,
      addZone,
      renameZone,
      deleteZone,
      addDevice,
      updateDevice,
      deleteDevice,
    }),
    [
      zones,
      devices,
      alerts,
      isLoading,
      addZone,
      renameZone,
      deleteZone,
      addDevice,
      updateDevice,
      deleteDevice,
    ]
  );

  return (
    <NetworkDataContext.Provider value={value}>
      {children}
    </NetworkDataContext.Provider>
  );
}

export function useNetworkData() {
  const ctx = React.useContext(NetworkDataContext);
  if (!ctx) throw new Error("useNetworkData must be used within NetworkDataProvider");
  return ctx;
}
