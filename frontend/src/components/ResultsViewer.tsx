import React, { useState } from 'react';
import { 
  Download, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Eye, 
  Package,
  Shield,
  Zap,
  Code,
  FileText,
  Loader2
} from 'lucide-react';
import { AnalysisResult, GeneratedSDK } from '../types';
import { CodePreview } from './CodePreview';
import { apiService } from '../services/api';
import { cn } from '../utils/cn';

interface ResultsViewerProps {
  jobId: string;
  analysis: AnalysisResult;
  generatedSDK?: GeneratedSDK;
}

export const ResultsViewer: React.FC<ResultsViewerProps> = ({
  jobId,
  analysis,
  generatedSDK,
}) => {
  const [showCode, setShowCode] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (!generatedSDK) return;

    setIsDownloading(true);
    try {
      const blob = await apiService.downloadSDK(jobId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${generatedSDK.providerName}-sdk.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const getViabilityColor = (isViable: boolean) => {
    return isViable ? 'green' : 'red';
  };

  const getViabilityIcon = (isViable: boolean) => {
    return isViable ? (
      <CheckCircle className="w-5 h-5 text-green-500" />
    ) : (
      <XCircle className="w-5 h-5 text-red-500" />
    );
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'green';
    if (confidence >= 60) return 'yellow';
    return 'red';
  };

  const getProviderTypeIcon = (type: string) => {
    switch (type) {
      case 'payment':
        return '💳';
      case 'shipping':
        return '📦';
      default:
        return '❓';
    }
  };

  return (
    <div className="space-y-6">
      {/* Analysis Summary */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">Analysis Results</h2>
          <div className="flex items-center space-x-2">
            {getViabilityIcon(analysis.isViable)}
            <span className={cn(
              'px-3 py-1 rounded-full text-sm font-medium',
              `bg-${getViabilityColor(analysis.isViable)}-100 text-${getViabilityColor(analysis.isViable)}-800`
            )}>
              {analysis.isViable ? 'SDK Generation Viable' : 'SDK Generation Not Viable'}
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Provider Type */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-2">
              <span className="text-2xl">{getProviderTypeIcon(analysis.providerType)}</span>
              <div>
                <h3 className="font-semibold text-gray-900">Provider Type</h3>
                <p className="text-sm text-gray-600 capitalize">
                  {analysis.providerType === 'unknown' ? 'Could not determine' : analysis.providerType}
                </p>
              </div>
            </div>
          </div>

          {/* Confidence Score */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-2">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center',
                `bg-${getConfidenceColor(analysis.confidence)}-100`
              )}>
                <Zap className={cn(
                  'w-4 h-4',
                  `text-${getConfidenceColor(analysis.confidence)}-600`
                )} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Confidence</h3>
                <p className="text-sm text-gray-600">{analysis.confidence}% confidence</p>
              </div>
            </div>
            <div className="progress-bar">
              <div 
                className={cn(
                  'h-2 rounded-full transition-all duration-300',
                  analysis.confidence >= 80 ? 'bg-green-500' :
                  analysis.confidence >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                )}
                style={{ width: `${analysis.confidence}%` }}
              />
            </div>
          </div>

          {/* Endpoints Detected */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <Code className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Endpoints</h3>
                <p className="text-sm text-gray-600">{analysis.endpoints.length} detected</p>
              </div>
            </div>
          </div>
        </div>

        {/* Authentication Info */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center space-x-3 mb-2">
            <Shield className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-blue-900">Authentication</h3>
          </div>
          <div className="text-sm text-blue-800">
            <p>Type: <span className="font-mono bg-blue-100 px-2 py-1 rounded">{analysis.authentication.type}</span></p>
            {analysis.authentication.location && (
              <p className="mt-1">Location: <span className="font-mono bg-blue-100 px-2 py-1 rounded">{analysis.authentication.location}</span></p>
            )}
            {analysis.authentication.parameterName && (
              <p className="mt-1">Parameter: <span className="font-mono bg-blue-100 px-2 py-1 rounded">{analysis.authentication.parameterName}</span></p>
            )}
          </div>
        </div>
      </div>

      {/* Detected Endpoints */}
      <div className="card">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Detected API Endpoints</h3>
        <div className="space-y-3">
          {analysis.endpoints.map((endpoint, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <span className={cn(
                    'px-2 py-1 rounded text-xs font-mono font-semibold',
                    endpoint.method === 'GET' && 'bg-green-100 text-green-800',
                    endpoint.method === 'POST' && 'bg-blue-100 text-blue-800',
                    endpoint.method === 'PUT' && 'bg-yellow-100 text-yellow-800',
                    endpoint.method === 'DELETE' && 'bg-red-100 text-red-800',
                    !['GET', 'POST', 'PUT', 'DELETE'].includes(endpoint.method) && 'bg-gray-100 text-gray-800'
                  )}>
                    {endpoint.method}
                  </span>
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">{endpoint.path}</code>
                </div>
                <span className="text-sm text-gray-600 capitalize">{endpoint.purpose.replace(/_/g, ' ')}</span>
              </div>
              
              {endpoint.parameters.length > 0 && (
                <div className="mt-2">
                  <h5 className="text-xs font-semibold text-gray-700 mb-1">Parameters:</h5>
                  <div className="flex flex-wrap gap-2">
                    {endpoint.parameters.map((param, paramIndex) => (
                      <span
                        key={paramIndex}
                        className={cn(
                          'text-xs px-2 py-1 rounded-full',
                          param.required 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-gray-100 text-gray-600'
                        )}
                      >
                        {param.name} ({param.type})
                        {param.required && ' *'}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Issues and Recommendations */}
      {(analysis.issues.length > 0 || analysis.recommendations.length > 0) && (
        <div className="grid md:grid-cols-2 gap-6">
          {analysis.issues.length > 0 && (
            <div className="card">
              <div className="flex items-center space-x-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                <h3 className="text-lg font-semibold text-gray-900">Issues Found</h3>
              </div>
              <ul className="space-y-2">
                {analysis.issues.map((issue, index) => (
                  <li key={index} className="flex items-start space-x-2 text-sm text-gray-700">
                    <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full mt-2 flex-shrink-0" />
                    <span>{issue}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {analysis.recommendations.length > 0 && (
            <div className="card">
              <div className="flex items-center space-x-2 mb-4">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <h3 className="text-lg font-semibold text-gray-900">Recommendations</h3>
              </div>
              <ul className="space-y-2">
                {analysis.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start space-x-2 text-sm text-gray-700">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* SDK Actions */}
      {generatedSDK && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Package className="w-6 h-6 text-conexa-primary" />
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Generated SDK</h3>
                <p className="text-gray-600">@conexa/{generatedSDK.providerName}-sdk</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowCode(!showCode)}
                className="btn-secondary flex items-center"
              >
                <Eye className="w-4 h-4 mr-2" />
                {showCode ? 'Hide Code' : 'Preview Code'}
              </button>
              
              <button
                onClick={handleDownload}
                className="btn-primary flex items-center"
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Download SDK
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span>{generatedSDK.files.length} files generated</span>
            </div>
            <div className="flex items-center space-x-2">
              <Package className="w-4 h-4" />
              <span>TypeScript SDK</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Production ready</span>
            </div>
          </div>
        </div>
      )}

      {/* Code Preview */}
      {showCode && generatedSDK && (
        <CodePreview files={generatedSDK.files} providerName={generatedSDK.providerName} />
      )}
    </div>
  );
};