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
        className="p-2 rounded-md bg-white/10 text-white hover:bg-white/20 hover:text-white"
    >
      <span className="material-symbols-outlined dark:hidden">light_mode</span>
      <span className="material-symbols-outlined hidden dark:inline">dark_mode</span>
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
