import React from 'react';
import { Link } from 'react-router-dom';
import { Zap, Code } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-conexa-primary rounded-lg">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Conexa Integration Generator
              </h1>
              <p className="text-sm text-gray-500">
                AI-powered SDK generation for ecommerce integrations
              </p>
            </div>
          </Link>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Code className="w-4 h-4" />
              <span>Powered by TypeScript & AI</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};