// Domain-specific NOC terms (Switch, Access Point, Online/Offline,
// Normal/Warning/Major/Critical, Zone) are intentionally left in English in
// BOTH locales — the original spec defines them in English and translating
// them would make the app harder to cross-reference with network docs.

export interface Dictionary {
  common: {
    cancel: string;
    save: string;
    add: string;
    edit: string;
    delete: string;
    back: string;
    close: string;
  };
  auth: {
    loginTitle: string;
    usernameLabel: string;
    passwordLabel: string;
    loginButton: string;
    errors: {
      missingFields: string;
      invalidCredentials: string;
      generic: string;
    };
  };
  sidebar: {
    tagline: string;
    overviewLink: string;
    zonesLabel: string;
    addZoneAria: string;
    noZones: string;
    closeMenuAria: string;
  };
  topbar: {
    searchPlaceholder: string;
    notificationsAria: string;
    menuAria: string;
    languageAria: string;
    signOut: string;
    fallbackName: string;
  };
  dashboard: {
    title: string;
    totalSwitch: string;
    totalAccessPoint: string;
    online: string;
    offline: string;
    zonesCaption: (count: number) => string;
    alertSummaryTitle: string;
    alertSummaryDesc: string;
    deviceStatusTitle: string;
    deviceStatusDesc: string;
    recentAlertsTitle: string;
    recentAlertsDesc: string;
    byZoneTitle: string;
    byZoneDesc: string;
    noAlertsInSystem: string;
    totalDevices: string;
  };
  zonesPage: {
    title: string;
    countSummary: (count: number) => string;
    addZone: string;
    emptyTitle: string;
    emptyDesc: string;
    editName: string;
    deleteZone: string;
    noAlerts: string;
    deviceSummary: (switchCount: number, apCount: number) => string;
    onlineSuffix: (count: number) => string;
    offlineSuffix: (count: number) => string;
  };
  zoneForm: {
    addTitle: string;
    editTitle: string;
    description: string;
    nameLabel: string;
    namePlaceholder: string;
    addButton: string;
    saveButton: string;
    errors: {
      required: string;
      duplicate: string;
      generic: string;
    };
  };
  deleteZoneDialog: {
    title: (name: string) => string;
    descriptionWithDevices: (deviceCount: number, alertCount: number) => string;
    descriptionSimple: string;
    confirm: string;
  };
  zoneDashboard: {
    switchLabel: string;
    accessPointLabel: string;
    onlineLabel: string;
    offlineLabel: string;
    severityTitle: string;
    severityDesc: string;
    mapTitle: string;
    mapDesc: string;
    alertsTitle: string;
    alertsDesc: string;
    sectionDesc: (title: string) => string;
    addDevice: (title: string) => string;
    emptySwitch: string;
    emptyAccessPoint: string;
    menuAria: string;
  };
  deviceTable: {
    columnDevice: string;
    columnIp: string;
    columnModel: string;
    columnStatus: string;
    columnSeverity: string;
    columnLastUpdate: string;
    actionsAria: string;
  };
  deviceForm: {
    addTitle: (kind: string) => string;
    editTitle: (kind: string) => string;
    description: string;
    uploadImage: string;
    changeImage: string;
    removeImage: string;
    nameLabel: string;
    ipLabel: string;
    brandLabel: string;
    modelLabel: string;
    snmpCommunityLabel: string;
    snmpCommunityHint: string;
    latLabel: string;
    lngLabel: string;
    mapHint: string;
    addButton: string;
    saveButton: string;
    errors: {
      nameRequired: string;
      ipRequired: string;
      ipDuplicate: string;
      generic: string;
    };
  };
  deleteDeviceDialog: {
    title: (name: string) => string;
    description: string;
    confirm: string;
  };
  deviceHeader: {
    edit: string;
    delete: string;
  };
  deviceDetail: {
    overviewTab: string;
    portsTab: (up: number, total: number) => string;
    trafficTab: string;
    cpuUsage: string;
    memoryUsage: string;
    bandwidthUsage: string;
    connectedClients: string;
    lastUpdate: (formatted: string) => string;
    liveUpdateNote: string;
  };
  portTable: {
    port: string;
    status: string;
    speed: string;
    bandwidth: string;
    trafficIn: string;
    trafficOut: string;
    noPorts: string;
    up: string;
    down: string;
  };
  trafficChart: {
    collecting: string;
  };
  deviceMap: {
    noPositions: string;
    viewDetails: string;
  };
  alerts: {
    all: string;
    noAlerts: string;
    noAlertsThisZone: string;
    noAlertsThisSeverity: string;
    countSuffix: (count: number) => string;
  };
  kinds: {
    switch: string;
    access_point: string;
  };
  zoneToasts: {
    added: (name: string) => string;
    renamed: string;
    deleted: (name: string) => string;
    deviceAdded: (name: string) => string;
    deviceUpdated: string;
    deviceDeleted: (name: string) => string;
  };
  alertMessages: {
    deviceOffline: string;
    highBandwidth: string;
    highMemory: string;
    highCpu: string;
  };
}

