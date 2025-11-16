import { db } from '@/lib/firebaseClient';
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';

export const sendFriendRequest = async (
  currentUserId: string,
  targetUserId: string
): Promise<void> => {
  const currentUserRef = doc(db, 'Users', currentUserId);
  const targetUserRef = doc(db, 'Users', targetUserId);

  await updateDoc(currentUserRef, {
    sentFriendRequests: arrayUnion(targetUserId),
  });

  await updateDoc(targetUserRef, {
    receivedFriendRequests: arrayUnion(currentUserId),
  });
};

export const acceptFriendRequest = async (
  currentUserId: string,
  requestUserId: string
): Promise<void> => {
  // Check if already friends to prevent duplicates
  const currentUserRef = doc(db, 'Users', currentUserId);
  const currentUserSnap = await getDoc(currentUserRef);
  const currentUserData = currentUserSnap.exists() ? currentUserSnap.data() : {};
  const currentFriends = currentUserData.friends || [];

  if (currentFriends.includes(requestUserId)) {
    return; // Already friends
  }

  const requestUserRef = doc(db, 'Users', requestUserId);

  await updateDoc(currentUserRef, {
    receivedFriendRequests: arrayRemove(requestUserId),
    friends: arrayUnion(requestUserId),
  });

  await updateDoc(requestUserRef, {
    sentFriendRequests: arrayRemove(currentUserId),
    friends: arrayUnion(currentUserId),
  });
};

export const declineFriendRequest = async (
  currentUserId: string,
  requestUserId: string
): Promise<void> => {
  const currentUserRef = doc(db, 'Users', currentUserId);
  const requestUserRef = doc(db, 'Users', requestUserId);

  await updateDoc(currentUserRef, {
    receivedFriendRequests: arrayRemove(requestUserId),
  });

  await updateDoc(requestUserRef, {
    sentFriendRequests: arrayRemove(currentUserId),
  });
};

export const removeFriend = async (
  currentUserId: string,
  friendId: string
): Promise<void> => {
  const currentUserRef = doc(db, 'Users', currentUserId);
  const friendRef = doc(db, 'Users', friendId);

  await updateDoc(currentUserRef, {
    friends: arrayRemove(friendId),
  });

  await updateDoc(friendRef, {
    friends: arrayRemove(currentUserId),
  });
};

