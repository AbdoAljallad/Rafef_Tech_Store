export type CustomerContactType = 'phone' | 'email' | 'whatsapp' | 'telegram' | 'other';
export type CustomerSortMode = 'name-asc' | 'name-desc' | 'code-asc' | 'code-desc' | 'created-desc' | 'created-asc';

export type CustomerContact = {
  id: number;
  customer_id: number;
  contact_type: CustomerContactType;
  contact_value: string;
  is_primary: number | boolean;
  created_at?: string;
};

export type CustomerLocation = {
  id: number;
  customer_id: number;
  name: string;
  location_type: 'home' | 'school' | 'company' | 'store' | 'factory' | 'hospital' | 'other';
  address_text: string | null;
  map_url: string | null;
  notes: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
};

export type CustomerNoteHistory = {
  id: number;
  customer_id: number;
  note_text: string;
  created_by_user_id: number | null;
  created_at: string;
};

export type Customer = {
  id: number;
  customer_code: string;
  name: string;
  name_original?: string;
  name_source_lang?: string | null;
  phone_primary: string | null;
  phone_secondary: string | null;
  email: string | null;
  avatar_url: string | null;
  customer_type: 'person' | 'business';
  notes: string | null;
  is_active: number;
  is_frozen: number;
  created_at: string;
  updated_at: string;
  contacts?: CustomerContact[];
  locations?: CustomerLocation[];
  notesHistory?: CustomerNoteHistory[];
};

export type CustomerCreateRequest = {
  name: string;
  phonePrimary?: string | null;
  phoneSecondary?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  customerType: 'person' | 'business';
  notes?: string | null;
  isFrozen?: boolean;
  contacts?: Array<{
    contactType: CustomerContactType;
    contactValue: string;
    isPrimary: boolean;
  }>;
};

export type CustomerUpdateRequest = Partial<CustomerCreateRequest>;

export type ContactCreateRequest = {
  contactType: CustomerContactType;
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
