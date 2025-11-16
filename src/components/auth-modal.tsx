'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db, googleProvider } from '@/lib/firebaseClient';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type AuthMode = 'login' | 'signup';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: AuthMode;
}

export function AuthModal({
  isOpen,
  onClose,
  initialMode = 'login',
}: AuthModalProps) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Sync mode with initialMode when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
    }
  }, [isOpen, initialMode]);

  const ensureUserDoc = async (uid: string, username: string, extra?: any) => {
    const userRef = doc(db, 'Users', uid);
    const existing = await getDoc(userRef);

    if (existing.exists()) {
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

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    if (!email || !password) {
      setStatus('Please provide an email and password.');
      return;
    }

    try {
      setLoading(true);
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const user = cred.user;

      const username = user.displayName || user.email?.split('@')[0] || 'User';

      await ensureUserDoc(user.uid, username, {
        email: user.email || null,
        displayName: user.displayName || null,
        photoURL: user.photoURL || null,
      });

      setStatus('Logged in! Redirecting…');
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err: any) {
      console.error(err);
      setStatus(err.message || 'Error logging in.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    if (!email || !password) {
      setStatus('Please provide an email and password.');
      return;
    }
    if (password !== confirm) {
      setStatus('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const user = cred.user;

      const username = user.displayName || email.split('@')[0] || 'NewUser';
      if (!user.displayName) {
        await updateProfile(user, { displayName: username });
      }

      await ensureUserDoc(user.uid, username, {
        email: user.email || null,
        displayName: user.displayName || username,
        photoURL: user.photoURL || null,
      });

      setStatus('Account created! Redirecting…');
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err: any) {
      console.error(err);
      setStatus(err.message || 'Error creating account.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setStatus(null);
    try {
      setLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;

      const username =
        firebaseUser.displayName ||
        firebaseUser.email?.split('@')[0] ||
        'NewUser';

      await ensureUserDoc(firebaseUser.uid, username, {
        email: firebaseUser.email || null,
        displayName: firebaseUser.displayName || null,
        photoURL: firebaseUser.photoURL || null,
      });

      setStatus('Signed in with Google! Redirecting…');
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err: any) {
      console.error(err);
      setStatus(err.message || 'Error with Google sign in.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirm('');
    setStatus(null);
    setLoading(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            {mode === 'login' ? 'Log in' : 'Create an account'}
          </DialogTitle>
          <DialogDescription className="text-center">
            {mode === 'login'
              ? 'Welcome back! Log in to continue'
              : 'Join GatherPoint today'}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={mode === 'login' ? handleEmailLogin : handleEmailSignup}
          className="space-y-4 mt-4"
        >
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete={
                mode === 'login' ? 'current-password' : 'new-password'
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {mode === 'signup' && (
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm Password</Label>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
          )}

          <Button type="submit" className="w-full cursor-pointer" disabled={loading}>
            {loading
              ? mode === 'login'
                ? 'Logging in…'
                : 'Creating account…'
              : mode === 'login'
              ? 'Log in with email'
              : 'Sign up with email'}
          </Button>
        </form>

        <div className="flex items-center gap-2 my-4">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">OR</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <Button
          onClick={handleGoogleAuth}
          disabled={loading}
          variant="outline"
          className="w-full cursor-pointer"
        >
          Continue with Google
        </Button>

        <p className="text-xs text-center text-muted-foreground mt-4">
          {mode === 'login' ? (
            <>
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  resetForm();
                }}
                className="text-primary underline hover:no-underline cursor-pointer"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  resetForm();
                }}
                className="text-primary underline hover:no-underline cursor-pointer"
              >
                Log in
              </button>
            </>
          )}
        </p>

        {status && (
          <p className="text-sm text-center text-muted-foreground mt-2">
            {status}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
