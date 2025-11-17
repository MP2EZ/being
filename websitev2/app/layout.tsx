import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Being - Mindfulness with Meaning",
  description: "Ancient Stoic wisdom meets modern mental health practice. Daily mindfulness grounded in 2,000 years of philosophical wisdom.",
  keywords: ["stoic mindfulness", "mental health", "meditation", "stoic philosophy", "mindfulness app", "PHQ-9", "GAD-7", "crisis support"],
  authors: [{ name: "Being" }],
  openGraph: {
    title: "Being - Stoic Mindfulness",
    description: "Mindfulness practice with deeper meaning, grounded in Stoic wisdom.",
    url: "https://www.being.fyi",
    siteName: "Being",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
