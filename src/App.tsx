import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { CreditsModalProvider } from "./contexts/CreditsModalContext";

// Pages
import Login from "./pages/Login";
import Verify from "./pages/Verify";
import AccessDenied from "./pages/AccessDenied";
import Home from "./pages/Home";
import Agents from "./pages/Agents";
import Chat from "./pages/Chat";
import History from "./pages/History";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import Kanban from "./pages/Kanban";
import Credits from "./pages/Credits";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/verify" element={<Verify />} />
      <Route path="/access-denied" element={<AccessDenied />} />
      <Route path="/home" element={<Home />} />
      <Route path="/agents" element={<Agents />} />
      <Route path="/chat/:conversationId" element={<Chat />} />
      <Route path="/history" element={<History />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/profile/credits" element={<Credits />} />
      <Route path="/kanban" element={<Kanban />} />
      <Route path="/admin" element={<Admin />} />
      {/* Legacy routes redirect to unified admin */}
      <Route path="/admin/agents" element={<Navigate to="/admin?section=agents" replace />} />
      <Route path="/admin/credits" element={<Navigate to="/admin?section=credits-overview" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <CreditsModalProvider>
            <AppRoutes />
          </CreditsModalProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
