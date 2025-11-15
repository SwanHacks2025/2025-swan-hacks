import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto min-h-screen px-6 py-12 sm:px-8 lg:px-16">
        <div className="mb-8 flex min-h-[50vh] items-center justify-between sm:min-h-[55vh] lg:min-h-[60vh]">
          <div className="flex flex-col">
            <h1 className="text-6xl font-bold tracking-tight text-foreground sm:text-7xl md:text-8xl lg:text-9xl">
              Gather
              <br />
              Point
            </h1>
          </div>
          <div className="flex h-32 w-32 items-center justify-center rounded-full border-2 border-foreground/20 bg-muted/50 sm:h-40 sm:w-40 lg:h-48 lg:w-48">
            <Image
              src="/GatherPointLogo.svg"
              alt="Gather Point Logo"
              width={128}
              height={128}
              className="h-20 w-20 sm:h-28 sm:w-28 lg:h-36 lg:w-36"
              priority
            />
          </div>
        </div>

        <div className="flex flex-col space-y-6 sm:space-y-8">
          <div className="space-y-3 sm:space-y-4">
            <p className="text-2xl font-semibold leading-tight text-foreground sm:text-3xl lg:text-4xl">
              Find your Community.
            </p>
            <p className="text-2xl font-semibold leading-tight text-foreground sm:text-3xl lg:text-4xl">
              Start something.
            </p>
            <p className="text-2xl font-semibold leading-tight text-foreground sm:text-3xl lg:text-4xl">
              Join something.
            </p>
          </div>

          <div className="flex flex-col gap-4 pt-8 sm:flex-row sm:gap-6">
            <Button asChild size="lg" className="text-base sm:text-lg">
              <Link href="#">Get Started</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="text-base sm:text-lg"
            >
              <Link href="#">Learn More</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
