import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Link as LinkIcon, Loader2 } from 'lucide-react';
import { apiService } from '../services/api';
import { cn } from '../utils/cn';

interface UploadAreaProps {
  onUploadSuccess: (jobId: string) => void;
  onUploadError: (error: string) => void;
}

export const UploadArea: React.FC<UploadAreaProps> = ({
  onUploadSuccess,
  onUploadError,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [providerName, setProviderName] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file');

  const { getRootProps, getInputProps, isDragActive, acceptedFiles } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
    onDrop: (files) => {
      if (files.length > 0) {
        handleFileUpload(files[0]);
      }
    },
    disabled: isUploading,
  });

  const handleFileUpload = async (file: File) => {
    if (!providerName.trim()) {
      onUploadError('Please enter a provider name');
      return;
    }

    setIsUploading(true);
    try {
      const response = await apiService.uploadPDF(file, providerName.trim());
      onUploadSuccess(response.jobId);
    } catch (error: any) {
      onUploadError(error.response?.data?.error?.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUrlUpload = async () => {
    if (!providerName.trim()) {
      onUploadError('Please enter a provider name');
      return;
    }

    if (!urlInput.trim()) {
      onUploadError('Please enter a valid URL');
      return;
    }

    setIsUploading(true);
    try {
      const response = await apiService.uploadURL(urlInput.trim(), providerName.trim());
      onUploadSuccess(response.jobId);
    } catch (error: any) {
      onUploadError(error.response?.data?.error?.message || 'URL processing failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="card">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Upload API Documentation
        </h2>
        <p className="text-gray-600">
          Upload a PDF file or provide a Swagger/OpenAPI URL to generate your SDK
        </p>
      </div>

      {/* Provider Name Input */}
      <div className="mb-6">
        <label htmlFor="providerName" className="block text-sm font-medium text-gray-700 mb-2">
          Provider Name *
        </label>
        <input
          type="text"
          id="providerName"
          value={providerName}
          onChange={(e) => setProviderName(e.target.value)}
          placeholder="e.g., PayPal, Stripe, FedEx, DHL"
          className="input"
          disabled={isUploading}
        />
      </div>

      {/* Upload Mode Toggle */}
      <div className="flex rounded-lg bg-gray-100 p-1 mb-6">
        <button
          type="button"
          onClick={() => setUploadMode('file')}
          className={cn(
            'flex-1 flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md transition-colors',
            uploadMode === 'file'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          )}
          disabled={isUploading}
        >
          <FileText className="w-4 h-4 mr-2" />
          PDF Upload
        </button>
        <button
          type="button"
          onClick={() => setUploadMode('url')}
          className={cn(
            'flex-1 flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md transition-colors',
            uploadMode === 'url'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          )}
          disabled={isUploading}
        >
          <LinkIcon className="w-4 h-4 mr-2" />
          Swagger URL
        </button>
      </div>

      {uploadMode === 'file' ? (
        <div
          {...getRootProps()}
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
            isDragActive
              ? 'border-conexa-primary bg-blue-50'
              : 'border-gray-300 hover:border-gray-400',
            isUploading && 'pointer-events-none opacity-50'
          )}
        >
          <input {...getInputProps()} />
          
          {isUploading ? (
            <div className="flex flex-col items-center">
              <Loader2 className="w-12 h-12 text-conexa-primary animate-spin mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">
                Uploading file...
              </p>
              <p className="text-gray-600">
                Please wait while we process your documentation
              </p>
            </div>
          ) : acceptedFiles.length > 0 ? (
            <div className="flex flex-col items-center">
              <FileText className="w-12 h-12 text-conexa-primary mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">
                {acceptedFiles[0].name}
              </p>
              <p className="text-gray-600 mb-4">
                {(acceptedFiles[0].size / 1024 / 1024).toFixed(2)} MB
              </p>
              <button
                type="button"
                onClick={() => handleFileUpload(acceptedFiles[0])}
                className="btn-primary"
                disabled={!providerName.trim() || isUploading}
              >
                Process PDF
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <Upload className="w-12 h-12 text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">
                {isDragActive ? 'Drop your PDF here' : 'Drop PDF or click to browse'}
              </p>
              <p className="text-gray-600">
                Maximum file size: 10MB
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label htmlFor="swaggerUrl" className="block text-sm font-medium text-gray-700 mb-2">
              Swagger/OpenAPI URL *
            </label>
            <input
              type="url"
              id="swaggerUrl"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://api.example.com/swagger.json"
              className="input"
              disabled={isUploading}
            />
          </div>
          
          <button
            type="button"
            onClick={handleUrlUpload}
            className="btn-primary w-full"
            disabled={!providerName.trim() || !urlInput.trim() || isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing URL...
              </>
            ) : (
              <>
                <LinkIcon className="w-4 h-4 mr-2" />
                Process Swagger URL
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};