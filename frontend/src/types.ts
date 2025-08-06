export interface Query {
  id: string;
  name: string;
  sql: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface QueryRun {
  id: string;
  queryId: string;
  sql: string;
  executionId: string;
  status: 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
  resultsS3Url?: string;
  errorMessage?: string;
  executedAt: string;
  completedAt?: string;
}

export interface QueryResults {
  columns: string[];
  rows: string[][];
  total: number;
  page: number;
  size: number;
}

export interface OpenQuery {
  id?: string;
  name: string;
  sql: string;
  description: string;
  isUnsaved: boolean;
  isDirty: boolean;
}