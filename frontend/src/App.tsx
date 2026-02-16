import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import CRCreator from "./pages/CRCreator";
import MarketIntelligence from "./pages/MarketIntelligence";
import KnowledgeManager from "./pages/KnowledgeManager";
import Copilot from "./pages/Copilot";
import Login from "./pages/Login";
import { useAuthStore } from "./stores/authStore";

export default function App() {
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="cr-creator" element={<CRCreator />} />
          <Route path="market" element={<MarketIntelligence />} />
          <Route path="knowledge" element={<KnowledgeManager />} />
          <Route path="copilot" element={<Copilot />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
