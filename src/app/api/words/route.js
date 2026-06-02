import { NextResponse } from 'next/server';
import User from '@/models/User';

export async function PATCH(req) {
  const { userId, wordId, result } = await req.json();
  // Logic to update word status (correct/wrong) in MongoDB
  return NextResponse.json({ success: true, message: 'Word status updated' });
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  // Fetch user words for flashcards session
  return NextResponse.json({ words: [] });
}