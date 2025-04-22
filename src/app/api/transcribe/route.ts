import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Readable } from 'stream';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('audio') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    console.log(`Received audio file: ${file.name}, size: ${file.size}, type: ${file.type}`);

    // Convert Blob to Buffer for OpenAI API
    const buffer = Buffer.from(await file.arrayBuffer());

    console.log('Sending audio to Whisper API...');

    // The API expects `file` to be `Uploadable`, which can be `fs.ReadStream | Blob | File | Buffer | Readable`.
    // We can pass the File object directly, or reconstruct it from the buffer if needed.
    // Reconstructing a File object seems the most robust way here.

    const transcription = await openai.audio.transcriptions.create({
      file: new File([buffer], file.name || 'audio.webm', { type: file.type }), // Pass as File object
      model: 'whisper-1',
      // language: 'pl', // Optional
      response_format: 'json',
    });

    console.log('Whisper API response received:', transcription);

    return NextResponse.json({ transcript: transcription.text });

  } catch (error) {
    console.error('Error calling Whisper API:', error);
    if (error instanceof OpenAI.APIError) {
      return NextResponse.json({ error: `OpenAI API Error: ${error.status} ${error.name}`, details: error.message }, { status: error.status || 500 });
    }
    return NextResponse.json({ error: 'Failed to transcribe audio', details: (error as Error).message }, { status: 500 });
  }
} 