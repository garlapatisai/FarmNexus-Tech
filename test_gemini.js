const fs = require('fs');
const dotenv = require('dotenv');
dotenv.config({ path: 'frontend/.env' });

const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.0-flash';
const BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

async function test() {
  const contents = [{ role: 'user', parts: [{ text: 'price of banana' }] }];
  const body = { 
    contents,
    systemInstruction: { parts: [{ text: 'You are an AI' }] }
  };
  
  const res = await fetch(`${BASE_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.log("ERROR:", res.status, text);
  } else {
    console.log("SUCCESS:", await res.json());
  }
}
test();
