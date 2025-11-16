import { CommunityEvent } from './firebaseEvents';

export interface SuggestEventsResponse {
  events: any[];
  error?: string;
  message?: string;
}

/**
 * Get AI-suggested events based on user's RSVPed events
 * @param userId - The user's ID
 * @returns Promise with array of suggested event results
 */
export async function suggestEvents(
  userId: string
): Promise<SuggestEventsResponse> {
  try {
    const response = await fetch('/api/gemini/suggest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
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
      message: data.message,
    };
  } catch (error) {
    console.error('Error suggesting events:', error);
    return {
      events: [],
      error: error instanceof Error ? error.message : 'Failed to get event suggestions',
    };
  }
}

