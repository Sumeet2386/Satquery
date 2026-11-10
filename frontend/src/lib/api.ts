/**
 * SatQuery AI — Unified Client API Bridge
 * Connects directly to FastAPI backend with automatic fallback to offline simulation.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface BackendHealth {
  status: string;
  service?: string;
  ps_number?: string;
  organization?: string;
  device?: string;
  version?: string;
  capabilities?: string[];
}

export interface UploadResponse {
  status: string;
  file_paths: string[];
  thumbnails: string[];
  compatibility: {
    valid: boolean;
    input_type: string;
    sensor_types: string[];
    issues: string[];
    warnings: string[];
    recommended_tasks: string[];
    file_infos?: Array<{
      path: string;
      filename: string;
      bands: number;
      width: number;
      height: number;
      crs: string;
      resolution_m: number;
      sensor_hint: string;
      dtype: string;
      acquisition_date: string | null;
    }>;
  };
}

export interface QueryResponse {
  status: string;
  query: string;
  answer: string;
  confidence: number;
  tier: "HIGH" | "MEDIUM" | "LOW";
  icon: string;
  visual_evidence?: any;
  bounding_boxes?: number[][];
  change_percentage?: number;
  agent_mode?: string;
  statistical_audit?: any;
  execution_trace: {
    trace_id: string;
    timestamp: string;
    query: string;
    selected_task: string;
    model_name: string;
    selected_tool: string;
    permitted_parameters: any;
    input_summary: any;
    confidence: any;
    latency_seconds: number;
    orchestrator: string;
  };
  compatibility_report?: any;
}

export async function checkBackendHealth(): Promise<{ online: boolean; data?: BackendHealth }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1800);
    const res = await fetch(`${API_BASE_URL}/health`, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      return { online: true, data };
    }
    return { online: false };
  } catch {
    return { online: false };
  }
}

export async function uploadSatelliteImages(files: File[]): Promise<UploadResponse> {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  const res = await fetch(`${API_BASE_URL}/api/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Upload failed");
  }

  return res.json();
}

export interface AgentQueryPayload {
  query: string;
  filePaths: string[];
  analysisContext?: Record<string, any>;
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
  llmConfig?: {
    provider: string;
    api_key?: string;
    model?: string;
    base_url?: string;
    enable_vision?: boolean;
  };
  preImageB64?: string;
  postImageB64?: string;
  preferBackend?: boolean;
}

export async function executeAgentQuery(payload: AgentQueryPayload | string, legacyFilePaths?: string[]): Promise<QueryResponse> {
  const reqObj: AgentQueryPayload =
    typeof payload === "string"
      ? { query: payload, filePaths: legacyFilePaths || [], preferBackend: true }
      : payload;

  const body = JSON.stringify({
    query: reqObj.query,
    file_paths: reqObj.filePaths,
    analysis_context: reqObj.analysisContext,
    conversation_history: reqObj.conversationHistory || [],
    llm_config: reqObj.llmConfig,
    pre_image_b64: reqObj.preImageB64,
    post_image_b64: reqObj.postImageB64,
  });

  // Try FastAPI backend first if online/preferred
  if (reqObj.preferBackend !== false) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      if (res.ok) {
        return res.json();
      }
    } catch {
      // Fall through to Next.js server-side /api/agent route
    }
  }

  // Fallback to Next.js server-side /api/agent route (handles real LLMs + Statistical Engine without CORS)
  const nextRes = await fetch("/api/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  if (!nextRes.ok) {
    const errorData = await nextRes.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.error || "Query execution failed");
  }
  return nextRes.json();
}

export async function testAgentConnection(
  llmConfig: { provider: string; api_key?: string; model?: string; base_url?: string },
  backendOnline: boolean
): Promise<{ ok: boolean; provider?: string; model?: string; message?: string; error?: string }> {
  if (backendOnline) {
    try {
      const r = await fetch(`${API_BASE_URL}/api/agent/test-connection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(llmConfig),
      });
      if (r.ok) return r.json();
    } catch {
      // Fall through to Next.js server route
    }
  }
  const r = await fetch("/api/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "test", llm_config: llmConfig }),
  });
  return r.json();
}

export async function generatePdfReport(data: {
  query: string;
  answer: string;
  confidence: number;
  tier: string;
  selected_task: string;
  model_name: string;
  input_type: string;
  sensors: string[];
  execution_trace: any;
}): Promise<{ status: string; file_url: string; local_path?: string }> {
  const res = await fetch(`${API_BASE_URL}/api/generate-report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw new Error("Failed to generate PDF report");
  }

  return res.json();
}

// ── Legacy / Job-based API Compatibility ─────────────────────────────────────

export interface AnalysisStatus {
  job_id: string;
  status: "pending" | "validating" | "preprocessing" | "inferring" | "explaining" | "done" | "failed";
  query: string;
  model_id: string;
  created_at: string;
  updated_at?: string;
  error?: string | null;
  warnings?: string[];
  elapsed_seconds?: number | null;
  explanation?: string | null;
  limitations?: string | null;
  change_geojson?: Record<string, unknown>;
  provenance?: Record<string, unknown>;
}

export interface UploadResult {
  upload_id: string;
  filename: string;
  size_mb: number;
  message: string;
}

export async function uploadImageFile(file: File): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/uploads`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Upload failed with status ${res.status}`);
    }

    return await res.json();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Network error";
    console.warn("Backend upload endpoint unreachable, falling back to client session ID:", message);
    return {
      upload_id: `upload_${crypto.randomUUID()}`,
      filename: file.name,
      size_mb: Number((file.size / (1024 * 1024)).toFixed(2)),
      message: "Uploaded to local workspace session.",
    };
  }
}

export async function submitAnalysisJob(params: {
  image_a_upload_id: string;
  image_b_upload_id: string;
  query: string;
  model_id?: string;
}): Promise<AnalysisStatus> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/analyses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_a_upload_id: params.image_a_upload_id,
        image_b_upload_id: params.image_b_upload_id,
        query: params.query,
        model_id: params.model_id || "changeformer",
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Analysis request failed with status ${res.status}`);
    }

    return await res.json();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Network error";
    console.warn("Backend analysis endpoint unreachable, creating simulated demo job:", message);
    return {
      job_id: "demo",
      status: "pending",
      query: params.query,
      model_id: params.model_id || "changeformer",
      created_at: new Date().toISOString(),
    };
  }
}

export async function fetchAnalysisStatus(jobId: string): Promise<AnalysisStatus | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/analyses/${jobId}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// Stub for auth functions — returns demo tokens
export async function loginUser(email: string, password: string): Promise<{ access_token: string }> {
  // In production, hit /api/v1/auth/login
  // For now, simulate a successful login
  await new Promise((resolve) => setTimeout(resolve, 800));
  if (!email || !password) throw new Error("Invalid credentials");
  return { access_token: `demo_token_${Date.now()}` };
}

export async function registerUser(params: {
  email: string;
  password: string;
  full_name: string;
  organization?: string;
}): Promise<{ access_token: string }> {
  await new Promise((resolve) => setTimeout(resolve, 800));
  return { access_token: `demo_token_${Date.now()}` };
}
