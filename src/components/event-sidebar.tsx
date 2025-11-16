import * as React from "react"
import { Plus, Filter } from "lucide-react"

import { EventFilters } from "@/components/event-filters"
import { DatePicker } from "@/components/date-picker"
import { EventSearch } from "@/components/event-search"
import { EventCalendar } from "@/components/event-calendar"
import { AIEventSuggestions } from "@/components/ai-event-suggestions"
import { useAuth } from "@/lib/firebaseAuth"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { EventDialog } from "./event-create"

export function EventSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth();
  
  return (
    <Sidebar {...props}>
      <SidebarHeader className="border-border/50 h-16 border-b bg-background/80 backdrop-blur-sm px-6">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-[#ff4958]" />
          <h2 className="font-bold text-lg">Filters</h2>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-4">
        <div className="space-y-6 py-6">
          <EventSearch />
          <SidebarSeparator className="mx-0 bg-border/50" />
          <DatePicker />
          <SidebarSeparator className="mx-0 bg-border/50" />
          <EventFilters />
          {user && (
            <>
              <SidebarSeparator className="mx-0 bg-border/50" />
              <EventCalendar user={user} />
            </>
          )}
          <SidebarSeparator className="mx-0 bg-border/50" />
          <AIEventSuggestions />
        </div>
      </SidebarContent>
      <SidebarFooter className="border-t border-border/50 bg-background/50 p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <EventDialog />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
