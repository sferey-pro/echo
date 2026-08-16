import React from "react"
import { Moon, Sun, Palette } from "lucide-react"
import { useTheme } from "./theme-provider"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="h-9 w-9 bg-transparent border-neo-border">
          {theme === "light" && <Sun className="h-[1.2rem] w-[1.2rem] text-black" />}
          {theme === "dark" && <Moon className="h-[1.2rem] w-[1.2rem] text-white" />}
          {theme === "neobrutalism" && <Palette className="h-[1.2rem] w-[1.2rem] text-black" />}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="border-2 border-neo-border shadow-[4px_4px_0px_black] font-bold">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          Classique Clair
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          Classique Sombre
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("neobrutalism")}>
          Néo-Brutalisme
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