export const en: Dictionary = {
  common: {
    cancel: "Cancel",
    save: "Save",
    add: "Add",
    edit: "Edit",
    delete: "Delete",
    back: "Back",
    close: "Close",
  },
  auth: {
    loginTitle: "Administrator Sign In",
    usernameLabel: "Username",
    passwordLabel: "Password",
    loginButton: "Sign in",
    errors: {
      missingFields: "Please enter your username and password",
      invalidCredentials: "Incorrect username or password",
      generic: "Sign in failed",
    },
  },
  sidebar: {
    tagline: "network ops",
    overviewLink: "Overview",
    zonesLabel: "Zones",
    addZoneAria: "Add new zone",
    noZones: "No zones yet — tap + to add one",
    closeMenuAria: "Close menu",
  },
  topbar: {
    searchPlaceholder: "Search devices or IP...",
    notificationsAria: "Notifications",
    menuAria: "Open menu",
    languageAria: "Change language",
    signOut: "Sign out",
    fallbackName: "Administrator",
  },
  dashboard: {
    title: "Overview",
    totalSwitch: "Total Switches",
    totalAccessPoint: "Total Access Points",
    online: "Online",
    offline: "Offline",
    zonesCaption: (count) => `${count} zones`,
    alertSummaryTitle: "Alert Summary — All Zones",
    alertSummaryDesc: "Ordered Critical → Major → Warning → Normal",
    deviceStatusTitle: "Device Status",
    deviceStatusDesc: "Online vs Offline",
    recentAlertsTitle: "Recent Alerts (All zones)",
    recentAlertsDesc: "All zones, Critical → Normal then most recent",
    byZoneTitle: "Alerts by Zone",
    byZoneDesc: "Tap a zone to open its dashboard",
    noAlertsInSystem: "No alerts in the system",
    totalDevices: "Total devices",
  },
  zonesPage: {
    title: "Manage Zones",
    countSummary: (count) => `${count} zones total — used to group devices by area or building`,
    addZone: "Add Zone",
    emptyTitle: "No zones yet",
    emptyDesc: "Add your first zone to start grouping network devices",
    editName: "Edit zone name",
    deleteZone: "Delete zone",
    noAlerts: "No alerts",
    deviceSummary: (s, a) => `${s} Switch · ${a} AP`,
    onlineSuffix: (n) => `${n} online`,
    offlineSuffix: (n) => `${n} offline`,
  },
  zoneForm: {
    addTitle: "Add New Zone",
    editTitle: "Edit Zone Name",
    description: "Used to group Switch and Access Point devices by area",
    nameLabel: "Zone Name",
    namePlaceholder: "e.g. Faculty of Information Technology",
    addButton: "Add Zone",
    saveButton: "Save",
    errors: {
      required: "Please enter a zone name",
      duplicate: "This zone name already exists",
      generic: "Unable to save",
    },
  },
  deleteZoneDialog: {
    title: (name) => `Delete zone "${name}"?`,
    descriptionWithDevices: (deviceCount, alertCount) =>
      `This will also delete ${deviceCount} device(s) and ${alertCount} alert(s) in this zone. This action cannot be undone.`,
    descriptionSimple: "This action cannot be undone.",
    confirm: "Delete Zone",
  },
  zoneDashboard: {
    switchLabel: "Switch",
    accessPointLabel: "Access Point",
    onlineLabel: "Online",
    offlineLabel: "Offline",
    severityTitle: "Alert Summary — This Zone",
    severityDesc: "Ordered Critical → Major → Warning → Normal",
    mapTitle: "Device Map",
    mapDesc: "Pin color matches device severity — gray means Offline",
    alertsTitle: "Alerts — This Zone",
    alertsDesc: "Device name, type, and severity — tap to view device details",
    sectionDesc: (title) => `Add, edit, or delete ${title} devices in this zone`,
    addDevice: (title) => `Add ${title}`,
    emptySwitch: "No switches in this zone yet",
    emptyAccessPoint: "No access points in this zone yet",
    menuAria: "Zone options",
  },
  deviceTable: {
    columnDevice: "Device",
    columnIp: "IP Address",
    columnModel: "Model",
    columnStatus: "Status",
    columnSeverity: "Severity",
    columnLastUpdate: "Last Update",
    actionsAria: "Device options",
  },
  deviceForm: {
    addTitle: (kind) => `Add New ${kind}`,
    editTitle: (kind) => `Edit ${kind}`,
    description:
      "Enter device details — Online/Offline status and usage metrics are pulled automatically from Monitor",
    uploadImage: "Upload Image",
    changeImage: "Change Image",
    removeImage: "Remove Image",
    nameLabel: "Device Name",
    ipLabel: "IP Address",
    brandLabel: "Brand",
    modelLabel: "Model",
    snmpCommunityLabel: "SNMP Community (optional)",
    snmpCommunityHint:
      "Leave blank to use the server's default community string. Only set this if this specific device uses a different one.",
    latLabel: "Position (Latitude)",
    lngLabel: "Position (Longitude)",
    mapHint: "Enter coordinates and it'll show up as a pin on the zone map right away",
    addButton: "Add Device",
    saveButton: "Save",
    errors: {
      nameRequired: "Please enter a device name",
      ipRequired: "Please enter an IP address",
      ipDuplicate: "Another device already uses this IP",
      generic: "Unable to save",
    },
  },
  deleteDeviceDialog: {
    title: (name) => `Delete device "${name}"?`,
    description:
      "Monitor history and alerts for this device will also be deleted. This action cannot be undone.",
    confirm: "Delete Device",
  },
  deviceHeader: {
    edit: "Edit",
    delete: "Delete",
  },
  deviceDetail: {
    overviewTab: "Overview",
    portsTab: (up, total) => `Ports (${up}/${total})`,
    trafficTab: "Traffic",
    cpuUsage: "CPU Usage",
    memoryUsage: "Memory Usage",
    bandwidthUsage: "Bandwidth Usage",
    connectedClients: "Connected Clients",
    lastUpdate: (formatted) => `Last update: ${formatted}`,
    liveUpdateNote: " · live updates via WebSocket, device data refreshed every 5 min",
  },
  portTable: {
    port: "Port",
    status: "Status",
    speed: "Speed",
    bandwidth: "Bandwidth",
    trafficIn: "Traffic In",
    trafficOut: "Traffic Out",
    noPorts: "No port data",
    up: "Up",
    down: "Down",
  },
  trafficChart: {
    collecting: "Collecting real-time traffic data...",
  },
  deviceMap: {
    noPositions: "No devices with a saved map position in this zone yet",
    viewDetails: "View details →",
  },
  alerts: {
    all: "All",
    noAlerts: "No alerts",
    noAlertsThisZone: "No alerts in this zone",
    noAlertsThisSeverity: "No alerts at this severity in this zone",
    countSuffix: (count) => `${count} alert${count === 1 ? "" : "s"}`,
  },
  kinds: {
    switch: "Switch",
    access_point: "Access Point",
  },
  zoneToasts: {
    added: (name) => `Zone "${name}" added`,
    renamed: "Zone name saved",
    deleted: (name) => `Zone "${name}" deleted`,
    deviceAdded: (name) => `Device "${name}" added`,
    deviceUpdated: "Device info saved",
    deviceDeleted: (name) => `Device "${name}" deleted`,
  },
  alertMessages: {
    deviceOffline: "Lost connection to device (Offline)",
    highBandwidth: "Bandwidth usage higher than normal",
    highMemory: "Memory usage over threshold",
    highCpu: "CPU usage over threshold",
  },
};

