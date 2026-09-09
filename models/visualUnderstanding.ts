// MedOS — Phase 12.4: Visual Understanding Domain Contracts
// Provider-neutral interfaces and task types for semantic diagram and educational figure analysis.

import type { SourceProvenance } from './ingestion';

export type VisualTaskType =
  | 'describe_visual'
  | 'extract_labels'
  | 'explain_diagram'
  | 'explain_chart'
  | 'summarize_figure';

export interface VisualAnalysisRequest {
  imageUri?: string;
  imageBase64?: string;
  mimeType: string;
  ocrText?: string;
  surroundingText?: string;
  task: VisualTaskType;
  sourceMetadata: {
    sourceId: string;
    sourceTitle: string;
    topicName: string;
    pageNumber?: number;
    slideNumber?: number;
    mediaId?: string;
    imageIndex?: number;
  };
}

export interface VisualAnalysisResult {
  status:
    | 'success'
    | 'partial'
    | 'uncertain'
    | 'failed'
    | 'blocked_by_provider_configuration'
    | 'visual_provider_not_configured'
    | 'provider_not_configured'
    | 'network_unavailable'
    | 'analysis_failed'
    | 'ready';
  description: string;
  labels: string[];
  visibleLabels?: string[];
  relationships?: string;
  educationalExplanation: string;
  uncertaintyWarnings?: string[];
  provenance: SourceProvenance;
  model?: string;
}

export interface VisualUnderstandingProvider {
  readonly id: string;
  readonly name: string;
  isAvailable(): Promise<boolean>;
  analyzeVisual(request: VisualAnalysisRequest): Promise<VisualAnalysisResult>;
}
