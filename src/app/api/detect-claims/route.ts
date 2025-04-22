import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client (reuse from environment)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// System prompt for the assistant
const systemPrompt = `Jesteś precyzyjnym asystentem AI, którego zadaniem jest identyfikacja twierdzeń faktograficznych w podanym tekście. Twoim celem jest wyodrębnienie **każdego** zdania, które przedstawia informację jako fakt, niezależnie od tego, czy jest ona prawdziwa, fałszywa, powszechnie znana czy kontrowersyjna. Ignoruj pytania, polecenia, opinie, wyrażenia subiektywne i niepełne zdania.

Przykłady twierdzeń do wyodrębnienia:
- "Ziemia jest płaska." (Nawet jeśli fałszywe)
- "Woda wrze w 100 stopniach Celsjusza na poziomie morza."
- "Słońce nie istnieje." (Nawet jeśli absurdalne)
- "Ten samochód jest czerwony."

Przykłady zdań do zignorowania:
- "Myślę, że jutro będzie padać." (Opinia)
- "Czy to prawda?" (Pytanie)
- "Zamknij drzwi." (Polecenie)
- "To jest piękne." (Subiektywne)

Zwróć wynik **wyłącznie** jako obiekt JSON zawierający jeden klucz: "claims". Wartością tego klucza powinna być tablica (array) zawierająca ciągi znaków (stringi) - dokładnie te zdania z oryginalnego tekstu, które zidentyfikowałeś jako twierdzenia faktograficzne. Jeśli w tekście nie ma żadnych takich twierdzeń, zwróć obiekt JSON z pustą tablicą: {"claims": []}. Nie dodawaj żadnych innych informacji ani formatowania poza wymaganym obiektem JSON.`;

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const textSegment = body.text;

    if (!textSegment || typeof textSegment !== 'string') {
      return NextResponse.json({ error: 'Invalid input: "text" field is required and must be a string.' }, { status: 400 });
    }

    console.log(`Detecting claims in text: "${textSegment}"`);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // lub "gpt-4-turbo"
      // Response format should be JSON
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        {
            role: "user",
            // Include the actual text segment in the user message
            content: `Tekst:\n"${textSegment}"\n\nObiekt JSON:`
        },
      ],
      temperature: 0.2, // Lower temperature for more deterministic output
    });

    const rawResponse = completion.choices[0]?.message?.content;
    console.log('Raw GPT response for claims:', rawResponse);

    if (!rawResponse) {
      throw new Error('Empty response from OpenAI API');
    }

    // Parse the JSON response from GPT
    // GPT should return something like: { "claims": ["claim 1", "claim 2"] }
    let parsedResult: { claims?: string[] } = {};
    try {
        parsedResult = JSON.parse(rawResponse);
        if (!Array.isArray(parsedResult.claims)) {
            console.warn("GPT response did not contain a valid 'claims' array. Raw:", rawResponse);
            // Default to empty if parsing fails or structure is wrong
             parsedResult = { claims: [] };
        }
    } catch (parseError) {
        console.error("Failed to parse GPT JSON response:", parseError, "Raw:", rawResponse);
         return NextResponse.json({ error: 'Failed to parse claims from AI response', details: (parseError as Error).message, rawResponse }, { status: 500 });
    }


    const claims = parsedResult.claims || [];
    console.log('Detected claims:', claims);

    return NextResponse.json({ claims });

  } catch (error) {
    console.error('Error calling OpenAI API for claim detection:', error);
    if (error instanceof OpenAI.APIError) {
      return NextResponse.json({ error: `OpenAI API Error: ${error.status} ${error.name}`, details: error.message }, { status: error.status || 500 });
    }
    return NextResponse.json({ error: 'Failed to detect claims', details: (error as Error).message }, { status: 500 });
  }
} 