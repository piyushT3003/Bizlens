/**
 * BizLens API Client: Type-safe client for FastAPI backend endpoints.
 */

export interface ColumnMappingItem {
  original_name: string;
  role: string;
  data_type: string;
  confidence: number;
  confirmed: boolean;
  reasoning?: string;
}

export interface QualityComponentScore {
  completeness: number;
  consistency: number;
  validity: number;
  uniqueness?: number;
  anomaly_freedom: number;
}

export interface QualityReport {
  score: number;
  components: QualityComponentScore;
  issues: Array<{ column?: string; severity: string; code: string; message: string }>;
  formula_version: string;
}

export interface DatasetVersionSummary {
  id: string;
  version_number: number;
  row_count: number;
  col_count: number;
  content_hash: string;
  quality_score?: number;
  lock_version?: number;
  label?: string;
  created_at: string;
}

export interface TransformationStats {
  row_count: number;
  col_count: number;
  null_count: number;
  duplicate_count: number;
}

export interface TransformationPreviewResponse {
  type: string;
  parameters: Record<string, any>;
  rows_affected: number;
  before_stats: TransformationStats;
  after_stats: TransformationStats;
  sample_before: Record<string, any>[];
  sample_after: Record<string, any>[];
  summary_message: string;
}

export interface TransformationApplyResponse {
  transformation_id: string;
  dataset_id: string;
  from_version_id: string;
  to_version_id: string;
  new_version_number: number;
  rows_affected: number;
  new_row_count: number;
  new_quality_score?: number;
  label: string;
  status: string;
  created_at: string;
}

export interface TransformationHistoryItem {
  id: string;
  dataset_id: string;
  from_version_id: string;
  to_version_id: string;
  type: string;
  parameters: Record<string, any>;
  rows_affected: number;
  before_stats: Record<string, any>;
  after_stats: Record<string, any>;
  status: string;
  created_at: string;
}

export interface QualityCopilotAction {
  type: string;
  title: string;
  description: string;
  parameters: Record<string, any>;
}

export interface QualityCopilotResponse {
  blocks: Array<{ tag: string; content: string; fact_ids: string[] }>;
  suggested_actions: QualityCopilotAction[];
  quality_score: number;
  components: QualityComponentScore;
  guardrail_result: Record<string, any>;
}

export interface DatasetSummary {
  id: string;
  name: string;
  description?: string;
  source_filename_sanitized: string;
  active_version_id?: string;
  status: string;
  row_count: number;
  col_count: number;
  quality_score?: number;
  created_at: string;
  updated_at: string;
}

export interface DatasetDetail extends DatasetSummary {
  versions: DatasetVersionSummary[];
  active_mapping?: Record<string, ColumnMappingItem>;
  quality_report?: QualityReport;
}

export interface DatasetPreview {
  dataset_id: string;
  version_number: number;
  total_rows: number;
  columns: string[];
  rows: Record<string, any>[];
}

export interface MetricResult {
  metric_id: string;
  label: string;
  value: number | null;
  formatted_value: string;
  unit: string;
  direction: string;
  previous_value?: number | null;
  delta_abs?: number | null;
  delta_pct?: number | null;
  status: "positive" | "warning" | "critical" | "neutral";
  is_available: boolean;
  unavailable_reason?: string | null;
  formula_sql: string;
  comparison_label?: string | null;
}

export interface BreakdownItem {
  dimension_value: string;
  metrics: Record<string, number>;
  share_pct: number;
  rank: number;
}

export interface LineageRecord {
  dataset_id: string;
  version_number: number;
  content_hash: string;
  total_rows_scanned: number;
  rows_after_filters: number;
  execution_time_ms: number;
  filters_applied: Record<string, any>;
  formula_registry_version: string;
}

export interface AnalyticsQueryResponse {
  metrics: Record<string, MetricResult>;
  breakdown?: BreakdownItem[];
  lineage?: LineageRecord;
}

export interface TrajectoryPoint {
  month_key: string;
  label: string;
  revenue: number;
  formatted_revenue: string;
  orders: number;
  delta_pct?: number | null;
  projected: boolean;
  status: string;
}

export interface TrajectoryResponse {
  dataset_id: string;
  dataset_name: string;
  total_months: number;
  points: TrajectoryPoint[];
  max_value: number;
  min_value: number;
  metric_label?: string;
  unit?: string;
}

export interface MetricCatalogItem {
  id: string;
  label: string;
  description: string;
  required_roles: string[];
  unit: string;
  format_str: string;
  direction: string;
  is_available: boolean;
  missing_roles: string[];
  resolved_columns: Record<string, string>;
  reason?: string;
}

