"use client";

import { Calendar } from "@/components/ui/calendar"

import {
  SidebarGroup,
  SidebarGroupContent,
} from "@/components/ui/sidebar"
import { useEventFilter } from "@/context/EventFilterContext"

export function DatePicker() {
  const { dateRange, setDateRange } = useEventFilter()

  return (
    <SidebarGroup className="px-0">
      <SidebarGroupContent>
        <Calendar 
          mode="range"
          selected={dateRange}
          onSelect={setDateRange}
          className="[&_[role=gridcell].bg-accent]:bg-sidebar-primary [&_[role=gridcell].bg-accent]:text-sidebar-primary-foreground [&_[role=gridcell]]:w-[40px]"
        />
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
