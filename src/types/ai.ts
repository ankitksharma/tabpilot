export interface AIProvider {
  id: string;
  name: string;
  configured: boolean;
}

export interface WorkspaceSuggestion {
  name: string;
  tabIds: number[];
  confidence: number;
  color?: string;
}

export interface RoutingRule {
  id: string;
  name: string;
  pattern: string;
  patternType: "domain" | "keyword" | "regex";
  groupName: string;
  color?: string;
  enabled: boolean;
}

export interface AIConfig {
  provider: "openai" | "claude" | "chrome-ai" | "none";
  apiKey: string;
  model: string;
}

export const DEFAULT_AI_CONFIG: AIConfig = {
  provider: "none",
  apiKey: "",
  model: "",
};