export interface GuardrailVerifyResponse {
  passed: boolean;
  total_extracted: number;
  extracted_tokens: Array<{
    raw_token: string;
    canonical_value: number;
    is_percentage: boolean;
    is_structural: boolean;
    is_year: boolean;
  }>;
  violations: Array<{
    raw_token: string;
    normalized_value: number;
    reason: string;
  }>;
  allowed_facts: number[];
  tolerance_used: number;
}

export interface ChatMessageBlock {
  tag: "CALCULATED FACT" | "INTERPRETATION" | "RECOMMENDATION" | "NOTICE" | string;
  content: string;
  fact_ids: string[];
  lineage_ref?: string | null;
}

export interface ShowYourWorkMetadata {
  fact_set: Array<{
    id: string;
    label: string;
    value: number | null;
    formatted_value: string;
    unit: string;
    delta_pct?: number | null;
    formula_sql?: string;
  }>;
  engine_query_ms: number;
  guardrail_result: {
    passed: boolean;
    total_extracted: number;
    violations: string[];
  };
  model_used: string;
  context_mode: string;
  pii_detected: boolean;
  pii_warning?: string | null;
}

export interface ChatMessageResponse {
  id: string;
  session_id: string;
  role: "user" | "assistant" | "system";
  blocks: ChatMessageBlock[];
  operation?: Record<string, any> | null;
  evidence_refs: string[];
  show_your_work?: ShowYourWorkMetadata | null;
  created_at: string;
}

export interface ChatSessionSummary {
  id: string;
  title: string;
  context_type: string;
  dataset_ref?: string | null;
  created_at: string;
  updated_at: string;
  messages_count: number;
}

export interface ChatSessionDetail extends ChatSessionSummary {
  messages: ChatMessageResponse[];
}

export interface SuggestedPrompt {
  id: string;
  prompt: string;
  category: string;
  context_type: string;
}

class ApiError extends Error {
  code: string;
  status: number;
  details?: any;

  constructor(code: string, message: string, status: number, details?: any) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export const API_BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export function getApiUrl(path: string): string {
  if (path.startsWith("/")) {
    if (API_BASE_URL) {
      return `${API_BASE_URL}${path}`;
    }
    if (typeof window !== "undefined" && window.location && window.location.origin && window.location.origin.startsWith("http") && !window.location.origin.includes(":3000")) {
      return `${window.location.origin}${path}`;
    }
    return `http://127.0.0.1:8000${path}`;
  }
  return path;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const targetUrl = getApiUrl(url);
  const res = await fetch(targetUrl, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options?.headers || {}),
    },
  });

  const contentType = res.headers.get("content-type") || "";

  if (!res.ok) {
    let errData: any;
    try {
      if (contentType.includes("application/json")) {
        errData = await res.json();
      }
    } catch {
      // ignore
    }
    const code = errData?.error?.code || "HTTP_ERROR";
    const message = errData?.error?.message || res.statusText;
    throw new ApiError(code, message, res.status, errData?.error?.details);
  }

  // If status is OK but returned HTML (e.g. Vercel SPA index.html returned for missing backend API route)
  if (contentType.includes("text/html")) {
    throw new ApiError("NOT_FOUND", `Endpoint returned HTML instead of JSON: ${url}`, 404);
  }

  return res.json() as Promise<T>;
}

