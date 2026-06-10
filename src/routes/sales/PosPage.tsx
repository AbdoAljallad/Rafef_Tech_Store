import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Calculator, History } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { DataTableColumn } from '../../shared/components/DataTable/DataTable';
import { catalogApi } from '../../modules/catalog/api/catalog.api';
import { getAvailableQuantity, getReorderThreshold, hasAvailableStock } from '../../modules/catalog/utils/stockAvailability';
import { crmApi } from '../../modules/crm/api/crm.api';
import financeApi from '../../modules/finance/api/finance.api';
import { repairApi } from '../../modules/repair/api/repair.api';
import { salesApi } from '../../modules/sales/api/sales.api';
import { formatSalesMoney, getSalesErrorMessage } from '../../modules/sales/utils/salesPresentation';
import type { SalesDocumentType } from '../../modules/sales/types/sales.types';
import { SearchInput } from '../../shared/components/SearchInput/SearchInput';
import { DataTable } from '../../shared/components/DataTable/DataTable';
import { isApiError } from '../../shared/api/apiErrors';
import { Button } from '../../shared/ui/Button';
import { Checkbox } from '../../shared/ui/Checkbox';
import { IconButton } from '../../shared/ui/IconButton';
import { Input } from '../../shared/ui/Input';
import { Select } from '../../shared/ui/Select';
import type { Product } from '../../modules/catalog/types/catalog.types';

type ProductCartLine = {
  kind: 'product';
  key: string;
  product: Product;
  qty: number;
  unitPrice: number;
};

type RepairServiceCartLine = {
  kind: 'repair_service';
  key: string;
  repairOrderId: number;
  repairOrderServiceId: number;
  description: string;
  qty: number;
  unitPrice: number;
};

type RepairPartCartLine = {
  kind: 'repair_part';
  key: string;
  repairOrderId: number;
  repairOrderPartId: number;
  productId: number;
  reservationId: number;
  description: string;
  sku: string;
  categoryName: string;
  qty: number;
  unitPrice: number;
};

type CartLine = ProductCartLine | RepairServiceCartLine | RepairPartCartLine;

type ProductSortMode = 'name-asc' | 'price-asc' | 'price-desc' | 'stock-asc' | 'stock-desc';
type ProductScopeMode = 'all' | 'sales' | 'repair' | 'creative';
type StockFilterMode = 'all' | 'in-stock' | 'low-stock' | 'out-of-stock';

const productCollator = new Intl.Collator(['ar', 'en', 'ru'], {
  numeric: true,
  sensitivity: 'base',
});

function numeric(value: number | string | null | undefined) {
  return Number(value ?? 0);
}

