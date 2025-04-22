import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// System prompt for fact-checking
const systemPrompt = `Jesteś precyzyjnym i obiektywnym analitykiem faktów. Twoim zadaniem jest ocena prawdziwości poniższego twierdzenia. Odpowiedz **wyłącznie** w formacie JSON, zawierającym następujące klucze:
- "status": Ciąg znaków (string) o jednej z trzech wartości: "true" (jeśli twierdzenie jest w przeważającej mierze prawdziwe), "false" (jeśli jest w przeważającej mierze fałszywe) lub "uncertain" (jeśli prawdziwość jest trudna do jednoznacznego ustalenia, kontrowersyjna, wymaga więcej kontekstu lub jest subiektywna).
- "explanation": Krótkie (maksymalnie 1-2 zdania), neutralne uzasadnienie oceny, wyjaśniające dlaczego twierdzenie jest prawdziwe, fałszywe lub niepewne. Skup się na meritum.
- "source": (Opcjonalnie) Jeśli to możliwe i zasadne, podaj JEDEN link URL do wiarygodnego, publicznie dostępnego źródła potwierdzającego ocenę (np. Wikipedia, renomowany portal informacyjny, encyklopedia). Jeśli nie możesz podać dobrego źródła, pomiń ten klucz lub ustaw go na null.

Dokonaj oceny opierając się na ogólnodostępnej, aktualnej wiedzy. Bądź obiektywny i bezstronny. Unikaj ogólników.`;

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const claim = body.claim;

    if (!claim || typeof claim !== 'string') {
      return NextResponse.json({ error: 'Invalid input: "claim" field is required and must be a string.' }, { status: 400 });
    }

    console.log(`Fact-checking claim: "${claim}"`);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // Or gpt-4-turbo
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        {
            role: "user",
            content: `Twierdzenie do oceny:\n"${claim}"\n\nOdpowiedź JSON:`
        },
      ],
      temperature: 0.1, // Very low temperature for factual consistency
      max_tokens: 150, // Limit response length
    });

    const rawResponse = completion.choices[0]?.message?.content;
    console.log('Raw GPT response for fact-check:', rawResponse);

    if (!rawResponse) {
      throw new Error('Empty response from OpenAI API');
    }

    // Parse the JSON response from GPT
    let parsedResult: { status?: string; explanation?: string; source?: string | null } = {};
    try {
        parsedResult = JSON.parse(rawResponse);
        // Basic validation
        if (!['true', 'false', 'uncertain'].includes(parsedResult.status || '')) {
             console.warn("GPT response had invalid 'status'. Raw:", rawResponse);
             // Decide how to handle - maybe force 'uncertain'?
             parsedResult.status = 'uncertain';
             parsedResult.explanation = parsedResult.explanation || "AI response format error (status).";
        }
         if (typeof parsedResult.explanation !== 'string') {
             console.warn("GPT response had invalid 'explanation'. Raw:", rawResponse);
              parsedResult.explanation = "AI response format error (explanation).";
         }
         // Ensure source is string or null
         if (parsedResult.source !== undefined && typeof parsedResult.source !== 'string' && parsedResult.source !== null) {
             parsedResult.source = null;
         }

    } catch (parseError) {
        console.error("Failed to parse GPT JSON response for fact-check:", parseError, "Raw:", rawResponse);
        // Return uncertain status on parse error
         return NextResponse.json({
             status: 'uncertain',
             explanation: `Failed to parse AI response: ${(parseError as Error).message}`,
             source: null
         }, { status: 500 }); // Indicate server-side issue
    }

    const result = {
        status: parsedResult.status as 'true' | 'false' | 'uncertain', // Type assertion after validation/defaulting
        explanation: parsedResult.explanation || 'No explanation provided.',
        source: parsedResult.source // Keep as string or null
    };

    console.log('Fact-check result:', result);
    return NextResponse.json(result);

  } catch (error) {
    console.error('Error calling OpenAI API for fact-checking:', error);
    const status = error instanceof OpenAI.APIError ? error.status : 500;
    const message = error instanceof OpenAI.APIError ? `OpenAI API Error: ${error.status} ${error.name}` : 'Failed to fact-check claim';
    const details = (error as Error).message;

     // Return uncertain status on API error
     return NextResponse.json({
         status: 'uncertain',
         explanation: `${message}. Details: ${details}`,
         source: null
     }, { status: status || 500 });
  }
} 