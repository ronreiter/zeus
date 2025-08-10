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
  parameters?: Record<string, string>;
  executedAt: string;
  completedAt?: string;
}

export interface QueryResults {
  columns: string[];
  rows: string[][];
  total: number;
  page: number;
  size: number;
  status: 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
  errorMessage?: string;
  completedAt?: string;
}

export interface OpenQuery {
  id?: string;
  name: string;
  sql: string;
  description: string;
  isUnsaved: boolean;
  isDirty: boolean;
}

export interface Column {
  name: string;
  type: string;
}

export interface CatalogTable {
  name: string;
  type: string;
  columns: Column[];
  location?: string;
  inputFormat?: string;
}

export interface CatalogDatabase {
  name: string;
  description?: string;
  tables: CatalogTable[];
}

export interface AthenaCatalog {
  databases: CatalogDatabase[];
}