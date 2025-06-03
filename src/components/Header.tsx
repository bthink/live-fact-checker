'use client';
import ThemeToggle from './ThemeToggle';

export default function Header() {
  return (
    <header className="w-full flex items-center justify-between py-4 px-6 bg-white/60 dark:bg-black/40 backdrop-blur border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
      <h1 className="text-lg font-semibold tracking-tight">Live Fact-Checker</h1>
      <ThemeToggle />
    </header>
  );
}
