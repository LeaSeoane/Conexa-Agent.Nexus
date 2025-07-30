import axios from 'axios';
import { UploadResponse, JobProgress, JobResult } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

export const apiService = {
  async uploadPDF(file: File, providerName: string): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('providerName', providerName);

    const response = await api.post<UploadResponse>('/upload/pdf', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  async uploadURL(url: string, providerName: string): Promise<UploadResponse> {
    const response = await api.post<UploadResponse>('/upload/url', {
      url,
      providerName,
    });

    return response.data;
  },

  async getJobStatus(jobId: string): Promise<JobProgress> {
    const response = await api.get<JobProgress>(`/analysis/${jobId}`);
    return response.data;
  },

  async getJobResult(jobId: string): Promise<JobResult> {
    const response = await api.get<JobResult>(`/analysis/${jobId}/result`);
    return response.data;
  },

  async downloadSDK(jobId: string): Promise<Blob> {
    const response = await api.get(`/download/${jobId}`, {
      responseType: 'blob',
    });

    return response.data;
  },
};