import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import type { Connection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { env } from '../src/config/env.js';

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
const backendRoot = path.resolve(currentDir, '..');
const backupDir = path.resolve(backendRoot, 'tmp/rebuild-backups');

const customerFirstNames = [
  'Алексей', 'Иван', 'Дмитрий', 'Сергей', 'Никита', 'Павел', 'Максим', 'Егор', 'Михаил', 'Владимир',
  'Андрей', 'Артём', 'Олег', 'Кирилл', 'Роман', 'Степан', 'Юрий', 'Виктор', 'Константин', 'Денис',
  'Анна', 'Мария', 'Елена', 'Ольга', 'Наталья', 'Светлана', 'Ирина', 'Татьяна', 'Дарья', 'Ксения',
  'Юлия', 'Виктория', 'Алина', 'Полина', 'Екатерина', 'Людмила', 'Валерия', 'София', 'Лидия', 'Марина',
];

const customerLastNames = [
  'Иванов', 'Петров', 'Сидоров', 'Смирнов', 'Кузнецов', 'Попов', 'Соколов', 'Лебедев', 'Козлов', 'Новиков',
  'Морозов', 'Волков', 'Фёдоров', 'Михайлов', 'Белов', 'Комаров', 'Орлов', 'Макаров', 'Зайцев', 'Павлов',
  'Романов', 'Громов', 'Титов', 'Гусев', 'Васильев', 'Савельев', 'Тарасов', 'Киселёв', 'Медведев', 'Алексеев',
];

const businessPrefixes = ['ООО', 'ИП', 'ТД', 'Сервис-центр', 'Магазин', 'Студия', 'Компания'];
const businessNames = [
  'Северный Вектор', 'ТехноПоток', 'Город Камер', 'КомпСнаб', 'ПрофиСервис', 'Сигнал Плюс', 'Принт Мастер',
  'Цифровой Контур', 'Линия Безопасности', 'ГлавТехСервис', 'Новый Офис', 'Формат Плюс', 'Точка Видео',
  'Склад Решений', 'Восток Системы', 'Гранд Электро', 'Ритм Сети', 'Спектр Печати', 'Класс Камера', 'Орбита Тех',
];

const cities = [
  { city: 'Москва', streets: ['Тверская', 'Садовая', 'Ленинградский проспект', 'Проспект Мира', 'Новослободская'] },
  { city: 'Санкт-Петербург', streets: ['Невский проспект', 'Лиговский проспект', 'Садовая', 'Марата', 'Пионерская'] },
  { city: 'Казань', streets: ['Баумана', 'Чистопольская', 'Ямашева', 'Петербургская', 'Кремлёвская'] },
  { city: 'Екатеринбург', streets: ['Малышева', 'Ленина', 'Белинского', 'Щорса', 'Репина'] },
  { city: 'Новосибирск', streets: ['Красный проспект', 'Гоголя', 'Советская', 'Фрунзе', 'Дуси Ковальчук'] },
];

const supplierSeeds = [
  ['SUP-RU-001', 'ООО "ТехноИмпорт"', '+7 495 210-10-01', 'sales@techimport.ru', 'Москва, склад поставок аксессуаров и ПК'],
  ['SUP-RU-002', 'ООО "Кабель Профи"', '+7 495 210-10-02', 'orders@cablepro.ru', 'Москва, кабельная продукция и коммутация'],
  ['SUP-RU-003', 'ООО "Видео Контроль"', '+7 812 440-22-10', 'b2b@videocontrol.ru', 'Санкт-Петербург, камеры и регистраторы'],
  ['SUP-RU-004', 'ООО "Принт Лайн"', '+7 843 550-14-20', 'ink@printline.ru', 'Казань, расходники для печати'],
  ['SUP-RU-005', 'ООО "Сервис Партс"', '+7 343 610-11-15', 'parts@serviceparts.ru', 'Екатеринбург, запчасти и ремонт'],
  ['SUP-RU-006', 'ООО "Ноутбук Маркет"', '+7 383 310-31-16', 'supply@notebookmarket.ru', 'Новосибирск, ноутбуки и комплектующие'],
  ['SUP-RU-007', 'ООО "Сетевые Решения"', '+7 495 333-14-17', 'network@seti.ru', 'Москва, сети и роутеры'],
  ['SUP-RU-008', 'ООО "Фото Премиум"', '+7 812 455-18-19', 'photo@premium.ru', 'Санкт-Петербург, фото- и печатные материалы'],
  ['SUP-RU-009', 'ООО "Офис Бумага"', '+7 843 501-51-20', 'paper@officepaper.ru', 'Казань, бумага и ламинация'],
  ['SUP-RU-010', 'ООО "Склад Безопасности"', '+7 343 701-44-21', 'cctv@securitystock.ru', 'Екатеринбург, CCTV оборудование'],
  ['SUP-RU-011', 'ООО "Питание и Заряд"', '+7 383 280-90-22', 'power@charge.ru', 'Новосибирск, блоки питания и зарядки'],
  ['SUP-RU-012', 'ООО "Городской POS"', '+7 495 288-77-23', 'pos@citypos.ru', 'Москва, терминалы и платёжное оборудование'],
];

const providerSeeds = [
  ['BANK_SBER', 'bank', 'СберБанк', 'Сбер', null, 'RU', 10],
  ['BANK_VTB', 'bank', 'ВТБ', 'ВТБ', null, 'RU', 20],
  ['BANK_TINKOFF', 'bank', 'Т-Банк', 'Т-Банк', null, 'RU', 30],
  ['BANK_ALFA', 'bank', 'Альфа-Банк', 'Альфа', null, 'RU', 40],
  ['WALLET_YOOMONEY', 'wallet', 'ЮMoney', 'ЮMoney', null, 'RU', 100],
  ['WALLET_QIWI', 'wallet', 'QIWI Кошелёк', 'QIWI', null, 'RU', 110],
  ['WALLET_SBP', 'wallet', 'СБП Переводы', 'СБП', null, 'RU', 120],
  ['MACHINE_POS_MAIN', 'payment_machine', 'POS-терминал Verifone', 'POS Main', null, 'RU', 200],
  ['MACHINE_PAY_KIOSK', 'payment_machine', 'Платёжный терминал', 'Pay Kiosk', null, 'RU', 210],
  ['CASH_MAIN', 'cash_holder', 'Главная касса', 'Касса', null, 'RU', 300],
  ['CASH_SAFE', 'cash_holder', 'Сейф магазина', 'Сейф', null, 'RU', 310],
];

type ProductBlueprint = {
  categoryCode: string;
  unitCode: string;
  trackingType: 'quantity' | 'serial' | 'batch';
  supplierCodes: string[];
  basePurchasePrice: number;
  markup: number;
  reorderThreshold: number;
  names: string[];
  variants: string[];
};

const productBlueprints: ProductBlueprint[] = [
  {
    categoryCode: 'accessories',
    unitCode: 'piece',
    trackingType: 'quantity',
    supplierCodes: ['SUP-RU-001', 'SUP-RU-006', 'SUP-RU-011'],
    basePurchasePrice: 180,
    markup: 1.5,
    reorderThreshold: 8,
    names: ['Беспроводная мышь', 'Игровая клавиатура', 'USB-хаб', 'Веб-камера', 'Bluetooth-гарнитура', 'Коврик для мыши', 'Охлаждающая подставка', 'Картридер USB 3.0', 'Портативная колонка', 'Сумка для ноутбука'],
    variants: ['Logitech', 'A4Tech', 'Redragon', 'Baseus', 'Hoco', 'Xiaomi', 'Defender', 'Trust', 'Ritmix'],
  },
  {
    categoryCode: 'spare_parts',
    unitCode: 'piece',
    trackingType: 'quantity',
    supplierCodes: ['SUP-RU-005', 'SUP-RU-006', 'SUP-RU-011'],
    basePurchasePrice: 320,
    markup: 1.42,
    reorderThreshold: 6,
    names: ['SSD SATA 2.5"', 'Модуль памяти DDR4', 'Блок питания для ноутбука', 'Клавиатура для ноутбука', 'Аккумулятор для ноутбука', 'Вентилятор охлаждения', 'Матрица 15.6"', 'Петли экрана', 'Термопаста 4 г', 'Разъём питания'],
    variants: ['Kingston', 'Crucial', 'ADATA', 'Samsung', 'HP', 'Dell', 'Lenovo', 'Acer', 'Asus'],
  },
  {
    categoryCode: 'cameras',
    unitCode: 'piece',
    trackingType: 'serial',
    supplierCodes: ['SUP-RU-003', 'SUP-RU-010'],
    basePurchasePrice: 1850,
    markup: 1.34,
    reorderThreshold: 4,
    names: ['IP-камера 2 Мп', 'IP-камера 4 Мп', 'Купольная AHD-камера', 'Уличная цилиндрическая камера', 'Wi-Fi камера наблюдения', 'PTZ-камера', 'Камера с ИК-подсветкой', 'Антивандальная камера', 'Камера для офиса', 'Камера для склада'],
    variants: ['Hikvision', 'Dahua', 'HiWatch', 'Ezviz', 'UNV', 'TP-Link', 'IMOU'],
  },
  {
    categoryCode: 'dvr_nvr',
    unitCode: 'piece',
    trackingType: 'serial',
    supplierCodes: ['SUP-RU-003', 'SUP-RU-010'],
    basePurchasePrice: 3400,
    markup: 1.28,
    reorderThreshold: 2,
    names: ['Видеорегистратор DVR 4 канала', 'Видеорегистратор DVR 8 каналов', 'Сетевой регистратор NVR 8 каналов', 'Сетевой регистратор NVR 16 каналов', 'Жёсткий диск для видеонаблюдения 2 ТБ', 'Жёсткий диск для видеонаблюдения 4 ТБ', 'PoE-коммутатор 8 портов', 'Блок питания CCTV 12V 10A', 'Монитор для поста охраны'],
    variants: ['Hikvision', 'Dahua', 'Seagate', 'WD Purple', 'UNV'],
  },
  {
    categoryCode: 'cables',
    unitCode: 'meter',
    trackingType: 'quantity',
    supplierCodes: ['SUP-RU-002', 'SUP-RU-007', 'SUP-RU-010'],
    basePurchasePrice: 12,
    markup: 1.7,
    reorderThreshold: 50,
    names: ['Кабель UTP Cat5e', 'Кабель UTP Cat6', 'Коаксиальный кабель RG-59', 'Кабель HDMI', 'Кабель DisplayPort', 'USB Type-C кабель', 'Патч-корд 1 м', 'Патч-корд 3 м', 'Кабель питания 2x0.75', 'Кабель VGA'],
    variants: ['белый', 'чёрный', 'серый', 'экранированный', 'морозостойкий'],
  },
  {
    categoryCode: 'ink',
    unitCode: 'piece',
    trackingType: 'batch',
    supplierCodes: ['SUP-RU-004', 'SUP-RU-008'],
    basePurchasePrice: 210,
    markup: 1.48,
    reorderThreshold: 7,
    names: ['Чернила для Epson 100 мл', 'Тонер-картридж HP', 'Тонер-картридж Canon', 'Совместимый картридж Brother', 'Пигментные чернила', 'Тонер Samsung', 'Чернила для фотопечати', 'Картридж Xerox', 'Чернила для струйного МФУ'],
    variants: ['чёрный', 'голубой', 'пурпурный', 'жёлтый', 'комплект'],
  },
  {
    categoryCode: 'paper',
    unitCode: 'ream',
    trackingType: 'batch',
    supplierCodes: ['SUP-RU-009', 'SUP-RU-008'],
    basePurchasePrice: 165,
    markup: 1.37,
    reorderThreshold: 12,
    names: ['Бумага A4 80 г/м2', 'Бумага A3 80 г/м2', 'Фотобумага A4 глянцевая', 'Фотобумага A4 матовая', 'Бумага для визиток', 'Самоклеящаяся бумага A4', 'Плотная бумага для буклетов'],
    variants: ['500 листов', '250 листов', '180 г/м2', '200 г/м2', '230 г/м2'],
  },
  {
    categoryCode: 'printing_materials',
    unitCode: 'box',
    trackingType: 'batch',
    supplierCodes: ['SUP-RU-004', 'SUP-RU-009'],
    basePurchasePrice: 95,
    markup: 1.6,
    reorderThreshold: 10,
    names: ['Плёнка для ламинирования A4', 'Плёнка для ламинирования A3', 'Термобумага 57 мм', 'Термобумага 80 мм', 'Самоклеящиеся этикетки'],
    variants: ['80 мкм', '100 мкм', '125 мкм', 'упаковка 100 шт.', 'упаковка 200 шт.'],
  },
  {
    categoryCode: 'laptop_pc_products',
    unitCode: 'piece',
    trackingType: 'serial',
    supplierCodes: ['SUP-RU-001', 'SUP-RU-006'],
    basePurchasePrice: 4200,
    markup: 1.24,
    reorderThreshold: 2,
    names: ['Ноутбук офисный 15.6"', 'Ноутбук для учёбы 14"', 'Монитор 24"', 'Мини-ПК', 'Системный блок Core i5', 'Wi-Fi роутер гигабитный', 'Материнская плата microATX'],
    variants: ['Lenovo', 'HP', 'Dell', 'Asus', 'Acer'],
  },
];

function createConnection() {
  return mysql.createConnection({
    host: env.MYSQL_HOST,
    port: env.MYSQL_PORT,
    user: env.MYSQL_USER,
    password: env.MYSQL_PASSWORD,
    database: env.MYSQL_DATABASE,
    multipleStatements: true,
    charset: 'utf8mb4',
  });
}

function quoteIdentifier(identifier: string) {
  return `\`${identifier.replace(/`/g, '``')}\``;
}

