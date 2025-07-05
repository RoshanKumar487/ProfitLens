
"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker, useDayPicker, type CaptionProps, type DayProps } from "react-day-picker"
import { format } from "date-fns"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

function CustomCalendarCaption(props: CaptionProps) {
  const { fromYear, toYear, fromDate, toDate } = useDayPicker();

  const handleMonthChange = (value: string) => {
    const newDate = new Date(props.displayMonth);
    newDate.setMonth(parseInt(value, 10));
    props.onMonthChange?.(newDate);
  };

  const handleYearChange = (value: string) => {
    const newDate = new Date(props.displayMonth);
    newDate.setFullYear(parseInt(value, 10));
    props.onMonthChange?.(newDate);
  };

  const startYear = fromYear || fromDate?.getFullYear() || 1900;
  const endYear = toYear || toDate?.getFullYear() || new Date().getFullYear() + 10;
  
  const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);
  const months = Array.from({ length: 12 }, (_, i) => i);

  return (
    <div className="flex justify-between items-center px-1 mb-4 gap-2">
      <Select
        value={props.displayMonth.getMonth().toString()}
        onValueChange={handleMonthChange}
      >
        <SelectTrigger className="w-auto flex-1 h-9 focus:ring-ring">
          <SelectValue placeholder="Month" />
        </SelectTrigger>
        <SelectContent>
          {months.map((month) => (
            <SelectItem key={month} value={month.toString()}>
              {format(new Date(2000, month), "MMMM")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={props.displayMonth.getFullYear().toString()}
        onValueChange={handleYearChange}
      >
        <SelectTrigger className="w-auto h-9 focus:ring-ring">
          <SelectValue placeholder="Year" />
        </SelectTrigger>
        <SelectContent>
          {years.map((year) => (
            <SelectItem key={year} value={year.toString()}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}


export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  components?: {
    DayContent?: React.ComponentType<{ date: Date; activeModifiers: object; displayMonth: Date }>;
  }
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  components,
  ...props
}: CalendarProps) {

  const useDropdowns = props.captionLayout === 'dropdown-buttons';

  const DayContentWrapper = (dayProps: DayProps) => {
    const { date, activeModifiers, displayMonth } = dayProps;
    if (components?.DayContent) {
      return <components.DayContent date={date} activeModifiers={activeModifiers} displayMonth={displayMonth} />;
    }
    return <>{format(date, "d")}</>;
  };

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: cn("flex justify-center pt-1 relative items-center", useDropdowns && "hidden"),
        caption_label: "text-sm font-medium",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell:
          "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        Caption: useDropdowns ? CustomCalendarCaption : undefined,
        IconLeft: () => <ChevronLeft className="h-4 w-4" />,
        IconRight: () => <ChevronRight className="h-4 w-4" />,
        DayContent: components?.DayContent ? DayContentWrapper : undefined,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
