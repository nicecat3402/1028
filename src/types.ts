export type TitleRankNumber = 95 | 90 | 80 | 70 | 60 | 50 | 40 | 30 | 20 | 0;

export interface Company {
  id: string;
  canonical_name: string;
  normalized_name?: string;
  tax_id: string; // 8-digit Taiwan UBN
  domain: string;
  phone: string;
  address: string;
  industry_tags: string[];
  aliases: string[];
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface Department {
  id: string;
  company_id: string;
  parent_id: string | null;
  name: string;
  level: 1 | 2 | 3; // 1: 部, 2: 課, 3: 組
  code?: string;
}

export interface Contact {
  id: string;
  company_id: string;
  department_id?: string;
  name: string;
  title_raw: string;
  title_rank: TitleRankNumber;
  mobile: string;
  direct_phone: string;
  extension: string;
  email: string;
  is_primary_contact: boolean;
  notes: string;
  tags?: string[];
  created_at?: string;
  last_interaction?: string;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  confidence: number;
  field_type?: 'name' | 'company' | 'title' | 'mobile' | 'phone' | 'email' | 'address' | 'tax_id';
}

export interface Card {
  id: string;
  contact_id: string;
  company_id?: string;
  department_id?: string;
  image_url: string;
  image_sha256: string;
  ocr_raw_text: string;
  ocr_boxes: BoundingBox[];
  confidence_scores: {
    name: number;
    company: number;
    title: number;
    mobile: number;
    phone: number;
    email: number;
    tax_id: number;
    address: number;
  };
  is_verified: boolean;
  acquired_at: string;
  acquired_event: string;
  created_at?: string;
  notes?: string;
  embedding_dim?: number;
}

export interface MergeQueueItem {
  id: string;
  source_card_id: string;
  source_company_name: string;
  source_tax_id?: string;
  source_email?: string;
  source_phone?: string;
  source_address?: string;
  target_company_id: string;
  target_company_name: string;
  calculated_score: number;
  match_reasons: {
    dimension: string;
    weight: number;
    score: number;
    detail: string;
  }[];
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export interface SearchFilter {
  keyword: string;
  company_id?: string;
  department_id?: string;
  min_rank?: number;
  max_rank?: number;
  tags?: string[];
  acquired_event?: string;
  time_range?: 'all' | '30d' | '90d' | '180d' | '365d';
  mode: 'hybrid' | 'structured' | 'fuzzy' | 'semantic';
}

export interface HitSource {
  type: 'structured' | 'fuzzy' | 'semantic';
  field: string;
  score: number;
  reason: string;
}

export interface SearchResultItem {
  contact: Contact;
  company: Company;
  department?: Department;
  card: Card | null;
  rrf_score: number;
  hit_sources: HitSource[];
}

export interface OfflineQueueItem {
  id: string;
  blob_url: string;
  filename: string;
  sha256: string;
  status: 'queued' | 'processing_ocr' | 'resolving_entity' | 'ready_for_review' | 'failed';
  progress: number;
  detected_name?: string;
  detected_company?: string;
  timestamp: string;
}
