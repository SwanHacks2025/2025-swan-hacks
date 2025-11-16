// app/profile/page.tsx
'use client';

import { updateProfile } from 'firebase/auth';
import { useEffect, useState, ChangeEvent } from 'react';
import { db, storage, auth } from '@/lib/firebaseClient';
import { useAuth } from '@/lib/firebaseAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  or,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useRouter } from 'next/navigation';
import {
  Camera,
  Edit2,
  X,
  Check,
  Lock,
  Globe,
  Calendar,
  MapPin,
} from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import Link from 'next/link';

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();

  const [username, setUsername] = useState('');
  const [displayUsername, setDisplayUsername] = useState('');
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [bio, setBio] = useState('');
  const [displayBio, setDisplayBio] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingUsername, setSavingUsername] = useState(false);
  const [savingBio, setSavingBio] = useState(false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [message, setMessage] = useState<string | null>(null);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [previousEvents, setPreviousEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  const router = useRouter();

  // Load profile data from Firestore
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setLoadingProfile(false);
        return;
      }

      try {
        const userRef = doc(db, 'Users', user.uid);
        const snap = await getDoc(userRef);

        if (snap.exists()) {
          const data = snap.data() as {
            Username?: string;
            photoURL?: string;
            customPhoto?: boolean;
            customPhotoURL?: string;
            bio?: string;
            interests?: string[];
            isPrivate?: boolean;
          };

          const initialUsername =
            data.Username ||
            user.displayName ||
            user.email?.split('@')[0] ||
            '';
          setUsername(initialUsername);
          setDisplayUsername(initialUsername);
          setPhotoURL(data.photoURL || user.photoURL || null);
          if (data.customPhoto) {
            setPhotoURL(data.customPhotoURL || null);
          }
          setBio(data.bio || '');
          setDisplayBio(data.bio || '');
          setInterests(data.interests || []);
          setIsPrivate(data.isPrivate || false);
        } else {
          const fallbackName =
            user.displayName || user.email?.split('@')[0] || 'NewUser';
          setUsername(fallbackName);
          setDisplayUsername(fallbackName);
          setPhotoURL(user.photoURL || null);
          setBio('');
          setDisplayBio('');
          setInterests([]);
          setIsPrivate(false);
        }
      } catch (err) {
        console.error(err);
        setMessage('Error loading profile.');
      } finally {
        setLoadingProfile(false);
      }
    };

    if (!authLoading) {
      fetchProfile();
    }
  }, [user, authLoading]);

  // Load previous events
  useEffect(() => {
    const fetchPreviousEvents = async () => {
      if (!user) return;

      setLoadingEvents(true);
      try {
        const eventsRef = collection(db, 'Events');
        const now = new Date();

        // Query for events where user is owner or attendee and date is in the past
        const q = query(
          eventsRef,
          or(
            where('owner', '==', user.uid),
            where('attendees', 'array-contains', user.uid)
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

    if (!authLoading && user) {
      fetchPreviousEvents();
    }
  }, [user, authLoading]);

  // Save username
  const handleSaveUsername = async () => {
    if (!user) return;
    setSavingUsername(true);
    setMessage(null);

    try {
      const userRef = doc(db, 'Users', user.uid);
      await setDoc(userRef, { Username: username }, { merge: true });
      setDisplayUsername(username);
      setIsEditingUsername(false);
      setMessage('Username updated!');
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error(err);
      setMessage('Error saving username.');
    } finally {
      setSavingUsername(false);
    }
  };

  // Save bio
  const handleSaveBio = async () => {
    if (!user) return;
    setSavingBio(true);
    setMessage(null);

    try {
      const userRef = doc(db, 'Users', user.uid);
      await setDoc(userRef, { bio: bio }, { merge: true });
      setDisplayBio(bio);
      setIsEditingBio(false);
      setMessage('Bio updated!');
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error(err);
      setMessage('Error saving bio.');
    } finally {
      setSavingBio(false);
    }
  };

  // Save interests
  const handleSaveInterests = async (interestsToSave: string[]) => {
    if (!user) return;
    setMessage(null);

    try {
      const userRef = doc(db, 'Users', user.uid);
      await setDoc(userRef, { interests: interestsToSave }, { merge: true });
      setMessage('Interests updated!');
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error(err);
      setMessage('Error saving interests.');
    }
  };

  // Add interest
  const handleAddInterest = async () => {
    if (newInterest.trim() && !interests.includes(newInterest.trim())) {
      const updated = [...interests, newInterest.trim()];
      setInterests(updated);
      setNewInterest('');
      await handleSaveInterests(updated);
    }
  };

  // Remove interest
  const handleRemoveInterest = async (interestToRemove: string) => {
    const updated = interests.filter((i) => i !== interestToRemove);
    setInterests(updated);
    await handleSaveInterests(updated);
  };

  // Save privacy setting
  const handleSavePrivacy = async (privateValue: boolean) => {
    if (!user) return;
    setSavingPrivacy(true);
    setMessage(null);

    try {
      const userRef = doc(db, 'Users', user.uid);
      await setDoc(userRef, { isPrivate: privateValue }, { merge: true });
      setIsPrivate(privateValue);
      setMessage('Privacy setting updated!');
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error(err);
      setMessage('Error saving privacy setting.');
    } finally {
      setSavingPrivacy(false);
    }
  };

  // Upload new profile picture
  const handlePhotoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!user) return;

    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    setMessage(null);

    try {
      if (!auth.currentUser) return;

      // Unique path so URL changes every upload -> avoids cache issues
      const path = `profilePictures/${user.uid}/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, path);

      // Upload to Firebase Storage
      await uploadBytes(storageRef, file);

      // Get a public download URL
      const downloadURL = await getDownloadURL(storageRef);

      // Save to Firestore doc
      const userRef = doc(db, 'Users', user.uid);
      await setDoc(
        userRef,
        {
          customPhotoURL: downloadURL,
          photoUpdatedAt: serverTimestamp(),
          customPhoto: true,
        },
        { merge: true }
      );

      await updateProfile(auth.currentUser, {
        photoURL: downloadURL,
      });
      // Update local state (URL changed => browser fetches new image)
      setPhotoURL(downloadURL);
      setMessage('Profile picture updated!');
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error(err);
      setMessage('Error uploading profile picture.');
    } finally {
      setUploadingPhoto(false);
      // Reset file input so same file can be selected again if needed
      e.target.value = '';
    }
  };

  if (authLoading || loadingProfile) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading profile…</p>
      </div>
    );
  }

  if (!user) {
    router.push('/');
    return null;
  }

  return (
    <div className="min-h-screen pt-28 pb-12 px-6">
      <div className="max-w-2xl mx-auto">
        {/* Floating Island Container */}
        <div className="bg-background/70 backdrop-blur-xl rounded-2xl border border-border shadow-lg">
          {/* Header with Profile Picture */}
          <div className="p-8 border-b border-border/50">
            <h1 className="text-3xl font-bold mb-6">My Profile</h1>

            {/* Profile Picture Section */}
            <div className="flex items-center gap-6">
              <div className="relative group">
                <Avatar className="h-24 w-24 ring-4 ring-primary/10">
                  {photoURL ? (
                    <AvatarImage src={photoURL} alt="Profile" />
                  ) : (
                    <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                      {displayUsername.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  )}
                </Avatar>
                <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <Camera className="w-6 h-6 text-white" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoChange}
                    disabled={uploadingPhoto}
                  />
                </label>
              </div>
              <div>
                <h2 className="text-xl font-bold">{displayUsername}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {user.email}
                </p>
                {uploadingPhoto && (
                  <p className="text-xs text-primary mt-2">Uploading...</p>
                )}
              </div>
            </div>
          </div>

          {/* Content Sections */}
          <div className="p-8 space-y-6">
            {/* Message Display */}
            {message && (
              <div className="bg-primary/10 border border-primary/20 rounded-lg px-4 py-3">
                <p className="text-sm text-primary font-medium">{message}</p>
              </div>
            )}

            {/* Username Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-muted-foreground">
                  Username
                </label>
                {!isEditingUsername && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setUsername(displayUsername);
                      setIsEditingUsername(true);
                      setMessage(null);
                    }}
                    className="gap-2"
                  >
                    <Edit2 className="w-3 h-3" />
                    Edit
                  </Button>
                )}
              </div>
              {!isEditingUsername ? (
                <div className="bg-muted/30 rounded-lg px-4 py-3">
                  <p className="font-medium">{displayUsername}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    className="bg-muted/30"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSaveUsername}
                      disabled={savingUsername}
                      size="sm"
                      className="gap-2"
                    >
                      <Check className="w-3 h-3" />
                      {savingUsername ? 'Saving…' : 'Save'}
                    </Button>
                    <Button
                      onClick={() => {
                        setUsername(displayUsername);
                        setIsEditingUsername(false);
                      }}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      <X className="w-3 h-3" />
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Bio Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-muted-foreground">
                  Bio
                </label>
                {!isEditingBio && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setBio(displayBio);
                      setIsEditingBio(true);
                      setMessage(null);
                    }}
                    className="gap-2"
                  >
                    <Edit2 className="w-3 h-3" />
                    Edit
                  </Button>
                )}
              </div>
              {!isEditingBio ? (
                <div className="bg-muted/30 rounded-lg px-4 py-3 min-h-[100px]">
                  <p className="text-foreground/80">
                    {displayBio || 'No bio yet. Click Edit to add one.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <textarea
                    className="w-full border rounded-lg px-4 py-3 text-sm min-h-[120px] bg-muted/30 border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us about yourself..."
                    maxLength={500}
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSaveBio}
                      disabled={savingBio}
                      size="sm"
                      className="gap-2"
                    >
                      <Check className="w-3 h-3" />
                      {savingBio ? 'Saving…' : 'Save'}
                    </Button>
                    <Button
                      onClick={() => {
                        setBio(displayBio);
                        setIsEditingBio(false);
                      }}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      <X className="w-3 h-3" />
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Privacy Section */}
            <div className="space-y-4">
              <label className="text-sm font-semibold text-muted-foreground">
                Account Privacy
              </label>
              <div className="bg-muted/30 rounded-lg px-4 py-4 mt-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isPrivate ? (
                      <Lock className="w-5 h-5 text-primary" />
                    ) : (
                      <Globe className="w-5 h-5 text-primary" />
                    )}
                    <div>
                      <p className="font-medium">
                        {isPrivate ? 'Private Account' : 'Public Account'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {isPrivate
                          ? 'Only your friends can view your profile'
                          : 'Anyone can view your profile'}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleSavePrivacy(!isPrivate)}
                    disabled={savingPrivacy}
                    variant={isPrivate ? 'outline' : 'default'}
                    size="sm"
                  >
                    {savingPrivacy
                      ? 'Saving…'
                      : isPrivate
                      ? 'Make Public'
                      : 'Make Private'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Interests Section */}
            <div className="space-y-4">
              <label className="text-sm font-semibold text-muted-foreground">
                Interests
              </label>
              <div className="flex flex-wrap gap-2 mt-3">
                {interests.map((interest, index) => (
                  <span
                    key={index}
                    className="px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium flex items-center gap-2 border border-primary/20"
                  >
                    {interest}
                    <button
                      onClick={() => handleRemoveInterest(interest)}
                      className="hover:text-primary/80 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newInterest}
                  onChange={(e) => setNewInterest(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddInterest();
                    }
                  }}
                  placeholder="Add an interest..."
                  className="bg-muted/30"
                />
                <Button onClick={handleAddInterest} size="default">
                  Add
                </Button>
              </div>
            </div>

            {/* Previous Events Section */}
            <div className="space-y-4">
              <label className="text-sm font-semibold text-muted-foreground">
                Previous Events
              </label>
              {loadingEvents ? (
                <div className="bg-muted/30 rounded-lg px-4 py-8 text-center mt-3">
                  <p className="text-sm text-muted-foreground">
                    Loading events...
                  </p>
                </div>
              ) : previousEvents.length > 0 ? (
                <div className="space-y-3 mt-3">
                  {previousEvents.map((event) => (
                    <Link
                      key={event.id}
                      href={`/events`}
                      className="block bg-muted/30 rounded-lg px-4 py-3 hover:bg-muted/50 transition-colors border border-border/40"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground truncate">
                            {event.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            <span>{event.date.toLocaleDateString()}</span>
                          </div>
                          {event.location && (
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <MapPin className="w-3 h-3" />
                              <span className="truncate">{event.location}</span>
                            </div>
                          )}
                        </div>
                        {event.category && (
                          <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs font-medium border border-primary/20 whitespace-nowrap">
                            {event.category}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="bg-muted/30 rounded-lg px-4 py-8 text-center mt-3">
                  <p className="text-sm text-muted-foreground">
                    No previous events yet
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
