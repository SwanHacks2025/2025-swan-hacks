import { db } from '@/lib/firebaseClient';
import { collection, query, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { UserResult, FriendRequestStatus } from '../types';

export const searchUsers = async (
  currentUserId: string,
  searchQuery: string
): Promise<UserResult[]> => {
  const usersRef = collection(db, 'Users');
  const q = query(usersRef, limit(50));

  const querySnapshot = await getDocs(q);
  const results: UserResult[] = [];

  // Get current user's data to check friend status
  const currentUserRef = doc(db, 'Users', currentUserId);
  const currentUserSnap = await getDoc(currentUserRef);
  const currentUserData = currentUserSnap.exists() ? currentUserSnap.data() : {};
  const currentFriends = currentUserData.friends || [];
  const sentRequests = currentUserData.sentFriendRequests || [];
  const receivedRequests = currentUserData.receivedFriendRequests || [];

  querySnapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const uid = docSnap.id;

    // Skip current user
    if (uid === currentUserId) return;

    // Filter by search query if provided
    const username = (data.Username || '').toLowerCase();
    if (searchQuery.trim() && !username.includes(searchQuery.trim().toLowerCase())) {
      return;
    }

    const isOtherUserOrganizer = data.organizer || false;
    const isOtherUserPrivate = data.isPrivate || false;
    const isCurrentUserPrivate = currentUserData.isPrivate || false;

    let status: FriendRequestStatus = 'none';
    if (currentFriends.includes(uid)) {
      status = 'friends';
    } else if (sentRequests.includes(uid)) {
      status = 'sent';
    } else if (receivedRequests.includes(uid)) {
      status = 'received';
    }

    results.push({
      uid,
      username: data.Username || 'Unknown',
      photoURL: data.customPhotoURL || data.photoURL || null,
      status,
      isPrivate: isOtherUserPrivate,
      isOrganizer: isOtherUserOrganizer,
      canMessage: false,
    });
  });

  return results;
};