function asDate(daysAgo: number, hour = 10) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hour, daysAgo % 60, 0, 0);
  return date;
}

function pick<T>(values: T[], index: number) {
  return values[index % values.length]!;
}

function money(value: number) {
  return Number(value.toFixed(2));
}

function sequence(prefix: string, index: number, width = 4) {
  return `${prefix}${String(index).padStart(width, '0')}`;
}

function buildPhone(index: number) {
  const middle = 900 + (index % 90);
  const tail = String(1000000 + index * 97).slice(-7);
  return `+7 ${middle} ${tail.slice(0, 3)}-${tail.slice(3, 5)}-${tail.slice(5)}`;
}

function toEmail(local: string, index: number) {
  return `${local}${String(index).padStart(3, '0')}@rafef-demo.ru`;
}

async function listTables(connection: Connection) {
  const [rows] = await connection.query<Array<RowDataPacket & { table_name: string }>>(
    `
      SELECT TABLE_NAME AS table_name
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_TYPE = 'BASE TABLE'
        AND TABLE_NAME <> 'schema_migrations'
      ORDER BY TABLE_NAME ASC
    `,
  );

  return rows.map((row) => row.table_name);
}

async function backupDatabase(connection: Connection, tables: string[]) {
  const payload: Record<string, RowDataPacket[]> = {};

  for (const tableName of tables) {
    const [rows] = await connection.query<RowDataPacket[]>(`SELECT * FROM ${quoteIdentifier(tableName)}`);
    payload[tableName] = rows;
  }

  await fs.mkdir(backupDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `db-reset-backup-${timestamp}.json`);
  await fs.writeFile(backupPath, JSON.stringify(payload, null, 2), 'utf8');
  return backupPath;
}

async function wipeDatabase(connection: Connection, tables: string[]) {
  await connection.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const tableName of tables) {
    await connection.query(`DELETE FROM ${quoteIdentifier(tableName)}`);
  }
  await connection.query('SET FOREIGN_KEY_CHECKS = 1');
}

function runBaseSeed() {
  const result = process.platform === 'win32'
    ? spawnSync(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', 'npm.cmd run seed'], {
        cwd: backendRoot,
        stdio: 'inherit',
      })
    : spawnSync('npm', ['run', 'seed'], {
        cwd: backendRoot,
        stdio: 'inherit',
      });

  if (result.status !== 0) {
    throw new Error('Base seed failed after database reset.');
  }
}

async function queryMap(connection: Connection, sql: string, params: unknown[] = []) {
  const [rows] = await connection.execute<Array<RowDataPacket & { id: number; code: string }>>(sql, params);
  return new Map(rows.map((row) => [String(row.code), Number(row.id)]));
}

async function getActorUserId(connection: Connection) {
  const [rows] = await connection.execute<Array<RowDataPacket & { id: number }>>(
    `SELECT id FROM auth_users WHERE username = ? LIMIT 1`,
    [env.SEED_ADMIN_USERNAME],
  );

  const userId = Number(rows[0]?.id ?? 0);
  if (!userId) {
    throw new Error('Admin user was not recreated after base seed.');
  }

  return userId;
}

