export interface SageExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  success: boolean;
}

export interface ToolResponse {
  content: Array<{
    type: "text" | "image" | "resource";
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

export interface LocaleData {
  metadata?: Record<string, string>;
  skills?: Record<string, Record<string, string>>;
  commands?: Record<string, Record<string, any>>;
  templates?: Record<string, Record<string, string>>;
  errors?: Record<string, string>;
  status?: Record<string, string>;
}

export type SageExecutor = (code: string) => Promise<string>;