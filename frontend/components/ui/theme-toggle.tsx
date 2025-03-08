"use client";

import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <Button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
      {theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
    </Button>
  );
}
