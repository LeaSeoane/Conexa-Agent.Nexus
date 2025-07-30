import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  FileText, 
  Zap, 
  Package,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { useSocket } from '../hooks/useSocket';
import { apiService } from '../services/api';
import { JobProgress } from '../types';
import { cn } from '../utils/cn';

interface ProgressDashboardProps {
  jobId: string;
}

export const ProgressDashboard: React.FC<ProgressDashboardProps> = ({ jobId }) => {
  const [progress, setProgress] = useState<JobProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { joinJobRoom, onProgress, offProgress } = useSocket();
  const navigate = useNavigate();

  useEffect(() => {
    joinJobRoom(jobId);

    const handleProgress = (progressUpdate: JobProgress) => {
      if (progressUpdate.jobId === jobId) {
        setProgress(progressUpdate);
      }
    };

    onProgress(handleProgress);

    // Initial status fetch
    const fetchInitialStatus = async () => {
      try {
        const status = await apiService.getJobStatus(jobId);
        setProgress(status);
      } catch (error) {
        console.error('Failed to fetch job status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialStatus();

    return () => {
      offProgress(handleProgress);
    };
  }, [jobId, joinJobRoom, onProgress, offProgress]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'analyzing':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'generating':
        return <Zap className="w-5 h-5 text-purple-500 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'yellow';
      case 'analyzing':
        return 'blue';
      case 'generating':
        return 'purple';
      case 'completed':
        return 'green';
      case 'failed':
        return 'red';
      default:
        return 'gray';
    }
  };

  const getStepStatus = (stepOrder: number, currentProgress: number, status: string) => {
    if (status === 'failed') return 'error';
    if (currentProgress >= stepOrder * 25) return 'completed';
    if (currentProgress >= (stepOrder - 1) * 25) return 'active';
    return 'pending';
  };

  const steps = [
    {
      name: 'Receiving',
      description: 'Processing uploaded documentation',
      order: 1,
      icon: FileText,
    },
    {
      name: 'Analyzing',
      description: 'AI-powered analysis of API endpoints',
      order: 2,
      icon: Zap,
    },
    {
      name: 'Generating',
      description: 'Creating TypeScript SDK code',
      order: 3,
      icon: Package,
    },
    {
      name: 'Complete',
      description: 'SDK ready for download',
      order: 4,
      icon: CheckCircle,
    },
  ];

  const handleViewResults = () => {
    navigate(`/job/${jobId}`);
  };

  if (isLoading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 text-conexa-primary animate-spin" />
          <span className="ml-3 text-gray-600">Loading job status...</span>
        </div>
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="card">
        <div className="flex items-center text-red-600">
          <AlertCircle className="w-5 h-5 mr-2" />
          <span>Unable to load job status</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            {getStatusIcon(progress.status)}
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Processing Status
              </h3>
              <p className="text-sm text-gray-600">Job ID: {jobId}</p>
            </div>
          </div>
          
          <div className={cn(
            'px-3 py-1 rounded-full text-xs font-medium',
            `bg-${getStatusColor(progress.status)}-100 text-${getStatusColor(progress.status)}-800`
          )}>
            {progress.status.charAt(0).toUpperCase() + progress.status.slice(1)}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progress</span>
            <span>{progress.progress}%</span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${progress.progress}%` }}
            />
          </div>
        </div>

        <p className="text-gray-700">{progress.message}</p>

        {progress.error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center text-red-800">
              <AlertCircle className="w-4 h-4 mr-2" />
              <span className="text-sm font-medium">Error:</span>
            </div>
            <p className="text-sm text-red-700 mt-1">{progress.error}</p>
          </div>
        )}

        {progress.status === 'completed' && (
          <div className="mt-4">
            <button
              onClick={handleViewResults}
              className="btn-primary"
            >
              View Results & Download SDK
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </div>
        )}
      </div>

      {/* Steps */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Processing Steps</h3>
        
        <div className="space-y-4">
          {steps.map((step, index) => {
            const stepStatus = getStepStatus(step.order, progress.progress, progress.status);
            const Icon = step.icon;
            
            return (
              <div key={step.name} className="flex items-center space-x-4">
                <div className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-full border-2',
                  stepStatus === 'completed' && 'bg-green-100 border-green-500',
                  stepStatus === 'active' && 'bg-blue-100 border-blue-500',
                  stepStatus === 'pending' && 'bg-gray-100 border-gray-300',
                  stepStatus === 'error' && 'bg-red-100 border-red-500'
                )}>
                  <Icon className={cn(
                    'w-5 h-5',
                    stepStatus === 'completed' && 'text-green-600',
                    stepStatus === 'active' && 'text-blue-600',
                    stepStatus === 'pending' && 'text-gray-400',
                    stepStatus === 'error' && 'text-red-600'
                  )} />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className={cn(
                      'font-medium',
                      stepStatus === 'completed' && 'text-green-900',
                      stepStatus === 'active' && 'text-blue-900',
                      stepStatus === 'pending' && 'text-gray-500',
                      stepStatus === 'error' && 'text-red-900'
                    )}>
                      {step.name}
                    </h4>
                    
                    {stepStatus === 'active' && (
                      <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                    )}
                    {stepStatus === 'completed' && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                    {stepStatus === 'error' && (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                  <p className={cn(
                    'text-sm',
                    stepStatus === 'completed' && 'text-green-700',
                    stepStatus === 'active' && 'text-blue-700',
                    stepStatus === 'pending' && 'text-gray-500',
                    stepStatus === 'error' && 'text-red-700'
                  )}>
                    {step.description}
                  </p>
                </div>
                
                {index < steps.length - 1 && (
                  <div className={cn(
                    'absolute left-9 mt-12 w-0.5 h-8',
                    stepStatus === 'completed' && 'bg-green-300',
                    stepStatus === 'active' && 'bg-blue-300',
                    'bg-gray-200'
                  )} style={{ marginLeft: '1.25rem' }} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};