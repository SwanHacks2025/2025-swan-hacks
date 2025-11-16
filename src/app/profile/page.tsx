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

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingUsername, setSavingUsername] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [message, setMessage] = useState<string | null>(null);
  const [isEditingUsername, setIsEditingUsername] = useState(false);

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
        } else {
          const fallbackName =
            user.displayName || user.email?.split("@")[0] || "NewUser";
          setUsername(fallbackName);
          setDisplayUsername(fallbackName);
          setPhotoURL(user.photoURL || null);
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
      <h1 className="text-2xl font-bold">Profile</h1>

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

      {message && <p className="text-sm text-gray-700">{message}</p>}
    </div>
  );
}