export const th: Dictionary = {
  common: {
    cancel: "ยกเลิก",
    save: "บันทึก",
    add: "เพิ่ม",
    edit: "แก้ไข",
    delete: "ลบ",
    back: "กลับ",
    close: "ปิด",
  },
  auth: {
    loginTitle: "เข้าสู่ระบบผู้ดูแลระบบ",
    usernameLabel: "ชื่อผู้ใช้",
    passwordLabel: "รหัสผ่าน",
    loginButton: "เข้าสู่ระบบ",
    errors: {
      missingFields: "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน",
      invalidCredentials: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
      generic: "เข้าสู่ระบบไม่สำเร็จ",
    },
  },
  sidebar: {
    tagline: "network ops",
    overviewLink: "ภาพรวมทั้งหมด",
    zonesLabel: "โซน",
    addZoneAria: "เพิ่มโซนใหม่",
    noZones: "ยังไม่มีโซน — กด + เพื่อเพิ่ม",
    closeMenuAria: "ปิดเมนู",
  },
  topbar: {
    searchPlaceholder: "ค้นหาอุปกรณ์ หรือ IP...",
    notificationsAria: "การแจ้งเตือน",
    menuAria: "เปิดเมนู",
    languageAria: "เปลี่ยนภาษา",
    signOut: "ออกจากระบบ",
    fallbackName: "ผู้ดูแลระบบ",
  },
  dashboard: {
    title: "ภาพรวมทั้งหมด",
    totalSwitch: "Switch ทั้งหมด",
    totalAccessPoint: "Access Point ทั้งหมด",
    online: "Online",
    offline: "Offline",
    zonesCaption: (count) => `${count} โซน`,
    alertSummaryTitle: "สรุปการแจ้งเตือนรวมทุกโซน",
    alertSummaryDesc: "เรียงจาก Critical → Major → Warning → Normal",
    deviceStatusTitle: "สถานะอุปกรณ์",
    deviceStatusDesc: "Online เทียบกับ Offline",
    recentAlertsTitle: "การแจ้งเตือนล่าสุด (รวมทุกโซน)",
    recentAlertsDesc: "รวมทุกโซน เรียง Critical → Normal แล้วตามเวลาล่าสุด",
    byZoneTitle: "การแจ้งเตือนแยกตามโซน",
    byZoneDesc: "แตะที่โซนเพื่อดู Zone Dashboard",
    noAlertsInSystem: "ไม่มีการแจ้งเตือนในระบบ",
    totalDevices: "อุปกรณ์ทั้งหมด",
  },
  zonesPage: {
    title: "จัดการโซน",
    countSummary: (count) => `ทั้งหมด ${count} โซน — ใช้จัดกลุ่มอุปกรณ์ตามพื้นที่หรืออาคาร`,
    addZone: "เพิ่มโซน",
    emptyTitle: "ยังไม่มีโซน",
    emptyDesc: "เพิ่มโซนแรกเพื่อเริ่มจัดกลุ่มอุปกรณ์เครือข่าย",
    editName: "แก้ไขชื่อโซน",
    deleteZone: "ลบโซน",
    noAlerts: "ไม่มีการแจ้งเตือน",
    deviceSummary: (s, a) => `${s} Switch · ${a} AP`,
    onlineSuffix: (n) => `${n} online`,
    offlineSuffix: (n) => `${n} offline`,
  },
  zoneForm: {
    addTitle: "เพิ่มโซนใหม่",
    editTitle: "แก้ไขชื่อโซน",
    description: "ใช้สำหรับจัดกลุ่มอุปกรณ์ Switch และ Access Point ตามพื้นที่",
    nameLabel: "ชื่อโซน",
    namePlaceholder: "เช่น คณะเทคโนโลยีสารสนเทศ",
    addButton: "เพิ่มโซน",
    saveButton: "บันทึก",
    errors: {
      required: "กรุณากรอกชื่อโซน",
      duplicate: "มีชื่อโซนนี้อยู่แล้ว",
      generic: "ไม่สามารถบันทึกได้",
    },
  },
  deleteZoneDialog: {
    title: (name) => `ลบโซน "${name}"?`,
    descriptionWithDevices: (deviceCount, alertCount) =>
      `จะลบอุปกรณ์ ${deviceCount} รายการ และการแจ้งเตือน ${alertCount} รายการที่อยู่ในโซนนี้ไปด้วย การกระทำนี้ไม่สามารถย้อนกลับได้`,
    descriptionSimple: "การกระทำนี้ไม่สามารถย้อนกลับได้",
    confirm: "ลบโซน",
  },
  zoneDashboard: {
    switchLabel: "Switch",
    accessPointLabel: "Access Point",
    onlineLabel: "Online",
    offlineLabel: "Offline",
    severityTitle: "สรุปการแจ้งเตือนของโซนนี้",
    severityDesc: "เรียงจาก Critical → Major → Warning → Normal",
    mapTitle: "แผนที่อุปกรณ์",
    mapDesc: "สีของหมุดตรงกับระดับ severity ของอุปกรณ์ — จุดสีเทาหมายถึง Offline",
    alertsTitle: "การแจ้งเตือนของโซนนี้",
    alertsDesc: "ชื่ออุปกรณ์ ประเภท และระดับความรุนแรง — คลิกเพื่อดูรายละเอียดอุปกรณ์",
    sectionDesc: (title) => `เพิ่ม แก้ไข หรือลบอุปกรณ์ ${title} ในโซนนี้`,
    addDevice: (title) => `เพิ่ม ${title}`,
    emptySwitch: "ยังไม่มี Switch ในโซนนี้",
    emptyAccessPoint: "ยังไม่มี Access Point ในโซนนี้",
    menuAria: "ตัวเลือกโซน",
  },
  deviceTable: {
    columnDevice: "อุปกรณ์",
    columnIp: "IP Address",
    columnModel: "รุ่น",
    columnStatus: "สถานะ",
    columnSeverity: "ระดับ",
    columnLastUpdate: "อัปเดตล่าสุด",
    actionsAria: "ตัวเลือกอุปกรณ์",
  },
  deviceForm: {
    addTitle: (kind) => `เพิ่ม ${kind} ใหม่`,
    editTitle: (kind) => `แก้ไข ${kind}`,
    description:
      "กรอกข้อมูลอุปกรณ์ — สถานะ Online/Offline และค่าการใช้งานจะดึงมาจากระบบ Monitor โดยอัตโนมัติ",
    uploadImage: "อัปโหลดรูปภาพ",
    changeImage: "เปลี่ยนรูปภาพ",
    removeImage: "ลบรูปภาพ",
    nameLabel: "ชื่ออุปกรณ์",
    ipLabel: "IP Address",
    brandLabel: "ยี่ห้อ",
    modelLabel: "รุ่น",
    snmpCommunityLabel: "SNMP Community (ไม่บังคับ)",
    snmpCommunityHint:
      "ปล่อยว่างไว้จะใช้ค่าเริ่มต้นของเซิร์ฟเวอร์ ใส่เฉพาะตอนที่อุปกรณ์ตัวนี้ใช้ community string ต่างจากอุปกรณ์อื่น",
    latLabel: "ตำแหน่ง (Latitude)",
    lngLabel: "ตำแหน่ง (Longitude)",
    mapHint: "กรอกพิกัดแล้วจะไปแสดงเป็นหมุดในแผนที่ของโซนทันที",
    addButton: "เพิ่มอุปกรณ์",
    saveButton: "บันทึก",
    errors: {
      nameRequired: "กรุณากรอกชื่ออุปกรณ์",
      ipRequired: "กรุณากรอก IP Address",
      ipDuplicate: "มีอุปกรณ์ที่ใช้ IP นี้อยู่แล้ว",
      generic: "ไม่สามารถบันทึกได้",
    },
  },
  deleteDeviceDialog: {
    title: (name) => `ลบอุปกรณ์ "${name}"?`,
    description:
      "ประวัติการ Monitor และการแจ้งเตือนของอุปกรณ์นี้จะถูกลบไปด้วย การกระทำนี้ไม่สามารถย้อนกลับได้",
    confirm: "ลบอุปกรณ์",
  },
  deviceHeader: {
    edit: "แก้ไข",
    delete: "ลบ",
  },
  deviceDetail: {
    overviewTab: "ภาพรวม",
    portsTab: (up, total) => `พอร์ต (${up}/${total})`,
    trafficTab: "Traffic",
    cpuUsage: "CPU Usage",
    memoryUsage: "Memory Usage",
    bandwidthUsage: "Bandwidth Usage",
    connectedClients: "Connected Clients",
    lastUpdate: (formatted) => `Last update: ${formatted}`,
    liveUpdateNote: " · อัปเดตสดผ่าน WebSocket ดึงข้อมูลจากอุปกรณ์ทุก 5 นาที",
  },
  portTable: {
    port: "Port",
    status: "สถานะ",
    speed: "ความเร็ว",
    bandwidth: "Bandwidth",
    trafficIn: "Traffic In",
    trafficOut: "Traffic Out",
    noPorts: "ไม่มีข้อมูลพอร์ต",
    up: "Up",
    down: "Down",
  },
  trafficChart: {
    collecting: "กำลังรวบรวมข้อมูล Traffic แบบเรียลไทม์...",
  },
  deviceMap: {
    noPositions: "ยังไม่มีอุปกรณ์ที่ระบุตำแหน่งบนแผนที่ในโซนนี้",
    viewDetails: "ดูรายละเอียด →",
  },
  alerts: {
    all: "ทั้งหมด",
    noAlerts: "ไม่มีการแจ้งเตือน",
    noAlertsThisZone: "ไม่มีการแจ้งเตือนในโซนนี้",
    noAlertsThisSeverity: "ไม่มีการแจ้งเตือนระดับนี้ในโซนนี้",
    countSuffix: (count) => `${count} alerts`,
  },
  kinds: {
    switch: "Switch",
    access_point: "Access Point",
  },
  zoneToasts: {
    added: (name) => `เพิ่มโซน "${name}" แล้ว`,
    renamed: "บันทึกชื่อโซนแล้ว",
    deleted: (name) => `ลบโซน "${name}" แล้ว`,
    deviceAdded: (name) => `เพิ่มอุปกรณ์ "${name}" แล้ว`,
    deviceUpdated: "บันทึกข้อมูลอุปกรณ์แล้ว",
    deviceDeleted: (name) => `ลบอุปกรณ์ "${name}" แล้ว`,
  },
  alertMessages: {
    deviceOffline: "สูญเสียการเชื่อมต่อกับอุปกรณ์ (Offline)",
    highBandwidth: "การใช้งาน Bandwidth สูงกว่าปกติ",
    highMemory: "การใช้งาน Memory สูงเกินเกณฑ์",
    highCpu: "การใช้งาน CPU สูงเกินเกณฑ์",
  },
};

export type Locale = "en" | "th";

export const dictionaries: Record<Locale, Dictionary> = { en, th };

export const localeIntlTag: Record<Locale, string> = {
  en: "en-US",
  th: "th-TH",
};
