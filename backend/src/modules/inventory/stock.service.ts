import { InventoryRepository } from './inventory.repository.js';
import type { UiLanguage } from '../../shared/localization/language.js';

export class StockService {
  constructor(private readonly inventoryRepository = new InventoryRepository()) {}

  listStock(params: { search?: string; offset: number; limit: number; language?: UiLanguage }) {
    return this.inventoryRepository.listStock(params);
  }
}
