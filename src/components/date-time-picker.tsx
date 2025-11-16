"use client"

import * as React from "react"
import { ChevronDownIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export function DateTimePicker() {
  const [open, setOpen] = React.useState(false)
  const [date, setDate] = React.useState<Date | undefined>(undefined)

  const [startTime, setStartTime] = React.useState("10:30")
  const [endTime, setEndTime] = React.useState("11:30")

  return (
    <div className="flex gap-4">

      <div className="flex flex-col gap-3">
        <Label htmlFor="date-picker" className="px-1">
          Date
        </Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              id="date-picker"
              className="w-32 justify-between font-normal"
            >
              {date ? date.toLocaleDateString() : "Select date"}
              <ChevronDownIcon />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto overflow-hidden p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => {
                setDate(d)
                setOpen(false)
              }}
            />
          </PopoverContent>
        </Popover>

        <input
          type="hidden"
          name="date"
          value={date ? date.toISOString().split("T")[0] : ""}
        />
      </div>

      <div className="flex flex-col gap-3">
        <Label htmlFor="start-time-picker" className="px-1">
          Start Time
        </Label>
        <Input
          type="time"
          id="start-time-picker"
          name="startTime"
          step="60"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
        />

        <input type="hidden" name="startTime" value={startTime} />
      </div>


      <div className="flex flex-col gap-3">
        <Label htmlFor="end-time-picker" className="px-1">
          End Time
        </Label>
        <Input
          type="time"
          id="end-time-picker"
          name="endTime"
          step="60"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          className="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
        />

        <input type="hidden" name="endTime" value={endTime} />
      </div>

    </div>
  )
}