async function upsertTranslation(
  connection: Connection,
  entityType: string,
  entityId: number,
  fieldName: string,
  text: string,
) {
  const trimmed = text.trim();
  if (!trimmed) return;

  const rows = [
    ['ru', trimmed, 'ru', true, 'manual'],
    ['ar', trimmed, 'ru', false, 'fallback_copy'],
  ] as const;

  for (const [langCode, textValue, sourceLangCode, isSource, origin] of rows) {
    await connection.execute(
      `INSERT INTO entity_translations (
         entity_type,
         entity_id,
         field_name,
         lang_code,
         text_value,
         source_lang_code,
         is_source,
         translation_origin,
         confidence
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         text_value = VALUES(text_value),
         source_lang_code = VALUES(source_lang_code),
         is_source = VALUES(is_source),
         translation_origin = VALUES(translation_origin),
         confidence = VALUES(confidence),
         updated_at = CURRENT_TIMESTAMP`,
      [entityType, entityId, fieldName, langCode, textValue, sourceLangCode, isSource, origin, 1],
    );
  }
}

async function seedProviders(connection: Connection) {
  for (const [code, providerType, name, shortName, parentCode, countryCode, sortOrder] of providerSeeds) {
    await connection.execute(
      `INSERT INTO finance_provider_catalog (
         code, provider_type, name, short_name, parent_code, country_code, sort_order, is_active
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)
       ON DUPLICATE KEY UPDATE
         provider_type = VALUES(provider_type),
         name = VALUES(name),
         short_name = VALUES(short_name),
         parent_code = VALUES(parent_code),
         country_code = VALUES(country_code),
         sort_order = VALUES(sort_order),
         is_active = TRUE`,
      [code, providerType, name, shortName, parentCode, countryCode, sortOrder],
    );
  }
}

