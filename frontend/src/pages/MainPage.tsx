import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadArea } from '../components/UploadArea';
import { ProgressDashboard } from '../components/ProgressDashboard';
import { AlertCircle, X } from 'lucide-react';

export const MainPage: React.FC = () => {
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleUploadSuccess = (jobId: string) => {
    setCurrentJobId(jobId);
    setError(null);
    // Update URL without navigating to preserve the upload state
    window.history.pushState({}, '', `/job/${jobId}`);
  };

  const handleUploadError = (errorMessage: string) => {
    setError(errorMessage);
    setCurrentJobId(null);
  };

  const handleStartNew = () => {
    setCurrentJobId(null);
    setError(null);
    window.history.pushState({}, '', '/');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Hero Section */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Generate Integration SDKs Automatically
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Upload your API documentation and let AI generate production-ready TypeScript SDKs 
          following Conexa's proven integration patterns.
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Upload Error</h3>
                <p className="text-sm text-red-600 mt-1">{error}</p>
              </div>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Current Job Progress or Upload Area */}
      {currentJobId ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-gray-900">
              Processing Documentation
            </h2>
            <button
              onClick={handleStartNew}
              className="btn-secondary"
            >
              Start New Upload
            </button>
          </div>
          <ProgressDashboard jobId={currentJobId} />
        </div>
      ) : (
        <UploadArea
          onUploadSuccess={handleUploadSuccess}
          onUploadError={handleUploadError}
        />
      )}

      {/* Features Section */}
      {!currentJobId && (
        <div className="grid md:grid-cols-3 gap-6 mt-12">
          <div className="card text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🤖</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">AI-Powered Analysis</h3>
            <p className="text-gray-600">
              Advanced AI analyzes your API documentation to understand endpoints, 
              authentication, and data structures.
            </p>
          </div>

          <div className="card text-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚡</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Production Ready</h3>
            <p className="text-gray-600">
              Generated SDKs include TypeScript types, error handling, logging, 
              and comprehensive tests following Conexa standards.
            </p>
          </div>

          <div className="card text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📦</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Instant Download</h3>
            <p className="text-gray-600">
              Download complete SDK packages ready for publishing to Conexa's 
              private NPM registry with documentation included.
            </p>
          </div>
        </div>
      )}

      {/* Supported Formats */}
      {!currentJobId && (
        <div className="card bg-gray-50 border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Supported Documentation Formats</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-red-100 rounded flex items-center justify-center">
                <span className="text-red-600 font-semibold text-sm">PDF</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">PDF Documentation</p>
                <p className="text-sm text-gray-600">Upload API docs in PDF format (max 10MB)</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                <span className="text-blue-600 font-semibold text-sm">API</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Swagger/OpenAPI</p>
                <p className="text-sm text-gray-600">Provide URLs to live API documentation</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};