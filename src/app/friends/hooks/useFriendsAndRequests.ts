import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebaseClient';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { UserResult, FriendRequestStatus } from '../types';

export function useFriendsAndRequests(
  userId: string | null,
  authLoading: boolean,
  onUpdateSearchResults?: (updateFn: (prev: UserResult[]) => UserResult[]) => void
) {
  const router = useRouter();
  const [friends, setFriends] = useState<UserResult[]>([]);
  const [friendRequests, setFriendRequests] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || authLoading) {
      if (!authLoading && !userId) {
        router.push('/');
      }
      return;
    }

    const userRef = doc(db, 'Users', userId);
    
    const unsubscribe = onSnapshot(userRef, async (userSnap) => {
      if (!userSnap.exists()) {
        setLoading(false);
        return;
      }

      try {
        const data = userSnap.data();
        const friendsList = data.friends || [];
        const sentRequests = data.sentFriendRequests || [];
        const receivedRequests = data.receivedFriendRequests || [];

        // Load friends details
        const friendsDetails = await Promise.all(
          friendsList.map(async (friendId: string) => {
            const friendRef = doc(db, 'Users', friendId);
            const friendSnap = await getDoc(friendRef);
            if (friendSnap.exists()) {
              const friendData = friendSnap.data();
              return {
                uid: friendId,
                username: friendData.Username || 'Unknown',
                photoURL: friendData.customPhotoURL || friendData.photoURL || null,
                status: 'friends' as FriendRequestStatus,
              };
            }
            return null;
          })
        );

        // Load received requests details
        const receivedDetails = await Promise.all(
          receivedRequests.map(async (requestId: string) => {
            const requestRef = doc(db, 'Users', requestId);
            const requestSnap = await getDoc(requestRef);
            if (requestSnap.exists()) {
              const requestData = requestSnap.data();
              return {
                uid: requestId,
                username: requestData.Username || 'Unknown',
                photoURL: requestData.customPhotoURL || requestData.photoURL || null,
                status: 'received' as FriendRequestStatus,
              };
            }
            return null;
          })
        );

        // Remove duplicates
        const uniqueFriends = friendsDetails
          .filter((f): f is UserResult => f !== null)
          .filter((friend, index, self) => 
            index === self.findIndex((f) => f.uid === friend.uid)
          );

        setFriends(uniqueFriends);
        setFriendRequests(receivedDetails.filter((f): f is UserResult => f !== null));
        
        // Update search results with current sent requests status
        if (onUpdateSearchResults) {
          onUpdateSearchResults((prev) =>
            prev.map((result) => {
              let newStatus: FriendRequestStatus = result.status;
              if (sentRequests.includes(result.uid)) {
                newStatus = 'sent';
              } else if (friendsList.includes(result.uid)) {
                newStatus = 'friends';
              } else if (receivedRequests.includes(result.uid)) {
                newStatus = 'received';
              } else {
                newStatus = 'none';
              }
              return { ...result, status: newStatus };
            })
          );
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error loading friends data:', err);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [userId, authLoading, router, onUpdateSearchResults]);

  return { friends, friendRequests, loading };
}

