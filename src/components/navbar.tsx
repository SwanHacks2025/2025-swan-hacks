'use client';

import Link from 'next/link';
import { Equal, X } from 'lucide-react';
import { Button } from '@/components/liquid-glass-button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import React from 'react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useAuth } from '@/lib/firebaseAuth';
import { db } from '@/lib/firebaseClient';
import { doc, getDoc } from 'firebase/firestore';
import { usePathname } from 'next/navigation';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/theme-toggle';

const menuItems = [
  { name: 'Map', href: '/map' },
  { name: 'Events', href: '/events' },
  { name: 'Friends', href: '/friends' },
  { name: 'About', href: '/about' },
];

interface NavbarProps {
  onLoginClick: () => void;
  onSignupClick: () => void;
}

export const Navbar = ({ onLoginClick, onSignupClick }: NavbarProps) => {
  const { user, loading, loginWithGoogle, logout } = useAuth();
  const isSignedIn = !!user;
  const pathname = usePathname();

  const [menuState, setMenuState] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Show floating state when scrolled OR on specific pages
  const isFloating =
    isScrolled ||
    pathname === '/map' ||
    pathname === '/friends' ||
    pathname === '/profile' ||
    pathname === '/events';

  // Load avatar the same way as ProfilePage
  React.useEffect(() => {
    if (!user) {
      setAvatarUrl(null);
      return;
    }

    const fetchAvatar = async () => {
      try {
        const userRef = doc(db, 'Users', user.uid);
        const snap = await getDoc(userRef);

        if (snap.exists()) {
          const data = snap.data() as {
            photoURL?: string;
            customPhoto?: boolean;
            customPhotoURL?: string;
          };

          let url: string | null = data.photoURL || user.photoURL || null;

          if (data.customPhoto && data.customPhotoURL) {
            url = data.customPhotoURL;
          }

          setAvatarUrl(url);
        } else {
          // no Firestore doc, fallback to auth photo
          setAvatarUrl(user.photoURL || null);
        }
      } catch (err) {
        console.error('Error loading navbar avatar:', err);
        setAvatarUrl(user.photoURL || null);
      }
    };

    fetchAvatar();
  }, [user]);

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'User';

  return (
    <header>
      <nav
        data-state={menuState && 'active'}
        className="fixed left-0 w-full z-1000 px-2 mt-2"
      >
        <div
          className={cn(
            'mx-auto max-w-7xl px-6 transition-all duration-300 lg:px-12',
            isFloating &&
              'bg-background/70 max-w-6xl rounded-2xl border border-border backdrop-blur-xl mt-2 lg:px-5 shadow-lg'
          )}
        >
          <div className="relative flex flex-wrap items-center justify-between gap-6 lg:gap-0 py-2">
            {/* Logo + mobile menu button */}
            <div className="flex w-full justify-between lg:w-auto">
              <Link
                href="/"
                aria-label="home"
                className="flex gap-2 items-center hover:opacity-90 transition-opacity"
              >
                <Image
                  src="/GatherPointLogo.svg"
                  alt="Gather Point"
                  width={48}
                  height={48}
                />
                <p className="font-semibold text-xl tracking-tighter text-foreground [font-family:var(--font-fugaz)]">
                  Gather <span className="text-primary">P<span className="text-[#ff4958]">o</span>int</span>
                </p>
              </Link>

              <button
                onClick={() => setMenuState(!menuState)}
                aria-label={menuState ? 'Close Menu' : 'Open Menu'}
                className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5 lg:hidden text-foreground"
              >
                <Equal className="in-data-[state=active]:rotate-180 in-data-[state=active]:scale-0 in-data-[state=active]:opacity-0 m-auto size-6 duration-200" />
                <X className="in-data-[state=active]:rotate-0 in-data-[state=active]:scale-100 in-data-[state=active]:opacity-100 absolute inset-0 m-auto size-6 -rotate-180 scale-0 opacity-0 duration-200" />
              </button>
            </div>

            {/* Center menu (desktop) only if signed in */}
            {isSignedIn && (
              <div className="absolute inset-0 m-auto hidden size-fit lg:block">
                <ul className="flex gap-6">
                  {menuItems.map((item, index) => (
                    <li key={index}>
                      <Link
                        href={item.href}
                        className={cn(
                          'px-4 py-2 rounded-lg transition-all duration-200 text-base font-semibold',
                          pathname === item.href
                            ? 'text-primary bg-primary/15 shadow-sm'
                            : 'text-foreground/80 hover:text-primary hover:bg-primary/8'
                        )}
                      >
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Right side (auth, avatar, mobile menu) */}
            <div className="bg-background in-data-[state=active]:block lg:in-data-[state=active]:flex mb-6 hidden w-full flex-wrap items-center justify-end space-y-8 rounded-3xl border p-6 shadow-2xl shadow-zinc-300/20 md:flex-nowrap lg:m-0 lg:flex lg:w-fit lg:gap-6 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none dark:shadow-none dark:lg:bg-transparent">
              {isSignedIn && (
                <div className="lg:hidden">
                  <ul className="space-y-2">
                    {menuItems.map((item, index) => (
                      <li key={index}>
                        <Link
                          href={item.href}
                          className={cn(
                            'block px-4 py-2 rounded-lg transition-all duration-200 text-base font-semibold',
                            pathname === item.href
                              ? 'text-primary bg-primary/15 shadow-sm'
                              : 'text-foreground/80 hover:text-primary hover:bg-primary/8'
                          )}
                        >
                          {item.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex w-full flex-col space-y-3 sm:flex-row sm:gap-2 sm:space-y-0 md:w-fit">
                {!isSignedIn ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={loading}
                      onClick={onLoginClick}
                      className="cursor-pointer"
                    >
                      <span>{loading ? 'Loading…' : 'Log In'}</span>
                    </Button>

                    <Button
                      size="sm"
                      disabled={loading}
                      onClick={onSignupClick}
                      className="cursor-pointer"
                    >
                      <span>Sign Up</span>
                    </Button>

                    <ThemeToggle />
                  </>
                ) : (
                  <>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="inline-flex items-center justify-center gap-2.5 h-10 px-3 py-2 rounded-lg hover:bg-primary/10 transition-colors cursor-pointer"
                          aria-label="Open user menu"
                        >
                          <Avatar className="h-8 w-8">
                            {avatarUrl && (
                              <AvatarImage
                                key={avatarUrl} // 🔑 force re-mount when URL changes
                                src={avatarUrl}
                              />
                            )}
                            <AvatarFallback className="text-xs font-semibold">
                              {displayName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>

                          <span className="text-sm font-semibold hidden sm:inline">
                            {displayName}
                          </span>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuLabel className="text-xs">
                          {displayName}
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href="/profile" className="cursor-pointer">
                            Profile
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={logout}
                          className="cursor-pointer"
                        >
                          <Link href="/" className="cursor-pointer">
                            Sign out
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <ThemeToggle />
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
};
