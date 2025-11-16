'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { db } from '@/lib/firebaseClient';
import { useAuth } from '@/lib/firebaseAuth';
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { UserPlus, Check, X, ArrowLeft, MessageCircle, UserMinus } from 'lucide-react';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function ViewProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const userId = params.userId as string;

  const [profileUser, setProfileUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [friendStatus, setFriendStatus] = useState<'none' | 'sent' | 'received' | 'friends' | 'self'>('none');
  const [updating, setUpdating] = useState(false);
  const [removeFriendDialogOpen, setRemoveFriendDialogOpen] = useState(false);

  // Generate chat ID from two user IDs (sorted for consistency)
  const getChatId = (uid1: string, uid2: string) => {
    return [uid1, uid2].sort().join('_');
  };

  useEffect(() => {
    if (!user || authLoading) {
      if (!authLoading && !user) {
        router.push('/login');
      }
      return;
    }

    // Don't load if viewing own profile
    if (userId === user.uid) {
      router.push('/profile');
      return;
    }

    const loadProfile = async () => {
      try {
        setLoading(true);
        
        // Load profile user data
        const profileRef = doc(db, 'Users', userId);
        const profileSnap = await getDoc(profileRef);
        
        if (!profileSnap.exists()) {
          setLoading(false);
          return;
        }

        const profileData = profileSnap.data();
        setProfileUser({
          uid: userId,
          username: profileData.Username || 'Unknown',
          photoURL: profileData.customPhotoURL || profileData.photoURL || null,
          bio: profileData.bio || '',
          interests: profileData.interests || [],
        });

        // Check friend status
        const currentUserRef = doc(db, 'Users', user.uid);
        const currentUserSnap = await getDoc(currentUserRef);
        
        if (currentUserSnap.exists()) {
          const currentUserData = currentUserSnap.data();
          const friends = currentUserData.friends || [];
          const sentRequests = currentUserData.sentFriendRequests || [];
          const receivedRequests = currentUserData.receivedFriendRequests || [];

          if (friends.includes(userId)) {
            setFriendStatus('friends');
          } else if (sentRequests.includes(userId)) {
            setFriendStatus('sent');
          } else if (receivedRequests.includes(userId)) {
            setFriendStatus('received');
          } else {
            setFriendStatus('none');
          }
        }
      } catch (err) {
        console.error('Error loading profile:', err);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user, authLoading, userId, router]);

  const handleSendFriendRequest = async () => {
    if (!user || updating) return;

    setUpdating(true);
    try {
      const currentUserRef = doc(db, 'Users', user.uid);
      const targetUserRef = doc(db, 'Users', userId);

      await updateDoc(currentUserRef, {
        sentFriendRequests: arrayUnion(userId),
      });

      await updateDoc(targetUserRef, {
        receivedFriendRequests: arrayUnion(user.uid),
      });

      setFriendStatus('sent');
    } catch (err) {
      console.error('Error sending friend request:', err);
    } finally {
      setUpdating(false);
    }
  };

  const handleAcceptRequest = async () => {
    if (!user || updating) return;

    setUpdating(true);
    try {
      const currentUserRef = doc(db, 'Users', user.uid);
      const requestUserRef = doc(db, 'Users', userId);

      await updateDoc(currentUserRef, {
        receivedFriendRequests: arrayRemove(userId),
        friends: arrayUnion(userId),
      });

      await updateDoc(requestUserRef, {
        sentFriendRequests: arrayRemove(user.uid),
        friends: arrayUnion(user.uid),
      });

      setFriendStatus('friends');
    } catch (err) {
      console.error('Error accepting friend request:', err);
    } finally {
      setUpdating(false);
    }
  };

  const handleDeclineRequest = async () => {
    if (!user || updating) return;

    setUpdating(true);
    try {
      const currentUserRef = doc(db, 'Users', user.uid);
      const requestUserRef = doc(db, 'Users', userId);

      await updateDoc(currentUserRef, {
        receivedFriendRequests: arrayRemove(userId),
      });

      await updateDoc(requestUserRef, {
        sentFriendRequests: arrayRemove(user.uid),
      });

      setFriendStatus('none');
    } catch (err) {
      console.error('Error declining friend request:', err);
    } finally {
      setUpdating(false);
    }
  };

  const handleRemoveFriend = async () => {
    if (!user || updating) return;

    setUpdating(true);
    try {
      const currentUserRef = doc(db, 'Users', user.uid);
      const friendRef = doc(db, 'Users', userId);

      await updateDoc(currentUserRef, {
        friends: arrayRemove(userId),
      });

      await updateDoc(friendRef, {
        friends: arrayRemove(user.uid),
      });

      setFriendStatus('none');
      setRemoveFriendDialogOpen(false);
    } catch (err) {
      console.error('Error removing friend:', err);
    } finally {
      setUpdating(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="container mx-auto px-6 py-24">
        <p className="text-center">Loading...</p>
      </div>
    );
  }

  if (!user || !profileUser) {
    return (
      <div className="container mx-auto px-6 py-24">
        <p className="text-center">Profile not found</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-24 max-w-2xl">
      <Button
        variant="ghost"
        onClick={() => router.back()}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      <div className="space-y-6">
        {/* Profile Header */}
        <div className="flex flex-col items-center space-y-4">
          <div className="relative h-32 w-32 rounded-full overflow-hidden border-2">
            {profileUser.photoURL ? (
              <Image
                src={profileUser.photoURL}
                alt={profileUser.username}
                fill
                className="object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-4xl bg-gray-200">
                {profileUser.username.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="text-center">
            <h1 className="text-3xl font-bold">{profileUser.username}</h1>
          </div>

          {/* Friend Status/Actions */}
          <div className="flex gap-2 flex-wrap justify-center">
            {friendStatus === 'friends' && (
              <>
                <Button
                  asChild
                  variant="default"
                >
                  <Link href={`/friends?chat=${getChatId(user.uid, userId)}`}>
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Message
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setRemoveFriendDialogOpen(true)}
                >
                  <UserMinus className="w-4 h-4 mr-2" />
                  Remove Friend
                </Button>
              </>
            )}
            {friendStatus === 'sent' && (
              <Button variant="outline" disabled>
                Request Sent
              </Button>
            )}
            {friendStatus === 'received' && (
              <>
                <Button onClick={handleAcceptRequest} disabled={updating}>
                  <Check className="w-4 h-4 mr-2" />
                  Accept
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDeclineRequest}
                  disabled={updating}
                >
                  <X className="w-4 h-4" />
                </Button>
              </>
            )}
            {friendStatus === 'none' && (
              <Button onClick={handleSendFriendRequest} disabled={updating}>
                <UserPlus className="w-4 h-4 mr-2" />
                Add Friend
              </Button>
            )}
          </div>
        </div>

        {/* Bio Section */}
        {profileUser.bio && (
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Bio</h2>
            <p className="text-muted-foreground whitespace-pre-wrap">
              {profileUser.bio}
            </p>
          </div>
        )}

        {/* Interests Section */}
        {profileUser.interests && profileUser.interests.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Interests</h2>
            <div className="flex flex-wrap gap-2">
              {profileUser.interests.map((interest: string, index: number) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                >
                  {interest}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Remove Friend Confirmation Dialog */}
      <Dialog open={removeFriendDialogOpen} onOpenChange={setRemoveFriendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Friend?</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {profileUser?.username} from your friends list? 
              You'll need to send a new friend request to message them again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRemoveFriendDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveFriend}
              disabled={updating}
            >
              Remove Friend
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

