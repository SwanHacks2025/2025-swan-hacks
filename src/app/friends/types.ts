import { Timestamp } from 'firebase/firestore';

export type FriendRequestStatus = 'none' | 'sent' | 'received' | 'friends';

export interface UserResult {
  uid: string;
  username: string;
  photoURL: string | null;
  status: FriendRequestStatus;
  isPrivate?: boolean;
  isOrganizer?: boolean;
  canMessage?: boolean;
}

export interface Message {
  id: string;
  text: string;
  senderId: string;
  receiverId: string;
  timestamp: Timestamp | null;
}

export interface Conversation {
  chatId: string;
  otherUser: {
    uid: string;
    username: string;
    photoURL: string | null;
  };
  lastMessage: string;
  lastMessageTime: Timestamp | null;
}

