import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { LayoutDashboard, Users, ClipboardList, Shield, LogOut, Binoculars } from "lucide-react";
import kstateLogo from "@/assets/kstate-logo.svg";
import { cn } from "@/lib/utils";

const AppSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { isAdmin, isCoach, isPlayer } = useUserRole();

  const navItems: { label: string; icon: typeof LayoutDashboard; path: string }[] = [];

  if (!isPlayer) {
    navItems.push({ label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" });
  }

  navItems.push({ label: "Player Data", icon: Users, path: "/player-data" });

  if (!isPlayer) {
    navItems.push({ label: "Game Log", icon: ClipboardList, path: "/game-log" });
  }

  if (isAdmin || isCoach) {
    navItems.push({ label: "Scouting", icon: Binoculars, path: "/scouting" });
  }

  if (isAdmin) {
    navItems.push({ label: "Admin", icon: Shield, path: "/admin" });
  }

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="w-44 min-h-screen gradient-kstate flex flex-col">
      {/* Logo */}
      <div className="px-3 py-4 border-b border-sidebar-border">
        <img src={kstateLogo} alt="K-State" className="h-8 mx-auto" />
        <p className="text-sidebar-foreground/70 text-[10px] text-center mt-1">Baseball Analytics</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-0.5">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* User / Sign Out */}
      <div className="p-2 border-t border-sidebar-border">
        <p className="text-sidebar-foreground/60 text-[10px] truncate mb-1 px-2">
          {user?.email}
        </p>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default AppSidebar;
