// app/signup/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db, googleProvider } from "@/lib/firebaseClient";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

export default function SignupPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Helper to create Firestore user doc if it doesn't exist
  const ensureUserDoc = async (uid: string, username: string, extra?: any) => {
    const userRef = doc(db, "Users", uid);
    const existing = await getDoc(userRef);

    if (existing.exists()) {
      // Don't overwrite, just touch lastLogin / updatedAt
      await setDoc(
        userRef,
        {
          lastLogin: serverTimestamp(),
          updatedAt: serverTimestamp(),
          ...(extra || {}),
        },
        { merge: true }
      );
      return;
    }

    await setDoc(userRef, {
      Username: username,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
      ...(extra || {}),
    });
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    if (!email || !password) {
      setStatus("Please provide an email and password.");
      return;
    }
    if (password !== confirm) {
      setStatus("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const user = cred.user;

      // Set a default displayName if it's empty
      const username = user.displayName || email.split("@")[0] || "NewUser";
      if (!user.displayName) {
        await updateProfile(user, { displayName: username });
      }

      await ensureUserDoc(user.uid, username, {
        email: user.email || null,
        displayName: user.displayName || username,
        photoURL: user.photoURL || null,
      });

      setStatus("Account created! Redirecting…");
      router.push("/profile");
    } catch (err: any) {
      console.error(err);
      setStatus(err.message || "Error creating account.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setStatus(null);
    try {
      setLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;

      const username =
        firebaseUser.displayName ||
        firebaseUser.email?.split("@")[0] ||
        "NewUser";

      await ensureUserDoc(firebaseUser.uid, username, {
        email: firebaseUser.email || null,
        displayName: firebaseUser.displayName || null,
        photoURL: firebaseUser.photoURL || null,
      });

      setStatus("Signed in with Google! Redirecting…");
      router.push("/profile");
    } catch (err: any) {
      console.error(err);
      setStatus(err.message || "Error with Google sign in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <h1 className="text-2xl font-bold text-center">Create an account</h1>

        <form onSubmit={handleEmailSignup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              autoComplete="email"
              className="w-full border rounded px-3 py-2 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              autoComplete="new-password"
              className="w-full border rounded px-3 py-2 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              autoComplete="new-password"
              className="w-full border rounded px-3 py-2 text-sm"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 rounded bg-blue-600 text-white text-sm font-medium disabled:opacity-60"
          >
            {loading ? "Creating account…" : "Sign up with email"}
          </button>
        </form>

        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-gray-300" />
          <span className="text-xs text-gray-500">OR</span>
          <div className="h-px flex-1 bg-gray-300" />
        </div>

        <button
          onClick={handleGoogleSignup}
          disabled={loading}
          className="w-full px-4 py-2 rounded bg-red-500 text-white text-sm font-medium disabled:opacity-60"
        >
          Continue with Google
        </button>

        <p className="text-xs text-center text-gray-600">
          Already have an account?{" "}
          <a href="/login" className="text-blue-600 underline">
            Log in
          </a>
        </p>

        {status && (
          <p className="text-sm text-center text-gray-700 mt-2">{status}</p>
        )}
      </div>
    </main>
  );
}
