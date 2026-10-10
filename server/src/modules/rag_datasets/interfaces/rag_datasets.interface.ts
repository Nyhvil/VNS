export enum DatasetLabel {
  SAFE = 'safe',
  SPAM = 'spam',
  PHISHING = 'phishing',
  MALWARE = 'malware',
}

export type RagDatasetsRow = {
  id: string;
  label: DatasetLabel;
  source: string | null;
  title: string | null;
  content: string;
  language: string | null;
  metadata: unknown;
  created_at: Date;
  updated_at: Date;
};
