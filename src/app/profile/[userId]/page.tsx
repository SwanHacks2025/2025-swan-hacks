'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebaseClient';
import { useAuth } from '@/lib/firebaseAuth';
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  collection,
  query,
  where,
  getDocs,
  or,
} from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  UserPlus,
  Check,
  X,
  ArrowLeft,
  MessageCircle,
  UserMinus,
  Lock,
  Calendar,
  MapPin,
} from 'lucide-react';
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
  const [friendStatus, setFriendStatus] = useState<
    'none' | 'sent' | 'received' | 'friends' | 'self'
  >('none');
  const [updating, setUpdating] = useState(false);
  const [removeFriendDialogOpen, setRemoveFriendDialogOpen] = useState(false);
  const [previousEvents, setPreviousEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  // Generate chat ID from two user IDs (sorted for consistency)
  const getChatId = (uid1: string, uid2: string) => {
    return [uid1, uid2].sort().join('_');
  };

  useEffect(() => {
    if (!user || authLoading) {
      if (!authLoading && !user) {
        router.push('/');
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
        const isProfilePrivate = profileData.isPrivate || false;

        // Check friend status
        const currentUserRef = doc(db, 'Users', user.uid);
        const currentUserSnap = await getDoc(currentUserRef);

        let canViewProfile = false;
        let friends: string[] = [];
        let sentRequests: string[] = [];
        let receivedRequests: string[] = [];

        if (currentUserSnap.exists()) {
          const currentUserData = currentUserSnap.data();
          friends = currentUserData.friends || [];
          sentRequests = currentUserData.sentFriendRequests || [];
          receivedRequests = currentUserData.receivedFriendRequests || [];

          if (friends.includes(userId)) {
            setFriendStatus('friends');
          } else if (sentRequests.includes(userId)) {
            setFriendStatus('sent');
          } else if (receivedRequests.includes(userId)) {
            setFriendStatus('received');
          } else {
            setFriendStatus('none');
          }

          // Can view profile if: public account OR (private account AND is friend)
          canViewProfile = !isProfilePrivate || friends.includes(userId);
        } else {
          // If current user data doesn't exist, can only view if public
          canViewProfile = !isProfilePrivate;
        }

        setProfileUser({
          uid: userId,
          username: profileData.Username || 'Unknown',
          photoURL: profileData.customPhotoURL || profileData.photoURL || null,
          bio: canViewProfile ? profileData.bio || '' : '',
          interests: canViewProfile ? profileData.interests || [] : [],
          isPrivate: isProfilePrivate,
          canViewProfile,
        });
      } catch (err) {
        console.error('Error loading profile:', err);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user, authLoading, userId, router]);

  // Load previous events
  useEffect(() => {
    const fetchPreviousEvents = async () => {
      if (!user || !userId || !profileUser) return;

      // Only load events if user can view profile
      if (profileUser.isPrivate && !profileUser.canViewProfile) {
        setPreviousEvents([]);
        return;
      }

      setLoadingEvents(true);
      try {
        const eventsRef = collection(db, 'Events');
        const now = new Date();

        // Query for events where profile user is owner or attendee and date is in the past
        const q = query(
          eventsRef,
          or(
            where('owner', '==', userId),
            where('attendees', 'array-contains', userId)
          )
        );

        const querySnapshot = await getDocs(q);
        const events: any[] = [];

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const eventDate = data.date?.toDate();

          // Only include past events
          if (eventDate && eventDate < now) {
            events.push({
              id: doc.id,
              ...data,
              date: eventDate,
            });
          }
        });

        // Sort by date (most recent first)
        events.sort((a, b) => b.date.getTime() - a.date.getTime());

        setPreviousEvents(events);
      } catch (err) {
        console.error('Error loading previous events:', err);
      } finally {
        setLoadingEvents(false);
      }
    };

    if (!authLoading && user && profileUser) {
      fetchPreviousEvents();
    }
  }, [user, authLoading, userId, profileUser]);

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
      <div className="h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user || !profileUser) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Profile not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-28 pb-12 px-6">
      <div className="max-w-2xl mx-auto">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4 w-fit gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>

        {/* Floating Island Container */}
        <div className="bg-background/70 backdrop-blur-xl rounded-2xl border border-border shadow-lg">
          {/* Header with Profile Picture */}
          <div className="p-8 border-b border-border/50">
            <div className="flex flex-col items-center gap-4">
              <Avatar className="h-32 w-32 ring-4 ring-primary/10">
                {profileUser.photoURL ? (
                  <AvatarImage
                    src={profileUser.photoURL}
                    alt={profileUser.username}
                  />
                ) : (
                  <AvatarFallback className="bg-primary/10 text-primary text-4xl font-bold">
                    {profileUser.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>

              <div className="text-center">
                <h1 className="text-3xl font-bold">{profileUser.username}</h1>
                {profileUser.isPrivate && (
                  <div className="flex items-center justify-center gap-2 mt-2 text-sm text-muted-foreground">
                    <Lock className="w-4 h-4" />
                    <span>Private Account</span>
                  </div>
                )}
              </div>

              {/* Friend Status/Actions */}
              <div className="flex gap-2 flex-wrap justify-center mt-2">
                {friendStatus === 'friends' && (
                  <>
                    <Button asChild variant="default" className="gap-2">
                      <Link
                        href={`/friends?chat=${getChatId(user.uid, userId)}`}
                      >
                        <MessageCircle className="w-4 h-4" />
                        Message
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setRemoveFriendDialogOpen(true)}
                      className="gap-2 cursor-pointer"
                    >
                      <UserMinus className="w-4 h-4" />
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
                    <Button
                      onClick={handleAcceptRequest}
                      disabled={updating}
                      className="gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Accept
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleDeclineRequest}
                      disabled={updating}
                      className="gap-2"
                    >
                      <X className="w-4 h-4" />
                      Decline
                    </Button>
                  </>
                )}
                {friendStatus === 'none' && (
                  <Button
                    onClick={handleSendFriendRequest}
                    disabled={updating}
                    className="gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    Add Friend
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Content Sections */}
          <div className="p-8 space-y-6">
            {/* Privacy Notice */}
            {profileUser.isPrivate && !profileUser.canViewProfile && (
              <div className="bg-muted/30 rounded-lg px-6 py-8 text-center">
                <Lock className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">
                  This is a private account. Only friends can view their profile
                  information.
                </p>
              </div>
            )}

            {/* Bio Section */}
            {profileUser.canViewProfile && profileUser.bio && (
              <div className="space-y-3">
                <label className="text-sm font-semibold text-muted-foreground">
                  Bio
                </label>
                <div className="bg-muted/30 rounded-lg px-4 py-3 min-h-[100px] mt-3">
                  <p className="text-foreground/80 whitespace-pre-wrap">
                    {profileUser.bio}
                  </p>
                </div>
              </div>
            )}

            {/* Interests Section */}
            {profileUser.canViewProfile &&
              profileUser.interests &&
              profileUser.interests.length > 0 && (
                <div className="space-y-4">
                  <label className="text-sm font-semibold text-muted-foreground">
                    Interests
                  </label>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {profileUser.interests.map(
                      (interest: string, index: number) => (
                        <span
                          key={index}
                          className="px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium border border-primary/20"
                        >
                          {interest}
                        </span>
                      )
                    )}
                  </div>
                </div>
              )}

            {/* Empty State for No Bio/Interests/Events */}
            {profileUser.canViewProfile &&
              !profileUser.bio &&
              (!profileUser.interests || profileUser.interests.length === 0) &&
              previousEvents.length === 0 &&
              !loadingEvents && (
                <div className="bg-muted/30 rounded-lg px-6 py-8 text-center mt-3">
                  <p className="text-muted-foreground">
                    {profileUser.username} hasn&apos;t added any profile
                    information yet.
                  </p>
                </div>
              )}
          </div>
        </div>
      </div>

      {/* Remove Friend Confirmation Dialog */}
      <Dialog
        open={removeFriendDialogOpen}
        onOpenChange={setRemoveFriendDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Friend?</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {profileUser?.username} from your
              friends list? You'll need to send a new friend request to message
              them again.
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
