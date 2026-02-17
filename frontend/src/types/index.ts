// ============================================
// Shared TypeScript types matching backend schemas
// ============================================

export type PlanType = "free" | "starter" | "pro" | "enterprise";

export interface User {
  id: string;
  email: string;
  company_name: string | null;
  plan: PlanType;
  created_at: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}

export interface Shop {
  id: string;
  shop_name: string;
  tts_shop_id: string | null;
  market: string | null;
  category: string | null;
  is_active: boolean;
  connected_at: string;
}

export interface CRProject {
  id: string;
  shop_id: string;
  product_name: string;
  product_url: string | null;
  purpose: "sales" | "awareness" | "review" | null;
  duration: "15s" | "30s" | "60s" | null;
  tone: string | null;
  reference_videos: string[] | null;
  additional_instructions: string | null;
  ai_output: CRAIOutput | null;
  status: "draft" | "generating" | "generated" | "filming" | "published";
  performance_data: Record<string, unknown> | null;
  created_at: string;
}

export interface CRAIOutput {
  concept: string;
  script: string;
  hooks: string[];
  cta: string;
  notes: string;
}

export interface CRGenerateRequest {
  shop_id: string;
  product_name: string;
  product_url?: string;
  purpose?: "sales" | "awareness" | "review";
  duration?: "15s" | "30s" | "60s";
  tone?: string;
  reference_videos?: string[];
  additional_instructions?: string;
}

export interface CRGenerateResponse {
  project_id: string;
  status: string;
  ai_output: CRAIOutput;
}

export interface TrendProduct {
  id: string;
  product_name: string;
  category: string | null;
  sold_count: number | null;
  revenue: number | null;
  growth_rate: number | null;
  competition_score: number | null;
  top_video_url: string | null;
  video_script: string | null;
  source: string | null;
  market: string | null;
  fetched_at: string;
}

export interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  category: "hook" | "script" | "trend" | "strategy" | "product" | null;
  source: string | null;
  performance_score: number | null;
  pinecone_id: string | null;
  created_at: string;
}

export interface CopilotMessage {
  role: "user" | "assistant";
  content: string;
}

export interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}

export interface HealthStatus {
  status: string;
  version: string;
  database: string;
}

export interface ApiError {
  detail: string;
}
