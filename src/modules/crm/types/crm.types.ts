export type Customer = {
  id: number;
  customer_code: string;
  name: string;
  phone_primary: string | null;
  phone_secondary: string | null;
  email: string | null;
  customer_type: 'person' | 'business';
  notes: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
};

export type CustomerCreateRequest = {
  name: string;
  phonePrimary?: string | null;
  phoneSecondary?: string | null;
  email?: string | null;
  customerType: 'person' | 'business';
  notes?: string | null;
};

export type CustomerUpdateRequest = Partial<CustomerCreateRequest>;

export type ContactCreateRequest = {
  contactType: 'phone' | 'email' | 'whatsapp' | 'telegram' | 'other';
  contactValue: string;
  isPrimary: boolean;
};

export type LocationCreateRequest = {
  name: string;
  locationType: 'home' | 'school' | 'company' | 'store' | 'factory' | 'hospital' | 'other';
  addressText?: string | null;
  mapUrl?: string | null;
  notes?: string | null;
};

export type NoteCreateRequest = {
  noteText: string;
};
