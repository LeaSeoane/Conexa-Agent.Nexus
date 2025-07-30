const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');

async function testMachUpload() {
  console.log('🔄 Testing MACH PDF upload with REAL OpenAI...');
  
  const form = new FormData();
  const pdfPath = '../documentation/Documentación MACH con  BCi on Us (1) (1).pdf';
  
  if (!fs.existsSync(pdfPath)) {
    console.log('❌ PDF file not found:', pdfPath);
    return;
  }
  
  form.append('file', fs.createReadStream(pdfPath));
  form.append('providerName', 'MACH_REAL_OPENAI_TEST');

  try {
    console.log('📤 Uploading PDF to backend...');
    const uploadResponse = await axios.post('http://localhost:3002/api/upload/pdf', form, {
      headers: {
        ...form.getHeaders(),
      },
    });

    console.log('✅ Upload successful:', uploadResponse.data);
    const jobId = uploadResponse.data.jobId;
    
    console.log('⏳ Waiting for real OpenAI analysis...');
    
    // Poll for results
    for (let i = 0; i < 20; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const statusResponse = await axios.get(`http://localhost:3002/api/analysis/${jobId}`);
      console.log(`Status check ${i + 1}:`, statusResponse.data);
      
      if (statusResponse.data.status === 'completed') {
        console.log('🎉 REAL OpenAI analysis completed!');
        break;
      } else if (statusResponse.data.status === 'failed') {
        console.log('❌ Analysis failed:', statusResponse.data);
        break;
      }
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
    console.log('Response:', error.response?.data);
  }
}

testMachUpload();