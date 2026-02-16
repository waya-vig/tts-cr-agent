import { NavLink, useNavigate } from "react-router";
import { useAuthStore } from "../stores/authStore";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard,
  Clapperboard,
  TrendingUp,
  BookOpen,
  MessageSquare,
  LogOut,
} from "lucide-react";

const navigation = [
  { name: "ダッシュボード", path: "/", icon: LayoutDashboard },
  { name: "CR作成", path: "/cr-creator", icon: Clapperboard },
  { name: "市場分析", path: "/market", icon: TrendingUp },
  { name: "ナレッジ管理", path: "/knowledge", icon: BookOpen },
  { name: "AIチャット", path: "/copilot", icon: MessageSquare },
];

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex h-16 items-center border-b border-sidebar-border px-6">
        <h2 className="text-lg font-bold text-sidebar-foreground tracking-tight">
          TTS CR Agent
        </h2>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.name}
          </NavLink>
        ))}
      </nav>
      <Separator className="bg-sidebar-border" />
      <div className="p-4">
        {user && (
          <p className="mb-2 truncate text-xs text-muted-foreground">
            {user.email}
          </p>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          ログアウト
        </Button>
      </div>
    </aside>
  );
}
