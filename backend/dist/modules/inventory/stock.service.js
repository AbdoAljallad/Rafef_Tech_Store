import { InventoryRepository } from './inventory.repository.js';
export class StockService {
    inventoryRepository;
    constructor(inventoryRepository = new InventoryRepository()) {
        this.inventoryRepository = inventoryRepository;
    }
    listStock(params) {
        return this.inventoryRepository.listStock(params);
    }
}
