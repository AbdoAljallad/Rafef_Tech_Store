export type DemoProductSeed = {
  sku: string;
  defaultName: string;
  categoryCode: string;
  unitCode: string;
  trackingType: 'quantity' | 'serial' | 'batch';
  purchasePrice: number;
  salePrice: number;
  reorderThreshold: number;
  barcode: string;
  quantityOnHand: number;
};

export type DemoInvoiceSeed = {
  invoiceCode: string;
  customerIndex: number | null;
  isWalkIn: boolean;
  status: 'draft' | 'approved' | 'voided';
  lines: Array<{
    sku: string;
    quantity: number;
    unitPrice: number;
  }>;
};

export type DemoRepairOrderSeed = {
  orderCode: string;
  customerIndex: number;
  deviceCategoryCode: string;
  brandName: string;
  deviceName: string;
  serialNo: string;
  problemDescription: string;
  intakeNotes: string;
  status: 'new' | 'inspection' | 'waiting_customer_approval' | 'waiting_part' | 'in_repair' | 'ready_for_delivery';
  noteText: string;
  services: Array<{
    serviceName: string;
    quantity: number;
    unitPrice: number;
  }>;
};

type ProductSeedInput = Omit<DemoProductSeed, 'barcode'>;

function product(
  sku: string,
  defaultName: string,
  categoryCode: string,
  purchasePrice: number,
  salePrice: number,
  reorderThreshold: number,
  quantityOnHand: number,
  options: Partial<Pick<DemoProductSeed, 'unitCode' | 'trackingType'>> = {},
): ProductSeedInput {
  return {
    sku,
    defaultName,
    categoryCode,
    unitCode: options.unitCode ?? 'piece',
    trackingType: options.trackingType ?? 'quantity',
    purchasePrice,
    salePrice,
    reorderThreshold,
    quantityOnHand,
  };
}

function withGeneratedBarcodes(startAt: number, products: ProductSeedInput[]): DemoProductSeed[] {
  return products.map((item, index) => ({
    ...item,
    barcode: String(startAt + index),
  }));
}

function line(sku: string, quantity: number, unitPrice: number) {
  return { sku, quantity, unitPrice };
}

function invoice(
  invoiceCode: string,
  customerIndex: number | null,
  status: DemoInvoiceSeed['status'],
  lines: DemoInvoiceSeed['lines'],
  isWalkIn = false,
): DemoInvoiceSeed {
  return {
    invoiceCode,
    customerIndex,
    isWalkIn,
    status,
    lines,
  };
}

const baseDemoProducts: DemoProductSeed[] = [
  {
    sku: 'DEMO-HDMI-2M',
    defaultName: 'HDMI Cable 2m Premium',
    categoryCode: 'cables',
    unitCode: 'piece',
    trackingType: 'quantity',
    purchasePrice: 85,
    salePrice: 149,
    reorderThreshold: 5,
    barcode: '6297001000011',
    quantityOnHand: 24,
  },
  {
    sku: 'DEMO-MOUSE-WL',
    defaultName: 'Rafef Air Wireless Mouse',
    categoryCode: 'accessories',
    unitCode: 'piece',
    trackingType: 'quantity',
    purchasePrice: 220,
    salePrice: 349,
    reorderThreshold: 4,
    barcode: '6297001000012',
    quantityOnHand: 18,
  },
  {
    sku: 'DEMO-SSD-512',
    defaultName: 'SATA SSD 512GB',
    categoryCode: 'laptop_pc_products',
    unitCode: 'piece',
    trackingType: 'quantity',
    purchasePrice: 1450,
    salePrice: 1890,
    reorderThreshold: 3,
    barcode: '6297001000013',
    quantityOnHand: 9,
  },
  {
    sku: 'DEMO-CHARGER-65W',
    defaultName: 'USB-C Charger 65W',
    categoryCode: 'accessories',
    unitCode: 'piece',
    trackingType: 'quantity',
    purchasePrice: 310,
    salePrice: 520,
    reorderThreshold: 4,
    barcode: '6297001000014',
    quantityOnHand: 13,
  },
  {
    sku: 'DEMO-CCTV-5MP',
    defaultName: 'CCTV Camera 5MP',
    categoryCode: 'cameras',
    unitCode: 'piece',
    trackingType: 'quantity',
    purchasePrice: 980,
    salePrice: 1390,
    reorderThreshold: 2,
    barcode: '6297001000015',
    quantityOnHand: 7,
  },
  {
    sku: 'DEMO-RAM-16GB',
    defaultName: 'DDR4 Memory 16GB',
    categoryCode: 'spare_parts',
    unitCode: 'piece',
    trackingType: 'quantity',
    purchasePrice: 760,
    salePrice: 1040,
    reorderThreshold: 3,
    barcode: '6297001000016',
    quantityOnHand: 11,
  },
];

