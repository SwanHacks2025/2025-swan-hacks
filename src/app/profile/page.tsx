// app/profile/page.tsx
"use client";

import { updateProfile } from "firebase/auth";
import { useEffect, useState, ChangeEvent } from "react";
import Image from "next/image";
import { db, storage, auth } from "@/lib/firebaseClient";
import { useAuth } from "@/lib/firebaseAuth";

import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();

  const [username, setUsername] = useState("");
  const [displayUsername, setDisplayUsername] = useState("");
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [bio, setBio] = useState("");
  const [displayBio, setDisplayBio] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState("");

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingUsername, setSavingUsername] = useState(false);
  const [savingBio, setSavingBio] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [message, setMessage] = useState<string | null>(null);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);

  const router = useRouter();

  // Load profile data from Firestore
  useEffect(() => {

    const fetchProfile = async () => {  
      if (!user) {
        setLoadingProfile(false);
        return;
      }

      try {
        const userRef = doc(db, "Users", user.uid);
        const snap = await getDoc(userRef);

        if (snap.exists()) {
          const data = snap.data() as {
            Username?: string;
            photoURL?: string;
            customPhoto?: boolean;
            customPhotoURL?: string;
            bio?: string;
            interests?: string[];
          };

          const initialUsername =
            data.Username ||
            user.displayName ||
            user.email?.split("@")[0] ||
            "";
          setUsername(initialUsername);
          setDisplayUsername(initialUsername);
          setPhotoURL(data.photoURL || user.photoURL || null);
          if (data.customPhoto) {
            setPhotoURL(data.customPhotoURL || null);
          }
          setBio(data.bio || "");
          setDisplayBio(data.bio || "");
          setInterests(data.interests || []);
        } else {
          const fallbackName =
            user.displayName || user.email?.split("@")[0] || "NewUser";
          setUsername(fallbackName);
          setDisplayUsername(fallbackName);
          setPhotoURL(user.photoURL || null);
          setBio("");
          setDisplayBio("");
          setInterests([]);
        }
      } catch (err) {
        console.error(err);
        setMessage("Error loading profile.");
      } finally {
        setLoadingProfile(false);
      }
    };

    if (!authLoading) {
      fetchProfile();
    }
  }, [user, authLoading]);

  // Save username
  const handleSaveUsername = async () => {
    if (!user) return;
    setSavingUsername(true);
    setMessage(null);

    try {
      const userRef = doc(db, "Users", user.uid);
      await setDoc(userRef, { Username: username }, { merge: true });
      setDisplayUsername(username);
      setIsEditingUsername(false);
      setMessage("Username updated!");
    } catch (err) {
      console.error(err);
      setMessage("Error saving username.");
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
      const userRef = doc(db, "Users", user.uid);
      await setDoc(userRef, { bio: bio }, { merge: true });
      setDisplayBio(bio);
      setIsEditingBio(false);
      setMessage("Bio updated!");
    } catch (err) {
      console.error(err);
      setMessage("Error saving bio.");
    } finally {
      setSavingBio(false);
    }
  };

  // Save interests
  const handleSaveInterests = async () => {
    if (!user) return;
    setMessage(null);

    try {
      const userRef = doc(db, "Users", user.uid);
      await setDoc(userRef, { interests: interests }, { merge: true });
      setMessage("Interests updated!");
    } catch (err) {
      console.error(err);
      setMessage("Error saving interests.");
    }
  };

  // Add interest
  const handleAddInterest = () => {
    if (newInterest.trim() && !interests.includes(newInterest.trim())) {
      const updated = [...interests, newInterest.trim()];
      setInterests(updated);
      setNewInterest("");
      handleSaveInterests();
    }
  };

  // Remove interest
  const handleRemoveInterest = (interestToRemove: string) => {
    const updated = interests.filter((i) => i !== interestToRemove);
    setInterests(updated);
    handleSaveInterests();
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
      const userRef = doc(db, "Users", user.uid);
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
      setMessage("Profile picture updated!");
    } catch (err) {
      console.error(err);
      setMessage("Error uploading profile picture.");
    } finally {
      setUploadingPhoto(false);
      // Reset file input so same file can be selected again if needed
      e.target.value = "";
    }
  };

  if (authLoading || loadingProfile) {
    return <p className="p-4">Loading profile…</p>;
  }

  if (!user) {
    router.push("/login");
    return;
  }

  return (
    <div className="max-w-md mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold mt-10">Profile</h1>

      {/* Profile Picture */}
      <div className="flex flex-col items-center space-y-3">
        <div className="relative h-24 w-24 rounded-full overflow-hidden border">
          {photoURL ? (
            <Image src={photoURL} alt="Profile" fill className="object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-xl bg-gray-200">
              {displayUsername.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <label className="text-sm">
          <span className="px-3 py-1 rounded border cursor-pointer text-xs">
            {uploadingPhoto ? "Uploading…" : "Change profile picture"}
          </span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoChange}
            disabled={uploadingPhoto}
          />
        </label>
      </div>

      {/* Username section */}
      <div className="space-y-2">
        <p className="text-sm text-gray-500">Username</p>
        {!isEditingUsername ? (
          <div className="flex items-center justify-between">
            <span className="text-base font-medium">{displayUsername}</span>
            <button
              onClick={() => {
                setUsername(displayUsername);
                setIsEditingUsername(true);
                setMessage(null);
              }}
              className="text-sm px-3 py-1 rounded border"
            >
              Edit
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <input
              className="w-full border rounded px-3 py-2 text-sm"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveUsername}
                disabled={savingUsername}
                className="px-4 py-1 rounded bg-blue-600 text-white text-sm disabled:opacity-60"
              >
                {savingUsername ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => {
                  setUsername(displayUsername);
                  setIsEditingUsername(false);
                }}
                className="px-4 py-1 rounded border text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bio section */}
      <div className="space-y-2">
        <p className="text-sm text-gray-500">Bio</p>
        {!isEditingBio ? (
          <div className="flex items-start justify-between">
            <p className="text-base text-gray-700 flex-1">
              {displayBio || "No bio yet. Click Edit to add one."}
            </p>
            <button
              onClick={() => {
                setBio(displayBio);
                setIsEditingBio(true);
                setMessage(null);
              }}
              className="text-sm px-3 py-1 rounded border ml-2"
            >
              Edit
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <textarea
              className="w-full border rounded px-3 py-2 text-sm min-h-[100px]"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              maxLength={500}
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveBio}
                disabled={savingBio}
                className="px-4 py-1 rounded bg-blue-600 text-white text-sm disabled:opacity-60"
              >
                {savingBio ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => {
                  setBio(displayBio);
                  setIsEditingBio(false);
                }}
                className="px-4 py-1 rounded border text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Interests section */}
      <div className="space-y-2">
        <p className="text-sm text-gray-500">Interests</p>
        <div className="flex flex-wrap gap-2 mb-2">
          {interests.map((interest, index) => (
            <span
              key={index}
              className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center gap-2"
            >
              {interest}
              <button
                onClick={() => handleRemoveInterest(interest)}
                className="text-blue-600 hover:text-blue-800"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            className="flex-1 border rounded px-3 py-2 text-sm"
            value={newInterest}
            onChange={(e) => setNewInterest(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddInterest();
              }
            }}
            placeholder="Add an interest..."
          />
          <button
            onClick={handleAddInterest}
            className="px-4 py-2 rounded bg-blue-600 text-white text-sm"
          >
            Add
          </button>
        </div>
      </div>

      {message && <p className="text-sm text-gray-700">{message}</p>}
    </div>
  );
}
