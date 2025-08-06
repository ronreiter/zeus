import axios from 'axios';
import type { Query, QueryRun, QueryResults } from './types';

const api = axios.create({
  baseURL: '/api',
});

export const queryApi = {
  getQueries: () => api.get<Query[]>('/queries'),
  createQuery: (data: { name: string; sql?: string; description?: string }) =>
    api.post<Query>('/queries', data),
  getQuery: (id: string) => api.get<Query>(`/queries/${id}`),
  updateQuery: (id: string, data: { name?: string; sql?: string; description?: string }) =>
    api.put<Query>(`/queries/${id}`, data),
  deleteQuery: (id: string) => api.delete(`/queries/${id}`),
  
  getQueryRuns: (queryId: string) => api.get<QueryRun[]>(`/queries/${queryId}/runs`),
  executeQuery: (queryId: string, sql: string) =>
    api.post<QueryRun>(`/queries/${queryId}/runs`, { sql }),
  deleteQueryRun: (id: string) => api.delete(`/query-runs/${id}`),
  
  executeAthenaQuery: (sql: string) => api.post<{ executionId: string }>('/athena/execute', { sql }),
  getQueryResults: (executionId: string, page: number = 1, size: number = 50) =>
    api.get<QueryResults>(`/athena/results/${executionId}?page=${page}&size=${size}`),
  exportResults: (executionId: string) =>
    api.get(`/athena/export/${executionId}`, { responseType: 'blob' }),
};