const additionalDemoProducts = withGeneratedBarcodes(6297002000001, [
  product('ACC-MSE-LOGI-M185', 'Logitech M185 Wireless Mouse', 'accessories', 420, 650, 6, 28),
  product('ACC-MSE-HP-X1000', 'HP X1000 Wired Mouse', 'accessories', 120, 220, 8, 35),
  product('ACC-KBD-LOGI-K120', 'Logitech K120 USB Keyboard', 'accessories', 260, 420, 6, 22),
  product('ACC-KBD-A4-FK10', 'A4Tech Fstyler FK10 Keyboard', 'accessories', 310, 480, 5, 19),
  product('ACC-ROUTER-ARCHERC6', 'TP-Link Archer C6 Router', 'accessories', 1850, 2550, 3, 9),
  product('ACC-ROUTER-TENDA-N301', 'Tenda N301 Router', 'accessories', 780, 1180, 4, 14),
  product('ACC-CHARGER-USBC25', 'USB-C 25W Fast Charger', 'accessories', 190, 320, 8, 30),
  product('ACC-CABLE-LIGHTNING-1M', 'USB-C to Lightning Cable 1m', 'cables', 75, 150, 8, 42),
  product('ACC-CABLE-USBC-1M', 'USB-C to USB-C Cable 1m', 'cables', 68, 135, 8, 48),
  product('ACC-POWERBANK-10K', 'Power Bank 10000mAh', 'accessories', 620, 920, 4, 17),
  product('ACC-BAG-LAP156', 'Laptop Backpack 15.6 Inch', 'accessories', 550, 840, 4, 11),
  product('ACC-HUB-USB3-4P', 'UGREEN USB 3.0 Hub 4-Port', 'accessories', 330, 550, 4, 16),
  product('ACC-SPEAKER-BT-MINI', 'Mini Bluetooth Speaker', 'accessories', 480, 720, 4, 13),
  product('ACC-HDMI-5M', 'HDMI Cable 5m Premium', 'cables', 120, 220, 6, 26),
  product('ACC-VGA-1M5', 'VGA Cable 1.5m', 'cables', 75, 140, 8, 40),
  product('ACC-ADAPTER-DP-HDMI', 'DisplayPort to HDMI Adapter', 'accessories', 165, 290, 5, 18),
  product('ACC-WEBCAM-1080P', 'Full HD Webcam 1080p', 'accessories', 720, 1080, 3, 12),
  product('ACC-HEADSET-OFFICE', 'Office Headset with Microphone', 'accessories', 460, 720, 4, 15),
  product('ACC-PRESENTER-R400', 'Wireless Presenter R400', 'accessories', 390, 620, 4, 10),
  product('ACC-LABEL-THERMAL', 'Thermal Label Printer 4x6', 'laptop_pc_products', 2500, 3600, 2, 6, {
    trackingType: 'serial',
  }),
  product('PC-SSD-NV2-1TB', 'Kingston NV2 1TB NVMe SSD', 'laptop_pc_products', 1800, 2490, 5, 14),
  product('PC-SSD-WDBLUE-1TB', 'WD Blue 1TB SATA SSD', 'laptop_pc_products', 2050, 2790, 4, 10),
  product('PC-SSD-CRUCIAL-240', 'Crucial BX500 240GB SSD', 'laptop_pc_products', 780, 1180, 7, 20),
  product('PC-HDD-SEAGATE-1TB', 'Seagate Barracuda 1TB HDD', 'laptop_pc_products', 1250, 1680, 5, 11),
  product('PC-RAM-CORSAIR-8GB', 'Corsair Vengeance 8GB DDR4', 'laptop_pc_products', 560, 860, 6, 16),
  product('PC-RAM-KINGSTON-16S', 'Kingston 16GB DDR4 SO-DIMM', 'laptop_pc_products', 890, 1290, 5, 12),
  product('PC-ADAPTER-DELL-65W', 'Dell 65W Laptop Adapter', 'laptop_pc_products', 390, 620, 5, 18),
  product('PC-ADAPTER-HP-45W', 'HP 45W Laptop Adapter', 'laptop_pc_products', 320, 520, 5, 16),
  product('PC-CPU-I5-12400', 'Intel Core i5-12400', 'laptop_pc_products', 6200, 7490, 2, 5),
  product('PC-MB-H610M', 'Gigabyte H610M Motherboard', 'laptop_pc_products', 3650, 4490, 2, 6),
  product('PC-PSU-500W', 'ATX 500W Power Supply', 'laptop_pc_products', 1180, 1680, 3, 9),
  product('PC-COOLER-H410R', 'Cooler Master Hyper H410R', 'laptop_pc_products', 850, 1250, 3, 8),
  product('PC-MONITOR-24IPS', '23.8 Inch IPS Monitor', 'laptop_pc_products', 3650, 4790, 2, 7, {
    trackingType: 'serial',
  }),
  product('PC-SCANNER-LIDE300', 'Canon LiDE 300 Scanner', 'laptop_pc_products', 2550, 3290, 2, 5, {
    trackingType: 'serial',
  }),
  product('PC-WIFI-USB-AC600', 'TP-Link USB Wi-Fi Adapter AC600', 'laptop_pc_products', 290, 460, 5, 14),
  product('PC-DVD-EXT', 'External USB DVD Writer', 'laptop_pc_products', 870, 1280, 3, 9),
  product('PC-FLASH-64GB', 'USB Flash Drive 64GB', 'laptop_pc_products', 160, 260, 10, 45),
  product('PC-HDD-EXT-2TB', 'Portable External HDD 2TB', 'laptop_pc_products', 2450, 3190, 2, 7, {
    trackingType: 'serial',
  }),
  product('PC-UPS-650VA', 'APC 650VA UPS', 'laptop_pc_products', 1950, 2690, 2, 6, {
    trackingType: 'serial',
  }),
  product('PC-CASE-MATX', 'Airflow mATX Case', 'laptop_pc_products', 1400, 1990, 2, 8),
  product('REP-SCR-IP11', 'OLED Screen Assembly for iPhone 11', 'spare_parts', 1850, 2650, 3, 7),
  product('REP-BAT-IP11', 'Battery for iPhone 11', 'spare_parts', 480, 790, 5, 15),
  product('REP-CHPORT-IP12', 'Charging Port Flex for iPhone 12', 'spare_parts', 220, 420, 5, 14),
  product('REP-SCR-SAMA54', 'Service Pack Screen for Samsung Galaxy A54', 'spare_parts', 2250, 3150, 3, 6),
  product('REP-BAT-SAMA54', 'Battery for Samsung Galaxy A54', 'spare_parts', 520, 850, 5, 12),
  product('REP-CHPORT-SAMA34', 'Charging Port Board for Samsung Galaxy A34', 'spare_parts', 160, 320, 5, 16),
  product('REP-LCD-REDMI12', 'LCD Screen for Redmi Note 12', 'spare_parts', 1150, 1750, 4, 9),
  product('REP-BAT-REDMI12', 'Battery for Redmi Note 12', 'spare_parts', 390, 650, 5, 18),
  product('REP-SCR-OPPOA78', 'Screen Assembly for Oppo A78', 'spare_parts', 1580, 2250, 3, 8),
  product('REP-BAT-HWY9PRIME', 'Battery for Huawei Y9 Prime', 'spare_parts', 420, 690, 5, 11),
  product('REP-CHPORT-USBC', 'Universal USB-C Charging Port', 'spare_parts', 35, 90, 10, 90),
  product('REP-CHPORT-MICRO', 'Universal Micro USB Charging Port', 'spare_parts', 25, 75, 10, 120),
  product('REP-KBD-DELL5490', 'Keyboard for Dell Latitude 5490', 'spare_parts', 310, 620, 4, 13),
  product('REP-KBD-HP250G8', 'Keyboard for HP 250 G8', 'spare_parts', 290, 580, 4, 12),
  product('REP-BAT-LENOVOIP3', 'Battery for Lenovo IdeaPad 3', 'spare_parts', 720, 1190, 4, 9),
  product('REP-DCJACK-ASP5', 'DC Jack for Acer Aspire 5', 'spare_parts', 65, 160, 8, 26),
  product('REP-FAN-ASUSVIVO', 'Cooling Fan for ASUS VivoBook', 'spare_parts', 190, 390, 6, 18),
  product('REP-LCD-156-30PIN', '15.6 Inch Slim Laptop Screen 30-pin', 'spare_parts', 1680, 2390, 3, 7),
  product('REP-LCD-140-30PIN', '14.0 Inch Laptop Screen 30-pin', 'spare_parts', 1540, 2190, 3, 7),
  product('REP-SATA-FLEX', 'Laptop SATA Flex Cable', 'spare_parts', 75, 180, 8, 24),
  product('REP-HINGE-156', 'Laptop Hinges Set 15.6 Inch', 'spare_parts', 120, 260, 6, 17),
  product('REP-ROLLER-HPLJ', 'Pickup Roller Kit for HP LaserJet', 'spare_parts', 95, 220, 8, 24),
  product('REP-HEAD-EPSL3110', 'Printhead for Epson L3110', 'spare_parts', 980, 1490, 3, 8),
  product('REP-WASTE-CANG3411', 'Waste Ink Pad for Canon G3411', 'spare_parts', 70, 180, 8, 20),
  product('REP-FUSERFILM-LJ', 'Printer Fuser Film Sleeve', 'spare_parts', 140, 320, 6, 14),
  product('CCTV-DOME-HIK-2MP', 'Hikvision 2MP Dome Camera', 'cameras', 690, 980, 3, 12, {
    trackingType: 'serial',
  }),
  product('CCTV-TURRET-HIK-5MP', 'Hikvision 5MP Turret Camera', 'cameras', 1080, 1490, 3, 8, {
    trackingType: 'serial',
  }),
  product('CCTV-BULLET-DAH-2MP', 'Dahua 2MP Bullet Camera', 'cameras', 720, 1020, 3, 10, {
    trackingType: 'serial',
  }),
  product('CCTV-DOME-UNV-4MP', 'Uniview 4MP Dome Camera', 'cameras', 960, 1360, 3, 9, {
    trackingType: 'serial',
  }),
  product('DVR-HIK-8CH', 'Hikvision 8-Channel DVR', 'dvr_nvr', 1850, 2590, 2, 5, {
    trackingType: 'serial',
  }),
  product('XVR-DAH-16CH', 'Dahua 16-Channel XVR', 'dvr_nvr', 3150, 4190, 2, 4, {
    trackingType: 'serial',
  }),
  product('SW-POE-8P', '8-Port PoE Switch', 'dvr_nvr', 1450, 1990, 3, 7),
  product('SW-GIGA-16P', '16-Port Gigabit Switch', 'dvr_nvr', 1780, 2450, 2, 6),
  product('CBL-CAT6-M', 'Cat6 UTP Cable per Meter', 'cables', 7, 14, 80, 550, { unitCode: 'meter' }),
  product('CBL-RG59P-M', 'RG59 + Power Cable per Meter', 'cables', 11, 22, 60, 420, { unitCode: 'meter' }),
  product('CONN-BNC-SCREW', 'BNC Screw Connector', 'cables', 6, 15, 20, 250),
  product('CONN-RJ45-CAT6', 'RJ45 Connector Cat6', 'cables', 1.8, 5, 100, 800),
  product('PSU-CCTV-12V10A', '12V 10A CCTV Power Supply', 'dvr_nvr', 230, 390, 5, 18),
  product('BOX-JUNCTION-CCTV', 'CCTV Junction Box', 'cameras', 45, 95, 10, 60),
  product('HDD-SURV-2TB', '2TB Surveillance HDD', 'dvr_nvr', 2150, 2890, 2, 5),
  product('INK-EPS003-BK', 'Epson 003 Black Ink Bottle', 'ink', 150, 240, 10, 50, {
    trackingType: 'batch',
  }),
  product('INK-EPS003-C', 'Epson 003 Cyan Ink Bottle', 'ink', 145, 240, 10, 44, {
    trackingType: 'batch',
  }),
  product('INK-EPS003-M', 'Epson 003 Magenta Ink Bottle', 'ink', 145, 240, 10, 42, {
    trackingType: 'batch',
  }),
  product('INK-EPS003-Y', 'Epson 003 Yellow Ink Bottle', 'ink', 145, 240, 10, 42, {
    trackingType: 'batch',
  }),
  product('INK-EPS664-BK', 'Epson 664 Black Ink Bottle', 'ink', 135, 220, 10, 36, {
    trackingType: 'batch',
  }),
  product('INK-CAN-GI41-BK', 'Canon GI-41 Black Ink Bottle', 'ink', 160, 250, 10, 34, {
    trackingType: 'batch',
  }),
  product('INK-CAN-GI41-C', 'Canon GI-41 Cyan Ink Bottle', 'ink', 155, 250, 10, 28, {
    trackingType: 'batch',
  }),
  product('INK-HP-GT53-BK', 'HP GT53 Black Ink Bottle', 'ink', 170, 260, 8, 24, {
    trackingType: 'batch',
  }),
  product('INK-ECOSOL-CYAN', 'Eco Solvent Ink Cyan 1L', 'ink', 390, 620, 6, 18, {
    trackingType: 'batch',
  }),
  product('INK-ECOSOL-MAG', 'Eco Solvent Ink Magenta 1L', 'ink', 390, 620, 6, 18, {
    trackingType: 'batch',
  }),
  product('INK-DTF-BLACK', 'DTF Pigment Ink Black 1L', 'ink', 520, 780, 4, 14, {
    trackingType: 'batch',
  }),
  product('PPR-A4-80G', 'A4 Copy Paper 80gsm Ream', 'paper', 150, 220, 10, 80, {
    unitCode: 'ream',
    trackingType: 'batch',
  }),
  product('PPR-A3-80G', 'A3 Copy Paper 80gsm Ream', 'paper', 290, 390, 8, 40, {
    unitCode: 'ream',
    trackingType: 'batch',
  }),
  product('PPR-PHOTO-A4-180', 'Glossy Photo Paper A4 180gsm Pack', 'paper', 85, 140, 10, 36, {
    unitCode: 'box',
    trackingType: 'batch',
  }),
  product('PPR-PHOTO-A4-230', 'Matte Photo Paper A4 230gsm Pack', 'paper', 95, 155, 8, 28, {
    unitCode: 'box',
    trackingType: 'batch',
  }),
  product('PPR-SUBL-A4', 'Sublimation Paper A4 Pack', 'paper', 110, 170, 6, 24, {
    unitCode: 'box',
    trackingType: 'batch',
  }),
  product('PPR-STICKER-A4', 'Glossy Sticker Paper A4 Pack', 'paper', 88, 145, 8, 30, {
    unitCode: 'box',
    trackingType: 'batch',
  }),
  product('MAT-PVC-ID', 'PVC ID Card Sheet Pack', 'printing_materials', 180, 280, 5, 20, {
    unitCode: 'box',
  }),
  product('MAT-LAM-COLD-1M', 'Cold Lamination Film 1m', 'printing_materials', 28, 52, 40, 160, {
    unitCode: 'meter',
  }),
  product('MAT-ROLLUP-85X200', 'Roll-Up Banner Stand 85x200', 'printing_materials', 420, 680, 4, 12),
  product('MAT-FLEX-440G', 'Flex Banner 440gsm per Meter', 'printing_materials', 22, 42, 50, 220, {
    unitCode: 'meter',
  }),
  product('MAT-VINYL-MATTE', 'Self Adhesive Vinyl Matte 1m', 'printing_materials', 38, 72, 30, 140, {
    unitCode: 'meter',
  }),
  product('MAT-CANVAS-061', 'Canvas Print Roll 0.61m', 'printing_materials', 55, 98, 20, 110, {
    unitCode: 'meter',
  }),
  product('MAT-HTV-WHITE', 'Heat Transfer Vinyl White 0.5m', 'printing_materials', 32, 65, 20, 120, {
    unitCode: 'meter',
  }),
  product('MAT-FOAM-A3', 'Foam Board 5mm A3 Sheet', 'printing_materials', 18, 35, 20, 90, {
    unitCode: 'sheet',
  }),
  product('MAT-PVCBOARD-A3', 'PVC Board 3mm A3 Sheet', 'printing_materials', 24, 46, 15, 76, {
    unitCode: 'sheet',
  }),
  product('MAT-CUTMAT-A3', 'Cutting Mat A3', 'printing_materials', 95, 160, 5, 18),
  product('MAT-LAMI-POUCH-A4', 'A4 Laminating Pouch 100 pcs', 'printing_materials', 120, 190, 6, 22, {
    unitCode: 'box',
  }),
  product('MAT-PHOTOBOOK-COVER', 'Photo Book Cover A4 Pack', 'printing_materials', 140, 225, 5, 16, {
    unitCode: 'box',
  }),
  product('MAT-SUBL-MUG', 'Sublimation Mug Blank 11oz', 'printing_materials', 58, 95, 12, 48),
]);