function normalizeQuantityValue(value: number) {
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function isEnabled(flag?: number) {
  return Number(flag ?? 0) === 1;
}

function safeEvaluateExpression(expression: string) {
  const trimmed = expression.trim();
  if (!trimmed) return null;
  if (!/^[\d+\-*/().\s]+$/.test(trimmed)) return null;

  try {
    const result = Function(`"use strict"; return (${trimmed});`)();
    return Number.isFinite(result) ? Number(result) : null;
  } catch {
    return null;
  }
}

function getRepairOrderIdFromCart(cart: CartLine[]) {
  const repairLine = cart.find((line) => line.kind !== 'product');
  return repairLine ? repairLine.repairOrderId : null;
}

export function PosPage() {
  const { t, i18n } = useTranslation('app');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [scopeFilter, setScopeFilter] = useState<ProductScopeMode>('all');
  const [stockFilter, setStockFilter] = useState<StockFilterMode>('all');
  const [sortMode, setSortMode] = useState<ProductSortMode>('name-asc');
  const [barcode, setBarcode] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [documentType, setDocumentType] = useState<SalesDocumentType>('invoice');
  const [isWalkIn, setIsWalkIn] = useState(true);
  const [customerId, setCustomerId] = useState('');
  const [amountReceived, setAmountReceived] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [paymentAccountId, setPaymentAccountId] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [calculatorExpression, setCalculatorExpression] = useState('');
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [importedRepairOrderId, setImportedRepairOrderId] = useState<number | null>(null);

  const repairOrderIdParam = Number(searchParams.get('repairOrderId') ?? 0) || null;
  const language = i18n.resolvedLanguage;
  const deferredSearch = useDeferredValue(search);
  const deferredCustomerSearch = useDeferredValue(customerSearch);
  const activeRepairOrderId = useMemo(() => getRepairOrderIdFromCart(cart), [cart]);
  const isRepairCustomerLocked = activeRepairOrderId !== null;

  const customersQuery = useQuery({
    queryKey: ['customers', 'pos', deferredCustomerSearch],
    queryFn: () => crmApi.listCustomers(deferredCustomerSearch, { pageSize: 100, sortMode: 'name-asc' }),
    enabled: !isWalkIn && !isRepairCustomerLocked,
  });
  const productsQuery = useQuery({
    queryKey: ['products', 'pos', deferredSearch],
    queryFn: () => catalogApi.listProducts(deferredSearch, { pageSize: 1000 }),
  });
  const categoriesQuery = useQuery({
    queryKey: ['catalog-categories'],
    queryFn: () => catalogApi.listCategories(),
  });
  const paymentMethodsQuery = useQuery({
    queryKey: ['finance-methods', 'pos'],
    queryFn: () => financeApi.listMethods(),
    enabled: documentType === 'invoice',
  });
  const paymentAccountsQuery = useQuery({
    queryKey: ['finance-accounts', 'pos'],
    queryFn: () => financeApi.listAccounts(),
    enabled: documentType === 'invoice',
  });
  const repairBillingQuery = useQuery({
    queryKey: ['repair-pos-billing', repairOrderIdParam],
    queryFn: () => repairApi.getOrderBilling(repairOrderIdParam as number),
    enabled: Boolean(repairOrderIdParam),
  });

  const createInvoice = useMutation({
    mutationFn: salesApi.createInvoice,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['sales', 'invoices'] });
    },
  });
  const approveInvoice = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload?: Parameters<typeof salesApi.approveInvoice>[1] }) => salesApi.approveInvoice(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['sales', 'invoices'] });
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      await queryClient.invalidateQueries({ queryKey: ['repairOrderBilling'] });
      await queryClient.invalidateQueries({ queryKey: ['repair-pos-billing'] });
    },
  });

  const productsById = useMemo(
    () => new Map((productsQuery.data?.items ?? []).map((product) => [product.id, product])),
    [productsQuery.data?.items],
  );
  const paymentMethods = paymentMethodsQuery.data?.items ?? [];
  const paymentAccounts = paymentAccountsQuery.data?.items ?? [];
  const selectedPaymentMethod = useMemo(
    () => paymentMethods.find((method) => String(method.id) === paymentMethodId) ?? null,
    [paymentMethodId, paymentMethods],
  );

  useEffect(() => {
    if (isWalkIn && !isRepairCustomerLocked) {
      setCustomerId('');
      setCustomerSearch('');
    }
  }, [isRepairCustomerLocked, isWalkIn]);

  useEffect(() => {
    if (documentType === 'quote') {
      setAmountReceived('');
      setPaymentMethodId('');
      setPaymentAccountId('');
      setPaymentReference('');
    }
  }, [documentType]);

  useEffect(() => {
    if (!selectedPaymentMethod?.linked_account_id) {
      return;
    }
    if (!paymentAccountId) {
      setPaymentAccountId(String(selectedPaymentMethod.linked_account_id));
    }
  }, [paymentAccountId, selectedPaymentMethod?.linked_account_id]);

  useEffect(() => {
    const billing = repairBillingQuery.data?.billing;
    if (!repairOrderIdParam || !billing || importedRepairOrderId === repairOrderIdParam) {
      return;
    }

    const importedLines: CartLine[] = [
      ...(billing.services ?? []).map((service: any) => ({
        kind: 'repair_service' as const,
        key: `repair-service-${service.repair_order_service_id}`,
        repairOrderId: Number(service.repair_order_id),
        repairOrderServiceId: Number(service.repair_order_service_id),
        description: service.service_name_snapshot,
        qty: numeric(service.quantity),
        unitPrice: numeric(service.unit_price_snapshot),
      })),
      ...(billing.parts ?? []).map((part: any) => ({
        kind: 'repair_part' as const,
        key: `repair-part-${part.repair_order_part_id}`,
        repairOrderId: Number(part.repair_order_id),
        repairOrderPartId: Number(part.repair_order_part_id),
        productId: Number(part.product_id),
        reservationId: Number(part.reservation_id),
        description: part.product_name_snapshot,
        sku: part.product_sku ?? '',
        categoryName: part.category_name ?? '',
        qty: numeric(part.quantity),
        unitPrice: numeric(part.current_sale_price),
      })),
    ];

    setCart(importedLines);
    setImportedRepairOrderId(repairOrderIdParam);
    setIsWalkIn(false);
    setCustomerId(String(billing.order?.customer_id ?? ''));
    setDocumentType('invoice');
  }, [importedRepairOrderId, repairBillingQuery.data?.billing, repairOrderIdParam]);

  const filteredProducts = useMemo(() => {
    const items = [...(productsQuery.data?.items ?? [])];
    const filtered = items.filter((product) => {
      const available = getAvailableQuantity(product);
      const reorderThreshold = getReorderThreshold(product);

      if (categoryFilter !== 'all' && product.category_code !== categoryFilter) {
        return false;
      }
      if (scopeFilter === 'sales' && !isEnabled(product.show_in_sales)) {
        return false;
      }
      if (scopeFilter === 'repair' && !isEnabled(product.show_in_repair)) {
        return false;
      }
      if (scopeFilter === 'creative' && !isEnabled(product.show_in_creative)) {
        return false;
      }
      if (stockFilter === 'in-stock' && available <= 0) {
        return false;
      }
      if (stockFilter === 'out-of-stock' && available > 0) {
        return false;
      }
      if (stockFilter === 'low-stock' && !(available > 0 && available <= reorderThreshold)) {
        return false;
      }
      return true;
    });

    filtered.sort((left, right) => {
      if (sortMode === 'name-asc') {
        return productCollator.compare(left.default_name, right.default_name);
      }
      if (sortMode === 'price-asc') {
        return numeric(left.current_sale_price) - numeric(right.current_sale_price);
      }
      if (sortMode === 'price-desc') {
        return numeric(right.current_sale_price) - numeric(left.current_sale_price);
      }
      if (sortMode === 'stock-asc') {
        return getAvailableQuantity(left) - getAvailableQuantity(right);
      }
      return getAvailableQuantity(right) - getAvailableQuantity(left);
    });

    return filtered;
  }, [categoryFilter, productsQuery.data?.items, scopeFilter, sortMode, stockFilter]);

  function resolveProduct(product: Product) {
    return productsById.get(product.id) ?? product;
  }

  function getStockValidationMessage(product: Product, requestedQty: number) {
    const available = getAvailableQuantity(resolveProduct(product));
    if (available <= 0) {
      return t('sales.errors.outOfStock');
    }
    if (requestedQty > available) {
      return t('sales.errors.quantityExceedsAvailable', { count: available });
    }
    return null;
  }

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.qty * item.unitPrice, 0),
    [cart],
  );
  const calculatorResult = useMemo(
    () => safeEvaluateExpression(calculatorExpression),
    [calculatorExpression],
  );
  const amountReceivedValue = numeric(amountReceived);
  const changeDue = Math.max(amountReceivedValue - subtotal, 0);
  const repairContext = repairBillingQuery.data?.billing ?? null;

  const productColumns = useMemo<DataTableColumn<Product>[]>(() => [
    {
      key: 'product',
      header: t('sales.fields.product'),
      render: (product) => (
        <div>
          <strong>{product.default_name}</strong>
          <div className="muted">{product.category_name}</div>
        </div>
      ),
    },
    {
      key: 'identifiers',
      header: t('sales.fields.skuBarcode'),
      render: (product) => (
        <div>
          <div>{product.sku}</div>
          <div className="muted">{product.primary_barcode || '-'}</div>
        </div>
      ),
    },
    {
      key: 'price',
      header: t('sales.fields.price'),
      render: (product) => formatSalesMoney(product.current_sale_price, language),
    },
    {
      key: 'stock',
      header: t('sales.fields.available'),
      render: (product) => {
        const available = getAvailableQuantity(product);
        const reorderThreshold = getReorderThreshold(product);
        const stockClass = available <= 0 ? 'danger' : available <= reorderThreshold ? 'warning' : 'ok';
        return <span className={`stock-pill ${stockClass}`}>{available}</span>;
      },
    },
    {
      key: 'actions',
      header: '',
      render: (product) => (
        <Button
          variant="secondary"
          disabled={!hasAvailableStock(resolveProduct(product))}
          title={!hasAvailableStock(resolveProduct(product)) ? t('sales.errors.outOfStock') : undefined}
          onClick={(event) => {
            event.stopPropagation();
            addProductToCart(product);
          }}
        >
          {t('sales.actions.add')}
        </Button>
      ),
    },
  ], [language, t, productsById]);

  const calculatorKeys = useMemo(() => ([
    ['7', '7'],
    ['8', '8'],
    ['9', '9'],
    ['/', '/'],
    ['4', '4'],
    ['5', '5'],
    ['6', '6'],
    ['*', '*'],
    ['1', '1'],
    ['2', '2'],
    ['3', '3'],
    ['-', '-'],
    ['0', '0'],
    ['.', '.'],
    ['=', '='],
    ['+', '+'],
    ['C', t('sales.calculator.clear')],
    ['DEL', t('sales.calculator.delete')],
    ['TOTAL', t('sales.calculator.total')],
    ['PAID', t('sales.calculator.paid')],
  ]), [t]);

  function addProductToCart(product: Product) {
    let nextError: string | null = null;

    setCart((current) => {
      const existingItem = current.find((item): item is ProductCartLine => item.kind === 'product' && item.product.id === product.id);
      const nextQty = normalizeQuantityValue((existingItem?.qty ?? 0) + 1);

      nextError = getStockValidationMessage(product, nextQty);
      if (nextError) {
        return current;
      }

      if (existingItem) {
        return current.map((item) =>
          item.kind === 'product' && item.product.id === product.id ? { ...item, qty: nextQty } : item,
        );
      }

      return [
        ...current,
        {
          kind: 'product',
          key: `product-${product.id}`,
          product,
          qty: 1,
          unitPrice: numeric(product.current_sale_price),
        },
      ];
    });

    setErrorMessage(nextError);
  }

  async function handleBarcodeLookup() {
    setErrorMessage(null);
    if (!barcode.trim()) {
      setErrorMessage(t('sales.errors.barcodeRequired'));
      return;
    }

    try {
      const result = await catalogApi.lookupBarcode(barcode.trim());
      addProductToCart(result.product);
      setBarcode('');
    } catch (error) {
      if (isApiError(error) && error.code === 'NOT_FOUND') {
        setErrorMessage(t('sales.errors.barcodeNotFound'));
        return;
      }
      setErrorMessage(getSalesErrorMessage(error, t));
    }
  }

  function updateQty(index: number, value: number) {
    let nextError: string | null = null;

    setCart((current) =>
      current.map((item, currentIndex) => {
        if (currentIndex !== index || item.kind !== 'product') {
          return item;
        }
        const nextQty = normalizeQuantityValue(value);
        nextError = getStockValidationMessage(item.product, nextQty);
        if (nextError) {
          const available = getAvailableQuantity(resolveProduct(item.product));
          return available > 0 ? { ...item, qty: available } : item;
        }
        return { ...item, qty: nextQty };
      }),
    );

    setErrorMessage(nextError);
  }

  function updateUnitPrice(index: number, value: number) {
    setCart((current) =>
      current.map((item, currentIndex) =>
        currentIndex === index ? { ...item, unitPrice: Math.max(0, Number.isFinite(value) ? value : 0) } : item,
      ),
    );
  }

  function removeItem(index: number) {
    setCart((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  function clearCart() {
    setCart([]);
    setAmountReceived('');
    setCalculatorExpression('');
    setErrorMessage(null);
  }

  function applyCalculatorValue(value: string) {
    if (value === 'C') {
      setCalculatorExpression('');
      return;
    }
    if (value === 'DEL') {
      setCalculatorExpression((current) => current.slice(0, -1));
      return;
    }
    if (value === '=') {
      const result = safeEvaluateExpression(calculatorExpression);
      if (result === null) {
        setErrorMessage(t('sales.errors.invalidCalculator'));
        return;
      }
      setCalculatorExpression(String(result));
      return;
    }
    if (value === 'TOTAL') {
      setCalculatorExpression(String(subtotal));
      return;
    }
    if (value === 'PAID') {
      const result = safeEvaluateExpression(calculatorExpression);
      const finalValue = result ?? subtotal;
      setAmountReceived(String(finalValue));
      return;
    }
    setCalculatorExpression((current) => `${current}${value}`);
  }

  async function submitDocument(options: { approveAfterCreate: boolean }) {
    setErrorMessage(null);

    if (cart.length === 0) {
      setErrorMessage(t('sales.errors.cartRequired'));
      return;
    }

    for (const item of cart) {
      if (item.kind !== 'product') {
        continue;
      }
      const stockMessage = getStockValidationMessage(item.product, item.qty);
      if (stockMessage) {
        setErrorMessage(stockMessage);
        return;
      }
    }

    if (!isWalkIn && !customerId) {
      setErrorMessage(t('sales.errors.customerRequired'));
      return;
    }

    try {
      const created = await createInvoice.mutateAsync({
        customerId: isWalkIn ? null : Number(customerId),
        repairOrderId: activeRepairOrderId,
        isWalkIn,
        documentType,
        lines: cart.map((item) => {
          if (item.kind === 'product') {
            return {
              lineType: 'product' as const,
              productId: item.product.id,
              quantity: item.qty,
              unitPrice: item.unitPrice,
            };
          }
          if (item.kind === 'repair_service') {
            return {
              lineType: 'repair_service' as const,
              repairOrderServiceId: item.repairOrderServiceId,
              quantity: item.qty,
              unitPrice: item.unitPrice,
            };
          }
          return {
            lineType: 'repair_part' as const,
            repairOrderPartId: item.repairOrderPartId,
            quantity: item.qty,
            unitPrice: item.unitPrice,
          };
        }),
      });

      const invoice = created.invoice;
      if (!invoice) {
        setErrorMessage(t('sales.errors.documentMissing'));
        return;
      }

      if (options.approveAfterCreate && documentType === 'invoice') {
        try {
          await approveInvoice.mutateAsync({
            id: invoice.id,
            payload: {
              paymentMethodId: paymentMethodId ? Number(paymentMethodId) : null,
              paymentAccountId: paymentAccountId ? Number(paymentAccountId) : null,
              paymentAmount: subtotal,
              paymentReference: paymentReference.trim() || null,
            },
          });
          navigate(`/sales/invoices/${invoice.id}`);
          return;
        } catch {
          setErrorMessage(t('sales.errors.approveFailed'));
          navigate(`/sales/invoices/${invoice.id}`);
          return;
        }
      }

      navigate(documentType === 'quote' ? `/sales/invoices/${invoice.id}/print?layout=a4` : `/sales/invoices/${invoice.id}`);
    } catch (error) {
      setErrorMessage(getSalesErrorMessage(error, t));
    }
  }

  function cartLineTitle(item: CartLine) {
    if (item.kind === 'product') {
      return item.product.default_name;
    }
    return item.description;
  }

  function cartLineMeta(item: CartLine) {
    if (item.kind === 'product') {
      return item.product.sku;
    }
    if (item.kind === 'repair_part') {
      return `${t('repair.parts')} • ${item.sku || '-'}`;
    }
    return t('repair.services');
  }

  return (
    <div className="pos-page">
      <header className="page-header pos-page-header">
        <div>
          <h1>{t('sales.titles.pos')}</h1>
        </div>
        <div className="pos-page-header-actions">
          <Button variant="secondary" icon={<History size={16} aria-hidden="true" />} onClick={() => navigate('/sales/invoices')}>
            {t('sales.actions.archive')}
          </Button>
        </div>
      </header>

      {errorMessage ? <div className="notice error" role="alert">{errorMessage}</div> : null}
      {repairBillingQuery.isError ? <div className="notice error" role="alert">{t('sales.errors.generic')}</div> : null}

      <section className="pos-grid">
        <aside className="pos-products-panel">
          <div className="pos-card pos-products-card">
            <div className="pos-card-heading">
              <div>
                <h2>{t('sales.sections.finder')}</h2>
                <p>{t('sales.sections.finderHint')}</p>
              </div>
              <span className="count-pill">{filteredProducts.length}</span>
            </div>

            <div className="pos-filter-stack">
              <div className="pos-search-row">
                <SearchInput
                  placeholder={t('sales.fields.searchProducts')}
                  value={search}
                  onChange={(event) => setSearch((event.target as HTMLInputElement).value)}
                />
                <Input label={t('sales.fields.barcode')} value={barcode} onChange={(event) => setBarcode((event.target as HTMLInputElement).value)} />
                <Button variant="secondary" onClick={handleBarcodeLookup}>
                  {t('sales.actions.scan')}
                </Button>
              </div>

              <div className="pos-filter-row">
                <Select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} label={t('sales.fields.category')}>
                  <option value="all">{t('sales.filters.categoryAll')}</option>
                  {(categoriesQuery.data?.items ?? []).map((category) => (
                    <option key={category.id} value={category.code}>{category.default_name}</option>
                  ))}
                </Select>
                <Select value={scopeFilter} onChange={(event) => setScopeFilter(event.target.value as ProductScopeMode)} label={t('sales.fields.department')}>
                  <option value="all">{t('sales.filters.scopeAll')}</option>
                  <option value="sales">{t('sales.filters.scopeSales')}</option>
                  <option value="repair">{t('sales.filters.scopeRepair')}</option>
                  <option value="creative">{t('sales.filters.scopeCreative')}</option>
                </Select>
                <Select value={stockFilter} onChange={(event) => setStockFilter(event.target.value as StockFilterMode)} label={t('sales.fields.stockLevel')}>
                  <option value="all">{t('sales.filters.stockAll')}</option>
                  <option value="in-stock">{t('sales.filters.stockIn')}</option>
                  <option value="low-stock">{t('sales.filters.stockLow')}</option>
                  <option value="out-of-stock">{t('sales.filters.stockOut')}</option>
                </Select>
                <Select value={sortMode} onChange={(event) => setSortMode(event.target.value as ProductSortMode)} label={t('sales.fields.sort')}>
                  <option value="name-asc">{t('sales.filters.sortName')}</option>
                  <option value="price-asc">{t('sales.filters.sortPriceAsc')}</option>
                  <option value="price-desc">{t('sales.filters.sortPriceDesc')}</option>
                  <option value="stock-asc">{t('sales.filters.sortStockAsc')}</option>
                  <option value="stock-desc">{t('sales.filters.sortStockDesc')}</option>
                </Select>
              </div>
            </div>

            <div className="product-list-shell">
              <DataTable
                rows={filteredProducts}
                isLoading={productsQuery.isLoading}
                loadingText={t('home.loading')}
                getRowKey={(row) => row.id}
                emptyText={t('sales.empty.products')}
                columns={productColumns}
                onRowClick={(row) => addProductToCart(row)}
              />
            </div>
          </div>
        </aside>

        <main className="pos-cart-panel">
          {repairContext ? (
            <div className="pos-card pos-repair-context-card">
              <div className="pos-card-heading">
                <div>
                  <h2>{t('repair.orderTitle', { code: repairContext.order?.order_code ?? repairOrderIdParam })}</h2>
                  <p>{repairContext.order?.customer_name} • {repairContext.order?.device_name}</p>
                </div>
                <span className="count-pill">{((repairContext.services ?? []).length + (repairContext.parts ?? []).length).toLocaleString()}</span>
              </div>
              <div className="repair-context-summary">
                <div><strong>{t('repair.services')}:</strong> {(repairContext.services ?? []).length}</div>
                <div><strong>{t('repair.parts')}:</strong> {(repairContext.parts ?? []).length}</div>
              </div>
            </div>
          ) : null}

          <div className="pos-card pos-cart-card">
            <div className="pos-card-heading">
              <div>
                <h2>{t('sales.sections.cart')}</h2>
                <p>{t('sales.sections.cartHint')}</p>
              </div>
              <Button variant="secondary" onClick={clearCart}>
                {t('sales.actions.clearCart')}
              </Button>
            </div>

            <div className="cart-list-shell">
              <table className="pos-cart-table">
                <thead>
                  <tr>
                    <th>{t('sales.fields.product')}</th>
                    <th>{t('sales.fields.quantity')}</th>
                    <th>{t('sales.fields.unitPrice')}</th>
                    <th>{t('sales.fields.lineTotal')}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {cart.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="empty-cart-cell">{t('sales.empty.cart')}</td>
                    </tr>
                  ) : (
                    cart.map((item, index) => (
                      <tr key={item.key}>
                        <td>
                          <strong>{cartLineTitle(item)}</strong>
                          <div className="muted">{cartLineMeta(item)}</div>
                        </td>
                        <td>
                          <Input
                            type="number"
                            min={0.0001}
                            step="0.0001"
                            value={String(item.qty)}
                            disabled={item.kind !== 'product'}
                            onChange={(event) => updateQty(index, Number((event.target as HTMLInputElement).value))}
                          />
                        </td>
                        <td>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={String(item.unitPrice)}
                            onChange={(event) => updateUnitPrice(index, Number((event.target as HTMLInputElement).value))}
                          />
                        </td>
                        <td>{formatSalesMoney(item.qty * item.unitPrice, language)}</td>
                        <td>
                          <Button variant="danger" onClick={() => removeItem(index)}>
                            {t('sales.actions.remove')}
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>

        <aside className="pos-sidebar-panel">
          <div className="pos-card">
            <div className="pos-card-heading">
              <div>
                <h2>{t('sales.sections.setup')}</h2>
                <p>{t('sales.sections.setupHint')}</p>
              </div>
            </div>

            <Select value={documentType} onChange={(event) => setDocumentType(event.target.value as SalesDocumentType)} label={t('sales.fields.documentType')}>
              <option value="invoice">{t('sales.documentTypes.invoice')}</option>
              <option value="quote">{t('sales.documentTypes.quote')}</option>
            </Select>

            <Checkbox label={t('sales.walkIn')} checked={isWalkIn} disabled={isRepairCustomerLocked} onChange={(event) => setIsWalkIn(event.target.checked)} />

            {!isWalkIn ? (
              <>
                {!isRepairCustomerLocked ? (
                  <SearchInput
                    placeholder={t('sales.fields.searchCustomers')}
                    value={customerSearch}
                    onChange={(event) => setCustomerSearch((event.target as HTMLInputElement).value)}
                  />
                ) : null}
                <Select value={customerId} onChange={(event) => setCustomerId(event.target.value)} label={t('sales.fields.customerSelect')} disabled={isRepairCustomerLocked}>
                  <option value="">{t('sales.fields.customerSelect')}</option>
                  {(customersQuery.data?.items ?? []).map((customer) => (
                    <option key={customer.id} value={customer.id}>{customer.name}</option>
                  ))}
                </Select>
                {isRepairCustomerLocked && repairContext?.order?.customer_name ? (
                  <div className="notice">{repairContext.order.customer_name}</div>
                ) : null}
              </>
            ) : null}

            <div className={`pos-document-note ${documentType === 'quote' ? 'quote' : 'invoice'}`}>
              {documentType === 'quote' ? t('sales.notes.quoteSafe') : t('sales.notes.invoiceAffectsStock')}
            </div>
          </div>

          <div className="pos-card pos-totals-card">
            <div className="pos-card-heading">
              <div>
                <h2>{t('sales.sections.totals')}</h2>
                <p>{t('sales.sections.totalsHint')}</p>
              </div>
              <div className="calculator-anchor">
                <IconButton
                  label={isCalculatorOpen ? t('sales.calculator.close') : t('sales.calculator.open')}
                  icon={<Calculator size={18} aria-hidden="true" />}
                  aria-pressed={isCalculatorOpen}
                  onClick={() => setIsCalculatorOpen((current) => !current)}
                />
                {isCalculatorOpen ? (
                  <div className="calculator-flyout">
                    <div className="calculator-display">
                      <small>{t('sales.calculator.title')}</small>
                      <strong>{calculatorExpression || '0'}</strong>
                      <span>{calculatorResult === null ? t('sales.calculator.ready') : `= ${formatSalesMoney(calculatorResult, language)}`}</span>
                    </div>
                    <div className="calculator-grid">
                      {calculatorKeys.map(([value, label]) => (
                        <button key={value} className={`calculator-key ${value.length > 2 ? 'wide' : ''}`} type="button" onClick={() => applyCalculatorValue(value)}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="totals-panel">
              <div className="total-line"><span>{t('sales.subtotal')}</span><strong>{formatSalesMoney(subtotal, language)}</strong></div>
              <div className="total-line emphasize"><span>{t('sales.total')}</span><strong>{formatSalesMoney(subtotal, language)}</strong></div>
              {documentType === 'invoice' ? (
                <>
                  <Input
                    label={t('sales.fields.amountReceived')}
                    type="number"
                    min={0}
                    step="0.01"
                    value={amountReceived}
                    onChange={(event) => setAmountReceived(event.target.value)}
                  />
                  <Select label={t('sales.fields.paymentMethod')} value={paymentMethodId} onChange={(event) => setPaymentMethodId(event.target.value)}>
                    <option value="">{t('sales.fields.paymentMethod')}</option>
                    {paymentMethods.map((method) => (
                      <option key={method.id} value={method.id}>
                        {method.name}
                      </option>
                    ))}
                  </Select>
                  <Select label={t('sales.fields.paymentAccount')} value={paymentAccountId} onChange={(event) => setPaymentAccountId(event.target.value)}>
                    <option value="">{t('sales.fields.paymentAccount')}</option>
                    {paymentAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} ({account.code})
                      </option>
                    ))}
                  </Select>
                  <Input
                    label={t('sales.fields.paymentReference')}
                    value={paymentReference}
                    onChange={(event) => setPaymentReference(event.target.value)}
                  />
                  {selectedPaymentMethod?.linked_account_name ? (
                    <div className="notice">
                      {selectedPaymentMethod.linked_account_name}
                    </div>
                  ) : null}
                  <div className="total-line"><span>{t('sales.fields.changeDue')}</span><strong>{formatSalesMoney(changeDue, language)}</strong></div>
                </>
              ) : null}
            </div>

            <div className="pos-actions">
              <Button variant="secondary" disabled={createInvoice.isPending || approveInvoice.isPending} onClick={() => submitDocument({ approveAfterCreate: false })}>
                {documentType === 'quote' ? t('sales.actions.createQuote') : t('sales.actions.saveDraft')}
              </Button>
              {documentType === 'invoice' ? (
                <Button disabled={createInvoice.isPending || approveInvoice.isPending} onClick={() => submitDocument({ approveAfterCreate: true })}>
                  {t('sales.actions.saveAndApprove')}
                </Button>
              ) : null}
            </div>
          </div>
        </aside>
      </section>

      <style>{`
        .pos-page{display:grid;gap:1rem;min-height:calc(100vh - 8rem)}
        .pos-page-header{align-items:center}
        .pos-page-header h1{margin:0}
        .pos-page-header-actions{display:flex;gap:0.75rem;flex-wrap:wrap}
        .pos-grid{display:grid;grid-template-columns:minmax(0,1.18fr) minmax(0,1fr) 340px;gap:1rem;align-items:start}
        .pos-card{display:grid;gap:0.95rem;padding:1rem;border:1px solid var(--theme-action-border);border-radius:24px;background:linear-gradient(145deg,var(--theme-panel-fill-start),var(--theme-panel-fill-end));box-shadow:var(--theme-panel-shadow);min-height:0}
        .pos-products-card{grid-template-rows:auto auto 1fr}
        .pos-cart-card{grid-template-rows:auto 1fr}
        .pos-card-heading{display:flex;justify-content:space-between;gap:1rem;align-items:flex-start}
        .pos-card-heading h2{margin:0;font-size:1.02rem}
        .pos-card-heading p{margin:0.25rem 0 0;color:var(--color-text-muted);font-size:0.92rem}
        .count-pill,.stock-pill{display:inline-flex;align-items:center;justify-content:center;padding:0.32rem 0.72rem;border-radius:999px;font-weight:700;border:1px solid rgba(132,156,179,0.2);background:rgba(255,255,255,0.06)}
        .stock-pill.ok{color:var(--theme-success-strong)}
        .stock-pill.warning{color:var(--theme-warning-strong)}
        .stock-pill.danger{color:var(--theme-danger-strong)}
        .pos-filter-stack{display:grid;gap:0.75rem}
        .pos-search-row{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(220px,0.8fr) auto;gap:0.7rem;align-items:end}
        .pos-filter-row{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0.7rem}
        .product-list-shell,.cart-list-shell{min-height:0;max-height:min(62vh,760px);overflow:hidden;border:1px solid rgba(132,156,179,0.14);border-radius:20px;background:rgba(255,255,255,0.03)}
        .product-list-shell .data-table-wrap{height:100%;overflow:auto}
        .cart-list-shell{overflow:auto}
        .pos-cart-table{width:100%;border-collapse:collapse}
        .pos-cart-table th,.pos-cart-table td{padding:0.8rem;border-bottom:1px solid rgba(132,156,179,0.16);text-align:start;vertical-align:top}
        .empty-cart-cell{text-align:center;color:var(--color-text-muted);padding:1.5rem 0}
        .pos-sidebar-panel{display:grid;gap:1rem}
        .pos-document-note{padding:0.85rem 0.95rem;border-radius:18px;border:1px solid rgba(132,156,179,0.2);background:rgba(255,255,255,0.05);line-height:1.6}
        .pos-document-note.quote{color:var(--theme-success-strong)}
        .pos-document-note.invoice{color:var(--theme-warning-strong)}
        .pos-totals-card{position:relative}
        .calculator-anchor{position:relative}
        .calculator-flyout{position:absolute;top:calc(100% + 0.65rem);inset-inline-end:0;width:min(320px,calc(100vw - 3rem));padding:0.95rem;border-radius:22px;border:1px solid rgba(96,141,190,0.24);background:linear-gradient(145deg,var(--theme-panel-fill-start),var(--theme-panel-fill-end));box-shadow:var(--theme-panel-shadow);display:grid;gap:0.75rem;z-index:5}
        .totals-panel{display:grid;gap:0.6rem}
        .total-line{display:flex;justify-content:space-between;gap:1rem;padding:0.8rem 0.95rem;border-radius:16px;background:rgba(255,255,255,0.05)}
        .total-line.emphasize{font-size:1.05rem}
        .calculator-display{display:grid;gap:0.18rem;padding:0.95rem 1rem;border-radius:20px;background:rgba(5,16,31,0.35);border:1px solid rgba(96,141,190,0.18)}
        .calculator-display small{color:var(--color-text-muted)}
        .calculator-display strong{font-size:1.45rem;word-break:break-all}
        .calculator-display span{color:var(--theme-accent-strong)}
        .calculator-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0.6rem}
        .calculator-key{min-height:48px;border-radius:16px;border:1px solid rgba(132,156,179,0.2);background:rgba(255,255,255,0.06);color:inherit;font:inherit;font-weight:700;cursor:pointer}
        .calculator-key:hover{background:rgba(255,255,255,0.1)}
        .calculator-key.wide{font-size:0.82rem}
        .pos-actions{display:grid;gap:0.75rem}
        .notice.error{padding:0.95rem 1rem;border-radius:18px;border:1px solid rgba(220,76,100,0.3);background:rgba(220,76,100,0.12)}
        .muted{font-size:0.86rem;color:var(--color-text-muted)}
        .pos-repair-context-card{margin-bottom:1rem}
        .repair-context-summary{display:flex;gap:1rem;flex-wrap:wrap}
        @media (max-width: 1320px){
          .pos-grid{grid-template-columns:1fr}
          .pos-sidebar-panel{order:-1}
        }
        @media (max-width: 860px){
          .pos-search-row,.pos-filter-row{grid-template-columns:1fr}
          .calculator-flyout{position:static;width:100%}
        }
        @media (max-width: 640px){
          .pos-card-heading{flex-direction:column;align-items:stretch}
          .pos-page-header{align-items:stretch}
          .pos-page-header-actions{justify-content:flex-start}
        }
      `}</style>
    </div>
  );
}
