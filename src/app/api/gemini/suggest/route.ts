import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { db } from '@/lib/firebaseClient';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_GEMINI_KEY;
    if (!apiKey) {
      console.error('Gemini API key not configured');
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      );
    }

    // Get user's RSVPed events using client SDK
    let userSnap;
    try {
      const userRef = doc(db, 'Users', userId);
      userSnap = await getDoc(userRef);
    } catch (dbError) {
      console.error('Error accessing Firestore:', dbError);
      return NextResponse.json(
        { 
          error: 'Database error', 
          details: dbError instanceof Error ? dbError.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
    
    if (!userSnap.exists()) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userSnap.data();
    const rsvpEventIds: string[] = userData?.rsvpEvents || [];
    const userInterests: string[] = userData?.interests || [];

    // Fetch all RSVPed events
    const rsvpEvents: any[] = [];
    for (const eventId of rsvpEventIds) {
      try {
        const eventRef = doc(db, 'Events', eventId);
        const eventSnap = await getDoc(eventRef);
        if (eventSnap.exists()) {
          rsvpEvents.push({
            id: eventSnap.id,
            ...eventSnap.data(),
          });
        }
      } catch (error) {
        console.error(`Error fetching event ${eventId}:`, error);
      }
    }

    // Fetch all available events
    let eventsSnapshot;
    try {
      const eventsRef = collection(db, 'Events');
      eventsSnapshot = await getDocs(eventsRef);
    } catch (dbError) {
      console.error('Error fetching events:', dbError);
      return NextResponse.json(
        { 
          error: 'Failed to fetch events', 
          details: dbError instanceof Error ? dbError.message : 'Unknown error',
          events: []
        },
        { status: 500 }
      );
    }
    
    const allEvents = eventsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as any[]; // Type as any[] since Firestore data structure is dynamic

    // Extract events the user is hosting from all events
    const hostedEvents = allEvents.filter((event) => event.owner === userId);
    const hostedEventIds = hostedEvents.map((e) => e.id);

    // Combine RSVPed and hosted events for preference analysis
    const userEvents = [...rsvpEvents, ...hostedEvents];

    // Check if user has any preferences (events or interests)
    if (userEvents.length === 0 && userInterests.length === 0) {
      return NextResponse.json({ 
        events: [],
        message: 'No RSVPed events, hosted events, or interests found. RSVP to events, host events, or add interests to your profile to get suggestions!' 
      });
    }

    // Extract tags and descriptions from both RSVPed and hosted events
    const allTags = new Set<string>();
    const descriptions: string[] = [];
    
    userEvents.forEach((event) => {
      if (event.tags && Array.isArray(event.tags)) {
        event.tags.forEach((tag: string) => allTags.add(tag));
      }
      if (event.description) {
        descriptions.push(event.description);
      }
    });

    // Add user interests to the tags set (they're similar to tags)
    userInterests.forEach((interest: string) => {
      if (interest && interest.trim()) {
        allTags.add(interest.trim());
      }
    });

    // Filter out events user has already RSVPed to OR is hosting
    const availableEvents = allEvents.filter(
      (event) => 
        !rsvpEventIds.includes(event.id) && 
        !hostedEventIds.includes(event.id) &&
        event.owner !== userId // Double-check: also filter by owner field
    );

    if (availableEvents.length === 0) {
      return NextResponse.json({ 
        events: [],
        message: 'No new events available for suggestions.' 
      });
    }

    // Prepare context for Gemini
    const tagsList = Array.from(allTags).join(', ');
    const descriptionsText = descriptions.slice(0, 5).join('\n'); // Limit to first 5 descriptions

    const genAI = new GoogleGenAI({ apiKey });

    const prompt = `Based on the following user preferences from events they've RSVPed to, events they're hosting, and their personal interests, suggest similar events from the available events list.

User's interests and event tags: ${tagsList || 'None'}
Sample event descriptions (from RSVPed and hosted events):
${descriptionsText || 'None'}

Available events to choose from:
${JSON.stringify(availableEvents.map(e => {
  let dateStr = null;
  if (e.date) {
    // Handle Firebase Timestamp
    if (e.date.toDate && typeof e.date.toDate === 'function') {
      dateStr = e.date.toDate().toISOString();
    } else if (e.date._seconds) {
      // Firebase Timestamp with _seconds
      dateStr = new Date(e.date._seconds * 1000).toISOString();
    } else if (e.date instanceof Date) {
      dateStr = e.date.toISOString();
    } else if (typeof e.date === 'string') {
      dateStr = e.date;
    }
  }
  return {
    id: e.id,
    name: e.name,
    description: e.description || '',
    category: e.category || '',
    tags: e.tags || [],
    location: e.location || '',
    date: dateStr
  };
}), null, 2)}

Please analyze the user's preferences and suggest events that match their interests. Consider:
1. Matching tags and user interests (from their profile)
2. Similar descriptions/categories
3. Event relevance to user's stated interests
4. Alignment with events they've RSVPed to or hosted

For each suggestion, provide a confidence score from 0.0 to 1.0, where:
- 0.9-1.0: Very high confidence (excellent match)
- 0.7-0.89: High confidence (good match)
- 0.5-0.69: Medium confidence (moderate match)
- Below 0.5: Low confidence (weak match)

Return a JSON array of objects, each with an event ID and confidence score. Only include suggestions with confidence >= 0.7 (high confidence). Format:
[
  {"eventId": "eventId1", "confidence": 0.95},
  {"eventId": "eventId2", "confidence": 0.88},
  ...
]

Sort by confidence (highest first). Return only the top 4 highest confidence suggestions. Return only the JSON array, no additional text.`;

    try {
      let response;
      try {
        response = await genAI.models.generateContent({
          model: 'gemini-2.0-flash-exp',
          contents: prompt,
        });
      } catch (genaiError) {
        console.error('Gemini API call failed:', genaiError);
        // Fall through to fallback
        throw genaiError;
      }

      // Extract text from Gemini response (handle different response formats)
      let text = '';
      if (typeof response.text === 'string') {
        text = response.text;
      } else if (response.candidates && response.candidates.length > 0) {
        const candidate = response.candidates[0];
        if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
          text = candidate.content.parts[0].text || '';
        }
      }
      
      if (!text) {
        console.error('Empty response from Gemini API');
        throw new Error('Empty response from Gemini API');
      }
      
      // Extract JSON array from response
      interface SuggestionWithConfidence {
        eventId: string;
        confidence: number;
      }
      
      let suggestions: SuggestionWithConfidence[] = [];
      try {
        // Try to find JSON array in the response
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        let parsed: any;
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          // Try parsing the entire text as JSON
          parsed = JSON.parse(text);
        }
        
        // Validate it's an array
        if (!Array.isArray(parsed)) {
          throw new Error('Response is not an array');
        }
        
        // Parse suggestions with confidence scores
        suggestions = parsed
          .map((item: any) => {
            // Handle both formats: {eventId, confidence} or just string IDs
            if (typeof item === 'string') {
              return { eventId: item, confidence: 0.8 }; // Default confidence for old format
            } else if (item && typeof item === 'object') {
              return {
                eventId: item.eventId || item.id || item.event_id,
                confidence: typeof item.confidence === 'number' ? item.confidence : 0.8
              };
            }
            return null;
          })
          .filter((item: SuggestionWithConfidence | null): item is SuggestionWithConfidence => 
            item !== null && 
            typeof item.eventId === 'string' && 
            typeof item.confidence === 'number'
          )
          // Filter to only high confidence (>= 0.7)
          .filter((item: SuggestionWithConfidence) => item.confidence >= 0.7)
          // Sort by confidence (highest first)
          .sort((a, b) => b.confidence - a.confidence)
          // Limit to top 4
          .slice(0, 4);
          
      } catch (parseError) {
        console.error('Failed to parse Gemini response:', parseError);
        console.error('Response text:', text);
        // Fallback: return events with matching tags (assign default confidence)
        const fallbackSuggestions = availableEvents
          .filter((event) => {
            if (tagsList && event.tags && Array.isArray(event.tags)) {
              return event.tags.some((tag: string) => allTags.has(tag));
            }
            return false;
          })
          .slice(0, 4)
          .map((e) => ({ eventId: e.id, confidence: 0.75 })); // Default confidence for fallback
        
        suggestions = fallbackSuggestions;
      }

      // Validate event IDs exist and extract them
      const validEventIds = suggestions
        .filter((suggestion) => 
          typeof suggestion.eventId === 'string' && 
          availableEvents.some((e) => e.id === suggestion.eventId)
        )
        .map((s) => s.eventId);

      // Fetch full event data for suggested IDs and convert timestamps
      // Maintain order and confidence scores from suggestions
      const suggestedEvents = validEventIds
        .map((id: string) => {
          const event = availableEvents.find((e) => e.id === id);
          if (!event) return null;
          
          // Find the confidence score for this event
          const suggestion = suggestions.find((s) => s.eventId === id);
          const confidence = suggestion?.confidence || 0.75;
          
          // Convert Firestore timestamps to ISO strings
          let dateStr = null;
          if (event.date) {
            if (event.date.toDate && typeof event.date.toDate === 'function') {
              dateStr = event.date.toDate().toISOString();
            } else if (event.date._seconds) {
              dateStr = new Date(event.date._seconds * 1000).toISOString();
            } else if (event.date instanceof Date) {
              dateStr = event.date.toISOString();
            }
          }
          
          let endTimeStr = null;
          if (event.endTime) {
            if (event.endTime.toDate && typeof event.endTime.toDate === 'function') {
              endTimeStr = event.endTime.toDate().toISOString();
            } else if (event.endTime._seconds) {
              endTimeStr = new Date(event.endTime._seconds * 1000).toISOString();
            } else if (event.endTime instanceof Date) {
              endTimeStr = event.endTime.toISOString();
            }
          }
          
          return {
            ...event,
            date: dateStr,
            endTime: endTimeStr,
            confidence, // Include confidence score in response
          };
        })
        .filter((e) => e !== null);

      return NextResponse.json({ events: suggestedEvents });
    } catch (apiError) {
      console.error('Gemini API call error:', apiError);
      
      // Fallback: return events with matching tags (limit to top 4)
      const fallbackEvents = availableEvents
        .filter((event) => {
          if (tagsList && event.tags && Array.isArray(event.tags)) {
            return event.tags.some((tag: string) => allTags.has(tag));
          }
          return false;
        })
        .slice(0, 4)
        .map((e) => {
          // Convert Firestore timestamps to ISO strings
          let dateStr = null;
          if (e.date) {
            if (e.date.toDate && typeof e.date.toDate === 'function') {
              dateStr = e.date.toDate().toISOString();
            } else if (e.date._seconds) {
              dateStr = new Date(e.date._seconds * 1000).toISOString();
            } else if (e.date instanceof Date) {
              dateStr = e.date.toISOString();
            }
          }
          
          let endTimeStr = null;
          if (e.endTime) {
            if (e.endTime.toDate && typeof e.endTime.toDate === 'function') {
              endTimeStr = e.endTime.toDate().toISOString();
            } else if (e.endTime._seconds) {
              endTimeStr = new Date(e.endTime._seconds * 1000).toISOString();
            } else if (e.endTime instanceof Date) {
              endTimeStr = e.endTime.toISOString();
            }
          }
          
          return {
            id: e.id,
            name: e.name,
            description: e.description,
            category: e.category,
            tags: e.tags || [],
            location: e.location,
            date: dateStr,
            endTime: endTimeStr,
            owner: e.owner,
            attendees: e.attendees || [],
            lat: e.lat,
            long: e.long,
            imageUri: e.imageUri,
            modelUri: e.modelUri,
            confidence: 0.75, // Default confidence for fallback
          };
        });

      return NextResponse.json({ 
        events: fallbackEvents,
        message: 'Used tag-based matching as fallback'
      });
    }
  } catch (error) {
    console.error('Request processing error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // Return a more detailed error for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = {
      message: errorMessage,
      type: error instanceof Error ? error.constructor.name : typeof error,
    };
    
    // If it's a Firebase error, provide more context
    if (errorMessage.includes('Firebase') || errorMessage.includes('firestore')) {
      errorDetails.message = 'Firebase database error. Please check your Firebase configuration.';
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to process request', 
        details: errorDetails,
        events: [] 
      },
      { status: 500 }
    );
  }
}