export const demoProducts: DemoProductSeed[] = [...baseDemoProducts, ...additionalDemoProducts];

const baseDemoInvoices: DemoInvoiceSeed[] = [
  invoice('DEMO-SINV-001', 0, 'approved', [
    line('DEMO-HDMI-2M', 2, 149),
    line('DEMO-MOUSE-WL', 1, 349),
  ]),
  invoice('DEMO-SINV-002', 1, 'draft', [
    line('DEMO-SSD-512', 1, 1890),
    line('DEMO-RAM-16GB', 1, 1040),
  ]),
  invoice('DEMO-SINV-003', null, 'voided', [
    line('DEMO-CCTV-5MP', 1, 1390),
    line('DEMO-CHARGER-65W', 1, 520),
  ], true),
];

const additionalDemoInvoices: DemoInvoiceSeed[] = [
  invoice('DEMO-SINV-101', 0, 'approved', [
    line('ACC-KBD-LOGI-K120', 2, 420),
    line('ACC-MSE-LOGI-M185', 2, 650),
    line('PPR-A4-80G', 3, 220),
  ]),
  invoice('DEMO-SINV-102', 1, 'approved', [
    line('PC-SSD-NV2-1TB', 1, 2490),
    line('PC-RAM-CORSAIR-8GB', 2, 860),
    line('PC-WIFI-USB-AC600', 1, 460),
  ]),
  invoice('DEMO-SINV-103', 2, 'approved', [
    line('REP-BAT-IP11', 1, 790),
    line('REP-CHPORT-USBC', 3, 90),
    line('ACC-CHARGER-USBC25', 1, 320),
  ]),
  invoice('DEMO-SINV-104', 3, 'draft', [
    line('REP-SCR-SAMA54', 1, 3150),
    line('REP-BAT-SAMA54', 1, 850),
    line('REP-CHPORT-SAMA34', 2, 320),
  ]),
  invoice('DEMO-SINV-105', 4, 'approved', [
    line('CCTV-TURRET-HIK-5MP', 2, 1490),
    line('DVR-HIK-8CH', 1, 2590),
    line('CBL-CAT6-M', 50, 14),
    line('PSU-CCTV-12V10A', 1, 390),
  ]),
  invoice('DEMO-SINV-106', 5, 'approved', [
    line('MAT-ROLLUP-85X200', 2, 680),
    line('MAT-VINYL-MATTE', 20, 72),
    line('MAT-LAMI-POUCH-A4', 1, 190),
  ]),
  invoice('DEMO-SINV-107', 6, 'approved', [
    line('INK-EPS003-BK', 2, 240),
    line('INK-EPS003-C', 1, 240),
    line('INK-EPS003-M', 1, 240),
    line('INK-EPS003-Y', 1, 240),
    line('PPR-PHOTO-A4-180', 3, 140),
  ]),
  invoice('DEMO-SINV-108', 7, 'voided', [
    line('REP-LCD-156-30PIN', 1, 2390),
    line('REP-FAN-ASUSVIVO', 1, 390),
  ]),
  invoice('DEMO-SINV-109', 8, 'approved', [
    line('ACC-CHARGER-USBC25', 3, 320),
    line('ACC-POWERBANK-10K', 2, 920),
    line('ACC-HEADSET-OFFICE', 1, 720),
  ]),
  invoice('DEMO-SINV-110', 9, 'draft', [
    line('REP-KBD-HP250G8', 1, 580),
    line('PC-ADAPTER-DELL-65W', 1, 620),
  ]),
  invoice('DEMO-SINV-111', 10, 'approved', [
    line('ACC-ROUTER-ARCHERC6', 1, 2550),
    line('SW-GIGA-16P', 1, 2450),
    line('CONN-RJ45-CAT6', 50, 5),
    line('CBL-CAT6-M', 100, 14),
  ]),
  invoice('DEMO-SINV-112', 11, 'approved', [
    line('INK-CAN-GI41-BK', 2, 250),
    line('INK-CAN-GI41-C', 2, 250),
    line('PPR-STICKER-A4', 4, 145),
    line('MAT-LAM-COLD-1M', 10, 52),
  ]),
  invoice('DEMO-SINV-113', 12, 'approved', [
    line('PC-MONITOR-24IPS', 2, 4790),
    line('PC-UPS-650VA', 1, 2690),
    line('PC-CASE-MATX', 2, 1990),
  ]),
  invoice('DEMO-SINV-114', 13, 'approved', [
    line('MAT-CANVAS-061', 10, 98),
    line('MAT-HTV-WHITE', 12, 65),
    line('MAT-SUBL-MUG', 24, 95),
  ]),
  invoice('DEMO-SINV-115', 14, 'voided', [
    line('PC-HDD-EXT-2TB', 1, 3190),
    line('PC-SCANNER-LIDE300', 1, 3290),
    line('ACC-WEBCAM-1080P', 1, 1080),
  ]),
  invoice('DEMO-SINV-116', null, 'approved', [
    line('PC-FLASH-64GB', 10, 260),
    line('ACC-PRESENTER-R400', 2, 620),
    line('ACC-BAG-LAP156', 2, 840),
  ], true),
  invoice('DEMO-SINV-117', 15, 'approved', [
    line('INK-HP-GT53-BK', 2, 260),
    line('REP-HEAD-EPSL3110', 1, 1490),
    line('REP-ROLLER-HPLJ', 2, 220),
    line('PPR-A3-80G', 3, 390),
  ]),
  invoice('DEMO-SINV-118', 16, 'approved', [
    line('XVR-DAH-16CH', 1, 4190),
    line('CCTV-DOME-UNV-4MP', 4, 1360),
    line('CBL-RG59P-M', 80, 22),
    line('BOX-JUNCTION-CCTV', 4, 95),
  ]),
  invoice('DEMO-SINV-119', 17, 'draft', [
    line('PC-CPU-I5-12400', 1, 7490),
    line('PC-MB-H610M', 1, 4490),
    line('PC-PSU-500W', 1, 1680),
    line('PC-COOLER-H410R', 1, 1250),
  ]),
  invoice('DEMO-SINV-120', 18, 'approved', [
    line('REP-SCR-IP11', 1, 2650),
    line('REP-BAT-IP11', 1, 790),
    line('REP-CHPORT-SAMA34', 2, 320),
    line('REP-HINGE-156', 2, 260),
    line('REP-SATA-FLEX', 3, 180),
  ]),
  invoice('DEMO-SINV-121', 19, 'approved', [
    line('MAT-FLEX-440G', 30, 42),
    line('MAT-FOAM-A3', 20, 35),
    line('MAT-PVCBOARD-A3', 15, 46),
    line('MAT-PVC-ID', 2, 280),
  ]),
  invoice('DEMO-SINV-122', 20, 'approved', [
    line('ACC-LABEL-THERMAL', 1, 3600),
    line('PPR-STICKER-A4', 6, 145),
    line('MAT-CUTMAT-A3', 1, 160),
  ]),
  invoice('DEMO-SINV-123', 21, 'approved', [
    line('PC-SCANNER-LIDE300', 1, 3290),
    line('MAT-CUTMAT-A3', 1, 160),
    line('MAT-PVC-ID', 1, 280),
    line('PPR-PHOTO-A4-230', 4, 155),
  ]),
  invoice('DEMO-SINV-124', 22, 'approved', [
    line('ACC-MSE-HP-X1000', 5, 220),
    line('ACC-KBD-A4-FK10', 3, 480),
    line('ACC-HUB-USB3-4P', 4, 550),
    line('ACC-BAG-LAP156', 3, 840),
  ]),
  invoice('DEMO-SINV-125', 23, 'approved', [
    line('CCTV-DOME-HIK-2MP', 2, 980),
    line('SW-POE-8P', 1, 1990),
    line('HDD-SURV-2TB', 1, 2890),
    line('CBL-CAT6-M', 40, 14),
  ]),
];

