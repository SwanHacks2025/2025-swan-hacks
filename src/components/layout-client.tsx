"use client";

import { Navbar } from "@/components/navbar";
import { AuthModal } from "@/components/auth-modal";
import { AuthModalProvider, useAuthModal } from "@/context/AuthModalContext";

function LayoutClientInner({ children }: { children: React.ReactNode }) {
  const { openLoginModal, openSignupModal, isOpen, mode, closeModal } =
    useAuthModal();

  return (
    <>
      <Navbar onLoginClick={openLoginModal} onSignupClick={openSignupModal} />
      {children}
      <AuthModal
        isOpen={isOpen}
        onClose={closeModal}
        initialMode={mode}
      />
    </>
  );
}

export function LayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <AuthModalProvider>
      <LayoutClientInner>{children}</LayoutClientInner>
    </AuthModalProvider>
  );
}
