"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DateTimePickerProps {
  date: Date | null;
  setDate: (date: Date) => void;
  className?: string;
  minDate?: Date;
}

export function DateTimePicker({ date, setDate, className, minDate }: DateTimePickerProps) {
  const minutesList = Array.from({ length: 4 }, (_, i) => i * 15);
  const hoursList = Array.from({ length: 24 }, (_, i) => i);

  const handleSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      const newDate = new Date(selectedDate);
      if (date) {
        newDate.setHours(date.getHours());
        newDate.setMinutes(date.getMinutes());
      } else {
        newDate.setHours(0);
        newDate.setMinutes(0);
      }
      setDate(newDate);
    }
  };

  const handleTimeChange = (type: "hours" | "minutes", value: string) => {
    if (!date) return;
    
    const newDate = new Date(date);
    if (type === "hours") {
      newDate.setHours(parseInt(value, 10));
    } else {
      newDate.setMinutes(parseInt(value, 10));
    }
    setDate(newDate);
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "PPP HH:mm") : <span>Pick a date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date || undefined}
            onSelect={handleSelect}
            initialFocus
            disabled={(currentDate: Date) => minDate ? currentDate < minDate : false}
          />
          {date && (
            <div className="flex items-center gap-2 border-t p-3">
              <Select
                value={date.getHours().toString()}
                onValueChange={(value: string) => handleTimeChange("hours", value)}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="Hours" />
                </SelectTrigger>
                <SelectContent>
                  {hoursList.map((hour) => (
                    <SelectItem key={hour} value={hour.toString()}>
                      {hour.toString().padStart(2, "0")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span>:</span>
              <Select
                value={date.getMinutes().toString()}
                onValueChange={(value: string) => handleTimeChange("minutes", value)}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="Minutes" />
                </SelectTrigger>
                <SelectContent>
                  {minutesList.map((minute) => (
                    <SelectItem key={minute} value={minute.toString()}>
                      {minute.toString().padStart(2, "0")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
} 