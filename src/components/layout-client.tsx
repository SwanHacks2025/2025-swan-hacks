"use client";

import { useState } from "react";
import { Navbar } from "@/components/navbar";
import { AuthModal } from "@/components/auth-modal";

type AuthMode = "login" | "signup";

export function LayoutClient({ children }: { children: React.ReactNode }) {
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

  return (
    <>
      <Navbar onLoginClick={openLoginModal} onSignupClick={openSignupModal} />
      {children}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
      />
    </>
  );
}
