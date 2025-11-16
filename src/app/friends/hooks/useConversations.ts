import { useEffect, useState } from 'react';
import { db } from '@/lib/firebaseClient';
import { collection, query, where, limit, doc, getDoc, getDocs, onSnapshot } from 'firebase/firestore';
import { Conversation } from '../types';
import { getChatId } from '../utils';

export function useConversations(userId: string | null, authLoading: boolean) {
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    if (!userId || authLoading) return;

    let unsubscribe: (() => void) | undefined;

    const setupConversations = async () => {
      try {
        const userRef = doc(db, 'Users', userId);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) return;

        const userData = userSnap.data();
        const isCurrentUserOrganizer = userData.organizer || false;
        const isCurrentUserPrivate = userData.isPrivate || false;

        const conversationsRef = collection(db, 'conversations');
        const conversationsQuery = query(
          conversationsRef,
          where('participants', 'array-contains', userId)
        );

        unsubscribe = onSnapshot(conversationsQuery, async (snapshot) => {
          const currentUserRef = doc(db, 'Users', userId);
          const currentUserSnap = await getDoc(currentUserRef);
          const currentUserData = currentUserSnap.exists() ? currentUserSnap.data() : {};
          const currentFriends = currentUserData.friends || [];

          const conversationsMap = new Map<string, Conversation>();

          // Process existing conversations - load other user's data fresh
          const conversationPromises = snapshot.docs.map(async (docSnap) => {
            const data = docSnap.data();
            const participants = data.participants || [];
            const otherUserId = participants.find((id: string) => id !== userId);
            if (otherUserId) {
              const otherUserRef = doc(db, 'Users', otherUserId);
              const otherUserSnap = await getDoc(otherUserRef);
              const otherUserData = otherUserSnap.exists() ? otherUserSnap.data() : {};
              
              return {
                chatId: docSnap.id,
                otherUser: {
                  uid: otherUserId,
                  username: otherUserData.Username || 'Unknown',
                  photoURL: otherUserData.customPhotoURL || otherUserData.photoURL || null,
                },
                lastMessage: data.lastMessage || '',
                lastMessageTime: data.lastMessageTime || null,
              };
            }
            return null;
          });
          
          const conversationResults = await Promise.all(conversationPromises);
          conversationResults.forEach((conv) => {
            if (conv) {
              conversationsMap.set(conv.chatId, conv);
            }
          });

          const conversationsList: Conversation[] = [];
          for (const friendId of currentFriends) {
            const chatId = getChatId(userId, friendId);
            if (conversationsMap.has(chatId)) {
              conversationsList.push(conversationsMap.get(chatId)!);
            } else {
              const friendRef = doc(db, 'Users', friendId);
              const friendSnap = await getDoc(friendRef);
              if (friendSnap.exists()) {
                const friendData = friendSnap.data();
                conversationsList.push({
                  chatId,
                  otherUser: {
                    uid: friendId,
                    username: friendData.Username || 'Unknown',
                    photoURL: friendData.customPhotoURL || friendData.photoURL || null,
                  },
                  lastMessage: '',
                  lastMessageTime: null,
                });
              }
            }
          }

          // Include conversations with non-friends based on privacy rules
          for (const [chatId, conversation] of conversationsMap.entries()) {
            const otherUserId = conversation.otherUser.uid;
            if (!currentFriends.includes(otherUserId)) {
              const otherUserRef = doc(db, 'Users', otherUserId);
              const otherUserSnap = await getDoc(otherUserRef);
              if (otherUserSnap.exists()) {
                const otherUserData = otherUserSnap.data();
                const isOtherUserOrganizer = otherUserData.organizer || false;
                const isOtherUserPrivate = otherUserData.isPrivate || false;
                
                if (isOtherUserOrganizer || isCurrentUserOrganizer) {
                  if (!conversationsList.find((c) => c.chatId === chatId)) {
                    conversationsList.push(conversation);
                  }
                } else if (isCurrentUserPrivate && !isOtherUserPrivate) {
                  if (!conversationsList.find((c) => c.chatId === chatId)) {
                    conversationsList.push(conversation);
                  }
                } else if (!isCurrentUserPrivate && isOtherUserPrivate) {
                  if (!conversationsList.find((c) => c.chatId === chatId)) {
                    conversationsList.push(conversation);
                  }
                } else if (isCurrentUserPrivate && isOtherUserPrivate) {
                  const messagesRef = collection(db, 'conversations', chatId, 'messages');
                  const messagesQuery = query(messagesRef, where('senderId', '==', otherUserId), limit(1));
                  const messagesSnap = await getDocs(messagesQuery);
                  
                  if (!messagesSnap.empty) {
                    if (!conversationsList.find((c) => c.chatId === chatId)) {
                      conversationsList.push(conversation);
                    }
                  }
                } else if (!isCurrentUserPrivate && !isOtherUserPrivate) {
                  if (!conversationsList.find((c) => c.chatId === chatId)) {
                    conversationsList.push(conversation);
                  }
                }
              }
            }
          }

          conversationsList.sort((a, b) => {
            if (!a.lastMessageTime) return 1;
            if (!b.lastMessageTime) return -1;
            return b.lastMessageTime.toMillis() - a.lastMessageTime.toMillis();
          });

          setConversations(conversationsList);
        });
      } catch (err) {
        console.error('Error loading conversations:', err);
      }
    };

    setupConversations();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [userId, authLoading]);

  return conversations;
}

