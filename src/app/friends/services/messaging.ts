import { db } from '@/lib/firebaseClient';
import { collection, query, where, limit, doc, getDoc, setDoc, updateDoc, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { getChatId } from '../utils';

export const canMessageUser = async (
  currentUserId: string,
  otherUserId: string
): Promise<boolean> => {
  const currentUserRef = doc(db, 'Users', currentUserId);
  const otherUserRef = doc(db, 'Users', otherUserId);
  
  const [currentUserSnap, otherUserSnap] = await Promise.all([
    getDoc(currentUserRef),
    getDoc(otherUserRef),
  ]);
  
  if (!currentUserSnap.exists() || !otherUserSnap.exists()) return false;
  
  const currentUserData = currentUserSnap.data();
  const otherUserData = otherUserSnap.data();
  
  const isCurrentUserOrganizer = currentUserData.organizer || false;
  const isOtherUserOrganizer = otherUserData.organizer || false;
  const isFriend = (currentUserData.friends || []).includes(otherUserId);
  const isCurrentUserPrivate = currentUserData.isPrivate || false;
  const isOtherUserPrivate = otherUserData.isPrivate || false;
  
  // Organizers can always message
  if (isCurrentUserOrganizer || isOtherUserOrganizer) {
    return true;
  }
  
  // Friends can always message each other
  if (isFriend) {
    return true;
  }
  
  // Private accounts can message public accounts
  if (isCurrentUserPrivate && !isOtherUserPrivate) {
    return true;
  }
  
  // Public accounts can message private accounts only if the private account messaged them first
  // Private accounts can message private accounts if the other private account messaged them first
  // Check if there's an existing conversation where the other user sent a message first
  if ((!isCurrentUserPrivate && isOtherUserPrivate) || (isCurrentUserPrivate && isOtherUserPrivate)) {
    const chatId = getChatId(currentUserId, otherUserId);
    const conversationRef = doc(db, 'conversations', chatId);
    const conversationSnap = await getDoc(conversationRef);
    
    if (conversationSnap.exists()) {
      // Check if there are any messages from the other user
      const messagesRef = collection(db, 'conversations', chatId, 'messages');
      const messagesQuery = query(messagesRef, where('senderId', '==', otherUserId), limit(1));
      const messagesSnap = await getDocs(messagesQuery);
      
      if (!messagesSnap.empty) {
        return true; // Other user has sent a message, so we can reply
      }
    }
    return false; // Cannot message private account that hasn't messaged first
  }
  
  // Public accounts can message other public accounts
  if (!isCurrentUserPrivate && !isOtherUserPrivate) {
    return true;
  }
  
  return false;
};

export const ensureConversation = async (
  currentUserId: string,
  chatId: string,
  otherUserId: string
): Promise<void> => {
  const conversationRef = doc(db, 'conversations', chatId);
  const conversationSnap = await getDoc(conversationRef);

  if (!conversationSnap.exists()) {
    // Verify they can message each other
    const canMessage = await canMessageUser(currentUserId, otherUserId);
    if (!canMessage) {
      throw new Error('You cannot message this user.');
    }

    await setDoc(conversationRef, {
      participants: [currentUserId, otherUserId],
      lastMessage: '',
      lastMessageTime: null,
    });
  }
};

export const sendMessage = async (
  currentUserId: string,
  chatId: string,
  messageText: string
): Promise<void> => {
  const [uid1, uid2] = chatId.split('_');
  const receiverId = uid1 === currentUserId ? uid2 : uid1;

  // Add message to subcollection
  const messagesRef = collection(db, 'conversations', chatId, 'messages');
  await addDoc(messagesRef, {
    text: messageText.trim(),
    senderId: currentUserId,
    receiverId,
    timestamp: serverTimestamp(),
  });

  // Update conversation metadata
  const conversationRef = doc(db, 'conversations', chatId);
  const conversationSnap = await getDoc(conversationRef);

  if (!conversationSnap.exists()) {
    const conversationData = {
      participants: [currentUserId, receiverId],
      lastMessage: messageText.trim(),
      lastMessageTime: serverTimestamp(),
    };
    await setDoc(conversationRef, conversationData);
  } else {
    await updateDoc(conversationRef, {
      lastMessage: messageText.trim(),
      lastMessageTime: serverTimestamp(),
    });
  }
};

