"use client";

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CalendarIcon, Plus } from "lucide-react"
import { SidebarMenuButton } from "./ui/sidebar"
import { Textarea } from "./ui/textarea"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "./ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@radix-ui/react-popover"
import { useState } from "react"
import { format } from "date-fns"
import { Calendar } from "./ui/calendar";

export function EventDialog() {
  const [date, setDate] = useState<Date>()

  return (
    <Dialog>
      <form>
        <DialogTrigger asChild>
          <SidebarMenuButton>
              <Plus />
              <span>Create new event</span>
          </SidebarMenuButton>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create new event</DialogTitle>
            <DialogDescription>
              Schedule a new event in you&apos;re community.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-3">
              <Label htmlFor="name-1">Name</Label>
              <Input id="name-1" name="name" placeholder="Cleanup in the Park" />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="description-1">Description</Label>
              <Textarea id="description-1" name="description" placeholder="A brief description of your event" />
            </div>
            <div className="grid gap-5">
                <Select>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select an category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Category</SelectLabel>
                      <SelectItem value="volunteeting">Volunteering</SelectItem>
                      <SelectItem value="sports">Sports</SelectItem>
                      <SelectItem value="tutoring">Tutoring</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
            </div>
            <div className="grid gap-5">
               <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    data-empty={!date}
                    className="data-[empty=true]:text-muted-foreground w-[280px] justify-start text-left font-normal"
                  >
                    <CalendarIcon />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={date} onSelect={setDate} />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit">Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </form>
    </Dialog>
  )
}
