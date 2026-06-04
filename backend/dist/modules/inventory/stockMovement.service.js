import { InventoryRepository } from './inventory.repository.js';
export class StockMovementService {
    inventoryRepository;
    constructor(inventoryRepository = new InventoryRepository()) {
        this.inventoryRepository = inventoryRepository;
    }
    listProductMovements(productId, params) {
        return this.inventoryRepository.listMovements(productId, params);
    }
}
