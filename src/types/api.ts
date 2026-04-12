export interface DynamicField {
  name: string;
  type: 'text' | 'number' | 'date';
}

export interface DocumentField {
  name: string;
  category: 'individual' | 'ppap';
}

export interface DynamicFieldsData {
  id: number;
  product_fields: DynamicField[];
  approval_fields: string[];
  quality_verification_fields: string[];
  important_fields: string[];
  documents: DocumentField[];
  updated_at: string;
}

export interface DropdownOptions {
  CUSTOMER_OPTIONS?: string[];
  PRODUCT_TYPE_OPTIONS?: string[];
  TUBE_DIA_OPTIONS?: string[];
  C_FLANGE_ORIENTATION_OPTIONS?: string[];
  COUPLING_FLANGE_OPTIONS?: string[];
  JOINT_TYPE_OPTIONS?: string[];
  FLANGE_YOKE_OPTIONS?: string[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
}

export interface ProductCounts {
  total: number;
  approved: number;
  approval_pending: number;
  approval_rejected: number;
  qv_approved: number;
  qv_pending: number;
  qv_rejected: number;
  active: number;
  pending: number;
  rejected: number;
  inactive: number;
  edited: number;
}

export interface Product {
  id: number;
  part_number: string;
  customer: string;
  status: 'draft' | 'active' | 'inactive';
  approved: 'pending' | 'approved' | 'rejected';
  quality_verified: 'pending' | 'approved' | 'rejected';
  edited: number;
  edited_fields: string[];
  specification: Record<string, any>;
  ppap_documents?: {
    ppap: Record<string, string>;
    individual: Record<string, string>;
  } | string;
  product_images?: Record<string, string> | string;
  created_at: string;
  updated_at: string;
  created_by: string;
  modified_by: string;
}

export interface ScannedProduct {
  id: number;
  dispatch_date: string;
  shift: string;
  part_no: string;
  customer_name: string;
  product_type: string;
  validation_status: 'pass' | 'fail' | 'pending';
  remarks: string;
  part_sl_no: string | null;
  sl_no?: string | number;
  scanned_text: string;
  plant_location: string;
  vendorCode: string | null;
  is_rejected: number | boolean;
  created_by: string | null;
  modified_by: string | null;
  product_id: number;
  scanned_specification: Record<string, any>;
  matched_fields: string[];
  mismatched_fields: string[];
  created_at: string;
  updated_at: string;
}

export type DailyScanSummary = ScannedProduct[];

export interface User {
  id: number;
  name: string;
  mobile: string | null;
  username: string;
  email: string;
  password: string;
  role: 'super admin' | 'admin' | 'production' | 'quality' | 'viewer';
  column_array: string[];
  menu_array: string[];
  document_name_array: string[];
  mail_types: string[];   // or MailType[] if you import it here

  profile_image: string | null;
  is_active: number | boolean;
  created_at?: string;
  updated_at?: string;
  show_image: string;
}

