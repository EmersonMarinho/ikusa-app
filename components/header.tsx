"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const navigation = [
  { name: "Upload", href: "/" },
  { name: "Histórico", href: "/history" },
  { name: "Comparar", href: "/compare" },
  { name: "KDA Mensal", href: "/kda-mensal" },
]

export function Header() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-800 bg-neutral-950/95 backdrop-blur supports-[backdrop-filter]:bg-neutral-950/60">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-blue-500 hover:text-blue-400 transition-colors">
            Ikusa
          </Link>

          <nav className="flex items-center space-x-6">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-neutral-950 rounded-md px-2 py-1",
                  pathname === item.href ? "text-blue-500" : "text-neutral-300",
                )}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  )
}
