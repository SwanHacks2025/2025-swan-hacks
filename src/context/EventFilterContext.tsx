"use client"

import { createContext, useContext, useState, ReactNode } from "react"
import { DateRange } from "react-day-picker"

export type FilterItem = string
export type FilterCategory = {
  name: string
  items: FilterItem[]
}

export type EventFilterContextType = {
  filters: FilterCategory[]
  // selected filter items
  selectedFilters: Record<string, Set<FilterItem>>
  toggleFilter: (category: string, item: FilterItem) => void

  // date range
  dateRange?: DateRange
  setDateRange: (range: DateRange | undefined) => void
}

const initialFilters: FilterCategory[] = [
  { name: "Attendance", items: ["Organizing", "Attendee"] },
  { name: "Category", items: ["Volunteering", "Sports", "Tutoring"] },
]

const EventFilterContext = createContext<EventFilterContextType | undefined>(
  undefined
)

export function EventFilterProvider({ children }: { children: ReactNode }) {
  const [dateRange, setDateRange] = useState<DateRange>()
  const [selectedFilters, setSelectedFilters] = useState<
    Record<string, Set<FilterItem>>
  >(() => {
    // Initialize all categories as empty sets
    const init: Record<string, Set<FilterItem>> = {}
    initialFilters.forEach((f) => (init[f.name] = new Set()))
    return init
  })

  const toggleFilter = (category: string, item: FilterItem) => {
    setSelectedFilters((prev) => {
      const updated = { ...prev }
      const setForCategory = new Set(updated[category]) // clone
      if (setForCategory.has(item)) {
        setForCategory.delete(item)
      } else {
        setForCategory.add(item)
      }
      updated[category] = setForCategory
      return updated
    })
  }

  return (
    <EventFilterContext.Provider
      value={{ filters: initialFilters, dateRange, setDateRange, selectedFilters, toggleFilter }}
    >
      {children}
    </EventFilterContext.Provider>
  )
}

export function useEventFilter() {
  const ctx = useContext(EventFilterContext)
  if (!ctx) throw new Error("useEventFilter must be used inside EventFilterProvider")
  return ctx
}
