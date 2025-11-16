import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export interface GeminiEventResult {
  name: string;
  description: string;
  category?: string;
  location: string;
  date?: string;
  time?: string;
  sourceUrl?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { query, location } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_GEMINI_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenAI({ apiKey });

    // Construct the search prompt
    const searchLocation = location ? ` in ${location}` : '';
    const prompt = `Search the web for upcoming volunteer events, community events, and local activities${searchLocation} related to: "${query}"

Please provide a JSON array of events with the following structure for each event:
{
  "name": "Event name",
  "description": "Brief description of the event",
  "category": "One of: Volunteering, Sports, Tutoring, or other relevant category",
  "location": "Full address or location name",
  "date": "Date in YYYY-MM-DD format if available",
  "time": "Time in HH:MM format if available",
  "sourceUrl": "URL where this event was found (if available)"
}

Return only valid JSON array, no additional text. If you find events, return an array. If no events are found, return an empty array [].`;

    try {
      const response = await genAI.models.generateContent({
        model: 'gemini-2.0-flash-exp', // Updated to use a more recent model
        contents: prompt,
      });
      
      const text = response.text || '';
      
      if (!text) {
        console.error('Empty response from Gemini API');
        return NextResponse.json(
          { error: 'Empty response from AI', events: [] },
          { status: 500 }
        );
      }

      // Try to extract JSON from the response
      let events: GeminiEventResult[] = [];
      try {
        // Remove markdown code blocks if present
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          events = JSON.parse(jsonMatch[0]);
        } else {
          // Try parsing the entire text
          events = JSON.parse(text);
        }
      } catch (parseError) {
        console.error('Failed to parse Gemini response:', parseError);
        console.error('Response text:', text);
        // Return empty array if parsing fails
        events = [];
      }

      // Validate and clean the events
      const validEvents = events
        .filter((event) => event.name && event.location)
        .map((event) => ({
          name: event.name.trim(),
          description: event.description?.trim() || '',
          category: event.category?.trim() || 'Volunteering',
          location: event.location.trim(),
          date: event.date?.trim(),
          time: event.time?.trim(),
          sourceUrl: event.sourceUrl?.trim(),
        }));

      return NextResponse.json({ events: validEvents });
    } catch (apiError) {
      console.error('Gemini API call error:', apiError);
      const errorMessage = apiError instanceof Error ? apiError.message : 'Unknown API error';
      const errorStack = apiError instanceof Error ? apiError.stack : undefined;
      console.error('Error stack:', errorStack);
      
      return NextResponse.json(
        { 
          error: 'Failed to call Gemini API', 
          details: errorMessage,
          events: [] 
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Request processing error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process request', 
        details: error instanceof Error ? error.message : 'Unknown error',
        events: [] 
      },
      { status: 500 }
    );
  }
}

