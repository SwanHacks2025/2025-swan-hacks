import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { EventSidebar } from "@/components/event-sidebar"
import { EventFilterProvider } from "@/context/EventFilterContext"

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 80)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <EventFilterProvider>
        <EventSidebar variant="inset" />
        <SidebarInset>
          {children}
        </SidebarInset>
      </EventFilterProvider>
    </SidebarProvider>
  )
}