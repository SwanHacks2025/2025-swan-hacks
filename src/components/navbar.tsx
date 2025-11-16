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
  { name: 'About', href: '/about' },
];

export const Navbar = () => {
  const { user, loading, logout } = useAuth();
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

  // Show floating state when scrolled OR on the map page
  const isFloating = isScrolled || pathname === '/map';

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
        className="fixed left-0 w-full z-20 px-2"
      >
        <div
          className={cn(
            'mx-auto max-w-6xl px-6 transition-all duration-300 lg:px-12',
            isFloating &&
              'bg-background/50 max-w-4xl rounded-2xl border backdrop-blur-lg mt-2 lg:px-5'
          )}
        >
          <div className="relative flex flex-wrap items-center justify-between gap-6 lg:gap-0 py-2">
            {/* Logo + mobile menu button */}
            <div className="flex w-full justify-between lg:w-auto">
              <Link
                href="/"
                aria-label="home"
                className="flex gap-2 items-center"
              >
                <Image
                  src="/GatherPointLogo.svg"
                  alt="Gather Point"
                  width={48}
                  height={48}
                />
                <p className="font-semibold text-xl tracking-tighter">
                  Gather Point
                </p>
              </Link>

              <button
                onClick={() => setMenuState(!menuState)}
                aria-label={menuState ? 'Close Menu' : 'Open Menu'}
                className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5 lg:hidden"
              >
                <Equal className="in-data-[state=active]:rotate-180 in-data-[state=active]:scale-0 in-data-[state=active]:opacity-0 m-auto size-6 duration-200" />
                <X className="in-data-[state=active]:rotate-0 in-data-[state=active]:scale-100 in-data-[state=active]:opacity-100 absolute inset-0 m-auto size-6 -rotate-180 scale-0 opacity-0 duration-200" />
              </button>
            </div>

            {/* Center menu (desktop) only if signed in */}
            {isSignedIn && (
              <div className="absolute inset-0 m-auto hidden size-fit lg:block">
                <ul className="flex gap-8 text-sm">
                  {menuItems.map((item, index) => (
                    <li key={index}>
                      <Link
                        href={item.href}
                        className="text-muted-foreground hover:text-accent-foreground block duration-150"
                      >
                        <span>{item.name}</span>
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
                  <ul className="space-y-6 text-base">
                    {menuItems.map((item, index) => (
                      <li key={index}>
                        <Link
                          href={item.href}
                          className="text-muted-foreground hover:text-accent-foreground block duration-150"
                        >
                          <span>{item.name}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex w-full flex-col space-y-3 sm:flex-row sm:gap-2 sm:space-y-0 md:w-fit">
                {!isSignedIn ? (
                  <>
                    <Link href="/login">
                      <Button size="sm" variant="outline" disabled={loading}>
                        <span>{loading ? 'Loading…' : 'Login'}</span>
                      </Button>
                    </Link>

                    <Link href="/signup">
                      <Button size="sm" disabled={loading}>
                        <span>Sign Up</span>
                      </Button>
                    </Link>
                    <ThemeToggle />
                  </>
                ) : (
                  <>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="flex items-center gap-2 rounded-lg p-2 hover:bg-primary/10 transition-colors"
                          aria-label="Open user menu"
                        >
                          <Avatar>
                            {avatarUrl && (
                              <AvatarImage
                                key={avatarUrl} // 🔑 force re-mount when URL changes
                                src={avatarUrl}
                              />
                            )}
                            <AvatarFallback>
                              {displayName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>

                          <span className="text-sm font-medium hidden sm:inline lg:inline">
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
                          <Link href="/profile">Profile</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={logout}
                          className="cursor-pointer"
                        >
                          <Link href="/">Sign out</Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
