# 🤖 Conexa Integration Generator

A complete AI-powered system for automatically generating TypeScript SDK libraries from API documentation. Built specifically for Conexa's ecommerce integration development workflow.

## ✨ Features

- **AI-Powered Analysis**: Intelligent parsing of PDF documentation and Swagger/OpenAPI specifications
- **Real-time Progress**: WebSocket-based live updates during processing
- **Modern UI**: Clean React interface with drag-and-drop file upload
- **Production-Ready SDKs**: Generated libraries follow Conexa's established patterns
- **Complete Development Stack**: Both frontend and backend included
- **TypeScript First**: Full type safety throughout the generated SDKs

## 🏗️ System Architecture

```
conexa-integration-generator/
├── frontend/          # React 18 + TypeScript frontend
├── backend/           # Node.js + Express API
├── generated-sdks/    # Output directory for generated SDKs
└── docs/              # Additional documentation
```

## 🚀 Quick Start

### Prerequisites

- Node.js 22+
- npm or yarn
- (Optional) OpenAI API key for enhanced AI analysis

### Installation

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd conexa-integration-generator
   npm run install:all
   ```

2. **Environment Configuration:**
   ```bash
   # Backend (.env file in /backend)
   PORT=3001
   OPENAI_API_KEY=your_openai_key_here  # Optional
   NODE_ENV=development
   
   # Frontend (.env file in /frontend)
   VITE_API_URL=http://localhost:3001/api
   VITE_SOCKET_URL=http://localhost:3001
   ```

3. **Start the development servers:**
   ```bash
   npm run dev
   ```

4. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - Health Check: http://localhost:3001/health

## 📱 Usage

### 1. Upload Documentation
- **PDF Upload**: Drag and drop API documentation PDFs (max 10MB)
- **Swagger URL**: Provide live OpenAPI/Swagger specification URLs

### 2. Monitor Progress
- Real-time progress updates via WebSocket
- Step-by-step processing visualization
- Error handling and retry mechanisms

### 3. Download Generated SDK
- Preview generated TypeScript code
- Download complete SDK packages as ZIP files
- Ready for publishing to Conexa's private NPM registry

## 🔧 API Endpoints

### Upload Endpoints
- `POST /api/upload/pdf` - Upload PDF documentation
- `POST /api/upload/url` - Submit Swagger/OpenAPI URL

### Analysis Endpoints  
- `GET /api/analysis/:jobId` - Get processing status
- `GET /api/analysis/:jobId/result` - Get complete analysis results

### Download Endpoints
- `GET /api/download/:jobId` - Download generated SDK ZIP

### WebSocket Events
- `analysis-progress` - Real-time progress updates
- `analysis-complete` - Processing completion notification

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test
npm run test:coverage
```

### Frontend Tests
```bash
cd frontend  
npm test
npm run test:coverage
```

### Run All Tests
```bash
npm test
```

## 📦 Generated SDK Structure

Each generated SDK follows Conexa's established patterns:

```
@conexa/provider-name-sdk/
├── src/
│   ├── config/           # App configuration
│   ├── interfaces/       # TypeScript interfaces and DTOs
│   ├── services/         # API service classes
│   ├── utils/           # Utilities (HTTP, logging, errors)
│   ├── client-sdk.ts    # Main SDK class
│   └── index.ts         # Public exports
├── __tests__/           # Jest unit tests
├── package.json         # NPM package configuration
├── tsconfig.json        # TypeScript configuration
├── jest.config.cjs      # Test configuration
└── README.md           # Usage documentation
```

## 🔐 Supported Provider Types

### Payment Providers
Generated methods:
- `createPayment(data: CreatePaymentDTO): Promise<PaymentResponse>`
- `getPaymentDetails(paymentId: string): Promise<PaymentData>`
- `cancelPayment(paymentId: string): Promise<void>`

### Shipping Providers  
Generated methods:
- `createShipment(data: CreateShipmentDTO): Promise<ShipmentResponse>`
- `getShipmentDetails(shipmentId: string): Promise<ShipmentData>`
- `updateShipment(shipmentId: string, updates: ShipmentUpdateDTO): Promise<void>`
- `cancelShipment(shipmentId: string): Promise<void>`
- `getShippingLabel(shipmentId: string): Promise<Buffer>`
- `getTrackingUrl(shipmentId: string): Promise<string>`

## 🛠️ Development

### Project Structure
```
/backend                 # Express.js API server
├── src/
│   ├── controllers/     # Route controllers
│   ├── services/        # Business logic services
│   ├── routes/         # API route definitions
│   ├── middleware/     # Express middleware
│   ├── types/          # TypeScript type definitions
│   └── utils/          # Utility functions
└── __tests__/          # Backend tests

/frontend               # React application
├── src/
│   ├── components/     # React components
│   ├── pages/         # Page components
│   ├── hooks/         # Custom React hooks
│   ├── services/      # API client services
│   ├── types/         # TypeScript interfaces
│   └── utils/         # Utility functions
└── __tests__/         # Frontend tests
```

### Building for Production

```bash
# Build both frontend and backend
npm run build

# Build individually
npm run build:backend
npm run build:frontend
```

### Environment Variables

#### Backend Configuration
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development|staging|production)
- `OPENAI_API_KEY` - OpenAI API key for AI analysis (optional)
- `LOG_LEVEL` - Logging level (debug|info|warn|error)

#### Frontend Configuration
- `VITE_API_URL` - Backend API URL
- `VITE_SOCKET_URL` - WebSocket server URL

## 🤝 Contributing

1. Follow the existing code patterns and conventions
2. Write tests for new functionality
3. Use TypeScript strictly (no `any` types)
4. Follow the established error handling patterns
5. Update documentation for API changes

## 📋 TODO / Roadmap

- [ ] Add support for Postman collections
- [ ] Implement rate limiting for API endpoints
- [ ] Add user authentication and job history
- [ ] Support for custom SDK templates
- [ ] Integration with Git repositories for direct commits
- [ ] Enhanced AI analysis with custom models
- [ ] Support for GraphQL API documentation

## 🐛 Troubleshooting

### Common Issues

1. **PDF Processing Fails**
   - Ensure PDF is not password protected
   - Check file size is under 10MB
   - Verify PDF contains extractable text

2. **WebSocket Connection Issues**
   - Check CORS configuration
   - Verify WebSocket URL is correct
   - Ensure no firewall blocking WebSocket connections

3. **AI Analysis Not Working**
   - Verify OpenAI API key is set
   - Check API key has sufficient credits
   - System falls back to rule-based analysis if AI unavailable

### Support

For technical support or questions:
- Check the troubleshooting section above
- Review the generated logs in development mode
- Open an issue with detailed error information

## 📄 License

UNLICENSED - Conexa Development Team

---

Built with ❤️ by the Conexa Development Team for seamless ecommerce integrations.