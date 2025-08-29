import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { PinAuthProvider } from "@/lib/pin-auth"

export const metadata: Metadata = {
  title: "Ikusa - Guild Log Processor",
  description: "Process and compare guild compositions from logs",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
      </head>
      <body className="min-h-screen bg-neutral-950 text-neutral-200">
        <PinAuthProvider>
          <Header />
          <main className="container mx-auto max-w-7xl px-4 py-8">{children}</main>
          <Footer />
        </PinAuthProvider>
      </body>
    </html>
  )
}
