import React, { useState } from 'react';
import { Highlight, themes } from 'prism-react-renderer';
import { Copy, Check, FileText, FolderOpen, File } from 'lucide-react';
import { GeneratedFile } from '../types';
import { cn } from '../utils/cn';

interface CodePreviewProps {
  files: GeneratedFile[];
  providerName: string;
}

export const CodePreview: React.FC<CodePreviewProps> = ({ files, providerName }) => {
  const [selectedFile, setSelectedFile] = useState<GeneratedFile>(files[0]);
  const [copiedFile, setCopiedFile] = useState<string | null>(null);

  const copyToClipboard = async (content: string, fileName: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedFile(fileName);
      setTimeout(() => setCopiedFile(null), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const getFileIcon = (file: GeneratedFile) => {
    if (file.path.endsWith('.ts') || file.path.endsWith('.tsx')) {
      return <span className="text-blue-500 text-xs font-mono">TS</span>;
    }
    if (file.path.endsWith('.json')) {
      return <span className="text-yellow-500 text-xs font-mono">JSON</span>;
    }
    if (file.path.endsWith('.md')) {
      return <span className="text-green-500 text-xs font-mono">MD</span>;
    }
    if (file.path.endsWith('.js') || file.path.endsWith('.cjs')) {
      return <span className="text-orange-500 text-xs font-mono">JS</span>;
    }
    return <File className="w-4 h-4 text-gray-400" />;
  };

  const getLanguage = (file: GeneratedFile): string => {
    if (file.path.endsWith('.ts') || file.path.endsWith('.tsx')) return 'typescript';
    if (file.path.endsWith('.json')) return 'json';
    if (file.path.endsWith('.md')) return 'markdown';
    if (file.path.endsWith('.js') || file.path.endsWith('.cjs')) return 'javascript';
    return 'text';
  };

  const organizeFiles = (files: GeneratedFile[]) => {
    const organized: { [key: string]: GeneratedFile[] } = {};
    
    files.forEach(file => {
      const pathParts = file.path.split('/');
      const folder = pathParts.length > 1 ? pathParts[0] : 'root';
      if (!organized[folder]) {
        organized[folder] = [];
      }
      organized[folder].push(file);
    });

    return organized;
  };

  const organizedFiles = organizeFiles(files);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-900">Generated SDK Code</h3>
        <div className="text-sm text-gray-600">
          {files.length} files generated
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* File Tree */}
        <div className="lg:col-span-1">
          <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
              <FolderOpen className="w-4 h-4 mr-2" />
              @conexa/{providerName}-sdk
            </h4>
            
            <div className="space-y-1">
              {Object.entries(organizedFiles).map(([folder, folderFiles]) => (
                <div key={folder}>
                  {folder !== 'root' && (
                    <div className="flex items-center text-sm font-medium text-gray-700 mb-2 ml-4">
                      <FolderOpen className="w-3 h-3 mr-1" />
                      {folder}/
                    </div>
                  )}
                  
                  {folderFiles.map((file) => (
                    <button
                      key={file.path}
                      onClick={() => setSelectedFile(file)}
                      className={cn(
                        'w-full text-left flex items-center space-x-2 px-2 py-1 rounded text-sm transition-colors',
                        folder !== 'root' && 'ml-6',
                        selectedFile.path === file.path
                          ? 'bg-conexa-primary text-white'
                          : 'hover:bg-gray-200 text-gray-700'
                      )}
                    >
                      <div className="w-5 h-5 flex items-center justify-center bg-white rounded border">
                        {getFileIcon(file)}
                      </div>
                      <span className="truncate font-mono">
                        {file.path.split('/').pop()}
                      </span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Code Display */}
        <div className="lg:col-span-3">
          <div className="bg-gray-900 rounded-lg overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between bg-gray-800 px-4 py-3 border-b border-gray-700">
              <div className="flex items-center space-x-2">
                <div className="flex items-center justify-center w-6 h-6 bg-gray-700 rounded">
                  {getFileIcon(selectedFile)}
                </div>
                <span className="text-gray-200 font-mono text-sm">
                  {selectedFile.path}
                </span>
              </div>
              
              <button
                onClick={() => copyToClipboard(selectedFile.content, selectedFile.path)}
                className="flex items-center space-x-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded text-sm transition-colors"
              >
                {copiedFile === selectedFile.path ? (
                  <>
                    <Check className="w-4 h-4 text-green-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            {/* Code Content */}
            <div className="overflow-x-auto max-h-96">
              <Highlight
                theme={themes.vsDark}
                code={selectedFile.content}
                language={getLanguage(selectedFile)}
              >
                {({ className, style, tokens, getLineProps, getTokenProps }) => (
                  <pre className={cn(className, 'p-4 text-sm')} style={style}>
                    {tokens.map((line, i) => (
                      <div key={i} {...getLineProps({ line })}>
                        <span className="inline-block w-8 text-right mr-4 text-gray-500 select-none">
                          {i + 1}
                        </span>
                        {line.map((token, key) => (
                          <span key={key} {...getTokenProps({ token })} />
                        ))}
                      </div>
                    ))}
                  </pre>
                )}
              </Highlight>
            </div>
          </div>

          {/* File Info */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>
                {selectedFile.content.split('\n').length} lines • {selectedFile.type}
              </span>
              <span>
                {(new Blob([selectedFile.content]).size / 1024).toFixed(1)} KB
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};