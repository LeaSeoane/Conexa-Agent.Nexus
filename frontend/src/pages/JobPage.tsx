import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { ProgressDashboard } from '../components/ProgressDashboard';
import { ResultsViewer } from '../components/ResultsViewer';
import { apiService } from '../services/api';
import { JobResult } from '../types';

export const JobPage: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [jobResult, setJobResult] = useState<JobResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) {
      navigate('/');
      return;
    }

    fetchJobResult();
  }, [jobId, navigate]);

  const fetchJobResult = async () => {
    if (!jobId) return;

    setIsLoading(true);
    setError(null);

    try {
      // First try to get the complete result
      try {
        const result = await apiService.getJobResult(jobId);
        setJobResult(result);
      } catch (resultError: any) {
        // If result not available, fall back to status check
        if (resultError.response?.status === 404 || resultError.response?.status === 400) {
          // Job exists but not completed, show progress dashboard
          setJobResult(null);
        } else {
          throw resultError;
        }
      }
    } catch (error: any) {
      console.error('Failed to fetch job result:', error);
      setError(error.response?.data?.error?.message || 'Failed to load job information');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    fetchJobResult();
  };

  if (!jobId) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-conexa-primary animate-spin mr-3" />
          <span className="text-gray-600">Loading job information...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="card">
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Job</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <div className="flex items-center justify-center space-x-3">
                <button onClick={handleRetry} className="btn-primary flex items-center">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry
                </button>
                <Link to="/" className="btn-secondary">
                  Go Home
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            to="/"
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Upload
          </Link>
          <div className="w-px h-6 bg-gray-300" />
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Job Details</h1>
            <p className="text-sm text-gray-600 font-mono">ID: {jobId}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      {jobResult?.analysis ? (
        <ResultsViewer
          jobId={jobId}
          analysis={jobResult.analysis}
          generatedSDK={jobResult.generatedSDK}
        />
      ) : (
        <ProgressDashboard jobId={jobId} />
      )}
    </div>
  );
};