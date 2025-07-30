const { ProcessingQueue } = require('./dist/src/services/processing-queue.service.js');

async function debugJobResult() {
  const jobId = '10f954c9-12dc-445f-b03a-77516bcbe590';
  
  // This is a workaround since we can't easily access the singleton
  console.log('🔍 Debug job result for:', jobId);
  console.log('To check the job result, we need to look at the backend logs or create a debug endpoint');
  console.log('The issue is likely that the analysis.isViable is false');
}

debugJobResult();