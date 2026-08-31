"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import Link from "next/link";
import { Device } from "@/lib/types";
import { SEVERITY_MARKER_COLOR, UNIVERSITY_OF_PHAYAO_CENTER } from "@/lib/map-constants";
import { useLocale } from "@/lib/i18n/locale-context";

function markerIcon(device: Device) {
  const color =
    device.status === "offline" ? "#9491a3" : SEVERITY_MARKER_COLOR[device.severity];
  const pulse = device.severity === "critical" && device.status === "online";

  return L.divIcon({
    className: "",
    html: `
      <span style="position:relative;display:inline-flex;">
        ${
          pulse
            ? `<span style="position:absolute;inset:-6px;border-radius:9999px;background:${color};opacity:0.35;animation:signal-pulse 1.4s cubic-bezier(.4,0,.3,1) infinite;"></span>`
            : ""
        }
        <span style="position:relative;display:block;width:16px;height:16px;border-radius:9999px;background:${color};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.35);"></span>
      </span>
    `,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -10],
  });
}

export function DeviceMap({ devices }: { devices: Device[] }) {
  const { t } = useLocale();
  const withPosition = devices.filter((d) => d.mapPosition);

  if (withPosition.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center rounded-md bg-brand-50 text-sm text-ink-400">
        {t.deviceMap.noPositions}
      </div>
    );
  }

  const center: [number, number] = withPosition[0].mapPosition
    ? [withPosition[0].mapPosition!.lat, withPosition[0].mapPosition!.lng]
    : UNIVERSITY_OF_PHAYAO_CENTER;

  return (
    <div className="isolate h-[360px] overflow-hidden rounded-md">
      <MapContainer
        center={center}
        zoom={17}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {withPosition.map((device) => (
          <Marker
            key={device.id}
            position={[device.mapPosition!.lat, device.mapPosition!.lng]}
            icon={markerIcon(device)}
          >
            <Popup>
              <div className="space-y-1">
                <p className="text-sm font-medium text-ink-900">{device.name}</p>
                <p className="font-mono text-xs text-ink-400">{device.ipAddress}</p>
                <Link
                  href={`/zones/${device.zoneId}/${
                    device.kind === "switch" ? "switches" : "access-points"
                  }/${device.id}`}
                  className="text-xs font-medium text-brand-700 hover:underline"
                >
                  {t.deviceMap.viewDetails}
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
