import api from "./api";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FieldImageRecord {
  id: number;
  field_name: string;
  option_value: string;
  file_path: string;
  created_at?: string;
  updated_at?: string;
}

export interface FieldDefinition {
  field_name: string;
  options: string[];
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

// ─── API Calls ────────────────────────────────────────────────────────────────

/** GET /api/field-images/fields — valid fields + dropdown options */
export async function fetchFieldDefinitions(): Promise<FieldDefinition[]> {
  const res = await api.get<ApiResponse<FieldDefinition[]>>("/field-images/fields");
  return res.data.data ?? [];
}

/** GET /api/field-images — list all, optional ?field_name= filter */
export async function fetchFieldImages(fieldName?: string): Promise<FieldImageRecord[]> {
  const params = fieldName ? { field_name: fieldName } : undefined;
  const res = await api.get<ApiResponse<FieldImageRecord[]>>("/field-images", { params });
  return res.data.data ?? [];
}

/** GET /api/field-images/by-field/:fieldName — all records for a field */
export async function fetchFieldImagesByField(fieldName: string): Promise<FieldImageRecord[]> {
  const res = await api.get<ApiResponse<FieldImageRecord[]>>(`/field-images/by-field/${fieldName}`);
  return res.data.data ?? [];
}

/** GET /api/field-images/:id — single record */
export async function fetchFieldImage(id: number): Promise<FieldImageRecord | null> {
  const res = await api.get<ApiResponse<FieldImageRecord>>(`/field-images/${id}`);
  return res.data.data ?? null;
}

/** POST /api/field-images — upload/upsert (multipart/form-data) */
export async function uploadFieldImage(
  fieldName: string,
  optionValue: string,
  file: File
): Promise<FieldImageRecord> {
  const form = new FormData();
  form.append("field_name", fieldName);
  form.append("option_value", optionValue);
  form.append("file", file);

  const res = await api.post<ApiResponse<FieldImageRecord>>("/field-images", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  if (!res.data.data) throw new Error(res.data.message ?? "Upload failed");
  return res.data.data;
}

/** DELETE /api/field-images/:id */
export async function deleteFieldImage(id: number): Promise<void> {
  await api.delete(`/field-images/${id}`);
}

/** Resolve a stored file_path to a full URL */
export function getFieldImageUrl(filePath: string): string {
  if (filePath.startsWith("http")) return filePath;
  return `${process.env.NEXT_PUBLIC_URL}/${filePath.replace(/\\/g, "/")}`;
}
