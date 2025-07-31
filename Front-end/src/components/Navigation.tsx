'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Home,
  Upload,
  Receipt,
  BarChart3,
  Settings,
  Menu,
  X,
  User,
  Sun,
  Moon,
  Mic,
} from 'lucide-react';
import { useRouter } from 'next/router';
import { useTheme } from 'next-themes';

export default function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();
  const { setTheme } = useTheme();

  const navigationItems = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Upload Receipt', href: '/upload', icon: Upload },
    { name: 'All Receipts', href: '/receipts', icon: Receipt },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Chat Assistant', href: '/user', icon: Mic },
    { name: 'My Profile', href: '/profile', icon: User },
  ];

  const isActive = (href: string) => {
    return router.pathname === href;
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 left-4 z-50 safe-area-inset">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="bg-background shadow-lg border-2 h-12 w-12"
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-background/50 z-40 safe-area-inset"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full w-80 sm:w-64 bg-card shadow-2xl transform transition-transform duration-300 z-40 safe-area-inset ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 lg:static lg:z-auto`}
      >
        <div className="p-4 sm:p-6 border-b bg-muted text-foreground">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-background rounded-xl flex items-center justify-center shadow-md">
              <Receipt className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Raseed</h1>
          </div>
        </div>

        <nav className="p-4 flex-1 overflow-y-auto">
          <ul className="space-y-1">
            {navigationItems.map(item => {
              const Icon = item.icon;
              return (
                <li key={item.name}>
                  <a
                    href={item.href}
                    className={`flex items-center gap-4 px-4 py-4 rounded-xl transition-all duration-200 touch-manipulation ${
                      isActive(item.href)
                        ? 'bg-accent text-primary font-semibold shadow-sm border-l-4 border-primary'
                        : 'text-foreground hover:bg-muted active:bg-muted'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Icon className="h-6 w-6 flex-shrink-0" />
                    <span className="text-base">{item.name}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 flex justify-center space-x-2 border-t bg-background">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setTheme('light')}
            className="w-12 h-12 rounded-full"
          >
            <Sun className="h-6 w-6 text-foreground" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setTheme('dark')}
            className="w-12 h-12 rounded-full"
          >
            <Moon className="h-6 w-6 text-foreground" />
          </Button>
        </div>
      </div>
    </>
  );
}
