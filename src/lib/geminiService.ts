import { GeminiEventResult } from '@/app/api/gemini/search/route';

export interface SearchEventsParams {
  query: string;
  location?: string;
}

export interface SearchEventsResponse {
  events: GeminiEventResult[];
  error?: string;
}

/**
 * Search for events using Gemini AI
 * @param params - Search parameters (query and optional location)
 * @returns Promise with array of event results
 */
export async function searchEvents(
  params: SearchEventsParams
): Promise<SearchEventsResponse> {
  try {
    const response = await fetch('/api/gemini/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: params.query,
        location: params.location || undefined,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        events: [],
        error: errorData.error || `HTTP error! status: ${response.status}`,
      };
    }

    const data = await response.json();
    return {
      events: data.events || [],
      error: data.error,
    };
  } catch (error) {
    console.error('Error searching events:', error);
    return {
      events: [],
      error: error instanceof Error ? error.message : 'Failed to search for events',
    };
  }
}

