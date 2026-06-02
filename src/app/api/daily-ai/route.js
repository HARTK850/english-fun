import { NextResponse } from 'next/server';

export async function POST(req) {
  const userData = await req.json();
  
  // קריאה ל-Gemini-3.1-flash-lite
  // הערה: יש להגדיר את ה-API Key ב-Environment Variables
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + process.env.GEMINI_API_KEY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `Analyze user learning data: ${JSON.stringify(userData)}. Return JSON with recommendedWords, difficulty, and suggestedGames.` }] }]
    })
  });

  const result = await response.json();
  return NextResponse.json(result);
}