async function seedAdditionalServices(connection: Connection) {
  const categories = [
    ['cctv_installation', 'Монтаж CCTV', 'projects'],
    ['on_site_maintenance', 'Выездное обслуживание', 'repair'],
  ];

  for (const [code, defaultName, module] of categories) {
    await connection.execute(
      `INSERT INTO catalog_service_categories (code, default_name, module)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE default_name = VALUES(default_name), module = VALUES(module), is_active = TRUE`,
      [code, defaultName, module],
    );
  }

  const categoryMap = await queryMap(
    connection,
    `SELECT id, code FROM catalog_service_categories WHERE code IN ('repair_labor', 'printer_service', 'cctv_installation', 'on_site_maintenance')`,
  );

  const services: Array<[string, string, string, string, number]> = [
    ['repair_labor', 'cleaning_notebook', 'Профилактика ноутбука', 'repair', 1200],
    ['repair_labor', 'replace_keyboard', 'Замена клавиатуры ноутбука', 'repair', 1800],
    ['printer_service', 'printer_refill', 'Заправка картриджа', 'repair', 900],
    ['printer_service', 'printer_maintenance', 'Обслуживание лазерного принтера', 'repair', 1600],
    ['cctv_installation', 'camera_installation', 'Монтаж IP-камеры', 'projects', 2500],
    ['cctv_installation', 'dvr_configuration', 'Настройка регистратора', 'projects', 2200],
    ['cctv_installation', 'cable_routing', 'Прокладка кабеля', 'projects', 350],
    ['cctv_installation', 'remote_access_setup', 'Настройка удалённого доступа', 'projects', 1500],
    ['on_site_maintenance', 'network_visit', 'Выезд по сети и маршрутизаторам', 'repair', 2100],
    ['on_site_maintenance', 'camera_diagnostics', 'Диагностика системы видеонаблюдения', 'repair', 1700],
  ];

  const serviceIds = new Map<string, number>();
  for (const [categoryCode, code, defaultName, module, defaultPrice] of services) {
    const categoryId = categoryMap.get(categoryCode);
    if (!categoryId) continue;

    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT INTO catalog_services (service_category_id, code, default_name, module, default_price)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         service_category_id = VALUES(service_category_id),
         default_name = VALUES(default_name),
         module = VALUES(module),
         default_price = VALUES(default_price),
         is_active = TRUE`,
      [categoryId, code, defaultName, module, defaultPrice],
    );

    const serviceId = result.insertId || Number((await connection.execute<Array<RowDataPacket & { id: number }>>(
      `SELECT id FROM catalog_services WHERE code = ? LIMIT 1`,
      [code],
    ))[0][0]?.id ?? 0);

    if (serviceId) {
      serviceIds.set(code, serviceId);
      await upsertTranslation(connection, 'catalog_services', serviceId, 'default_name', defaultName);
    }
  }

  return serviceIds;
}

async function seedSuppliers(connection: Connection, actorUserId: number) {
  const supplierIds = new Map<string, number>();

  for (const [code, name, phone, email, notes] of supplierSeeds) {
    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT INTO catalog_suppliers (name, phone, email, address_text, notes, created_by_user_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, phone, email, 'Россия', notes, actorUserId],
    );
    supplierIds.set(code, result.insertId);
    await upsertTranslation(connection, 'catalog_suppliers', result.insertId, 'name', name);
  }

  return supplierIds;
}

async function seedCustomers(connection: Connection, actorUserId: number) {
  const customerIds: Array<{ id: number; type: 'person' | 'business'; name: string }> = [];

  for (let index = 0; index < 200; index += 1) {
    const type = index < 140 ? 'person' : 'business';
    const cityData = pick(cities, index);
    const street = pick(cityData.streets, index);

    const name = type === 'person'
      ? `${pick(customerFirstNames, index)} ${pick(customerLastNames, index * 3)}`
      : `${pick(businessPrefixes, index)} "${pick(businessNames, index * 2)}"`;

    const emailLocal = type === 'person' ? 'client' : 'company';
    const phone = buildPhone(index + 1);
    const createdAt = asDate((index * 2) % 180, 9 + (index % 8));

    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT INTO crm_customers (
         customer_code, name, phone_primary, phone_secondary, email, customer_type, notes, is_active, is_frozen, created_by_user_id, created_at, updated_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, ?, ?, ?, ?)`,
      [
        sequence('CUS-RU-', index + 1, 4),
        name,
        phone,
        index % 5 === 0 ? buildPhone(index + 501) : null,
        toEmail(emailLocal, index + 1),
        type,
        type === 'business'
          ? `Корпоративный клиент из города ${cityData.city}.`
          : `Постоянный розничный клиент из города ${cityData.city}.`,
        index % 17 === 0,
        actorUserId,
        createdAt,
        createdAt,
      ],
    );

    customerIds.push({ id: result.insertId, type, name });
    await upsertTranslation(connection, 'crm_customers', result.insertId, 'name', name);

    await connection.execute(
      `INSERT INTO crm_customer_contacts (customer_id, contact_type, contact_value, is_primary)
       VALUES (?, 'phone', ?, TRUE), (?, 'email', ?, TRUE)`,
      [result.insertId, phone, result.insertId, toEmail(emailLocal, index + 1)],
    );

    if (index % 3 === 0) {
      await connection.execute(
        `INSERT INTO crm_customer_contacts (customer_id, contact_type, contact_value, is_primary)
         VALUES (?, 'telegram', ?, FALSE)`,
        [result.insertId, `@client_${String(index + 1).padStart(3, '0')}`],
      );
    }

    await connection.execute(
      `INSERT INTO crm_locations (customer_id, name, location_type, address_text, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        result.insertId,
        type === 'business' ? 'Основной объект' : 'Адрес клиента',
        type === 'business' ? 'company' : 'home',
        `${cityData.city}, ул. ${street}, д. ${10 + (index % 70)}`,
        type === 'business' ? 'Подходит для монтажных работ и доставки.' : 'Предпочитает вечерний визит.',
        createdAt,
        createdAt,
      ],
    );

    if (index % 2 === 0) {
      await connection.execute(
        `INSERT INTO crm_customer_notes (customer_id, note_text, created_by_user_id, created_at)
         VALUES (?, ?, ?, ?)`,
        [
          result.insertId,
          type === 'business'
            ? 'Согласован контакт с ответственным сотрудником и пропуск на объект.'
            : 'Покупает расходники и аксессуары каждые 1-2 месяца.',
          actorUserId,
          createdAt,
        ],
      );
    }
  }

  return customerIds;
}

async function seedProducts(
  connection: Connection,
  actorUserId: number,
  supplierIds: Map<string, number>,
) {
  const categoryMap = await queryMap(connection, 'SELECT id, code FROM catalog_categories');
  const unitMap = await queryMap(connection, 'SELECT id, code FROM catalog_units');
  const products: Array<{
    id: number;
    sku: string;
    name: string;
    categoryCode: string;
    purchasePrice: number;
    salePrice: number;
  }> = [];

  const targetByCategory: Record<string, number> = {
    accessories: 90,
    spare_parts: 90,
    cameras: 70,
    dvr_nvr: 45,
    cables: 65,
    ink: 45,
    paper: 35,
    printing_materials: 25,
    laptop_pc_products: 35,
  };

  let globalIndex = 0;
  for (const blueprint of productBlueprints) {
    const target = targetByCategory[blueprint.categoryCode] ?? 0;
    const categoryId = categoryMap.get(blueprint.categoryCode);
    const unitId = unitMap.get(blueprint.unitCode);
    if (!categoryId || !unitId) {
      throw new Error(`Missing lookup for ${blueprint.categoryCode}/${blueprint.unitCode}`);
    }

    for (let index = 0; index < target; index += 1) {
      const baseName = pick(blueprint.names, index);
      const variant = pick(blueprint.variants, Math.floor(index / Math.max(1, blueprint.names.length)));
      const name = `${baseName} ${variant}`;
      const sku = `${blueprint.categoryCode.slice(0, 3).toUpperCase()}-${String(globalIndex + 1).padStart(5, '0')}`;
      const purchasePrice = money(blueprint.basePurchasePrice + (index % 9) * (blueprint.basePurchasePrice * 0.07));
      const salePrice = money(purchasePrice * blueprint.markup);
      const createdAt = asDate((globalIndex * 2) % 160, 10 + (globalIndex % 6));

      const [productResult] = await connection.execute<ResultSetHeader>(
        `INSERT INTO catalog_products (
           category_id,
           unit_id,
           sku,
           default_name,
           tracking_type,
           current_purchase_price,
           current_sale_price,
           reorder_threshold,
           created_by_user_id,
           updated_by_user_id,
           created_at,
           updated_at
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          categoryId,
          unitId,
          sku,
          name,
          blueprint.trackingType,
          purchasePrice,
          salePrice,
          blueprint.reorderThreshold,
          actorUserId,
          actorUserId,
          createdAt,
          createdAt,
        ],
      );

      const productId = productResult.insertId;
      products.push({
        id: productId,
        sku,
        name,
        categoryCode: blueprint.categoryCode,
        purchasePrice,
        salePrice,
      });

      await upsertTranslation(connection, 'catalog_products', productId, 'default_name', name);

      await connection.execute(
        `INSERT INTO catalog_product_barcodes (product_id, barcode, is_primary)
         VALUES (?, ?, TRUE)`,
        [productId, `460${String(100000000 + globalIndex).slice(-9)}`],
      );

      const quantityOnHand = blueprint.trackingType === 'serial'
        ? 2 + (index % 6)
        : blueprint.categoryCode === 'cables'
          ? 120 + (index % 40) * 5
          : 8 + (index % 12) * 3;

      await connection.execute(
        `INSERT INTO inventory_stock_balances (product_id, quantity_on_hand, quantity_reserved)
         VALUES (?, ?, 0)`,
        [productId, quantityOnHand],
      );

      await connection.execute(
        `INSERT INTO inventory_stock_movements (
           product_id, movement_type, quantity, unit_cost, source_type, source_id, note, created_by_user_id, created_at
         )
         VALUES (?, 'purchase_in', ?, ?, 'seed_product', ?, ?, ?, ?)`,
        [productId, quantityOnHand, purchasePrice, productId, 'Первичное наполнение склада', actorUserId, createdAt],
      );

      if (blueprint.trackingType === 'serial') {
        for (let serialIndex = 0; serialIndex < Math.min(quantityOnHand, 4); serialIndex += 1) {
          await connection.execute(
            `INSERT INTO catalog_product_serials (product_id, serial_no, status, current_source_type, current_source_id, created_at, updated_at)
             VALUES (?, ?, 'in_stock', 'stock_seed', ?, ?, ?)`,
            [productId, `${sku}-SN-${String(serialIndex + 1).padStart(3, '0')}`, productId, createdAt, createdAt],
          );
        }
      }

      const linkedSuppliers = blueprint.supplierCodes.slice(0, 2);
      for (const supplierCode of linkedSuppliers) {
        const supplierId = supplierIds.get(supplierCode);
        if (!supplierId) continue;
        await connection.execute(
          `INSERT INTO catalog_product_suppliers (product_id, supplier_id, supplier_sku, last_purchase_price)
           VALUES (?, ?, ?, ?)`,
          [productId, supplierId, `${supplierCode}-${sku}`, purchasePrice],
        );
      }

      globalIndex += 1;
    }
  }

  for (let index = 0; index < 15; index += 1) {
    const product = products[index * 3];
    if (!product) continue;
    const oldPurchase = money(product.purchasePrice * 0.92);
    const oldSale = money(product.salePrice * 0.94);
    await connection.execute(
      `INSERT INTO catalog_product_price_history (
         product_id, old_purchase_price, new_purchase_price, old_sale_price, new_sale_price, reason, changed_by_user_id, changed_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        product.id,
        oldPurchase,
        product.purchasePrice,
        oldSale,
        product.salePrice,
        'Плановое обновление закупочной цены',
        actorUserId,
        asDate(30 + index, 14),
      ],
    );
  }

  return products;
}

async function seedPurchaseOrders(
  connection: Connection,
  actorUserId: number,
  supplierIds: Map<string, number>,
  products: Array<{ id: number; purchasePrice: number }>,
) {
  const supplierKeys = [...supplierIds.keys()];
  for (let index = 0; index < 10; index += 1) {
    const supplierId = supplierIds.get(pick(supplierKeys, index)) ?? null;
    const receivedAt = asDate(15 + index, 11);
    const [orderResult] = await connection.execute<ResultSetHeader>(
      `INSERT INTO inventory_purchase_orders (
         supplier_id, status, notes, created_by_user_id, received_by_user_id, created_at, received_at
       )
       VALUES (?, 'received', ?, ?, ?, ?, ?)`,
      [supplierId, 'Поставка для демонстрационных остатков', actorUserId, actorUserId, receivedAt, receivedAt],
    );

    for (let lineIndex = 0; lineIndex < 4; lineIndex += 1) {
      const product = products[index * 4 + lineIndex];
      if (!product) continue;
      const quantity = 5 + ((index + lineIndex) % 7);
      await connection.execute(
        `INSERT INTO inventory_purchase_order_lines (
           purchase_order_id, product_id, quantity, unit_cost, received_quantity
         )
         VALUES (?, ?, ?, ?, ?)`,
        [orderResult.insertId, product.id, quantity, product.purchasePrice, quantity],
      );
    }
  }
}

async function seedFinance(
  connection: Connection,
  actorUserId: number,
  customers: Array<{ id: number; name: string }>,
) {
  const accounts = [
    ['ACC-CASH-01', 'Главная касса', 'cash_drawer', 'Главная касса', 'CASH_MAIN', 'EGP', null, 45000],
    ['ACC-SAFE-01', 'Сейф магазина', 'branch_safe', 'Сейф магазина', 'CASH_SAFE', 'EGP', null, 90000],
    ['ACC-BANK-01', 'Расчётный счёт СберБанк', 'bank_account', 'СберБанк', 'BANK_SBER', 'EGP', '408178100000001', 180000],
    ['ACC-BANK-02', 'Расчётный счёт ВТБ', 'bank_account', 'ВТБ', 'BANK_VTB', 'EGP', '408178100000002', 125000],
    ['ACC-WALLET-01', 'Кошелёк ЮMoney', 'e_wallet', 'ЮMoney', 'WALLET_YOOMONEY', 'EGP', 'YM-STORE-01', 22000],
    ['ACC-WALLET-02', 'СБП Переводы', 'e_wallet', 'СБП', 'WALLET_SBP', 'EGP', 'SBP-STORE-02', 17000],
    ['ACC-POS-01', 'POS-терминал', 'pos_terminal', 'POS-терминал Verifone', 'MACHINE_POS_MAIN', 'EGP', 'POS-1001', 12000],
    ['ACC-CLEAR-01', 'Клиринговый счёт переводов', 'clearing_account', 'Т-Банк', 'BANK_TINKOFF', 'EGP', '407028100000003', 38000],
  ] as const;

  const accountIds = new Map<string, number>();
  for (const [code, name, type, provider, providerCode, currency, accountNumber, openingBalance] of accounts) {
    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT INTO finance_payment_accounts (
         code, name, type, provider, provider_code, currency, account_number, opening_balance, is_active, notes, created_by_user_id
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?, ?)`,
      [code, name, type, provider, providerCode, currency, accountNumber, openingBalance, 'Демонстрационный счёт', actorUserId],
    );
    accountIds.set(code, result.insertId);
  }

  const methods = [
    ['MET-CASH', 'Наличные', 'cash', 'Главная касса', 'CASH_MAIN', 'ACC-CASH-01'],
    ['MET-SBER', 'Перевод СберБанк', 'bank_transfer', 'СберБанк', 'BANK_SBER', 'ACC-BANK-01'],
    ['MET-VTB', 'Карта ВТБ', 'bank_card', 'ВТБ', 'BANK_VTB', 'ACC-BANK-02'],
    ['MET-YOO', 'ЮMoney', 'wallet_transfer', 'ЮMoney', 'WALLET_YOOMONEY', 'ACC-WALLET-01'],
    ['MET-SBP', 'СБП', 'wallet_transfer', 'СБП', 'WALLET_SBP', 'ACC-WALLET-02'],
    ['MET-POS', 'POS-терминал', 'pos_terminal', 'POS-терминал Verifone', 'MACHINE_POS_MAIN', 'ACC-POS-01'],
    ['MET-KIOSK', 'Платёжный терминал', 'instant_payment_machine', 'Платёжный терминал', 'MACHINE_PAY_KIOSK', 'ACC-POS-01'],
    ['MET-SERVICE', 'Сервисные платежи', 'service_machine', 'Платёжный терминал', 'MACHINE_PAY_KIOSK', 'ACC-POS-01'],
    ['MET-BALANCE', 'Баланс клиента', 'customer_balance', '', null, 'ACC-CLEAR-01'],
    ['MET-MIX', 'Смешанная оплата', 'mixed', '', null, 'ACC-CASH-01'],
  ] as const;

  const methodIds = new Map<string, number>();
  for (const [code, name, methodType, provider, providerCode, linkedAccountCode] of methods) {
    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT INTO finance_payment_methods (
         code, name, method_type, provider, provider_code, linked_account_id, notes, created_by_user_id
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        code,
        name,
        methodType,
        provider || null,
        providerCode,
        accountIds.get(linkedAccountCode) ?? null,
        'Демонстрационный метод оплаты',
        actorUserId,
      ],
    );
    methodIds.set(code, result.insertId);
  }

  const operations = [
    ['TRX-0001', 'ACC-CASH-01', 'MET-CASH', 6200, 'in', 'sale_payment', 'Оплата розничной продажи'],
    ['TRX-0002', 'ACC-BANK-01', 'MET-SBER', 15200, 'in', 'bank_transfer', 'Оплата корпоративного заказа'],
    ['TRX-0003', 'ACC-WALLET-01', 'MET-YOO', 2400, 'in', 'wallet_transfer', 'Перевод через ЮMoney'],
    ['TRX-0004', 'ACC-POS-01', 'MET-POS', 8800, 'in', 'sale_payment', 'Оплата картой на кассе'],
    ['TRX-0005', 'ACC-BANK-02', 'MET-VTB', 12800, 'in', 'bank_transfer', 'Предоплата за монтаж'],
    ['TRX-0006', 'ACC-CLEAR-01', 'MET-BALANCE', 3500, 'in', 'internal_transfer', 'Зачисление клиентского баланса'],
    ['TRX-0007', 'ACC-CASH-01', 'MET-CASH', 2900, 'out', 'supplier_payment', 'Расчёт с локальным поставщиком'],
    ['TRX-0008', 'ACC-BANK-01', 'MET-SBER', 6400, 'out', 'supplier_payment', 'Оплата закупки камер'],
    ['TRX-0009', 'ACC-WALLET-02', 'MET-SBP', 1700, 'out', 'wallet_transfer', 'Возврат перевода клиенту'],
    ['TRX-0010', 'ACC-POS-01', 'MET-KIOSK', 2100, 'in', 'machine_settlement', 'Инкассация терминала'],
    ['TRX-0011', 'ACC-POS-01', 'MET-SERVICE', 990, 'in', 'mobile_topup', 'Платёж за сервис пополнения'],
    ['TRX-0012', 'ACC-POS-01', 'MET-SERVICE', 1180, 'in', 'internet_topup', 'Платёж за интернет'],
    ['TRX-0013', 'ACC-POS-01', 'MET-SERVICE', 860, 'in', 'electricity_card', 'Продажа карты оплаты'],
    ['TRX-0014', 'ACC-BANK-02', 'MET-VTB', 4200, 'out', 'adjustment', 'Корректировка банка'],
    ['TRX-0015', 'ACC-CLEAR-01', 'MET-MIX', 2750, 'in', 'general', 'Смешанная оплата заказа'],
  ] as const;

  const transactionIds: number[] = [];
  for (let index = 0; index < operations.length; index += 1) {
    const [code, accountCode, methodCode, amount, direction, operationType, notes] = operations[index]!;
    const customer = customers[index];
    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT INTO finance_transactions (
         transaction_code, account_id, payment_method_id, amount, currency, direction, operation_type,
         reference_type, reference_id, counterparty_name, external_reference, notes, created_by_user_id, created_at
       )
       VALUES (?, ?, ?, ?, 'EGP', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        code,
        accountIds.get(accountCode) ?? null,
        methodIds.get(methodCode) ?? null,
        amount,
        direction,
        operationType,
        customer ? 'customer' : null,
        customer?.id ?? null,
        customer?.name ?? 'Внутренняя операция',
        `EXT-${String(index + 1).padStart(5, '0')}`,
        notes,
        actorUserId,
        asDate(20 - (index % 10), 12 + (index % 5)),
      ],
    );
    transactionIds.push(result.insertId);
  }

  let runningBalance = 0;
  for (let index = 0; index < 12; index += 1) {
    const transactionId = transactionIds[index] ?? null;
    const change = index % 3 === 0 ? money(1800 + index * 90) : money(-650 - index * 35);
    runningBalance = money(runningBalance + change);
    await connection.execute(
      `INSERT INTO finance_customer_ledger (
         customer_id, transaction_id, amount_change, balance_after, notes, created_by_user_id, created_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        customers[index]!.id,
        transactionId,
        change,
        runningBalance,
        change > 0 ? 'Пополнение клиентского баланса' : 'Списание по заказу',
        actorUserId,
        asDate(18 - index, 13),
      ],
    );
  }

  const expenses = [
    ['EXP-0001', 'ACC-CASH-01', 1450, 'Логистика', 'Доставка расходников'],
    ['EXP-0002', 'ACC-CASH-01', 980, 'Офис', 'Канцелярия и упаковка'],
    ['EXP-0003', 'ACC-BANK-01', 7200, 'Аренда', 'Частичная оплата аренды'],
    ['EXP-0004', 'ACC-BANK-02', 2100, 'Реклама', 'Онлайн-продвижение услуг'],
    ['EXP-0005', 'ACC-WALLET-01', 650, 'Связь', 'Корпоративная связь'],
    ['EXP-0006', 'ACC-CLEAR-01', 1800, 'Зарплата', 'Аванс технику'],
    ['EXP-0007', 'ACC-CASH-01', 540, 'Хозяйственные', 'Расходные материалы'],
    ['EXP-0008', 'ACC-BANK-01', 3100, 'Интернет и ПО', 'Сервисы для магазина'],
  ] as const;

  for (let index = 0; index < expenses.length; index += 1) {
    const [expenseCode, accountCode, amount, category, notes] = expenses[index]!;
    await connection.execute(
      `INSERT INTO finance_expenses (
         expense_code, account_id, amount, currency, category, notes, created_by_user_id, created_at
       )
       VALUES (?, ?, ?, 'EGP', ?, ?, ?, ?)`,
      [expenseCode, accountIds.get(accountCode) ?? null, amount, category, notes, actorUserId, asDate(16 - index, 15)],
    );
  }

  const refundTargets = transactionIds.slice(0, 5);
  for (let index = 0; index < refundTargets.length; index += 1) {
    await connection.execute(
      `INSERT INTO finance_refunds (
         refund_code, transaction_id, amount, currency, reason, processed_by_user_id, processed_at, created_at
       )
       VALUES (?, ?, ?, 'EGP', ?, ?, ?, ?)`,
      [
        sequence('REF-00', index + 1, 2),
        refundTargets[index],
        250 + index * 75,
        'Корректировка или возврат клиенту',
        actorUserId,
        asDate(8 - index, 16),
        asDate(8 - index, 16),
      ],
    );
  }

  for (let index = 0; index < 8; index += 1) {
    const startedAt = asDate(9 - index, 8);
    const closedAt = new Date(startedAt);
    closedAt.setHours(20, 15, 0, 0);
    await connection.execute(
      `INSERT INTO finance_work_sessions (
         user_id, started_at, closed_at, starting_balance, ending_balance, notes
       )
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        actorUserId,
        startedAt,
        closedAt,
        1500 + index * 250,
        3900 + index * 450,
        'Смена главной кассы',
      ],
    );
  }

  for (let index = 0; index < 5; index += 1) {
    const closingDate = new Date();
    closingDate.setDate(closingDate.getDate() - index);
    const isoDate = closingDate.toISOString().slice(0, 10);
    await connection.execute(
      `INSERT INTO finance_daily_closings (closed_at, closed_by_user_id, totals, created_at)
       VALUES (?, ?, ?, ?)`,
      [
        isoDate,
        actorUserId,
        JSON.stringify({
          cash: 15000 + index * 1200,
          bank: 32000 + index * 1700,
          wallets: 5400 + index * 350,
          refunds: 500 + index * 60,
        }),
        asDate(index, 21),
      ],
    );
  }
}

