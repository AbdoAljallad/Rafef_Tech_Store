import { pool } from '../../database/mysql.js';
import { AppError } from '../../shared/errors/AppError.js';
function nullable(value) {
    return value === undefined ? null : value;
}
export class RepairRepository {
    listCategories() { return pool.query('SELECT * FROM repair_device_categories WHERE is_active = TRUE ORDER BY name_ru').then(([r]) => r); }
    listBrands() { return pool.query('SELECT * FROM repair_device_brands WHERE is_active = TRUE ORDER BY name').then(([r]) => r); }
    async listModels() {
        const [rows] = await pool.query(`SELECT m.*, c.name_ru AS category_name_ru, b.name AS brand_name
       FROM repair_device_models m
       INNER JOIN repair_device_categories c ON c.id = m.category_id
       INNER JOIN repair_device_brands b ON b.id = m.brand_id
       WHERE m.is_active = TRUE ORDER BY b.name, m.name`);
        return rows;
    }
    async createCategory(input) {
        const [r] = await pool.execute('INSERT INTO repair_device_categories (code, name_ru) VALUES (?, ?)', [input.code, input.nameRu]);
        return { id: r.insertId, ...input };
    }
    async createBrand(input) {
        const [r] = await pool.execute('INSERT INTO repair_device_brands (name) VALUES (?)', [input.name]);
        return { id: r.insertId, ...input };
    }
    async createModel(input) {
        await this.requireCategory(input.categoryId);
        await this.requireBrand(input.brandId);
        const [r] = await pool.execute('INSERT INTO repair_device_models (category_id, brand_id, name) VALUES (?, ?, ?)', [input.categoryId, input.brandId, input.name]);
        return { id: r.insertId, ...input };
    }
    async createDevice(input) {
        await this.requireCustomer(input.customerId);
        await this.requireCategory(input.categoryId);
        if (input.brandId)
            await this.requireBrand(input.brandId);
        if (input.modelId)
            await this.requireModel(input.modelId);
        const [r] = await pool.execute(`INSERT INTO repair_devices (customer_id, category_id, brand_id, model_id, device_name, serial_no, imei, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [input.customerId, input.categoryId, nullable(input.brandId), nullable(input.modelId), input.deviceName, nullable(input.serialNo), nullable(input.imei), nullable(input.notes)]);
        return this.findDevice(r.insertId);
    }
    async listOrders(params) {
        const [rows] = await pool.execute(`SELECT o.*, c.name AS customer_name, d.device_name
       FROM repair_orders o
       INNER JOIN crm_customers c ON c.id = o.customer_id
       INNER JOIN repair_devices d ON d.id = o.device_id
       ORDER BY o.created_at DESC LIMIT ${params.limit} OFFSET ${params.offset}`);
        return rows;
    }
    async createOrder(input, userId) {
        await this.requireCustomer(input.customerId);
        const device = await this.findDevice(input.deviceId);
        if (!device)
            throw new AppError(404, 'NOT_FOUND', 'Device not found');
        if (Number(device.customer_id) !== input.customerId)
            throw new AppError(400, 'VALIDATION_ERROR', 'Device must belong to customer');
        const [r] = await pool.execute(`INSERT INTO repair_orders (order_code, customer_id, device_id, problem_description, intake_notes, assigned_user_id, created_by_user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`, [await this.nextOrderCode(), input.customerId, input.deviceId, input.problemDescription, nullable(input.intakeNotes), nullable(input.assignedUserId), userId]);
        await this.insertStatusHistory(r.insertId, null, 'new', 'Order created', userId);
        return this.findOrder(r.insertId);
    }
    async findOrder(id) {
        const [orders] = await pool.execute('SELECT * FROM repair_orders WHERE id = ? LIMIT 1', [id]);
        const order = orders[0];
        if (!order)
            return null;
        const [services] = await pool.execute('SELECT * FROM repair_order_services WHERE repair_order_id = ? ORDER BY id', [id]);
        const [parts] = await pool.execute('SELECT * FROM repair_order_parts WHERE repair_order_id = ? ORDER BY id', [id]);
        const [notes] = await pool.execute('SELECT * FROM repair_order_notes WHERE repair_order_id = ? ORDER BY id', [id]);
        const [history] = await pool.execute('SELECT * FROM repair_order_status_history WHERE repair_order_id = ? ORDER BY id', [id]);
        return { ...order, services, parts, notes, history };
    }
    async addService(orderId, input) {
        await this.requireOrder(orderId);
        let name = input.serviceName;
        let price = input.unitPrice ?? 0;
        if (input.serviceId) {
            const [rows] = await pool.execute('SELECT default_name, default_price FROM catalog_services WHERE id = ? AND is_active = TRUE', [input.serviceId]);
            const service = rows[0];
            if (!service)
                throw new AppError(404, 'NOT_FOUND', 'Service not found');
            name = name ?? String(service.default_name);
            price = input.unitPrice ?? Number(service.default_price);
        }
        if (!name)
            throw new AppError(400, 'VALIDATION_ERROR', 'Service name is required');
        const [r] = await pool.execute('INSERT INTO repair_order_services (repair_order_id, service_id, service_name_snapshot, quantity, unit_price_snapshot) VALUES (?, ?, ?, ?, ?)', [orderId, nullable(input.serviceId), name, input.quantity, price]);
        return { id: r.insertId, repairOrderId: orderId, serviceName: name, quantity: input.quantity, unitPrice: price };
    }
    async addPart(orderId, input, reservationId) {
        await this.requireOrder(orderId);
        const product = await this.requireProduct(input.productId);
        const [r] = await pool.execute('INSERT INTO repair_order_parts (repair_order_id, product_id, product_name_snapshot, quantity, unit_cost_snapshot, reservation_id) VALUES (?, ?, ?, ?, ?, ?)', [orderId, input.productId, product.default_name, input.quantity, product.current_purchase_price, reservationId]);
        return { id: r.insertId, repairOrderId: orderId, reservationId, productId: input.productId, quantity: input.quantity };
    }
    async changeStatus(orderId, input, userId) {
        const order = await this.requireOrder(orderId);
        await pool.execute('UPDATE repair_orders SET status = ? WHERE id = ?', [input.status, orderId]);
        await this.insertStatusHistory(orderId, String(order.status), input.status, input.note ?? null, userId);
        return this.findOrder(orderId);
    }
    async addNote(orderId, input, userId) {
        await this.requireOrder(orderId);
        const [r] = await pool.execute('INSERT INTO repair_order_notes (repair_order_id, note_text, created_by_user_id) VALUES (?, ?, ?)', [orderId, input.noteText, userId]);
        return { id: r.insertId, repairOrderId: orderId, noteText: input.noteText };
    }
    async receipt(orderId) {
        const order = await this.findOrder(orderId);
        if (!order)
            throw new AppError(404, 'NOT_FOUND', 'Repair order not found');
        const orderRow = order;
        const [customers] = await pool.execute('SELECT * FROM crm_customers WHERE id = ?', [Number(orderRow.customer_id)]);
        const device = await this.findDevice(Number(orderRow.device_id));
        return { order, customer: customers[0], device };
    }
    async requireOrder(id) {
        const [rows] = await pool.execute('SELECT * FROM repair_orders WHERE id = ? LIMIT 1', [id]);
        const row = rows[0];
        if (!row)
            throw new AppError(404, 'NOT_FOUND', 'Repair order not found');
        return row;
    }
    async requireProduct(id) {
        const [rows] = await pool.execute('SELECT * FROM catalog_products WHERE id = ? AND is_active = TRUE', [id]);
        const row = rows[0];
        if (!row)
            throw new AppError(404, 'NOT_FOUND', 'Product not found');
        return row;
    }
    async requireCustomer(id) {
        const [rows] = await pool.execute('SELECT id FROM crm_customers WHERE id = ? AND is_active = TRUE', [id]);
        if (!rows[0])
            throw new AppError(404, 'NOT_FOUND', 'Customer not found');
    }
    async requireCategory(id) {
        const [rows] = await pool.execute('SELECT id FROM repair_device_categories WHERE id = ? AND is_active = TRUE', [id]);
        if (!rows[0])
            throw new AppError(404, 'NOT_FOUND', 'Device category not found');
    }
    async requireBrand(id) {
        const [rows] = await pool.execute('SELECT id FROM repair_device_brands WHERE id = ? AND is_active = TRUE', [id]);
        if (!rows[0])
            throw new AppError(404, 'NOT_FOUND', 'Brand not found');
    }
    async requireModel(id) {
        const [rows] = await pool.execute('SELECT id FROM repair_device_models WHERE id = ? AND is_active = TRUE', [id]);
        if (!rows[0])
            throw new AppError(404, 'NOT_FOUND', 'Model not found');
    }
    async findDevice(id) {
        const [rows] = await pool.execute('SELECT * FROM repair_devices WHERE id = ? LIMIT 1', [id]);
        return rows[0] ?? null;
    }
    async insertStatusHistory(orderId, oldStatus, newStatus, note, userId) {
        await pool.execute('INSERT INTO repair_order_status_history (repair_order_id, old_status, new_status, note, changed_by_user_id) VALUES (?, ?, ?, ?, ?)', [orderId, oldStatus, newStatus, note, userId]);
    }
    async nextOrderCode() {
        const [rows] = await pool.query('SELECT AUTO_INCREMENT AS next_id FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = "repair_orders"');
        return `REP-${String(rows[0]?.next_id ?? Date.now()).padStart(6, '0')}`;
    }
}
