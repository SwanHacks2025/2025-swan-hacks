import {
    getFirestore,
    collection,
    getDocs,
    FirestoreDataConverter,
    QueryDocumentSnapshot
} from "firebase/firestore";

export enum EventTypes {
    NO_CATEGORY,
    VOLUNTEER = 'Volunteering',
    SPORTS = 'Sports',
    TUTORING = 'Tutoring'
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
    
    constructor(id: string, name: string, description: string, category: EventTypes, lat: number, long: number, location: string, date: Date) {
        this.id = id
        this.name = name
        this.description = description
        this.category = category
        this.lat = lat
        this.long = long
        this.location = location
        this.date = date
    }
}

export const communityEventConverter: FirestoreDataConverter<CommunityEvent> = {
    toFirestore(event: CommunityEvent) {
        return {
            name: event.name,
            description: event.description,
            category: event.category,
            lat: event.lat,
            long: event.long,
            location: event.location,
            date: event.date
        };
    },
    fromFirestore(snapshot: QueryDocumentSnapshot): CommunityEvent {
        const data = snapshot.data();
        return new CommunityEvent(
            snapshot.id,
            data.name,
            data.description,
            EventTypes[data.category.toUpperCase() as keyof typeof EventTypes],
            data.lat,
            data.long,
            data.location,
            data.date ? data.date.toDate() : new Date(data.date)
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

    return snapshot.docs.map(doc => doc.data());
}