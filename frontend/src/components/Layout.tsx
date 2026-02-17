import { Outlet } from "react-router";
import Sidebar from "./Sidebar";

export default function Layout() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="relative flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
