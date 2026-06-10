export type SalesDocumentType = 'invoice' | 'quote';
export type SalesInvoiceStatus = 'draft' | 'approved' | 'voided' | 'returned';

export type SalesInvoiceLine = {
  id: number;
  invoice_id: number;
  line_type: 'product' | 'repair_part' | 'repair_service' | 'manual';
  product_id: number | null;
  description_snapshot?: string | null;
  sku_snapshot?: string | null;
  category_name_snapshot?: string | null;
  quantity: string;
  unit_price: string;
  unit_cost: string | null;
  reservation_id?: number | null;
  repair_order_service_id?: number | null;
  repair_order_part_id?: number | null;
  source_type?: string | null;
  source_id?: number | null;
  line_total: string;
  product_name: string;
  product_sku: string;
  category_name: string;
};

export type SalesInvoice = {
  id: number;
  invoice_code: string;
  customer_id: number | null;
  repair_order_id?: number | null;
  customer_code?: string | null;
  customer_name?: string | null;
  is_walk_in: boolean | number;
  document_type: SalesDocumentType;
  status: SalesInvoiceStatus;
  subtotal: string;
  tax: string;
  total: string;
  created_at: string;
  approved_at?: string | null;
  voided_at?: string | null;
  note_text?: string | null;
  a4_header_text?: string | null;
  a4_footer_text?: string | null;
  receipt_header_text?: string | null;
  receipt_footer_text?: string | null;
  lines: SalesInvoiceLine[];
};

export type SalesInvoiceListItem = Omit<SalesInvoice, 'lines'> & {
  line_count: number;
};

export type SalesInvoiceListFilters = {
  page?: number;
  pageSize?: number;
  offset?: number;
  limit?: number;
  search?: string;
  documentType?: SalesDocumentType | 'all';
  status?: SalesInvoiceStatus | 'all';
  dateFrom?: string;
  dateTo?: string;
};

export type SalesInvoiceListResponse = {
  items: SalesInvoiceListItem[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type SalesInvoiceCreatePayload = {
  customerId?: number | null;
  repairOrderId?: number | null;
  isWalkIn?: boolean;
  documentType?: SalesDocumentType;
  noteText?: string | null;
  a4HeaderText?: string | null;
  a4FooterText?: string | null;
  receiptHeaderText?: string | null;
  receiptFooterText?: string | null;
  lines: Array<
    | {
        lineType?: 'product';
        productId: number;
        quantity: number;
        unitPrice: number;
      }
    | {
        lineType: 'repair_service';
        repairOrderServiceId: number;
        quantity?: number;
        unitPrice?: number;
      }
    | {
        lineType: 'repair_part';
        repairOrderPartId: number;
        quantity?: number;
        unitPrice?: number;
      }
  >;
};

export type SalesInvoicePrintPayload = {
  noteText?: string | null;
  a4HeaderText?: string | null;
  a4FooterText?: string | null;
  receiptHeaderText?: string | null;
  receiptFooterText?: string | null;
};

export type SalesInvoiceApprovePayload = {
  paymentAccountId?: number | null;
  paymentMethodId?: number | null;
  paymentAmount?: number | null;
  paymentReference?: string | null;
};
