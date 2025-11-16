import { ca } from "date-fns/locale";
import {
    getFirestore,
    collection,
    getDocs,
    FirestoreDataConverter,
    QueryDocumentSnapshot,
    doc,
    getDoc
} from "firebase/firestore";
import { ValueOf } from "resium";

export enum EventTypes {
    NO_CATEGORY,
    VOLUNTEER = 'Volunteering',
    SPORTS = 'Sports',
    TUTORING = 'Tutoring'
}

export function getEventTypeFilename(category: EventTypes): string {
  switch (category) {
    case EventTypes.VOLUNTEER:
      return "/models/VolunteeringMarker.glb";
    case EventTypes.SPORTS:
      return "/models/SportsMarker.glb";
    case EventTypes.TUTORING:
      return "/models/TutoringMarker.glb";
    default:
        return "";
  }
}

function getEventTypeName(category: EventTypes) {
    switch (category) {
        case EventTypes.VOLUNTEER:
          return "VOLUNTEER";
        case EventTypes.SPORTS:
          return "SPORTS";
        case EventTypes.TUTORING:
          return "TUTORING";
        default:
            return "NO_CATEGORY";
    }
} 

export class CommunityEvent {
    id: string
    name: string
    description: string
    category: EventTypes

    lat: number
    long: number
    location: string
    date: Date
    endTime?: Date

    owner: string
    attendees: string[]
    tags: string[]

    imageUri: string
    modelUri: string

    constructor(id: string, name: string, description: string, category: EventTypes, lat: number, long: number, location: string, date: Date, owner: string, attendees: string[], imageUri: string, modelUri: string, tags: string[] = [], endTime?: Date) {
        this.id = id
        this.name = name
        this.description = description
        this.category = category
        this.lat = lat
        this.long = long
        this.location = location
        this.date = date
        this.endTime = endTime
        this.owner = owner
        this.attendees = attendees
        this.tags = tags
        this.imageUri = imageUri
        this.modelUri = modelUri
    }
}

export const communityEventConverter: FirestoreDataConverter<CommunityEvent> = {
    toFirestore(event: CommunityEvent) {
        return {
            name: event.name,
            description: event.description,
            category: getEventTypeName(event.category),
            lat: event.lat,
            long: event.long,
            location: event.location,
            date: event.date,
            endTime: event.endTime || null,
            owner: event.owner,
            attendees: event.attendees,
            tags: event.tags || [],
            imageUri: event.imageUri,
            modelUri: event.modelUri
        };
    },
    fromFirestore(snapshot: QueryDocumentSnapshot): CommunityEvent {
        const data = snapshot.data();
        return new CommunityEvent(
            snapshot.id,
            data.name,
            data.description,
            data.category ? EventTypes[data.category.toUpperCase() as keyof typeof EventTypes] : EventTypes.NO_CATEGORY,
            data.lat,
            data.long,
            data.location,
            data.date ? data.date.toDate() : new Date(data.date),
            data.owner,
            data.attendees || [],
            data.imageUri,
            data.modelUri,
            data.tags || [],
            data.endTime ? data.endTime.toDate() : undefined
        );
    }
};

export async function fetchCommunityEvents(): Promise<CommunityEvent[]> {
    const db = getFirestore();

    const eventsRef = collection(db, "Events")
        .withConverter(communityEventConverter);

    const snapshot = await getDocs(eventsRef);

    return snapshot.docs.map(doc => doc.data());
}

export async function fetchCommunityEventsByUserId(id: string): Promise<CommunityEvent[]> {
    const db = getFirestore();

    const eventsRef = collection(db, "Events")
        .withConverter(communityEventConverter);

    const snapshot = await getDocs(eventsRef);

    return snapshot.docs.map(doc => doc.data()).filter(data => data.owner == id || (data.attendees && data.attendees.includes(id)));
}

export async function getCommunityEvent(id: string): Promise<CommunityEvent | null> {
    const db = getFirestore();

    const eventsRef = doc(db, "Events", id)
        .withConverter(communityEventConverter);

    const snapshot = await getDoc(eventsRef);
    return snapshot.exists() ? snapshot.data() : null
}