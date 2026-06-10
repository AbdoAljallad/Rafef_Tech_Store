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

export const demoProducts: DemoProductSeed[] = [
  {
    sku: 'DEMO-HDMI-2M',
    defaultName: 'Кабель HDMI 2м Premium',
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
    defaultName: 'Беспроводная мышь Rafef Air',
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
    defaultName: 'SSD 512GB SATA',
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
    defaultName: 'Зарядное устройство 65W USB-C',
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
    defaultName: 'Камера видеонаблюдения 5MP',
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
    defaultName: 'Оперативная память 16GB DDR4',
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

export const demoInvoices: DemoInvoiceSeed[] = [
  {
    invoiceCode: 'DEMO-SINV-001',
    customerIndex: 0,
    isWalkIn: false,
    status: 'approved',
    lines: [
      { sku: 'DEMO-HDMI-2M', quantity: 2, unitPrice: 149 },
      { sku: 'DEMO-MOUSE-WL', quantity: 1, unitPrice: 349 },
    ],
  },
  {
    invoiceCode: 'DEMO-SINV-002',
    customerIndex: 1,
    isWalkIn: false,
    status: 'draft',
    lines: [
      { sku: 'DEMO-SSD-512', quantity: 1, unitPrice: 1890 },
      { sku: 'DEMO-RAM-16GB', quantity: 1, unitPrice: 1040 },
    ],
  },
  {
    invoiceCode: 'DEMO-SINV-003',
    customerIndex: null,
    isWalkIn: true,
    status: 'voided',
    lines: [
      { sku: 'DEMO-CCTV-5MP', quantity: 1, unitPrice: 1390 },
      { sku: 'DEMO-CHARGER-65W', quantity: 1, unitPrice: 520 },
    ],
  },
];

export const demoRepairOrders: DemoRepairOrderSeed[] = [
  {
    orderCode: 'DEMO-REP-001',
    customerIndex: 0,
    deviceCategoryCode: 'phone',
    brandName: 'Samsung',
    deviceName: 'Samsung Galaxy A54',
    serialNo: 'DEMO-SAM-A54-001',
    problemDescription: 'Разбит экран и нестабильно работает сенсор.',
    intakeNotes: 'Устройство включается, но верхняя часть дисплея не реагирует на касания.',
    status: 'inspection',
    noteText: 'Клиент просил предварительно согласовать стоимость до замены дисплея.',
    services: [{ serviceName: 'Диагностика и подготовка к замене экрана', quantity: 1, unitPrice: 180 }],
  },
  {
    orderCode: 'DEMO-REP-002',
    customerIndex: 1,
    deviceCategoryCode: 'printer',
    brandName: 'HP',
    deviceName: 'HP LaserJet Pro 400',
    serialNo: 'DEMO-HP-LJ400-002',
    problemDescription: 'Постоянное замятие бумаги и шум при захвате листа.',
    intakeNotes: 'Картридж клиента установлен, печать бледная после очистки.',
    status: 'ready_for_delivery',
    noteText: 'Заказ готов к выдаче, клиенту нужно проверить качество тестовой страницы.',
    services: [
      { serviceName: 'Чистка тракта подачи бумаги', quantity: 1, unitPrice: 250 },
      { serviceName: 'Регулировка роликов подачи', quantity: 1, unitPrice: 190 },
    ],
  },
];
