// app/profile/page.tsx
"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebaseClient";
import {
  onAuthStateChanged,
  User,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Listen for auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setLoading(false);
        return;
      }

      const userRef = doc(db, "Users", firebaseUser.uid);
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        const data = snap.data() as { Username?: string };
        setUsername(data.Username || firebaseUser.displayName || "");
      } else {
        // Default to displayName if no doc
        setUsername(firebaseUser.displayName || "");
      }

      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setMessage(null);

    try {
      const userRef = doc(db, "Users", user.uid);

      // Set field "Username" at /Users/<uid>
      await setDoc(
        userRef,
        { Username: username },
        { merge: true }
      );

      setMessage("Username updated!");
    } catch (err: any) {
      console.error(err);
      setMessage("Error saving username.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="p-4">Loading profile…</p>;
  }

  if (!user) {
    return <p className="p-4">You must be logged in to view your profile.</p>;
  }

  return (
    <div className="max-w-md mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">Profile</h1>

      <div className="space-y-1">
        <p className="text-sm text-gray-500">User ID</p>
        <p className="font-mono text-sm break-all">{user.uid}</p>
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium">Username</label>
        <input
          className="w-full border rounded px-3 py-2 text-sm"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter your username"
        />
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="px-4 py-2 rounded bg-blue-600 text-white text-sm disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save"}
      </button>

      {message && (
        <p className="text-sm text-gray-700">{message}</p>
      )}
      
    </div>
  );
}
