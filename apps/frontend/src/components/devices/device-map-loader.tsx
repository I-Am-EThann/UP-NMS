"use client";

import dynamic from "next/dynamic";

export const DeviceMap = dynamic(
  () => import("./device-map").then((mod) => mod.DeviceMap),
  {
    ssr: false,
    loading: () => <div className="h-[360px] rounded-md bg-brand-50" />,
  }
);
