'use client';
import Link from 'next/link';
import Image from 'next/image';
import {
  MapPin,
  Calendar,
  Users,
  Github,
} from 'lucide-react';
import { usePathname } from 'next/navigation';

export function Footer() {
  const pathname = usePathname();
  const currentYear = new Date().getFullYear();

  if (pathname === '/map' || pathname === '/friends') {
    return null;
  }

  return (
    <footer className="bg-background border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <Image
                src="/GatherPointLogo.svg"
                alt="Gather Point"
                width={40}
                height={40}
              />
              <span className="font-semibold text-xl tracking-tight text-foreground">
                Gather Point
              </span>
            </Link>
            <p className="text-muted-foreground text-sm mb-4 max-w-sm">
              Where communities connect and experiences begin. Discover local
              events, join communities, and create meaningful connections.
            </p>
            <div className="flex gap-4">
              <a
                href="https://github.com/SwanHacks2025/2025-swan-hacks"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                aria-label="GitHub"
              >
                <Github className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Navigation Links */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Explore</h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/map"
                  className="text-muted-foreground hover:text-primary transition-colors text-sm cursor-pointer flex items-center gap-2"
                >
                  <MapPin className="h-4 w-4" />
                  Map
                </Link>
              </li>
              <li>
                <Link
                  href="/events"
                  className="text-muted-foreground hover:text-primary transition-colors text-sm cursor-pointer flex items-center gap-2"
                >
                  <Calendar className="h-4 w-4" />
                  Events
                </Link>
              </li>
              <li>
                <Link
                  href="/communities"
                  className="text-muted-foreground hover:text-primary transition-colors text-sm cursor-pointer flex items-center gap-2"
                >
                  <Users className="h-4 w-4" />
                  Communities
                </Link>
              </li>
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Company</h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/about"
                  className="text-muted-foreground hover:text-primary transition-colors text-sm cursor-pointer"
                >
                  About
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-8 border-t border-border">
          <p className="text-center text-sm text-muted-foreground">
            © {currentYear} Gather Point. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
