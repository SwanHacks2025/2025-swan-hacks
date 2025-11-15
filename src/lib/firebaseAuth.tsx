"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  onAuthStateChanged,
  User,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

import { auth, db, googleProvider } from "@/lib/firebaseClient";

import { useRouter } from "next/navigation";


type AuthContextType = {
  user: User | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  loginWithGoogle: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();


  // Listen for auth state changes and persist login across refreshes
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // ---------------------------------------------------------
  // GOOGLE LOGIN HANDLER (moved from LandingPage)
  // ---------------------------------------------------------
  const loginWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    const firebaseUser = result.user;

    const userRef = doc(db, "Users", firebaseUser.uid);
    const existing = await getDoc(userRef);

    // Don't overwrite existing user data
    if (existing.exists()) {
      await setDoc(
        userRef,
        { lastLogin: serverTimestamp() },
        { merge: true }
      );
      return;
    }

    const username =
      firebaseUser.displayName ||
      firebaseUser.email?.split("@")[0] ||
      "NewUser";

    // Create new user doc
    await setDoc(userRef, {
      Username: username,
      email: firebaseUser.email || null,
      displayName: firebaseUser.displayName || null,
      photoURL: firebaseUser.photoURL || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
    });
  };

  // ---------------------------------------------------------
  // LOGOUT HANDLER
  // ---------------------------------------------------------
  const logout = async () => {

    await signOut(auth).then(() => {
      router.push("/")
      });     
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        loginWithGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
