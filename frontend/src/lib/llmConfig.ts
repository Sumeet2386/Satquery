export type LLMProviderId =
  | "statistical"
  | "gemini"
  | "openai"
  | "anthropic"
  | "groq"
  | "openrouter"
  | "ollama"
  | "custom";

export interface LLMClientConfig {
  provider: LLMProviderId;
  api_key: string;
  model: string;
  base_url?: string;
  enable_vision: boolean;
}

export const PROVIDER_PRESETS: Record<
  LLMProviderId,
  {
    label: string;
    defaultModel: string;
    suggestedModels: string[];
    requiresKey: boolean;
    supportsVision: boolean;
    placeholderKey: string;
    helperText: string;
  }
> = {
  statistical: {
    label: "Built-in Statistical Engine (Offline)",
    defaultModel: "statistical-engine-v2",
    suggestedModels: ["statistical-engine-v2"],
    requiresKey: false,
    supportsVision: false,
    placeholderKey: "",
    helperText:
      "Computes exact descriptive, spatial, quadrant, nearest-neighbor, GSD, and cluster statistics directly from active telemetry without external API calls.",
  },
  gemini: {
    label: "Google Gemini (Multimodal Vision)",
    defaultModel: "gemini-2.5-flash",
    suggestedModels: ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.5-pro"],
    requiresKey: true,
    supportsVision: true,
    placeholderKey: "AIzaSy...",
    helperText:
      "Directly inspects both Pre-Event (T1) and Post-Event (T2) satellite images alongside exact statistical telemetry.",
  },
  openai: {
    label: "OpenAI (GPT-4o Vision)",
    defaultModel: "gpt-4o-mini",
    suggestedModels: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini"],
    requiresKey: true,
    supportsVision: true,
    placeholderKey: "sk-proj-...",
    helperText:
      "Supports multimodal visual comparison of T1/T2 imagery and statistical reasoning.",
  },
  anthropic: {
    label: "Anthropic Claude (Vision)",
    defaultModel: "claude-3-5-sonnet-latest",
    suggestedModels: ["claude-3-5-sonnet-latest", "claude-3-5-haiku-latest"],
    requiresKey: true,
    supportsVision: true,
    placeholderKey: "sk-ant-...",
    helperText:
      "High-precision analytical and geospatial vision-language reasoning.",
  },
  groq: {
    label: "Groq (Ultra-Fast Llama)",
    defaultModel: "llama-3.3-70b-versatile",
    suggestedModels: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
    requiresKey: true,
    supportsVision: false,
    placeholderKey: "gsk_...",
    helperText:
      "Sub-second statistical & conversational reasoning over computed scene telemetry.",
  },
  openrouter: {
    label: "OpenRouter (Any Model)",
    defaultModel: "google/gemini-2.5-flash",
    suggestedModels: [
      "google/gemini-2.5-flash",
      "openai/gpt-4o-mini",
      "anthropic/claude-3.5-sonnet",
    ],
    requiresKey: true,
    supportsVision: true,
    placeholderKey: "sk-or-...",
    helperText: "Unified gateway for Gemini, GPT-4o, Claude, and open models.",
  },
  ollama: {
    label: "Ollama (100% Local LLM)",
    defaultModel: "llama3.2",
    suggestedModels: ["llama3.2", "llava", "qwen2.5", "llama3.2-vision"],
    requiresKey: false,
    supportsVision: true,
    placeholderKey: "(Not required for local Ollama)",
    helperText:
      "Runs locally on your Mac via http://localhost:11434 with zero external API keys.",
  },
  custom: {
    label: "Custom OpenAI-Compatible",
    defaultModel: "gpt-4o-mini",
    suggestedModels: ["gpt-4o-mini"],
    requiresKey: true,
    supportsVision: true,
    placeholderKey: "Bearer key...",
    helperText: "Connect any vLLM, LM Studio, Together, or custom chat completions endpoint.",
  },
};

const STORAGE_KEY = "satquery_llm_config_v1";
const SESSION_KEY_STORE = "satquery_llm_secret_v1";

export function loadLLMConfig(): LLMClientConfig {
  const defaultLocalOllama: LLMClientConfig = {
    provider: "ollama",
    api_key: "",
    model: "llama3.2",
    base_url: "http://localhost:11434",
    enable_vision: true,
  };
  if (typeof window === "undefined") {
    return defaultLocalOllama;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const sessionKey = window.sessionStorage.getItem(SESSION_KEY_STORE) || "";
    if (raw) {
      const parsed = JSON.parse(raw);
      // Migrate any legacy api_key out of localStorage into tab-scoped sessionStorage
      if (parsed.api_key) {
        if (!sessionKey) {
          window.sessionStorage.setItem(SESSION_KEY_STORE, parsed.api_key);
        }
        const { api_key: _removed, ...rest } = parsed;
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rest));
      }
      return {
        provider: parsed.provider || "ollama",
        api_key: sessionKey || parsed.api_key || "",
        model: parsed.model || PROVIDER_PRESETS[(parsed.provider as LLMProviderId) || "ollama"]?.defaultModel || "llama3.2",
        base_url: parsed.base_url || (parsed.provider === "ollama" ? "http://localhost:11434" : ""),
        enable_vision: parsed.enable_vision !== undefined ? Boolean(parsed.enable_vision) : true,
      };
    }
  } catch {
    // Ignore storage read errors
  }
  return defaultLocalOllama;
}

export function saveLLMConfig(cfg: LLMClientConfig): void {
  if (typeof window === "undefined") return;
  try {
    // Never persist API keys in localStorage; keep secrets ephemeral in sessionStorage
    const { api_key, ...nonSecretPrefs } = cfg;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nonSecretPrefs));
    if (api_key) {
      window.sessionStorage.setItem(SESSION_KEY_STORE, api_key);
    } else {
      window.sessionStorage.removeItem(SESSION_KEY_STORE);
    }
  } catch {
    // Ignore storage write errors
  }
}

/**
 * Downscale an image URL (blob: or /database_samples/...) into a compact JPEG data URL
 * suitable for Vision-Language Models without bloating request payloads.
 */
export async function imageUrlToCompactBase64(url?: string, maxDim = 512): Promise<string | undefined> {
  if (!url || typeof document === "undefined") return undefined;
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.crossOrigin = "anonymous";
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Image load failed"));
      el.src = url;
    });
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const w = Math.max(64, Math.round(img.width * scale));
    const h = Math.max(64, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", 0.82);
  } catch {
    return undefined;
  }
}

