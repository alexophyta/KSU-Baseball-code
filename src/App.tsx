import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import PlayerData from "./pages/PlayerData";
import GameLog from "./pages/GameLog";
import Admin from "./pages/Admin";
import Scouting from "./pages/Scouting";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/player-data" element={<ProtectedRoute><PlayerData /></ProtectedRoute>} />
            <Route path="/game-log" element={<ProtectedRoute><GameLog /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute allowedRoles={["creator"]}><Admin /></ProtectedRoute>} />
            <Route path="/scouting" element={<ProtectedRoute allowedRoles={["creator", "coach"]}><Scouting /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