async function seedSales(
  connection: Connection,
  actorUserId: number,
  customers: Array<{ id: number; name: string }>,
  products: Array<{ id: number; sku: string; name: string; salePrice: number; purchasePrice: number; categoryCode: string }>,
) {
  const invoices: number[] = [];

  for (let index = 0; index < 12; index += 1) {
    const customer = customers[index]!;
    const createdAt = asDate(14 - index, 11 + (index % 5));
    const status = index < 8 ? 'approved' : index < 10 ? 'draft' : 'returned';
    const invoiceProducts = products.slice(index * 3, index * 3 + 4);
    const subtotal = money(invoiceProducts.reduce((sum, product, lineIndex) => sum + product.salePrice * (1 + (lineIndex % 2)), 0));
    const tax = money(subtotal * 0.05);
    const total = money(subtotal + tax);

    const [invoiceResult] = await connection.execute<ResultSetHeader>(
      `INSERT INTO sales_invoices (
         invoice_code, customer_id, is_walk_in, status, subtotal, tax, total,
         created_by_user_id, created_at, approved_by_user_id, approved_at
       )
       VALUES (?, ?, FALSE, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sequence('INV-RU-', index + 1, 4),
        customer.id,
        status,
        subtotal,
        tax,
        total,
        actorUserId,
        createdAt,
        status === 'approved' ? actorUserId : null,
        status === 'approved' ? createdAt : null,
      ],
    );

    invoices.push(invoiceResult.insertId);

    for (let lineIndex = 0; lineIndex < invoiceProducts.length; lineIndex += 1) {
      const product = invoiceProducts[lineIndex]!;
      const quantity = lineIndex % 2 === 0 ? 1 : 2;
      await connection.execute(
        `INSERT INTO sales_invoice_lines (
           invoice_id, line_type, product_id, description_snapshot, sku_snapshot, category_name_snapshot,
           quantity, unit_price, unit_cost, line_total, source_type, source_id, created_at
         )
         VALUES (?, 'product', ?, ?, ?, ?, ?, ?, ?, ?, 'catalog_product', ?, ?)`,
        [
          invoiceResult.insertId,
          product.id,
          product.name,
          product.sku,
          product.categoryCode,
          quantity,
          product.salePrice,
          product.purchasePrice,
          money(quantity * product.salePrice),
          product.id,
          createdAt,
        ],
      );
    }
  }

  for (let index = 0; index < 4; index += 1) {
    const invoiceId = invoices[index];
    if (!invoiceId) continue;
    const [returnResult] = await connection.execute<ResultSetHeader>(
      `INSERT INTO sales_returns (return_code, invoice_id, created_by_user_id, created_at)
       VALUES (?, ?, ?, ?)`,
      [sequence('RET-RU-', index + 1, 3), invoiceId, actorUserId, asDate(6 - index, 17)],
    );

    const product = products[index]!;
    await connection.execute(
      `INSERT INTO sales_return_lines (return_id, product_id, quantity, unit_price, unit_cost, line_total)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [returnResult.insertId, product.id, 1, product.salePrice, product.purchasePrice, product.salePrice],
    );
  }
}

