import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { pool } from './mysql.js';
import { runMigrations } from './migrationRunner.js';
const permissions = [
    { code: 'auth.users.view', module: 'auth', nameRu: 'Просмотр пользователей' },
    { code: 'auth.users.manage', module: 'auth', nameRu: 'Управление пользователями' },
    { code: 'auth.permissions.manage', module: 'auth', nameRu: 'Управление правами доступа' },
    { code: 'auth.sessions.view', module: 'auth', nameRu: 'Просмотр сессий' },
    { code: 'crm.customers.view', module: 'crm', nameRu: 'Просмотр клиентов' },
    { code: 'crm.customers.create', module: 'crm', nameRu: 'Создание клиентов' },
    { code: 'crm.customers.update', module: 'crm', nameRu: 'Редактирование клиентов' },
    { code: 'crm.customers.notes.manage', module: 'crm', nameRu: 'Управление заметками клиентов' },
    { code: 'catalog.products.view', module: 'catalog', nameRu: 'Просмотр товаров' },
    { code: 'catalog.products.manage', module: 'catalog', nameRu: 'Управление товарами' },
    { code: 'catalog.prices.change', module: 'catalog', nameRu: 'Изменение цен' },
    { code: 'catalog.suppliers.manage', module: 'catalog', nameRu: 'Управление поставщиками' },
    { code: 'catalog.services.manage', module: 'catalog', nameRu: 'Управление услугами' },
    { code: 'inventory.stock.view', module: 'inventory', nameRu: 'Просмотр склада' },
    { code: 'inventory.stock.adjust', module: 'inventory', nameRu: 'Корректировка склада' },
    { code: 'inventory.purchases.manage', module: 'inventory', nameRu: 'Управление закупками' },
    { code: 'inventory.reservations.manage', module: 'inventory', nameRu: 'Управление резервами' },
    { code: 'inventory.cost.view', module: 'inventory', nameRu: 'Просмотр себестоимости' },
    { code: 'sales.invoices.view', module: 'sales', nameRu: 'Просмотр счетов' },
    { code: 'sales.invoices.create', module: 'sales', nameRu: 'Создание счетов' },
    { code: 'sales.invoices.approve', module: 'sales', nameRu: 'Проведение счетов' },
    { code: 'sales.invoices.void', module: 'sales', nameRu: 'Аннулирование счетов' },
    { code: 'sales.returns.process', module: 'sales', nameRu: 'Обработка возвратов' },
    { code: 'sales.returns.create', module: 'sales', nameRu: 'Создание документов возврата' },
    { code: 'sales.discounts.apply', module: 'sales', nameRu: 'Применение скидок' },
    { code: 'finance.accounts.view', module: 'finance', nameRu: 'Просмотр финансовых счетов' },
    { code: 'finance.accounts.manage', module: 'finance', nameRu: 'Управление финансовыми счетами' },
    { code: 'finance.payments.create', module: 'finance', nameRu: 'Создание платежей' },
    { code: 'finance.refunds.approve', module: 'finance', nameRu: 'Подтверждение возвратов' },
    { code: 'finance.expenses.manage', module: 'finance', nameRu: 'Управление расходами' },
    { code: 'finance.ledger.view', module: 'finance', nameRu: 'Просмотр баланса клиентов' },
    { code: 'finance.profit.view', module: 'finance', nameRu: 'Просмотр прибыли' },
    { code: 'finance.daily_closing.manage', module: 'finance', nameRu: 'Закрытие дня' },
    { code: 'repair.orders.view', module: 'repair', nameRu: 'Просмотр ремонтов' },
    { code: 'repair.orders.create', module: 'repair', nameRu: 'Создание ремонтов' },
    { code: 'repair.orders.update', module: 'repair', nameRu: 'Редактирование ремонтов' },
    { code: 'repair.parts.reserve', module: 'repair', nameRu: 'Резерв запчастей' },
    { code: 'repair.parts.consume', module: 'repair', nameRu: 'Списание запчастей' },
    { code: 'repair.deliver', module: 'repair', nameRu: 'Выдача ремонта' },
    { code: 'repair.warranty.create', module: 'repair', nameRu: 'Создание гарантии/повтора' },
    { code: 'creative.jobs.view', module: 'creative', nameRu: 'Просмотр творческих работ' },
    { code: 'creative.jobs.create', module: 'creative', nameRu: 'Создание творческих работ' },
    { code: 'creative.jobs.update', module: 'creative', nameRu: 'Редактирование творческих работ' },
    { code: 'creative.vendors.manage', module: 'creative', nameRu: 'Управление подрядчиками' },
    { code: 'creative.cost.view', module: 'creative', nameRu: 'Просмотр затрат творческих работ' },
    { code: 'projects.view', module: 'projects', nameRu: 'Просмотр проектов' },
    { code: 'projects.create', module: 'projects', nameRu: 'Создание проектов' },
    { code: 'projects.update', module: 'projects', nameRu: 'Редактирование проектов' },
    { code: 'projects.materials.reserve', module: 'projects', nameRu: 'Резерв материалов проекта' },
    { code: 'projects.materials.consume', module: 'projects', nameRu: 'Списание материалов проекта' },
    { code: 'projects.profit.view', module: 'projects', nameRu: 'Просмотр прибыли проектов' },
    { code: 'events.view', module: 'events', nameRu: 'Просмотр событий' },
    { code: 'events.manage', module: 'events', nameRu: 'Управление событиями' },
    { code: 'events.integration_health.view', module: 'events', nameRu: 'Просмотр состояния интеграций' },
    { code: 'reports.sales.view', module: 'reports', nameRu: 'Отчеты по продажам' },
    { code: 'reports.inventory.view', module: 'reports', nameRu: 'Отчеты по складу' },
    { code: 'reports.finance.view', module: 'reports', nameRu: 'Финансовые отчеты' },
    { code: 'reports.repair.view', module: 'reports', nameRu: 'Отчеты по ремонту' },
    { code: 'reports.projects.view', module: 'reports', nameRu: 'Отчеты по проектам' },
    { code: 'reports.creative.view', module: 'reports', nameRu: 'Отчеты по творческим работам' },
    { code: 'reports.profit.view', module: 'reports', nameRu: 'Отчеты по прибыли' },
    { code: 'reports.customers.view', module: 'reports', nameRu: 'Отчеты по клиентам' },
    { code: 'integrations.view', module: 'integrations', nameRu: 'Просмотр интеграций' },
    { code: 'integrations.manage', module: 'integrations', nameRu: 'Управление интеграциями' },
    { code: 'ai.assistant.use', module: 'integrations', nameRu: 'Использование AI ассистента' },
    { code: 'ai.assistant.approve_dangerous_action', module: 'integrations', nameRu: 'Подтверждение опасных AI действий' },
];
async function upsertRole(code, nameRu, description) {
    await pool.execute(`INSERT INTO auth_roles (code, name_ru, description, is_system, is_active)
     VALUES (?, ?, ?, TRUE, TRUE)
     ON DUPLICATE KEY UPDATE name_ru = VALUES(name_ru), description = VALUES(description), is_active = TRUE`, [code, nameRu, description]);
}
async function getRoleId(code) {
    const [rows] = await pool.execute('SELECT id FROM auth_roles WHERE code = ?', [
        code,
    ]);
    const role = rows[0];
    if (!role) {
        throw new Error(`Missing role ${code}`);
    }
    return role.id;
}
async function seedPermissions() {
    for (const permission of permissions) {
        await pool.execute(`INSERT INTO auth_permissions (code, module, name_ru, description)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE module = VALUES(module), name_ru = VALUES(name_ru), description = VALUES(description)`, [permission.code, permission.module, permission.nameRu, permission.description ?? null]);
    }
}
async function assignRoleDefaults(roleCode, allowedCodes) {
    const roleId = await getRoleId(roleCode);
    const [permissionRows] = await pool.query('SELECT id, code FROM auth_permissions');
    const allowedSet = new Set(allowedCodes);
    for (const permission of permissionRows) {
        await pool.execute(`INSERT INTO auth_role_permission_defaults (role_id, permission_id, is_allowed)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE is_allowed = VALUES(is_allowed)`, [roleId, permission.id, allowedSet.has(permission.code)]);
    }
}
async function seedAdminUser() {
    const roleId = await getRoleId('OWNER_ADMIN');
    const passwordHash = await bcrypt.hash(env.SEED_ADMIN_PASSWORD, 12);
    await pool.execute(`INSERT INTO auth_users (role_id, username, password_hash, display_name, status, max_discount_percent)
     VALUES (?, ?, ?, ?, 'active', 100)
     ON DUPLICATE KEY UPDATE role_id = VALUES(role_id), display_name = VALUES(display_name), status = 'active'`, [roleId, env.SEED_ADMIN_USERNAME, passwordHash, 'Администратор']);
    const [users] = await pool.execute('SELECT id FROM auth_users WHERE username = ?', [env.SEED_ADMIN_USERNAME]);
    const user = users[0];
    if (!user) {
        throw new Error('Failed to seed admin user');
    }
    const [permissionRows] = await pool.query('SELECT id FROM auth_permissions');
    for (const permission of permissionRows) {
        await pool.execute(`INSERT INTO auth_user_permissions (user_id, permission_id, is_allowed)
       VALUES (?, ?, TRUE)
       ON DUPLICATE KEY UPDATE is_allowed = TRUE`, [user.id, permission.id]);
    }
}
async function seedAiAssistantUser() {
    const roleId = await getRoleId('AI_ASSISTANT');
    const hasConfiguredPassword = env.SEED_AI_ASSISTANT_PASSWORD.length >= 8;
    const passwordHash = await bcrypt.hash(hasConfiguredPassword ? env.SEED_AI_ASSISTANT_PASSWORD : `disabled-${Date.now()}`, 12);
    const status = hasConfiguredPassword ? 'active' : 'disabled';
    await pool.execute(`INSERT INTO auth_users (role_id, username, password_hash, display_name, status, max_discount_percent)
     VALUES (?, 'ai_assistant', ?, 'AI Assistant', ?, 0)
     ON DUPLICATE KEY UPDATE role_id = VALUES(role_id), password_hash = VALUES(password_hash), display_name = VALUES(display_name), status = VALUES(status)`, [roleId, passwordHash, status]);
    const [users] = await pool.execute('SELECT id FROM auth_users WHERE username = ?', ['ai_assistant']);
    const user = users[0];
    if (!user)
        return;
    const [permissionRows] = await pool.execute(`SELECT id, code FROM auth_permissions WHERE code IN ('ai.assistant.use', 'events.view', 'integrations.view')`);
    for (const permission of permissionRows) {
        await pool.execute(`INSERT INTO auth_user_permissions (user_id, permission_id, is_allowed)
       VALUES (?, ?, TRUE)
       ON DUPLICATE KEY UPDATE is_allowed = TRUE`, [user.id, permission.id]);
    }
}
async function seedUnits() {
    const units = [
        ['piece', 'Штука', false],
        ['meter', 'Метр', true],
        ['box', 'Коробка', false],
        ['sheet', 'Лист', false],
        ['ream', 'Пачка бумаги', false],
    ];
    for (const unit of units) {
        await pool.execute(`INSERT INTO catalog_units (code, name_ru, allows_fraction)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE name_ru = VALUES(name_ru), allows_fraction = VALUES(allows_fraction)`, unit);
    }
}
async function seedCategories() {
    const categories = [
        ['accessories', 'Аксессуары', true, false, false, false],
        ['spare_parts', 'Запчасти', true, true, false, false],
        ['cameras', 'Камеры', true, false, true, false],
        ['dvr_nvr', 'DVR / NVR', true, false, true, false],
        ['cables', 'Кабели', true, true, true, false],
        ['ink', 'Чернила', true, false, false, true],
        ['paper', 'Бумага', true, false, false, true],
        ['printing_materials', 'Материалы для печати', true, false, false, true],
        ['laptop_pc_products', 'Товары для ноутбуков и ПК', true, true, false, false],
    ];
    for (const category of categories) {
        await pool.execute(`INSERT INTO catalog_categories (
         code, default_name, show_in_sales, show_in_repair, show_in_projects, show_in_creative
       )
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         default_name = VALUES(default_name),
         show_in_sales = VALUES(show_in_sales),
         show_in_repair = VALUES(show_in_repair),
         show_in_projects = VALUES(show_in_projects),
         show_in_creative = VALUES(show_in_creative),
         is_active = TRUE`, category);
    }
}
async function seedServiceCategoriesAndServices() {
    const serviceCategories = [
        ['repair_labor', 'Ремонтные работы', 'repair'],
        ['printer_service', 'Обслуживание принтеров', 'repair'],
        ['creative_design', 'Дизайн', 'creative'],
    ];
    for (const category of serviceCategories) {
        await pool.execute(`INSERT INTO catalog_service_categories (code, default_name, module)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE default_name = VALUES(default_name), module = VALUES(module), is_active = TRUE`, category);
    }
    const [repairCategories] = await pool.execute('SELECT id, code FROM catalog_service_categories WHERE code IN ("repair_labor", "printer_service")');
    const categoryIdByCode = new Map(repairCategories.map((row) => [row.code, row.id]));
    const services = [
        [categoryIdByCode.get('repair_labor'), 'screen_replacement', 'Замена экрана', 'repair', 0],
        [categoryIdByCode.get('repair_labor'), 'battery_replacement', 'Замена батареи', 'repair', 0],
        [categoryIdByCode.get('repair_labor'), 'charging_port_repair', 'Ремонт разъема зарядки', 'repair', 0],
        [categoryIdByCode.get('repair_labor'), 'cleaning_service', 'Чистка устройства', 'repair', 0],
        [categoryIdByCode.get('printer_service'), 'printer_diagnostics', 'Диагностика принтера', 'repair', 0],
    ];
    for (const service of services) {
        const [serviceCategoryId, code, defaultName, module, defaultPrice] = service;
        if (!serviceCategoryId)
            continue;
        const serviceValues = [serviceCategoryId, code, defaultName, module, defaultPrice];
        await pool.execute(`INSERT INTO catalog_services (service_category_id, code, default_name, module, default_price)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         service_category_id = VALUES(service_category_id),
         default_name = VALUES(default_name),
         module = VALUES(module),
         default_price = VALUES(default_price),
         is_active = TRUE`, serviceValues);
    }
}
async function seedRepairDictionaries() {
    const categories = [
        ['phone', 'Телефон'],
        ['laptop', 'Ноутбук'],
        ['desktop', 'Компьютер'],
        ['printer', 'Принтер'],
        ['camera', 'Камера'],
    ];
    for (const category of categories) {
        await pool.execute(`INSERT INTO repair_device_categories (code, name_ru)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE name_ru = VALUES(name_ru), is_active = TRUE`, category);
    }
    for (const brand of ['Apple', 'Samsung', 'HP', 'Dell', 'Lenovo', 'Canon', 'Epson']) {
        await pool.execute(`INSERT INTO repair_device_brands (name)
       VALUES (?)
       ON DUPLICATE KEY UPDATE is_active = TRUE`, [brand]);
    }
}
async function seedProjectTypes() {
    const projectTypes = [
        ['cctv', 'CCTV / Surveillance', 'Camera, DVR/NVR, and monitoring installation projects'],
        ['network', 'Network Infrastructure', 'LAN, Wi-Fi, cabling, rack, and network equipment projects'],
    ];
    for (const projectType of projectTypes) {
        await pool.execute(`INSERT INTO project_types (code, default_name, description)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE default_name = VALUES(default_name), description = VALUES(description), is_active = TRUE`, projectType);
    }
}
try {
    await runMigrations();
    await upsertRole('OWNER_ADMIN', 'Владелец / Администратор', 'Full local system owner/admin access');
    await upsertRole('AI_ASSISTANT', 'AI ассистент', 'Restricted API-only assistant role');
    await seedPermissions();
    await assignRoleDefaults('OWNER_ADMIN', permissions.map((permission) => permission.code));
    await assignRoleDefaults('AI_ASSISTANT', ['ai.assistant.use', 'events.view', 'integrations.view']);
    await seedAdminUser();
    await seedAiAssistantUser();
    await seedUnits();
    await seedCategories();
    await seedServiceCategoriesAndServices();
    await seedRepairDictionaries();
    await seedProjectTypes();
    console.log('Seed completed');
}
finally {
    await pool.end();
}
