import { InventoryRepository } from './inventory.repository.js';

export class StockMovementService {
  constructor(private readonly inventoryRepository = new InventoryRepository()) {}

  listProductMovements(productId: number, params: { offset: number; limit: number }) {
    return this.inventoryRepository.listMovements(productId, params);
  }
}
