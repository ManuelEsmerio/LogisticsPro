"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-[#151f35] text-foreground shadow-inner",
        className
      )}
      classNames={{
        months: "flex flex-col",
        month: "space-y-4",
        caption: "flex items-center justify-between",
        caption_label: "text-sm font-semibold text-slate-900 dark:text-white",
        nav: "flex items-center gap-2",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 p-0 hover:bg-slate-100 dark:hover:bg-slate-700"
        ),
        nav_button_previous: "",
        nav_button_next: "",
        table: "w-full border-collapse",
        head: "",
        head_row: "grid grid-cols-7 gap-y-1 text-center",
        head_cell:
          "text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2",
        weekdays: "grid grid-cols-7 gap-y-1 text-center",
        weekday:
          "text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2",
        row: "grid grid-cols-7 gap-y-1 text-center",
        cell: "p-0",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "aspect-square h-9 w-9 rounded-full text-sm font-medium text-slate-900 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-blue-500 text-white ring-2 ring-blue-500 ring-offset-2 ring-offset-white dark:ring-offset-[#151f35] shadow-[0_0_15px_rgba(59,130,246,0.5)]",
        day_today: "bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-slate-200 font-semibold",
        day_outside:
          "day-outside text-muted-foreground opacity-60 aria-selected:bg-accent/40 aria-selected:text-muted-foreground",
        day_disabled: "text-muted-foreground opacity-40",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ className, ...props }) => (
          <ChevronLeft className={cn("h-4 w-4", className)} {...props} />
        ),
        IconRight: ({ className, ...props }) => (
          <ChevronRight className={cn("h-4 w-4", className)} {...props} />
        ),
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
