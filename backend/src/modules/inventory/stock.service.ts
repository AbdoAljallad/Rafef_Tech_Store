import { InventoryRepository } from './inventory.repository.js';

export class StockService {
  constructor(private readonly inventoryRepository = new InventoryRepository()) {}

  listStock(params: { search?: string; offset: number; limit: number }) {
    return this.inventoryRepository.listStock(params);
  }
}
