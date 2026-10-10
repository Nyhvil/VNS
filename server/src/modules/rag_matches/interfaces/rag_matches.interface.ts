import { DatasetLabel } from '../../rag_datasets/interfaces/rag_datasets.interface';

export type RagMatchesRow = {
  id: string;
  scan_id: string;
  dataset_id: string | null;
  similarity_score: string | number;
  matched_label: DatasetLabel | null;
  matched_text: string | null;
  metadata: unknown;
  created_at: Date;
};
