"use client";

import { ClipboardCheck, User } from "lucide-react";
import { DriverTab } from "@/types/driver.types";

interface BottomNavigationProps {
  activeTab: DriverTab;
  onTabChange: (tab: DriverTab) => void;
}

export function BottomNavigation({
  activeTab,
  onTabChange,
}: BottomNavigationProps) {
  const items: { id: DriverTab; label: string; icon: typeof User }[] = [
    { id: "checklists", label: "Checklists", icon: ClipboardCheck },
    { id: "profile", label: "Perfil", icon: User },
  ];

  return (
    <div className="fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2 border-t-2 border-border bg-surface pb-[env(safe-area-inset-bottom)] shadow-2xl">
      <div className="grid grid-cols-2 items-center gap-1 px-2 pt-2 pb-2">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl py-3 transition-all ${
                isActive
                  ? "bg-primary/10 text-primary scale-105 dark:bg-primary/20"
                  : "text-text-muted hover:bg-surface-muted dark:hover:bg-surface-elevated"
              }`}
            >
              <Icon className={`h-6 w-6 ${isActive ? "text-primary" : ""}`} />
              <span className="text-xs font-semibold">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
