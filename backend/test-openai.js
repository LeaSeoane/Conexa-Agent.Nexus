const OpenAI = require('openai');
require('dotenv').config();

async function testOpenAI() {
  console.log('Testing OpenAI API connection...');
  console.log('API Key present:', !!process.env.OPENAI_API_KEY);
  console.log('API Key first 8 chars:', process.env.OPENAI_API_KEY?.substring(0, 8) || 'NOT SET');

  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_actual_openai_api_key_here') {
    console.log('❌ ERROR: OpenAI API key not properly configured!');
    console.log('Please set OPENAI_API_KEY in backend/.env file');
    return;
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  try {
    console.log('Making test API call to OpenAI...');
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant."
        },
        {
          role: "user",
          content: "Say 'OpenAI integration working!' and nothing else."
        }
      ],
      max_tokens: 50,
      temperature: 0.1
    });

    console.log('✅ SUCCESS: OpenAI API is working!');
    console.log('Response:', completion.choices[0].message.content);
    console.log('Token usage:', completion.usage);
    console.log('Model used:', completion.model);
  } catch (error) {
    console.log('❌ ERROR: OpenAI API call failed:', error.message);
    if (error.code === 'invalid_api_key') {
      console.log('The API key is invalid. Please check your OpenAI API key.');
    } else if (error.code === 'insufficient_quota') {
      console.log('Insufficient quota. Please check your OpenAI billing.');
    }
  }
}

testOpenAI();