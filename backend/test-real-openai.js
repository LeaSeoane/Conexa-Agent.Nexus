const OpenAI = require('openai');
require('dotenv').config();

async function testRealOpenAI() {
  console.log('🔑 Testing REAL OpenAI API connection...');
  console.log('API Key loaded:', !!process.env.OPENAI_API_KEY);
  console.log('API Key length:', process.env.OPENAI_API_KEY?.length);
  console.log('API Key first 10:', process.env.OPENAI_API_KEY?.substring(0, 10));
  console.log('API Key last 4:', process.env.OPENAI_API_KEY?.slice(-4));

  if (!process.env.OPENAI_API_KEY) {
    console.log('❌ No API key found');
    return;
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  try {
    console.log('\n🤖 Making REAL OpenAI API call...');
    const startTime = Date.now();
    
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant. Respond with JSON only."
        },
        {
          role: "user",
          content: "Analyze this API and respond with JSON: {'test': 'successful', 'api_type': 'unknown', 'confidence': 95}"
        }
      ],
      max_tokens: 100,
      temperature: 0.1,
      response_format: { type: 'json_object' }
    });

    const endTime = Date.now();
    
    console.log('\n✅ SUCCESS: REAL OpenAI API call worked!');
    console.log('⏱️  Response time:', endTime - startTime, 'ms');
    console.log('🏷️  Model used:', completion.model);
    console.log('💰 Token usage:', completion.usage);
    console.log('📝 Response:', completion.choices[0].message.content);
    
    console.log('\n🎉 REAL OPENAI INTEGRATION IS WORKING!');
    console.log('Your OpenAI dashboard should now show:');
    console.log('- 1 API request');
    console.log('- Token consumption:', completion.usage?.total_tokens);
    console.log('- Small dollar amount charged');
    
  } catch (error) {
    console.log('\n❌ ERROR: OpenAI API call failed');
    console.log('Error code:', error.code);
    console.log('Error message:', error.message);
    console.log('Status:', error.status);
    
    if (error.code === 'invalid_api_key') {
      console.log('🔑 The API key is invalid or malformed');
    } else if (error.code === 'insufficient_quota') {
      console.log('💳 Insufficient quota - check billing');
    }
  }
}

testRealOpenAI();