'use client';

import Link from 'next/link';
import { Equal, X, LogOut } from 'lucide-react';
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
      {/* Mobile Menu Backdrop */}
      {menuState && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[999] lg:hidden"
          onClick={() => setMenuState(false)}
        />
      )}
      <nav
        data-state={menuState && 'active'}
        className="fixed left-0 w-full z-[1000] px-2 mt-2"
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
                  Gather{' '}
                  <span className="text-primary">
                    P<span className="text-[#ff4958]">o</span>int
                  </span>
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
                          'px-4 py-2 rounded-lg transition-all duration-200 text-base font-semibold cursor-pointer',
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
            <div
              className={cn(
                'hidden lg:flex lg:w-fit lg:gap-6 lg:items-center',
                menuState && 'block w-full'
              )}
            >
              {/* Mobile Menu Content */}
              {menuState && (
                <div
                  className={cn(
                    'lg:hidden w-full space-y-6 py-4',
                    !isFloating &&
                      'bg-background rounded-2xl border border-border p-6 shadow-lg'
                  )}
                >
                  {/* Mobile Navigation Links */}
                  {isSignedIn && (
                    <div className="space-y-1">
                      {menuItems.map((item, index) => (
                        <Link
                          key={index}
                          href={item.href}
                          onClick={() => {
                            setMenuState(false);
                          }}
                          className={cn(
                            'block px-4 py-3 rounded-lg transition-all duration-200 text-base font-semibold cursor-pointer',
                            pathname === item.href
                              ? 'text-primary bg-primary/15 shadow-sm'
                              : 'text-foreground/80 hover:text-primary hover:bg-primary/8'
                          )}
                        >
                          {item.name}
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Mobile User Section */}
                  {isSignedIn ? (
                    <div className="space-y-3 pt-4 border-t border-border">
                      {/* Profile Link */}
                      <Link
                        href="/profile"
                        onClick={() => setMenuState(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-primary/8 transition-colors cursor-pointer"
                      >
                        <Avatar className="h-10 w-10">
                          {avatarUrl && (
                            <AvatarImage key={avatarUrl} src={avatarUrl} />
                          )}
                          <AvatarFallback className="text-sm font-semibold">
                            {displayName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-foreground">
                            {displayName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            View Profile
                          </p>
                        </div>
                      </Link>

                      {/* Sign Out Link */}
                      <button
                        onClick={() => {
                          setMenuState(false);
                          logout();
                        }}
                        className="flex items-center gap-3 w-full px-4 py-3 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer text-red-500"
                      >
                        <LogOut className="h-4 w-4" />
                        <span className="text-base font-semibold">
                          Sign Out
                        </span>
                      </button>

                      {/* Theme Toggle */}
                      <div className="px-4" onClick={() => setMenuState(false)}>
                        <ThemeToggle />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 pt-4">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={loading}
                        onClick={() => {
                          setMenuState(false);
                          onLoginClick();
                        }}
                        className="w-full cursor-pointer"
                      >
                        <span>{loading ? 'Loading…' : 'Log In'}</span>
                      </Button>

                      <Button
                        size="sm"
                        disabled={loading}
                        onClick={() => {
                          setMenuState(false);
                          onSignupClick();
                        }}
                        className="w-full cursor-pointer"
                      >
                        <span>Sign Up</span>
                      </Button>

                      <div className="px-4">
                        <ThemeToggle />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Desktop Auth Section */}
              <div className="hidden lg:flex lg:items-center lg:gap-6">
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
                              <AvatarImage key={avatarUrl} src={avatarUrl} />
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
                          className="cursor-pointer text-red-500 focus:text-red-500 focus:bg-red-500/10"
                        >
                          Sign out
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
