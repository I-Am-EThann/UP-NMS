-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMINISTRATOR');
CREATE TYPE "DeviceKind" AS ENUM ('SWITCH', 'ACCESS_POINT');
CREATE TYPE "DeviceStatus" AS ENUM ('ONLINE', 'OFFLINE');
CREATE TYPE "Severity" AS ENUM ('NORMAL', 'WARNING', 'MAJOR', 'CRITICAL');
CREATE TYPE "PortLinkStatus" AS ENUM ('UP', 'DOWN');
CREATE TYPE "AlertMessageKey" AS ENUM ('DEVICE_OFFLINE', 'HIGH_BANDWIDTH', 'HIGH_MEMORY');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'ADMINISTRATOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateTable
CREATE TABLE "zones" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "zones_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "zones_name_key" ON "zones"("name");

-- CreateTable
CREATE TABLE "devices" (
    "id" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "kind" "DeviceKind" NOT NULL,
    "name" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "imageUrl" TEXT,
    "mapLat" DOUBLE PRECISION,
    "mapLng" DOUBLE PRECISION,
    "status" "DeviceStatus" NOT NULL DEFAULT 'ONLINE',
    "severity" "Severity" NOT NULL DEFAULT 'NORMAL',
    "lastUpdate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cpuUsagePercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "memoryUsagePercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "connectedClients" INTEGER,
    "bandwidthUsagePercent" DOUBLE PRECISION,
    "trafficInMbps" DOUBLE PRECISION,
    "trafficOutMbps" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "devices_ipAddress_key" ON "devices"("ipAddress");
CREATE INDEX "devices_zoneId_idx" ON "devices"("zoneId");

-- CreateTable
CREATE TABLE "ports" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "portNumber" INTEGER NOT NULL,
    "status" "PortLinkStatus" NOT NULL DEFAULT 'DOWN',
    "speedMbps" INTEGER NOT NULL DEFAULT 0,
    "bandwidthUsagePercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "trafficInMbps" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "trafficOutMbps" DOUBLE PRECISION NOT NULL DEFAULT 0,
    CONSTRAINT "ports_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ports_deviceId_portNumber_key" ON "ports"("deviceId", "portNumber");

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "severity" "Severity" NOT NULL,
    "messageKey" "AlertMessageKey" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "alerts_zoneId_idx" ON "alerts"("zoneId");
CREATE INDEX "alerts_deviceId_idx" ON "alerts"("deviceId");

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "zones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ports" ADD CONSTRAINT "ports_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "zones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
