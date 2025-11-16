"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type AuthMode = "login" | "signup";

interface AuthModalContextType {
  openLoginModal: () => void;
  openSignupModal: () => void;
  isOpen: boolean;
  mode: AuthMode;
  closeModal: () => void;
}

const AuthModalContext = createContext<AuthModalContextType | undefined>(
  undefined
);

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");

  const openLoginModal = () => {
    setAuthMode("login");
    setAuthModalOpen(true);
  };

  const openSignupModal = () => {
    setAuthMode("signup");
    setAuthModalOpen(true);
  };

  const closeModal = () => {
    setAuthModalOpen(false);
  };

  return (
    <AuthModalContext.Provider
      value={{
        openLoginModal,
        openSignupModal,
        isOpen: authModalOpen,
        mode: authMode,
        closeModal,
      }}
    >
      {children}
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const context = useContext(AuthModalContext);
  if (context === undefined) {
    throw new Error("useAuthModal must be used within an AuthModalProvider");
  }
  return context;
}