export const demoInvoices: DemoInvoiceSeed[] = [...baseDemoInvoices, ...additionalDemoInvoices];

export const demoRepairOrders: DemoRepairOrderSeed[] = [
  {
    orderCode: 'DEMO-REP-001',
    customerIndex: 0,
    deviceCategoryCode: 'phone',
    brandName: 'Samsung',
    deviceName: 'Samsung Galaxy A54',
    serialNo: 'DEMO-SAM-A54-001',
    problemDescription: 'Cracked screen and unstable touch response on the upper part of the display.',
    intakeNotes: 'The device powers on, but the top section of the screen does not respond consistently.',
    status: 'inspection',
    noteText: 'Customer asked for approval before any full display replacement is started.',
    services: [{ serviceName: 'Diagnostics and screen replacement preparation', quantity: 1, unitPrice: 180 }],
  },
  {
    orderCode: 'DEMO-REP-002',
    customerIndex: 1,
    deviceCategoryCode: 'printer',
    brandName: 'HP',
    deviceName: 'HP LaserJet Pro 400',
    serialNo: 'DEMO-HP-LJ400-002',
    problemDescription: 'Frequent paper jams and loud noise during paper pickup.',
    intakeNotes: 'Customer cartridge installed. Print density remains light after cleaning.',
    status: 'ready_for_delivery',
    noteText: 'Order is ready for pickup after the customer checks the test print quality.',
    services: [
      { serviceName: 'Paper feed path cleaning', quantity: 1, unitPrice: 250 },
      { serviceName: 'Pickup roller adjustment', quantity: 1, unitPrice: 190 },
    ],
  },
];
