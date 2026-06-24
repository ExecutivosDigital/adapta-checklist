"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ChevronRight,
  ClipboardCheck,
  Truck,
  User,
  X,
} from "lucide-react";
import { DriverTab } from "@/types/driver.types";

interface SidebarProps {
  activeTab: DriverTab;
  onTabChange: (tab: DriverTab) => void;
  userName: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({
  activeTab,
  onTabChange,
  userName,
  isCollapsed,
  onToggleCollapse,
}: SidebarProps) {
  const menuItems: { id: DriverTab; label: string; icon: typeof User }[] = [
    { id: "checklists", label: "Checklists", icon: ClipboardCheck },
    { id: "profile", label: "Perfil", icon: User },
  ];

  return (
    <aside
      className={`fixed top-0 left-0 z-40 h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white shadow-2xl transition-all duration-300 ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-700 p-4">
          {!isCollapsed && (
            <div className="flex items-center gap-3">
              <div className="bg-primary flex h-10 w-10 items-center justify-center rounded-lg">
                <Truck className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-white">Checklist Frota</h2>
                <p className="text-xs text-text-subtle">TMS Adapta</p>
              </div>
            </div>
          )}
          {isCollapsed && (
            <div className="bg-primary flex h-10 w-10 items-center justify-center rounded-lg">
              <Truck className="h-6 w-6 text-white" />
            </div>
          )}
          <button
            onClick={onToggleCollapse}
            className="rounded-lg p-2 transition-colors hover:bg-gray-700"
          >
            {isCollapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <X className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* User Info */}
        {!isCollapsed && (
          <div className="border-b border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <Avatar className="border-primary h-12 w-12 border-2">
                <AvatarFallback className="bg-primary text-white">
                  {(userName || "?").charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-white">
                  {userName ? userName.split(" ")[0] : "—"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Menu Items */}
        <nav className="flex-1 space-y-1 p-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-all duration-200 ${
                  isActive
                    ? "bg-primary shadow-primary/50 text-white shadow-lg"
                    : "text-text-subtle hover:bg-gray-700 hover:text-white"
                }`}
              >
                <Icon
                  className={`h-5 w-5 shrink-0 ${isActive ? "text-white" : ""}`}
                />
                {!isCollapsed && (
                  <span className="font-medium">{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
