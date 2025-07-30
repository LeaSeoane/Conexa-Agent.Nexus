"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SDKGeneratorService = void 0;
const logger_1 = require("../utils/logger");
class SDKGeneratorService {
    async generateSDK(analysis, providerName) {
        logger_1.logger.info(`Generating SDK for ${providerName} (${analysis.providerType})`);
        const normalizedName = this.normalizeProviderName(providerName);
        const files = [];
        files.push(this.generateIndexFile(normalizedName));
        files.push(this.generateClientSDKFile(normalizedName, analysis));
        files.push(this.generateAppConfigFile());
        files.push(this.generateHttpServiceFile());
        files.push(this.generateLoggerFile());
        files.push(this.generateErrorFile());
        files.push(this.generateAuthServiceFile(analysis));
        if (analysis.providerType === 'payment') {
            files.push(this.generatePaymentServiceFile(analysis, normalizedName));
            files.push(this.generatePaymentInterfacesFile());
        }
        else if (analysis.providerType === 'shipping') {
            files.push(this.generateShippingServiceFile(analysis, normalizedName));
            files.push(this.generateShippingInterfacesFile());
        }
        files.push(this.generateBaseInterfacesFile());
        files.push(this.generateTestFile(normalizedName, analysis.providerType));
        files.push(this.generateJestConfigFile());
        files.push(this.generateTsConfigFile());
        files.push(this.generateEslintConfigFile());
        const packageJson = this.generatePackageJson(normalizedName, providerName);
        const readme = this.generateReadme(providerName, analysis);
        return {
            providerName: normalizedName,
            files,
            packageJson,
            readme
        };
    }
    normalizeProviderName(name) {
        return name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    }
    generateIndexFile(providerName) {
        return {
            path: 'src/index.ts',
            type: 'typescript',
            content: `export { ClientSDK } from './client-sdk';
export { setAppConfig, getAppConfig } from './config/app-config';
export { authenticate } from './services/auth.service';
export * from './interfaces';`
        };
    }
    generateClientSDKFile(providerName, analysis) {
        const services = analysis.providerType === 'payment'
            ? ['CheckoutService', 'TransactionService']
            : ['ShippingService', 'TrackingService'];
        const imports = services.map(service => `import { ${service} } from './services/${service.toLowerCase().replace('service', '')}.service';`).join('\n');
        const properties = services.map(service => `  public readonly ${service.replace('Service', '')}: ${service};`).join('\n');
        const initialization = services.map(service => `    this.${service.replace('Service', '')} = new ${service}(this.token);`).join('\n');
        return {
            path: 'src/client-sdk.ts',
            type: 'typescript',
            content: `${imports}

export class ClientSDK {
${properties}

  constructor(private token: string) {
    this.validateToken(token);
    this.initializeServices();
  }

  private validateToken(token: string): void {
    if (!token) {
      throw new Error('Authentication token is required');
    }
  }

  private initializeServices(): void {
${initialization}
  }
}`
        };
    }
    generateAppConfigFile() {
        return {
            path: 'src/config/app-config.ts',
            type: 'typescript',
            content: `export interface AppConfig {
  env: 'development' | 'staging' | 'production';
  debug: boolean;
  userAgent: string;
  timeout?: number;
  baseUrl?: string;
}

let appConfig: AppConfig = {
  env: 'production',
  debug: false,
  userAgent: 'Conexa-SDK/1.0.0'
};

export function setAppConfig(config: Partial<AppConfig>): void {
  appConfig = { ...appConfig, ...config };
}

export function getAppConfig(): AppConfig {
  return { ...appConfig };
}`
        };
    }
    generateHttpServiceFile() {
        return {
            path: 'src/utils/httpService.ts',
            type: 'typescript',
            content: `import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { getAppConfig } from '../config/app-config';
import { logger } from './logger';

export class HttpService {
  private client: AxiosInstance;

  constructor(private token: string) {
    this.client = this.createAxiosInstance();
  }

  private createAxiosInstance(): AxiosInstance {
    const config = getAppConfig();
    
    const instance = axios.create({
      baseURL: config.baseUrl || 'https://api.provider.com', // TODO: Replace with actual API URL
      timeout: config.timeout || 30000,
      headers: {
        'Authorization': \`Bearer \${this.token}\`,
        'Content-Type': 'application/json',
        'User-Agent': config.userAgent
      }
    });

    this.setupInterceptors(instance);
    return instance;
  }

  private setupInterceptors(instance: AxiosInstance): void {
    instance.interceptors.request.use(
      (config) => {
        if (getAppConfig().debug) {
          logger.debug(\`Making \${config.method?.toUpperCase()} request to \${config.url}\`);
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    instance.interceptors.response.use(
      (response) => response,
      (error) => {
        logger.error('HTTP request failed:', error.message);
        return Promise.reject(this.handleHttpError(error));
      }
    );
  }

  private handleHttpError(error: any): Error {
    if (error.response) {
      const { status, data } = error.response;
      return new Error(\`HTTP \${status}: \${data?.message || error.message}\`);
    }
    return new Error(\`Network Error: \${error.message}\`);
  }

  public async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get(url, config);
    return response.data;
  }

  public async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post(url, data, config);
    return response.data;
  }

  public async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put(url, data, config);
    return response.data;
  }

  public async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete(url, config);
    return response.data;
  }
}`
        };
    }
    generateLoggerFile() {
        return {
            path: 'src/utils/logger.ts',
            type: 'typescript',
            content: `import pino from 'pino';

export const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:dd-mm-yyyy HH:MM:ss',
      ignore: 'pid,hostname'
    }
  },
  level: process.env.LOG_LEVEL || 'info'
});`
        };
    }
    generateErrorFile() {
        return {
            path: 'src/utils/error.ts',
            type: 'typescript',
            content: `export class SDKError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'SDKError';
  }
}

export function createError(message: string, code?: string, statusCode?: number): SDKError {
  return new SDKError(message, code, statusCode);
}`
        };
    }
    generateAuthServiceFile(analysis) {
        const authType = analysis.authentication.type;
        const authLocation = analysis.authentication.location || 'header';
        const paramName = analysis.authentication.parameterName || 'Authorization';
        return {
            path: 'src/services/auth.service.ts',
            type: 'typescript',
            content: `import { HttpService } from '../utils/httpService';
import { logger } from '../utils/logger';

export async function authenticate(apiKey: string, apiSecret?: string): Promise<string> {
  // TODO: Implement actual authentication based on provider requirements
  // Current authentication type detected: ${authType}
  // Location: ${authLocation}
  // Parameter name: ${paramName}
  
  try {
    logger.info('Starting authentication process');
    
    // For now, return the apiKey as token
    // TODO: Replace with actual authentication flow
    if (!apiKey) {
      throw new Error('API key is required');
    }

    logger.info('Authentication successful');
    return apiKey;
  } catch (error) {
    logger.error('Authentication failed:', error);
    throw error;
  }
}`
        };
    }
    generatePaymentServiceFile(analysis, providerName) {
        const createEndpoint = analysis.endpoints.find(e => e.purpose.includes('create_payment'));
        const getEndpoint = analysis.endpoints.find(e => e.purpose.includes('get_payment'));
        const getPath = getEndpoint?.path?.replace('{id}', '${paymentId}') || '/api/payments/${paymentId}';
        return {
            path: 'src/services/checkout.service.ts',
            type: 'typescript',
            content: `import { HttpService } from '../utils/httpService';
import { CreatePaymentDTO, PaymentResponse, PaymentData } from '../interfaces/payment.interfaces';
import { logger } from '../utils/logger';

export class CheckoutService {
  private httpService: HttpService;

  constructor(token: string) {
    this.httpService = new HttpService(token);
  }

  async createPayment(data: CreatePaymentDTO): Promise<PaymentResponse> {
    try {
      logger.info('Creating payment');
      
      // TODO: Implement actual payment creation
      // Detected endpoint: ${createEndpoint?.path || '/api/payments'} (${createEndpoint?.method || 'POST'})
      
      const response = await this.httpService.post<PaymentResponse>(
        '${createEndpoint?.path || '/api/payments'}',
        data
      );

      logger.info(\`Payment created successfully: \${response.id}\`);
      return response;
    } catch (error) {
      logger.error('Failed to create payment:', error);
      throw error;
    }
  }

  async getPaymentDetails(paymentId: string): Promise<PaymentData> {
    try {
      logger.info(\`Retrieving payment details: \${paymentId}\`);
      
      // TODO: Implement actual payment retrieval
      // Detected endpoint: ${getEndpoint?.path || '/api/payments/{id}'} (${getEndpoint?.method || 'GET'})
      
      const response = await this.httpService.get<PaymentData>(
        \`${getPath}\`
      );

      return response;
    } catch (error) {
      logger.error('Failed to get payment details:', error);
      throw error;
    }
  }

  async cancelPayment(paymentId: string): Promise<void> {
    try {
      logger.info(\`Cancelling payment: \${paymentId}\`);
      
      // TODO: Implement actual payment cancellation
      await this.httpService.delete(\`/api/payments/\${paymentId}\`);
      
      logger.info(\`Payment cancelled successfully: \${paymentId}\`);
    } catch (error) {
      logger.error('Failed to cancel payment:', error);
      throw error;
    }
  }
}`
        };
    }
    generateShippingServiceFile(analysis, providerName) {
        const createEndpoint = analysis.endpoints.find(e => e.purpose.includes('create_shipment'));
        const getEndpoint = analysis.endpoints.find(e => e.purpose.includes('get_shipment'));
        const getPath = getEndpoint?.path?.replace('{id}', '${shipmentId}') || '/api/shipments/${shipmentId}';
        return {
            path: 'src/services/shipping.service.ts',
            type: 'typescript',
            content: `import { HttpService } from '../utils/httpService';
import { CreateShipmentDTO, ShipmentResponse, ShipmentData, ShipmentUpdateDTO } from '../interfaces/shipping.interfaces';
import { logger } from '../utils/logger';

export class ShippingService {
  private httpService: HttpService;

  constructor(token: string) {
    this.httpService = new HttpService(token);
  }

  async createShipment(data: CreateShipmentDTO): Promise<ShipmentResponse> {
    try {
      logger.info('Creating shipment');
      
      // TODO: Implement actual shipment creation
      // Detected endpoint: ${createEndpoint?.path || '/api/shipments'} (${createEndpoint?.method || 'POST'})
      
      const response = await this.httpService.post<ShipmentResponse>(
        '${createEndpoint?.path || '/api/shipments'}',
        data
      );

      logger.info(\`Shipment created successfully: \${response.id}\`);
      return response;
    } catch (error) {
      logger.error('Failed to create shipment:', error);
      throw error;
    }
  }

  async getShipmentDetails(shipmentId: string): Promise<ShipmentData> {
    try {
      logger.info(\`Retrieving shipment details: \${shipmentId}\`);
      
      const response = await this.httpService.get<ShipmentData>(
        \`${getPath}\`
      );

      return response;
    } catch (error) {
      logger.error('Failed to get shipment details:', error);
      throw error;
    }
  }

  async updateShipment(shipmentId: string, updates: ShipmentUpdateDTO): Promise<void> {
    try {
      logger.info(\`Updating shipment: \${shipmentId}\`);
      
      await this.httpService.put(\`/api/shipments/\${shipmentId}\`, updates);
      
      logger.info(\`Shipment updated successfully: \${shipmentId}\`);
    } catch (error) {
      logger.error('Failed to update shipment:', error);
      throw error;
    }
  }

  async cancelShipment(shipmentId: string): Promise<void> {
    try {
      logger.info(\`Cancelling shipment: \${shipmentId}\`);
      
      await this.httpService.delete(\`/api/shipments/\${shipmentId}\`);
      
      logger.info(\`Shipment cancelled successfully: \${shipmentId}\`);
    } catch (error) {
      logger.error('Failed to cancel shipment:', error);
      throw error;
    }
  }

  async getShippingLabel(shipmentId: string): Promise<Buffer> {
    try {
      logger.info(\`Getting shipping label: \${shipmentId}\`);
      
      // TODO: Implement label retrieval
      const response = await this.httpService.get<Buffer>(\`/api/shipments/\${shipmentId}/label\`);
      
      return response;
    } catch (error) {
      logger.error('Failed to get shipping label:', error);
      throw error;
    }
  }

  async getTrackingUrl(shipmentId: string): Promise<string> {
    try {
      logger.info(\`Getting tracking URL: \${shipmentId}\`);
      
      // TODO: Implement tracking URL retrieval
      const response = await this.httpService.get<{ trackingUrl: string }>(\`/api/shipments/\${shipmentId}/tracking\`);
      
      return response.trackingUrl;
    } catch (error) {
      logger.error('Failed to get tracking URL:', error);
      throw error;
    }
  }
}`
        };
    }
    generatePaymentInterfacesFile() {
        return {
            path: 'src/interfaces/payment.interfaces.ts',
            type: 'typescript',
            content: `export interface CreatePaymentDTO {
  amount: number;
  currency: string;
  description?: string;
  customerId?: string;
  metadata?: Record<string, any>;
}

export interface PaymentResponse {
  id: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  amount: number;
  currency: string;
  paymentUrl?: string;
  createdAt: string;
}

export interface PaymentData {
  id: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  amount: number;
  currency: string;
  description?: string;
  customerId?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}`
        };
    }
    generateShippingInterfacesFile() {
        return {
            path: 'src/interfaces/shipping.interfaces.ts',
            type: 'typescript',
            content: `export interface Address {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface Package {
  weight: number;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  description?: string;
}

export interface CreateShipmentDTO {
  origin: Address;
  destination: Address;
  package: Package;
  serviceType?: string;
  metadata?: Record<string, any>;
}

export interface ShipmentResponse {
  id: string;
  status: 'created' | 'in_transit' | 'delivered' | 'cancelled';
  trackingNumber: string;
  estimatedDelivery?: string;
  createdAt: string;
}

export interface ShipmentData {
  id: string;
  status: 'created' | 'in_transit' | 'delivered' | 'cancelled';
  trackingNumber: string;
  origin: Address;
  destination: Address;
  package: Package;
  serviceType?: string;
  estimatedDelivery?: string;
  actualDelivery?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface ShipmentUpdateDTO {
  status?: 'created' | 'in_transit' | 'delivered' | 'cancelled';
  estimatedDelivery?: string;
  actualDelivery?: string;
  metadata?: Record<string, any>;
}`
        };
    }
    generateBaseInterfacesFile() {
        return {
            path: 'src/interfaces/index.ts',
            type: 'typescript',
            content: `export * from './payment.interfaces';
export * from './shipping.interfaces';

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface PaginatedResponse<T = any> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}`
        };
    }
    generateTestFile(providerName, providerType) {
        const serviceName = providerType === 'payment' ? 'Checkout' : 'Shipping';
        return {
            path: '__tests__/client-sdk.test.ts',
            type: 'typescript',
            content: `import { ClientSDK } from '../src/client-sdk';

describe('ClientSDK', () => {
  const mockToken = 'test-token-123';

  it('should create instance with valid token', () => {
    const sdk = new ClientSDK(mockToken);
    expect(sdk).toBeInstanceOf(ClientSDK);
    expect(sdk.${serviceName}).toBeDefined();
  });

  it('should throw error with invalid token', () => {
    expect(() => new ClientSDK('')).toThrow('Authentication token is required');
  });

  it('should initialize services correctly', () => {
    const sdk = new ClientSDK(mockToken);
    expect(sdk.${serviceName}).toBeDefined();
  });
});`
        };
    }
    generateJestConfigFile() {
        return {
            path: 'jest.config.cjs',
            type: 'javascript',
            content: `module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/__tests__'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html']
};`
        };
    }
    generateTsConfigFile() {
        return {
            path: 'tsconfig.json',
            type: 'json',
            content: `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "removeComments": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "__tests__"]
}`
        };
    }
    generateEslintConfigFile() {
        return {
            path: '.eslintrc.json',
            type: 'json',
            content: `{
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "extends": [
    "eslint:recommended",
    "@typescript-eslint/recommended"
  ],
  "parserOptions": {
    "ecmaVersion": 2022,
    "sourceType": "module"
  },
  "rules": {
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "warn"
  },
  "env": {
    "node": true,
    "es2022": true,
    "jest": true
  }
}`
        };
    }
    generatePackageJson(normalizedName, providerName) {
        return {
            name: `@conexa/${normalizedName}-sdk`,
            version: "1.0.0",
            description: `Conexa SDK for ${providerName} integration`,
            main: "dist/index.js",
            types: "dist/index.d.ts",
            scripts: {
                build: "tsc",
                test: "jest",
                "test:watch": "jest --watch",
                "test:coverage": "jest --coverage",
                lint: "eslint src --ext .ts",
                "lint:fix": "eslint src --ext .ts --fix",
                format: "prettier --write src/**/*.ts",
                release: "npm run build && npm run test",
                "publish:registry": "npm publish --registry https://npm-registry.conexa.ai"
            },
            dependencies: {
                axios: "^1.6.0",
                pino: "^8.0.0"
            },
            devDependencies: {
                "@types/node": "^22.0.0",
                "@typescript-eslint/eslint-plugin": "^6.0.0",
                "@typescript-eslint/parser": "^6.0.0",
                eslint: "^8.0.0",
                jest: "^29.0.0",
                "@types/jest": "^29.0.0",
                prettier: "^3.0.0",
                typescript: "^5.0.0"
            },
            keywords: ["conexa", "integration", "ecommerce", "sdk", normalizedName],
            author: "Conexa Development Team",
            license: "UNLICENSED"
        };
    }
    generateReadme(providerName, analysis) {
        const normalizedName = this.normalizeProviderName(providerName);
        const serviceType = analysis.providerType === 'payment' ? 'Payment' : 'Shipping';
        const serviceExample = analysis.providerType === 'payment'
            ? `const payment = await sdk.Checkout.createPayment({
  amount: 1000,
  currency: 'USD',
  description: 'Test payment'
});`
            : `const shipment = await sdk.Shipping.createShipment({
  origin: { /* origin address */ },
  destination: { /* destination address */ },
  package: { /* package details */ }
});`;
        return `# ${providerName} SDK

Conexa SDK for ${providerName} ${serviceType.toLowerCase()} integration.

## Installation

\`\`\`bash
npm install @conexa/${normalizedName}-sdk --registry https://npm-registry.conexa.ai
\`\`\`

## Configuration

\`\`\`typescript
import { setAppConfig } from '@conexa/${normalizedName}-sdk';

setAppConfig({
  env: 'development',
  debug: true,
  userAgent: 'My App v1.0.0',
  baseUrl: 'https://api.provider.com' // TODO: Replace with actual API URL
});
\`\`\`

## Authentication

\`\`\`typescript
import { authenticate } from '@conexa/${normalizedName}-sdk';

const token = await authenticate('your-api-key', 'your-api-secret');
\`\`\`

## Usage

\`\`\`typescript
import { ClientSDK, setAppConfig, authenticate } from '@conexa/${normalizedName}-sdk';

// Configure the SDK
setAppConfig({
  env: 'development',
  debug: true
});

// Authenticate
const token = await authenticate('your-api-key');

// Create SDK instance
const sdk = new ClientSDK(token);

// Use the SDK
${serviceExample}
\`\`\`

## API Reference

### ${serviceType} Operations

${analysis.endpoints.map(endpoint => `- **${endpoint.method} ${endpoint.path}**: ${endpoint.purpose}`).join('\n')}

## Development

\`\`\`bash
# Install dependencies
npm install

# Build the SDK
npm run build

# Run tests
npm test

# Run linting
npm run lint

# Format code
npm run format
\`\`\`

## Publishing

\`\`\`bash
# Build and test
npm run release

# Publish to Conexa registry
npm run publish:registry
\`\`\`

## TODO

${analysis.issues.length > 0 ? '### Issues to Address\n' + analysis.issues.map(issue => `- ${issue}`).join('\n') + '\n\n' : ''}

### Recommendations

${analysis.recommendations.map(rec => `- ${rec}`).join('\n')}

## License

UNLICENSED - Conexa Development Team
`;
    }
}
exports.SDKGeneratorService = SDKGeneratorService;
//# sourceMappingURL=sdk-generator.service.js.map