async function seedRepair(
  connection: Connection,
  actorUserId: number,
  customers: Array<{ id: number; name: string }>,
  products: Array<{ id: number; name: string; purchasePrice: number; categoryCode: string }>,
  serviceIds: Map<string, number>,
) {
  const categoryMap = await queryMap(connection, 'SELECT id, code FROM repair_device_categories');
  const brandMap = await queryMap(connection, 'SELECT id, code FROM (SELECT id, UPPER(REPLACE(name, \' \', \'_\')) AS code FROM repair_device_brands) brand_codes');
  const productPool = products.filter((product) => ['spare_parts', 'laptop_pc_products'].includes(product.categoryCode));
  const serviceCodePool = ['cleaning_notebook', 'replace_keyboard', 'printer_refill', 'printer_maintenance', 'network_visit', 'camera_diagnostics'];
  const reservationTotals = new Map<number, number>();

  const statuses = ['new', 'inspection', 'waiting_part', 'in_repair', 'ready_for_delivery', 'delivered'] as const;
  const brandCodes = [...brandMap.keys()];
  const categoryCodes = ['laptop', 'printer', 'camera', 'desktop', 'phone'];

  for (let index = 0; index < 12; index += 1) {
    const customer = customers[20 + index]!;
    const categoryCode = pick(categoryCodes, index);
    const categoryId = categoryMap.get(categoryCode);
    const brandCode = pick(brandCodes, index);
    const brandId = brandMap.get(brandCode) ?? null;
    if (!categoryId) continue;

    const [deviceResult] = await connection.execute<ResultSetHeader>(
      `INSERT INTO repair_devices (
         customer_id, category_id, brand_id, model_id, device_name, serial_no, imei, notes, created_at
       )
       VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?)`,
      [
        customer.id,
        categoryId,
        brandId,
        `Устройство ${index + 1}`,
        `DEV-RU-${String(index + 1).padStart(4, '0')}`,
        categoryCode === 'phone' ? `359${String(10000000000 + index).slice(-11)}` : null,
        'Принято в сервис для демонстрации модуля ремонта.',
        asDate(22 - index, 10),
      ],
    );

    const status = pick(statuses, index);
    const [orderResult] = await connection.execute<ResultSetHeader>(
      `INSERT INTO repair_orders (
         order_code, customer_id, device_id, status, problem_description, intake_notes, created_by_user_id, assigned_user_id, created_at, updated_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sequence('REP-RU-', index + 1, 4),
        customer.id,
        deviceResult.insertId,
        status,
        pick([
          'Не включается устройство.',
          'Требуется профилактика и чистка.',
          'Проблема с зарядкой и разъёмом.',
          'Не печатает после замены картриджа.',
          'Нет изображения с камеры.',
        ], index),
        'Клиент оставил устройство в мастерской.',
        actorUserId,
        actorUserId,
        asDate(22 - index, 10),
        asDate(20 - index, 18),
      ],
    );

    await connection.execute(
      `INSERT INTO repair_order_status_history (repair_order_id, old_status, new_status, note, changed_by_user_id, changed_at)
       VALUES (?, NULL, 'new', ?, ?, ?)`,
      [orderResult.insertId, 'Заказ создан', actorUserId, asDate(22 - index, 10)],
    );

    if (status !== 'new') {
      await connection.execute(
        `INSERT INTO repair_order_status_history (repair_order_id, old_status, new_status, note, changed_by_user_id, changed_at)
         VALUES (?, 'new', ?, ?, ?, ?)`,
        [orderResult.insertId, status, 'Переход к следующему этапу ремонта', actorUserId, asDate(21 - index, 15)],
      );
    }

    const serviceCode = pick(serviceCodePool, index);
    const serviceId = serviceIds.get(serviceCode) ?? null;
    await connection.execute(
      `INSERT INTO repair_order_services (
         repair_order_id, service_id, service_name_snapshot, quantity, unit_price_snapshot, created_at
       )
       VALUES (?, ?, ?, 1, ?, ?)`,
      [
        orderResult.insertId,
        serviceId,
        pick([
          'Профилактика ноутбука',
          'Замена клавиатуры ноутбука',
          'Заправка картриджа',
          'Обслуживание лазерного принтера',
          'Выезд по сети и маршрутизаторам',
          'Диагностика системы видеонаблюдения',
        ], index),
        900 + index * 140,
        asDate(20 - index, 16),
      ],
    );

    if (index < 8) {
      const part = productPool[index * 2]!;
      const quantity = 1 + (index % 2);
      const [reservationResult] = await connection.execute<ResultSetHeader>(
        `INSERT INTO inventory_stock_reservations (
           product_id, quantity, status, source_type, source_id, notes, created_by_user_id, created_at
         )
         VALUES (?, ?, 'active', 'repair_order', ?, ?, ?, ?)`,
        [
          part.id,
          quantity,
          orderResult.insertId,
          'Резерв под ремонт',
          actorUserId,
          asDate(19 - index, 14),
        ],
      );

      reservationTotals.set(part.id, money((reservationTotals.get(part.id) ?? 0) + quantity));

      await connection.execute(
        `INSERT INTO repair_order_parts (
           repair_order_id, product_id, product_name_snapshot, quantity, unit_cost_snapshot, reservation_id, created_at
         )
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          orderResult.insertId,
          part.id,
          part.name,
          quantity,
          part.purchasePrice,
          reservationResult.insertId,
          asDate(19 - index, 14),
        ],
      );
    }

    await connection.execute(
      `INSERT INTO repair_order_notes (repair_order_id, note_text, created_by_user_id, created_at)
       VALUES (?, ?, ?, ?)`,
      [
        orderResult.insertId,
        index % 2 === 0
          ? 'Клиент согласовал предварительную стоимость ремонта.'
          : 'Ожидается поступление детали или повторная диагностика.',
        actorUserId,
        asDate(18 - index, 17),
      ],
    );
  }

  return reservationTotals;
}

