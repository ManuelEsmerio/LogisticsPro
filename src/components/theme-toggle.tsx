"use client"

import * as React from "react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <Button 
        variant="ghost" 
        size="icon" 
        onClick={() => setTheme(theme === "light" ? "dark" : "light")}
        className="p-2 rounded-md bg-transparent text-slate-400 hover:bg-white/20 hover:text-white"
    >
      <span className="material-symbols-outlined rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0">light_mode</span>
      <span className="material-symbols-outlined absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100">dark_mode</span>
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
