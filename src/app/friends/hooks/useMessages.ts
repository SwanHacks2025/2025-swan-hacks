import { useEffect, useState } from 'react';
import { db } from '@/lib/firebaseClient';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { Message } from '../types';

export function useMessages(userId: string | null, chatId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (!userId || !chatId) {
      setMessages([]);
      return;
    }

    const messagesRef = collection(db, 'conversations', chatId, 'messages');
    const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesList: Message[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        messagesList.push({
          id: docSnap.id,
          text: data.text || '',
          senderId: data.senderId || '',
          receiverId: data.receiverId || '',
          timestamp: data.timestamp || null,
        });
      });
      setMessages(messagesList);
    });

    return () => unsubscribe();
  }, [userId, chatId]);

  return messages;
}

