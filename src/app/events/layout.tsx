import { EventFilterProvider } from "@/context/EventFilterContext"

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <EventFilterProvider>
      {children}
    </EventFilterProvider>
  )
}