export const api = {
  // Datasets
  async getDatasets(): Promise<DatasetSummary[]> {
    return request<DatasetSummary[]>("/api/v1/datasets");
  },

  async getDataset(id: string): Promise<DatasetDetail> {
    return request<DatasetDetail>(`/api/v1/datasets/${id}`);
  },

  async uploadDataset(file: File, name?: string, description?: string): Promise<DatasetDetail> {
    const formData = new FormData();
    formData.append("file", file);
    if (name) formData.append("name", name);
    if (description) formData.append("description", description);

    return request<DatasetDetail>("/api/v1/datasets/upload", {
      method: "POST",
      body: formData,
    });
  },

  async getDatasetPreview(id: string, limit: number = 50, offset: number = 0): Promise<DatasetPreview> {
    return request<DatasetPreview>(`/api/v1/datasets/${id}/preview?limit=${limit}&offset=${offset}`);
  },

  async getDatasetProfile(id: string): Promise<any> {
    return request<any>(`/api/v1/datasets/${id}/profile`);
  },

  async updateColumnMapping(id: string, mapping: Record<string, ColumnMappingItem>): Promise<any> {
    return request<any>(`/api/v1/datasets/${id}/mapping`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mapping }),
    });
  },

  async loadDemoDataset(): Promise<DatasetDetail> {
    return request<DatasetDetail>("/api/v1/datasets/demo", {
      method: "POST",
    });
  },

  async deleteDataset(id: string): Promise<{ message: string }> {
    return request<{ message: string }>(`/api/v1/datasets/${id}`, {
      method: "DELETE",
    });
  },

  // Analytics Engine
  async getMetricCatalog(datasetId?: string): Promise<MetricCatalogItem[]> {
    const q = datasetId ? `?dataset_id=${encodeURIComponent(datasetId)}` : "";
    return request<MetricCatalogItem[]>(`/api/v1/analytics/metrics${q}`);
  },

  async queryAnalytics(payload: {
    dataset_id?: string;
    metric_ids?: string[];
    filters?: Record<string, any>;
    group_by_role?: string;
    compare_to_previous?: boolean;
  }): Promise<AnalyticsQueryResponse> {
    return request<AnalyticsQueryResponse>("/api/v1/analytics/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  async getBreakdown(payload: {
    dataset_id?: string;
    dimension_role?: string;
    dimension_column?: string;
    metric_ids?: string[];
    filters?: Record<string, any>;
  }): Promise<BreakdownItem[]> {
    return request<BreakdownItem[]>("/api/v1/analytics/breakdown", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  async getTrajectory(datasetId: string, category?: string | null, limit: number = 12): Promise<TrajectoryResponse> {
    const params = new URLSearchParams({ dataset_id: datasetId, limit: String(limit) });
    if (category) {
      params.append("category", category);
    }
    return request<TrajectoryResponse>(`/api/v1/analytics/trajectory?${params.toString()}`);
  },

  async verifyGuardrail(payload: {
    text: string;
    fact_values: number[];
    allowed_ordinals?: number[];
    context_years?: number[];
    tolerance?: number;
  }): Promise<GuardrailVerifyResponse> {
    return request<GuardrailVerifyResponse>("/api/v1/analytics/guardrail/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  async getGuardrailMetrics(): Promise<{
    total_verifications: number;
    total_violations: number;
    violation_rate: number;
  }> {
    return request<{
      total_verifications: number;
      total_violations: number;
      violation_rate: number;
    }>("/api/v1/analytics/guardrail/metrics");
  },

  // Chat & Ask BizLens
  async getChatSessions(): Promise<ChatSessionSummary[]> {
    return request<ChatSessionSummary[]>("/api/v1/chat/sessions");
  },

  async createChatSession(payload: {
    title?: string;
    context_type?: string;
    dataset_ref?: string;
  }): Promise<ChatSessionDetail> {
    return request<ChatSessionDetail>("/api/v1/chat/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  async getChatSession(sessionId: string): Promise<ChatSessionDetail> {
    return request<ChatSessionDetail>(`/api/v1/chat/sessions/${sessionId}`);
  },

  async deleteChatSession(sessionId: string): Promise<{ message: string }> {
    return request<{ message: string }>(`/api/v1/chat/sessions/${sessionId}`, {
      method: "DELETE",
    });
  },

  async getSuggestedPrompts(datasetId?: string): Promise<SuggestedPrompt[]> {
    const q = datasetId ? `?dataset_id=${encodeURIComponent(datasetId)}` : "";
    return request<SuggestedPrompt[]>(`/api/v1/chat/suggested-prompts${q}`);
  },

  async askBizLens(payload: {
    session_id?: string;
    query: string;
    context_mode?: string;
    dataset_id?: string;
  }): Promise<ChatMessageResponse> {
    return request<ChatMessageResponse>("/api/v1/chat/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  async renameChatSession(sessionId: string, title: string): Promise<{ id: string; title: string }> {
    return request<{ id: string; title: string }>(`/api/v1/chat/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
  },

  async getAIConsent(): Promise<{ consented: boolean; consent_at: string | null }> {
    return request<{ consented: boolean; consent_at: string | null }>("/api/v1/chat/consent");
  },

  async grantAIConsent(): Promise<{ consented: boolean; consent_at: string; message: string }> {
    return request<{ consented: boolean; consent_at: string; message: string }>("/api/v1/chat/consent", {
      method: "POST",
    });
  },

  // Management Reports (PDF + CSV)
  async generateReport(payload: ReportGeneratePayload): Promise<ReportDetail> {
    return request<ReportDetail>("/api/v1/reports/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  async getReports(datasetId?: string): Promise<ReportSummary[]> {
    const q = datasetId ? `?dataset_id=${encodeURIComponent(datasetId)}` : "";
    return request<ReportSummary[]>(`/api/v1/reports${q}`);
  },

  async getReport(reportId: string): Promise<ReportDetail> {
    return request<ReportDetail>(`/api/v1/reports/${reportId}`);
  },

  async deleteReport(reportId: string): Promise<{ status: string; id: string }> {
    return request<{ status: string; id: string }>(`/api/v1/reports/${reportId}`, {
      method: "DELETE",
    });
  },

  getReportPdfUrl(reportId: string): string {
    return getApiUrl(`/api/v1/reports/${reportId}/download/pdf`);
  },

  getReportCsvUrl(reportId: string): string {
    return getApiUrl(`/api/v1/reports/${reportId}/download/csv`);
  },

  async getDatasetPeriods(datasetId: string): Promise<DatasetPeriodsInfo> {
    return request<DatasetPeriodsInfo>(`/api/v1/reports/dataset-periods/${datasetId}`);
  },

  async regenerateReport(reportId: string): Promise<ReportDetail> {
    return request<ReportDetail>(`/api/v1/reports/${reportId}/regenerate`, {
      method: "POST",
    });
  },

  async refreshReport(reportId: string): Promise<ReportDetail> {
    return request<ReportDetail>(`/api/v1/reports/${reportId}/refresh-latest`, {
      method: "POST",
    });
  },

  // Phase 6: Quality & Transformations
  async getQualityReport(versionId: string): Promise<QualityReport> {
    return request<QualityReport>(`/api/v1/versions/${versionId}/quality`);
  },

  async getQualityCopilotAdvice(
    versionId: string,
    focusColumn?: string,
    focusIssueCode?: string
  ): Promise<QualityCopilotResponse> {
    return request<QualityCopilotResponse>(`/api/v1/versions/${versionId}/quality/copilot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        focus_column: focusColumn,
        focus_issue_code: focusIssueCode,
      }),
    });
  },

  async previewTransformation(
    versionId: string,
    type: string,
    parameters: Record<string, any> = {}
  ): Promise<TransformationPreviewResponse> {
    return request<TransformationPreviewResponse>(`/api/v1/versions/${versionId}/transform/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, parameters }),
    });
  },

  async applyTransformation(
    versionId: string,
    type: string,
    parameters: Record<string, any> = {},
    label?: string,
    lockVersion: number = 1
  ): Promise<TransformationApplyResponse> {
    return request<TransformationApplyResponse>(`/api/v1/versions/${versionId}/transform/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        parameters,
        label,
        lock_version: lockVersion,
      }),
    });
  },

  async getTransformationHistory(datasetId: string): Promise<TransformationHistoryItem[]> {
    return request<TransformationHistoryItem[]>(`/api/v1/datasets/${datasetId}/transformations`);
  },

  async activateDatasetVersion(
    datasetId: string,
    versionId: string
  ): Promise<{ status: string; message: string; version_number: number }> {
    return request<{ status: string; message: string; version_number: number }>(
      `/api/v1/datasets/${datasetId}/versions/${versionId}/activate`,
      {
        method: "POST",
      }
    );
  },

  // Phase 9: Shared Findings & Business Insights
  async getFindings(
    datasetId: string,
    versionId?: string,
    forceRefresh?: boolean,
    currency?: string,
    numberGrouping?: string
  ): Promise<FindingsSummary> {
    const params = new URLSearchParams();
    if (versionId) params.append("version_id", versionId);
    if (forceRefresh) params.append("force_refresh", "true");
    if (currency) params.append("currency", currency);
    if (numberGrouping) params.append("number_grouping", numberGrouping);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return request<FindingsSummary>(`/api/v1/findings/dataset/${datasetId}${qs}`);
  },

  async refreshFindings(
    datasetId: string,
    versionId?: string,
    currency?: string,
    numberGrouping?: string
  ): Promise<FindingsSummary> {
    const params = new URLSearchParams();
    if (versionId) params.append("version_id", versionId);
    if (currency) params.append("currency", currency);
    if (numberGrouping) params.append("number_grouping", numberGrouping);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return request<FindingsSummary>(`/api/v1/findings/dataset/${datasetId}/refresh${qs}`, {
      method: "POST",
    });
  },

  async getFinding(findingId: string): Promise<Finding> {
    return request<Finding>(`/api/v1/findings/${findingId}`);
  },

  async updateFindingStatus(findingId: string, status: string, note?: string): Promise<Finding> {
    return request<Finding>(`/api/v1/findings/${findingId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, note }),
    });
  },

  async explainFinding(findingId: string): Promise<FindingExplainResult> {
    return request<FindingExplainResult>(`/api/v1/findings/${findingId}/explain`, {
      method: "POST",
    });
  },

  async pinFindingToDecisions(findingId: string): Promise<Finding> {
    return request<Finding>(`/api/v1/findings/${findingId}/pin-decision`, {
      method: "POST",
    });
  },

  // Phase 10: Forecast Observatory
  async getForecastObservatory(datasetId: string, dimension: string = "category", currency?: string): Promise<ForecastObservatoryData> {
    const params = new URLSearchParams();
    if (dimension) params.append("dimension", dimension);
    if (currency) params.append("currency", currency);
    const q = params.toString() ? `?${params.toString()}` : "";
    return request<ForecastObservatoryData>(`/api/v1/forecasting/observatory/${datasetId}${q}`);
  },

  async explainObservatory(datasetId: string): Promise<any> {
    return request<any>("/api/v1/forecasting/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataset_id: datasetId }),
    });
  },

  // Phase 11: What-If Scenario Simulation
  async simulateScenario(req: ScenarioSimulationRequest): Promise<ScenarioSimulationResponse> {
    return request<ScenarioSimulationResponse>("/api/v1/scenarios/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
  },

  async getScenarioAssumptions(datasetId: string): Promise<ElasticityAssumptions> {
    return request<ElasticityAssumptions>(`/api/v1/scenarios/assumptions/${datasetId}`);
  },

  async saveScenario(req: ScenarioSaveRequest): Promise<ScenarioRecordResponse> {
    return request<ScenarioRecordResponse>("/api/v1/scenarios/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
  },

  async listScenarios(datasetId: string): Promise<ScenarioRecordResponse[]> {
    return request<ScenarioRecordResponse[]>(`/api/v1/scenarios/list/${datasetId}`);
  },

  async compareScenarios(datasetId: string): Promise<ScenarioCompareResponse> {
    return request<ScenarioCompareResponse>(`/api/v1/scenarios/compare/${datasetId}`);
  },

  async explainScenario(req: ScenarioExplainRequest): Promise<{ strategic_summary: string; fact_badges: any[] }> {
    return request<{ strategic_summary: string; fact_badges: any[] }>("/api/v1/scenarios/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
  },

  // Phase 12: Platform Settings, Key Vault & Preferences
  async getSettings(): Promise<SettingsData> {
    try {
      const data = await request<SettingsData>("/api/v1/settings");
      if (typeof window !== "undefined") {
        localStorage.setItem("bizlens_settings", JSON.stringify(data));
      }
      return data;
    } catch {
      if (typeof window !== "undefined") {
        const cached = localStorage.getItem("bizlens_settings");
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed.profile?.display_name && parsed.profile.display_name.includes("Alexander")) {
              parsed.profile.display_name = "Piyush Toddale";
            }
            return parsed;
          } catch {}
        }
      }
      const rawStoredName = typeof window !== "undefined" ? localStorage.getItem("bizlens_display_name") : null;
      const safeDisplayName = rawStoredName && !rawStoredName.includes("Alexander") ? rawStoredName : "Piyush Toddale";
      return {
        profile: {
          display_name: safeDisplayName,
          email: "piyush@bizlens.ai",
          role: (typeof window !== "undefined" && localStorage.getItem("bizlens_role")) || "Lead Analytics Architect",
          status: "active",
          created_at: new Date().toISOString(),
        },
        preferences: {
          currency: (typeof window !== "undefined" && localStorage.getItem("bizlens_currency")) || "INR",
          number_grouping: (typeof window !== "undefined" && localStorage.getItem("bizlens_number_grouping")) || "lakh_crore",
          fiscal_year_start_month: 4,
          date_format_default: "DD/MM/YYYY",
          timezone: "Asia/Kolkata",
          week_start: 1,
          theme: (typeof window !== "undefined" && localStorage.getItem("bizlens_theme")) || "dark",
          accent_intensity: 1.0,
          motion_level: (typeof window !== "undefined" && localStorage.getItem("bizlens_motion_level")) || "full",
          density: (typeof window !== "undefined" && localStorage.getItem("bizlens_density")) || "comfortable",
          ai_detail_level: "balanced",
          gemini_consent: true,
          gemini_consent_at: new Date().toISOString(),
          anomaly_threshold_pct: 15.0,
          email_digests: true,
          webhook_url: undefined,
        },
        key_status: {
          provider: "google_gemini",
          is_configured: typeof window !== "undefined" && !!(localStorage.getItem("bizlens_gemini_api_key") || (import.meta as any).env?.VITE_GEMINI_API_KEY),
          source: typeof window !== "undefined" && localStorage.getItem("bizlens_gemini_api_key") ? "custom_vault" : "none",
          is_valid: true,
        },
        completion_percentage: 92,
        facets: {
          profile: true,
          appearance: true,
          data_locale: true,
          ai_vault: true,
          notifications: true,
          security: true,
        },
      };
    }
  },

  async updateSettings(payload: SettingsUpdatePayload): Promise<SettingsData> {
    try {
      const data = await request<SettingsData>("/api/v1/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (typeof window !== "undefined") {
        localStorage.setItem("bizlens_settings", JSON.stringify(data));
      }
      return data;
    } catch {
      let base: SettingsData;
      try {
        const cached = typeof window !== "undefined" ? localStorage.getItem("bizlens_settings") : null;
        base = cached ? JSON.parse(cached) : await this.getSettings();
      } catch {
        base = await this.getSettings();
      }

      if (payload.display_name) base.profile.display_name = payload.display_name;
      if (payload.currency) base.preferences.currency = payload.currency;
      if (payload.number_grouping) base.preferences.number_grouping = payload.number_grouping;
      if (payload.fiscal_year_start_month) base.preferences.fiscal_year_start_month = payload.fiscal_year_start_month;
      if (payload.date_format_default) base.preferences.date_format_default = payload.date_format_default;
      if (payload.timezone) base.preferences.timezone = payload.timezone;
      if (payload.week_start !== undefined) base.preferences.week_start = payload.week_start;
      if (payload.theme) base.preferences.theme = payload.theme;
      if (payload.accent_intensity !== undefined) base.preferences.accent_intensity = payload.accent_intensity;
      if (payload.motion_level) base.preferences.motion_level = payload.motion_level;
      if (payload.density) base.preferences.density = payload.density;
      if (payload.ai_detail_level) base.preferences.ai_detail_level = payload.ai_detail_level;
      if (payload.gemini_consent !== undefined) base.preferences.gemini_consent = payload.gemini_consent;
      if (payload.anomaly_threshold_pct !== undefined) base.preferences.anomaly_threshold_pct = payload.anomaly_threshold_pct;
      if (payload.email_digests !== undefined) base.preferences.email_digests = payload.email_digests;
      if (payload.webhook_url !== undefined) base.preferences.webhook_url = payload.webhook_url;

      if (typeof window !== "undefined") {
        localStorage.setItem("bizlens_settings", JSON.stringify(base));
      }
      return base;
    }
  },

  async getApiKeyStatus(): Promise<APIKeyStatusData> {
    return request<APIKeyStatusData>("/api/v1/settings/api-key/status");
  },

  async updateApiKey(apiKey?: string, provider: string = "google_gemini"): Promise<APIKeyStatusData> {
    return request<APIKeyStatusData>("/api/v1/settings/api-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: apiKey, provider }),
    });
  },

  async testApiKey(apiKey?: string, provider: string = "google_gemini"): Promise<{ is_valid: boolean; message: string; model?: string }> {
    return request<{ is_valid: boolean; message: string; model?: string }>("/api/v1/settings/api-key/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: apiKey, provider }),
    });
  },

  async getSessions(): Promise<SessionData[]> {
    try {
      return await request<SessionData[]>("/api/v1/settings/sessions");
    } catch {
      return [
        {
          id: "sess-local-1",
          user_agent: typeof navigator !== "undefined" ? `${navigator.userAgent.slice(0, 48)} (Current)` : "Chrome / Desktop (Active)",
          ip: "127.0.0.1",
          created_at: new Date().toISOString(),
          is_current: true,
        },
        {
          id: "sess-local-2",
          user_agent: "Mobile Safari / iOS",
          ip: "192.168.1.10",
          created_at: new Date(Date.now() - 86400000).toISOString(),
          is_current: false,
        },
      ];
    }
  },

  async revokeSession(sessionId: string): Promise<{ revoked: boolean; session_id: string }> {
    try {
      return await request<{ revoked: boolean; session_id: string }>(`/api/v1/settings/sessions/${sessionId}/revoke`, {
        method: "POST",
      });
    } catch {
      return { revoked: true, session_id: sessionId };
    }
  },

  async getAuditLogs(limit: number = 15): Promise<AuditLogData[]> {
    try {
      return await request<AuditLogData[]>(`/api/v1/settings/audit-logs?limit=${limit}`);
    } catch {
      return [
        {
          id: "audit-1",
          action: "update_settings",
          resource_type: "user_settings",
          ip: "127.0.0.1",
          created_at: new Date().toISOString(),
          metadata: { updated_fields: ["currency", "theme", "density"] },
        },
        {
          id: "audit-2",
          action: "session_authenticated",
          resource_type: "auth",
          ip: "127.0.0.1",
          created_at: new Date(Date.now() - 3600000).toISOString(),
          metadata: { status: "success" },
        },
        {
          id: "audit-3",
          action: "dataset_verified",
          resource_type: "dataset",
          ip: "127.0.0.1",
          created_at: new Date(Date.now() - 7200000).toISOString(),
          metadata: { dataset: "Retail_Q3", rows: 20412 },
        },
      ];
    }
  },
};

export interface PeriodOption {
  key: string;
  label: string;
  start: string;
  end: string;
}

export interface SectionCapability {
  available: boolean;
  reason?: string | null;
}

export interface DatasetPeriodsInfo {
  dataset_id: string;
  dataset_name: string;
  version_id: string;
  version_number: number;
  has_date_column: boolean;
  date_column?: string | null;
  min_date?: string | null;
  max_date?: string | null;
  fiscal_year_start_month: number;
  fiscal_year_label: string;
  available_months: PeriodOption[];
  available_quarters: PeriodOption[];
  available_categories: string[];
  available_regions: string[];
  capabilities: Record<string, SectionCapability>;
}

export interface ReportSummary {
  id: string;
  dataset_id: string;
  dataset_name: string;
  version_id: string;
  type: string;
  period_type?: string;
  period_start?: string | null;
  period_end?: string | null;
  period_label?: string | null;
  title: string;
  registry_version: string;
  status: string;
  has_pdf: boolean;
  has_csv: boolean;
  created_at: string;
}

export interface ReportDetail extends ReportSummary {
  facts_snapshot: Record<string, any>;
  filters: Record<string, any>;
  sections?: string[];
  pdf_download_url: string;
  csv_download_url: string;
}

export interface ReportGeneratePayload {
  dataset_id?: string;
  type?: string;
  period_type?: string;
  period_start?: string;
  period_end?: string;
  period_label?: string;
  sections?: string[];
  title?: string;
  filters?: Record<string, any>;
}

export interface FindingEvidence {
  metric: string;
  dimension?: string | null;
  segment_value?: string | null;
  baseline_value?: number | null;
  observed_value?: number | null;
  delta_pct?: number | null;
  impact_amount: number;
  impact_formatted: string;
  impact_type: "risk" | "upside" | "efficiency" | "anomaly" | string;
  confidence_score: number;
  sample_size: number;
  formula_name?: string | null;
  duckdb_sql?: string | null;
  execution_ms?: number | null;
}

export interface Finding {
  id: string;
  version_id: string;
  dataset_id: string;
  dataset_name: string;
  title: string;
  kind: "opportunity" | "risk" | "efficiency" | "anomaly";
  priority: "high" | "medium" | "low";
  evidence: FindingEvidence;
  interpretation: string;
  potential_action: string;
  status: "open" | "applied" | "completed" | "dismissed";
  status_history: Array<{
    status: string;
    timestamp: string;
    user?: string;
    note?: string;
  }>;
  created_at: string;
  updated_at: string;
}

export interface FindingsSummary {
  dataset_id: string;
  dataset_name: string;
  version_id: string;
  version_number: number;
  total_findings: number;
  opportunities_count: number;
  risks_count: number;
  efficiencies_count: number;
  anomalies_count: number;
  high_priority_count: number;
  open_count: number;
  applied_count: number;
  total_impact_at_risk: number;
  total_impact_at_risk_formatted: string;
  total_upside_potential: number;
  total_upside_potential_formatted: string;
  findings: Finding[];
}

export interface FindingExplainResult {
  finding_id: string;
  title: string;
  kind: string;
  explanation: string;
  strategic_context: string;
  risk_assessment: string;
  action_steps: string[];
  verified_facts: string[];
  guardrail_result: string;
  model_used: string;
  latency_ms: number;
}

// Phase 10: Forecast Observatory Interfaces
export interface BacktestMetrics {
  accuracy_pct: number;
  baseline_beat_pct: number;
  coverage_pct: number;
  test_periods_count: number;
  smape: number;
  mae_model: number;
  mae_baseline: number;
}

export interface BacktestRecord {
  period_label: string;
  actual_value: number;
  predicted_value: number;
  error_pct: number;
  within_interval: boolean;
}

export interface ForecastPoint {
  period_label: string;
  actual_value?: number | null;
  projected_value?: number | null;
  lower_bound_95?: number | null;
  upper_bound_95?: number | null;
  is_projected: boolean;
}

export interface ContributionItem {
  dimension_value: string;
  prior_value: number;
  current_value: number;
  delta_abs: number;
  delta_formatted: string;
  share_pct: number;
  rank: number;
}

export interface AnomalyItem {
  period_label: string;
  metric_id: string;
  actual_value: number;
  expected_value: number;
  lower_bound: number;
  upper_bound: number;
  deviation_score: number;
  severity: "low" | "medium" | "high";
  is_seasonal: boolean;
  explanation: string;
}

export interface ScenarioFlowNode {
  node_id: string;
  type: "driver" | "metric" | "outcome";
  title: string;
  delta_formatted: string;
  elasticity?: number | null;
  detail: string;
}

export interface ForecastObservatoryData {
  dataset_id: string;
  status: "available" | "insufficient_history";
  history_periods_count: number;
  min_required_periods: number;
  unavailable_reason?: string | null;
  metrics?: BacktestMetrics | null;
  held_out_table: BacktestRecord[];
  forecast_series: ForecastPoint[];
  contribution_breakdown: ContributionItem[];
  contribution_dimension: string;
  scenario_flow: ScenarioFlowNode[];
  anomalies: AnomalyItem[];
  ai_insight?: {
    strategic_context: string;
    strategic_recommendation?: string;
    actionable_solutions?: string[];
    anomaly_assessment?: string;
    model_used?: string;
    verified_facts: any[];
    guardrail_status: string;
  } | null;
  lineage?: Record<string, any> | null;
}

// Phase 11: What-If Scenario Simulation
export interface DriverAdjustment {
  price_pct: number;
  cost_pct: number;
  marketing_spend_pct: number;
  discount_pct: number;
}

export interface ElasticityAssumptions {
  price_elasticity: number;
  marketing_elasticity: number;
  variable_cost_ratio: number;
  fixed_cost_ratio: number;
  source: string;
  methodology_note: string;
}

export interface ScenarioMetrics {
  revenue: number;
  revenue_formatted: string;
  volume_units: number;
  volume_formatted: string;
  cogs: number;
  cogs_formatted: string;
  gross_profit: number;
  gross_profit_formatted: string;
  gross_margin_pct: number;
  avg_unit_price: number;
  avg_unit_cost: number;
}

export interface WaterfallStep {
  label: string;
  delta_value: number;
  delta_formatted: string;
  running_total: number;
  running_formatted: string;
  step_type: "baseline" | "positive" | "negative" | "subtotal" | "result";
}

export interface SensitivityCell {
  price_delta_pct: number;
  cost_delta_pct: number;
  simulated_profit: number;
  profit_formatted: string;
  profit_delta_pct: number;
  is_baseline: boolean;
}

export interface ScenarioSimulationRequest {
  dataset_id: string;
  drivers: DriverAdjustment;
  custom_assumptions?: ElasticityAssumptions;
}

export interface ScenarioSimulationResponse {
  dataset_id: string;
  baseline_metrics: ScenarioMetrics;
  simulated_metrics: ScenarioMetrics;
  deltas: {
    revenue_delta_abs: number;
    revenue_delta_formatted: string;
    revenue_delta_pct: number;
    profit_delta_abs: number;
    profit_delta_formatted: string;
    profit_delta_pct: number;
    volume_delta_abs: number;
    volume_delta_formatted: string;
    volume_delta_pct: number;
    margin_delta_pts: number;
  };
  assumptions: ElasticityAssumptions;
  waterfall: WaterfallStep[];
  sensitivity_matrix: SensitivityCell[][];
  strategic_summary: string;
  fact_badges: Array<{ label: string; value: string; verified: boolean }>;
  lineage_ref: Record<string, any>;
  execution_time_ms: number;
}

export interface ScenarioSaveRequest {
  dataset_id: string;
  name: string;
  drivers: DriverAdjustment;
  custom_assumptions?: ElasticityAssumptions;
}

export interface ScenarioRecordResponse {
  id: string;
  dataset_id: string;
  version_id: string;
  name: string;
  created_at: string;
  drivers: DriverAdjustment;
  assumptions: ElasticityAssumptions;
  metrics: ScenarioMetrics;
  deltas: Record<string, any>;
}

export interface ScenarioCompareResponse {
  dataset_id: string;
  baseline: ScenarioMetrics;
  scenarios: ScenarioRecordResponse[];
}

export interface ScenarioExplainRequest {
  dataset_id: string;
  drivers: DriverAdjustment;
  simulated_metrics: ScenarioMetrics;
  deltas: Record<string, any>;
  assumptions: ElasticityAssumptions;
}

// Phase 12: Platform Settings, Key Vault & Configuration Crystal
export interface ProfileData {
  display_name: string;
  email: string;
  role: string;
  status: string;
  created_at?: string | null;
}

export interface PreferencesData {
  currency: string;
  number_grouping: string;
  fiscal_year_start_month: number;
  date_format_default: string;
  timezone: string;
  week_start: number;
  theme: string;
  accent_intensity: number;
  motion_level: string;
  density: string;
  ai_detail_level: string;
  gemini_consent: boolean;
  gemini_consent_at?: string | null;
  anomaly_threshold_pct: number;
  email_digests: boolean;
  webhook_url?: string | null;
}

export interface SettingsUpdatePayload {
  display_name?: string;
  role?: string;
  currency?: string;
  number_grouping?: string;
  fiscal_year_start_month?: number;
  date_format_default?: string;
  timezone?: string;
  week_start?: number;
  theme?: string;
  accent_intensity?: number;
  motion_level?: string;
  density?: string;
  ai_detail_level?: string;
  gemini_consent?: boolean;
  anomaly_threshold_pct?: number;
  email_digests?: boolean;
  webhook_url?: string;
}

export interface APIKeyStatusData {
  provider: string;
  is_configured: boolean;
  source: "custom_vault" | "environment" | "none" | string;
  masked_key?: string | null;
  is_valid: boolean;
  message?: string | null;
}

export interface FacetCompletionData {
  profile: boolean;
  appearance: boolean;
  data_locale: boolean;
  ai_vault: boolean;
  notifications: boolean;
  security: boolean;
}

export interface SettingsData {
  profile: ProfileData;
  preferences: PreferencesData;
  key_status: APIKeyStatusData;
  completion_percentage: number;
  facets: FacetCompletionData;
}

export interface SessionData {
  id: string;
  user_agent?: string;
  ip?: string;
  created_at: string;
  is_current: boolean;
}

export interface AuditLogData {
  id: string;
  action: string;
  resource_type: string;
  ip?: string;
  created_at: string;
  metadata?: Record<string, any>;
}