async function seedProjects(
  connection: Connection,
  actorUserId: number,
  customers: Array<{ id: number; name: string }>,
  products: Array<{ id: number; name: string; purchasePrice: number; categoryCode: string }>,
) {
  const typeMap = await queryMap(connection, 'SELECT id, code FROM project_types');
  const cctvProducts = products.filter((product) => ['cameras', 'dvr_nvr', 'cables'].includes(product.categoryCode));
  const reservationTotals = new Map<number, number>();

  for (let index = 0; index < 8; index += 1) {
    const typeCode = index % 2 === 0 ? 'cctv' : 'network';
    const typeId = typeMap.get(typeCode) ?? null;
    const customer = customers[80 + index]!;
    const createdAt = asDate(40 - index * 2, 9);
    const [projectResult] = await connection.execute<ResultSetHeader>(
      `INSERT INTO projects (
         project_code, project_type_id, customer_id, title, description, status,
         planned_start_at, planned_end_at, created_by_user_id, assigned_user_id, created_at, updated_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sequence('PRJ-RU-', index + 1, 3),
        typeId,
        customer.id,
        typeCode === 'cctv'
          ? `Монтаж видеонаблюдения на объекте ${customer.name}`
          : `Сетевое обновление офиса ${customer.name}`,
        typeCode === 'cctv'
          ? 'Установка камер, регистратора и удалённого доступа.'
          : 'Замена сети, настройка маршрутизатора и рабочих точек.',
        pick(['planned', 'in_progress', 'on_hold', 'completed'], index),
        createdAt,
        asDate(30 - index, 18),
        actorUserId,
        actorUserId,
        createdAt,
        createdAt,
      ],
    );

    await connection.execute(
      `INSERT INTO project_status_history (project_id, from_status, to_status, stage_code, notes, changed_by_user_id, changed_at)
       VALUES (?, NULL, 'planned', ?, ?, ?, ?)`,
      [projectResult.insertId, typeCode, 'Проект запланирован после согласования сметы.', actorUserId, createdAt],
    );

    await connection.execute(
      `INSERT INTO project_sites (
         project_id, site_name, address_text, location_notes, contact_name, contact_phone, created_by_user_id, created_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        projectResult.insertId,
        'Основной объект',
        `${pick(cities, index).city}, ул. ${pick(pick(cities, index).streets, index)}, д. ${15 + index}`,
        'Доступ к монтажу по согласованию.',
        customer.name,
        buildPhone(700 + index),
        actorUserId,
        createdAt,
      ],
    );

    for (let materialIndex = 0; materialIndex < 2; materialIndex += 1) {
      const product = cctvProducts[index * 2 + materialIndex]!;
      const quantity = materialIndex === 0 ? 2 : 30;
      const [reservationResult] = await connection.execute<ResultSetHeader>(
        `INSERT INTO inventory_stock_reservations (
           product_id, quantity, status, source_type, source_id, notes, created_by_user_id, created_at
         )
         VALUES (?, ?, 'active', 'project', ?, ?, ?, ?)`,
        [
          product.id,
          quantity,
          projectResult.insertId,
          'Резерв для проекта монтажа',
          actorUserId,
          asDate(35 - index, 13),
        ],
      );

      reservationTotals.set(product.id, money((reservationTotals.get(product.id) ?? 0) + quantity));

      await connection.execute(
        `INSERT INTO project_materials (
           project_id, product_id, product_name_snapshot, quantity, unit_cost_snapshot, reservation_id, notes, created_by_user_id, created_at
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          projectResult.insertId,
          product.id,
          product.name,
          quantity,
          product.purchasePrice,
          reservationResult.insertId,
          'Материал зарезервирован под проект.',
          actorUserId,
          asDate(35 - index, 13),
        ],
      );
    }

    await connection.execute(
      `INSERT INTO project_installed_assets (
         project_id, site_id, product_id, asset_type, asset_name, serial_no, ip_address, mac_address, installation_notes, installed_at, created_by_user_id, created_at
       )
       VALUES (
         ?,
         (SELECT id FROM project_sites WHERE project_id = ? ORDER BY id ASC LIMIT 1),
         ?,
         ?,
         ?,
         ?,
         ?,
         ?,
         ?,
         ?,
         ?,
         ?
       )`,
      [
        projectResult.insertId,
        projectResult.insertId,
        cctvProducts[index * 2]!.id,
        typeCode === 'cctv' ? 'camera' : 'network',
        typeCode === 'cctv' ? 'Уличная камера' : 'Маршрутизатор',
        `ASSET-${String(index + 1).padStart(4, '0')}`,
        `192.168.${10 + index}.20`,
        `00:1A:C2:9B:${String(10 + index).padStart(2, '0')}:AA`,
        'Установлено и добавлено в акт проекта.',
        asDate(28 - index, 16),
        actorUserId,
        asDate(28 - index, 16),
      ],
    );

    await connection.execute(
      `INSERT INTO project_notes (project_id, note_text, created_by_user_id, created_at)
       VALUES (?, ?, ?, ?)`,
      [
        projectResult.insertId,
        typeCode === 'cctv'
          ? 'Клиент запросил удалённый просмотр и резерв по ночной съёмке.'
          : 'Согласован простой офиса на время сетевых работ.',
        actorUserId,
        asDate(34 - index, 15),
      ],
    );
  }

  return reservationTotals;
}

async function seedCreative(connection: Connection, actorUserId: number, customers: Array<{ id: number }>) {
  const jobTypes = [
    ['banner_design', 'Дизайн баннера'],
    ['business_cards', 'Печать визиток'],
    ['product_labels', 'Этикетки для товаров'],
    ['social_media', 'Макеты для соцсетей'],
    ['store_sign', 'Вывеска магазина'],
  ] as const;

  const jobTypeIds = new Map<string, number>();
  for (const [code, defaultName] of jobTypes) {
    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT INTO creative_job_types (code, default_name, created_by_user_id, created_at)
       VALUES (?, ?, ?, ?)`,
      [code, defaultName, actorUserId, asDate(25, 11)],
    );
    jobTypeIds.set(code, result.insertId);
    await upsertTranslation(connection, 'creative_job_types', result.insertId, 'default_name', defaultName);
  }

  const vendors = [
    ['VEN-001', 'Типография "Формат"'],
    ['VEN-002', 'Студия "Линия цвета"'],
    ['VEN-003', 'Монтажная группа "Свет"'],
    ['VEN-004', 'Рекламное агентство "Медиа Про"'],
    ['VEN-005', 'Печать и резка "Быстро"'],
  ] as const;

  const vendorIds = new Map<string, number>();
  for (const [code, name] of vendors) {
    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT INTO creative_vendors (code, name, contact, created_by_user_id, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [code, name, JSON.stringify({ phone: buildPhone(900 + resultCounter(code)), email: `${code.toLowerCase()}@vendors.ru` }), actorUserId, asDate(24, 12)],
    );
    vendorIds.set(code, result.insertId);
    await upsertTranslation(connection, 'creative_vendors', result.insertId, 'name', name);
  }

  const typeCodes = [...jobTypeIds.keys()];
  const vendorCodes = [...vendorIds.keys()];
  const statuses = ['draft', 'in_progress', 'waiting_vendor', 'completed'] as const;

  for (let index = 0; index < 8; index += 1) {
    const jobTypeCode = pick(typeCodes, index);
    const customerId = customers[120 + index]?.id ?? null;
    const createdAt = asDate(26 - index, 10);
    const [jobResult] = await connection.execute<ResultSetHeader>(
      `INSERT INTO creative_jobs (
         job_code, job_type_id, customer_id, title, description, status, deadline_at, created_by_user_id, created_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sequence('CRJ-RU-', index + 1, 3),
        jobTypeIds.get(jobTypeCode) ?? null,
        customerId,
        `Творческая задача №${index + 1}`,
        'Подготовка печатного или рекламного материала для клиента.',
        pick(statuses, index),
        asDate(18 - index, 18),
        actorUserId,
        createdAt,
      ],
    );

    await connection.execute(
      `INSERT INTO creative_job_lines (job_id, line_type, description, quantity, unit_price, created_by_user_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [jobResult.insertId, 'design', 'Основной макет', 1, 1200 + index * 150, actorUserId, createdAt],
    );
    await connection.execute(
      `INSERT INTO creative_job_lines (job_id, line_type, description, quantity, unit_price, created_by_user_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [jobResult.insertId, 'print', 'Печать или подготовка к производству', 1, 900 + index * 110, actorUserId, createdAt],
    );
    await connection.execute(
      `INSERT INTO creative_vendor_tasks (vendor_id, job_id, external_task_code, status, notes, created_by_user_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        vendorIds.get(pick(vendorCodes, index)) ?? null,
        jobResult.insertId,
        sequence('VT-', index + 1, 3),
        index % 2 === 0 ? 'in_progress' : 'pending',
        'Передано подрядчику на исполнение.',
        actorUserId,
        createdAt,
      ],
    );
    await connection.execute(
      `INSERT INTO creative_job_status_history (job_id, from_status, to_status, notes, created_by_user_id, created_at)
       VALUES (?, NULL, ?, ?, ?, ?)`,
      [jobResult.insertId, pick(statuses, index), 'Статус зафиксирован для демо.', actorUserId, createdAt],
    );
  }
}

function resultCounter(value: string) {
  return value.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % 1000;
}

async function seedEvents(connection: Connection, actorUserId: number) {
  const events = [
    ['crm', 'customer_created', 'Добавлен новый клиент', 'Создана карточка нового клиента.', 'crm_customers', 1, 'info'],
    ['catalog', 'price_updated', 'Обновлены цены', 'Изменена закупочная стоимость ряда товаров.', 'catalog_products', 3, 'important'],
    ['inventory', 'purchase_received', 'Поступление на склад', 'Принята поставка по закупке.', 'inventory_purchase_orders', 2, 'info'],
    ['repair', 'repair_in_progress', 'Ремонт в работе', 'Мастер приступил к ремонту устройства.', 'repair_orders', 4, 'important'],
    ['projects', 'project_started', 'Старт проекта', 'Начались монтажные работы на объекте.', 'projects', 1, 'important'],
    ['finance', 'bank_transfer', 'Поступил банковский перевод', 'Клиент оплатил заказ переводом.', 'finance_transactions', 2, 'info'],
    ['finance', 'refund_processed', 'Оформлен возврат', 'Выполнен частичный возврат клиенту.', 'finance_refunds', 1, 'urgent'],
    ['creative', 'vendor_assigned', 'Назначен подрядчик', 'Задача передана внешнему подрядчику.', 'creative_jobs', 2, 'info'],
    ['reports', 'daily_summary_ready', 'Готова ежедневная сводка', 'Сформирована ежедневная финансовая сводка.', null, null, 'info'],
    ['projects', 'site_visit_due', 'Запланирован выезд', 'На завтра назначен выезд на объект.', 'projects', 3, 'important'],
  ] as const;

  for (let index = 0; index < events.length; index += 1) {
    const [module, eventType, title, message, entityType, entityId, severity] = events[index]!;
    await connection.execute(
      `INSERT INTO app_events (
         module, event_type, title, message, entity_type, entity_id, severity, created_by_user_id, created_at, read_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        module,
        eventType,
        title,
        message,
        entityType,
        entityId,
        severity,
        actorUserId,
        asDate(5 - (index % 5), 10 + index),
        index % 3 === 0 ? asDate(4 - (index % 4), 12) : null,
      ],
    );
  }
}

async function applyReservationTotals(connection: Connection, totals: Map<number, number>) {
  for (const [productId, quantityReserved] of totals.entries()) {
    await connection.execute(
      `UPDATE inventory_stock_balances
       SET quantity_on_hand = GREATEST(quantity_on_hand, ?),
           quantity_reserved = ?
       WHERE product_id = ?`,
      [quantityReserved, quantityReserved, productId],
    );
  }
}

async function collectSummary(connection: Connection) {
  const tables = [
    'crm_customers',
    'catalog_products',
    'catalog_suppliers',
    'sales_invoices',
    'repair_orders',
    'projects',
    'finance_payment_accounts',
    'finance_payment_methods',
    'finance_transactions',
    'creative_jobs',
  ];

  const summary: Record<string, number> = {};
  for (const table of tables) {
    const [rows] = await connection.query<Array<RowDataPacket & { total: number }>>(
      `SELECT COUNT(*) AS total FROM ${quoteIdentifier(table)}`,
    );
    summary[table] = Number(rows[0]?.total ?? 0);
  }
  return summary;
}

async function main() {
  const dataOnlyMode = process.argv.includes('--data-only');

  if (!dataOnlyMode) {
    const cleanupConnection = await createConnection();
    const tables = await listTables(cleanupConnection);
    const backupPath = await backupDatabase(cleanupConnection, tables);
    console.log(`Backup written to ${backupPath}`);
    await wipeDatabase(cleanupConnection, tables);
    await cleanupConnection.end();

    runBaseSeed();
  }

  const connection = await createConnection();
  try {
    await connection.beginTransaction();

    const actorUserId = await getActorUserId(connection);
    await seedProviders(connection);
    const serviceIds = await seedAdditionalServices(connection);
    const supplierIds = await seedSuppliers(connection, actorUserId);
    const customers = await seedCustomers(connection, actorUserId);
    const products = await seedProducts(connection, actorUserId, supplierIds);
    await seedPurchaseOrders(connection, actorUserId, supplierIds, products);
    await seedFinance(connection, actorUserId, customers);
    await seedSales(connection, actorUserId, customers, products);
    const repairReservations = await seedRepair(connection, actorUserId, customers, products, serviceIds);
    const projectReservations = await seedProjects(connection, actorUserId, customers, products);
    await seedCreative(connection, actorUserId, customers);
    await seedEvents(connection, actorUserId);

    const combinedReservations = new Map<number, number>();
    for (const [productId, quantity] of [...repairReservations.entries(), ...projectReservations.entries()]) {
      combinedReservations.set(productId, money((combinedReservations.get(productId) ?? 0) + quantity));
    }
    await applyReservationTotals(connection, combinedReservations);

    await connection.commit();

    const summary = await collectSummary(connection);
    console.log(JSON.stringify({ status: 'ok', summary }, null, 2));
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
