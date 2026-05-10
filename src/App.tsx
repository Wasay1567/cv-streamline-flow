import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Home from "@/pages/Home";
import Dashboard from "@/pages/Dashboard";
import CVForm from "@/pages/CVForm";
import Students from "@/pages/Students";
import Admin from "@/pages/Admin";
import SetupUserProfile from "@/pages/SetupUserProfile";
import StudentDashboard from "@/components/dashboards/StudentDashboard";
import AdvisorDashboard from "@/components/dashboards/AdvisorDashboard";
import AdminDashboard from "@/components/dashboards/AdminDashboard";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/setup-profile" element={<ProtectedRoute requireProfileSetup={false}><SetupUserProfile /></ProtectedRoute>} />
            <Route path="/home" element={<ProtectedRoute><AppLayout><Home /></AppLayout></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/dashboard/student" element={<ProtectedRoute allowedRoles={['student']}><AppLayout><StudentDashboard /></AppLayout></ProtectedRoute>} />
            <Route path="/dashboard/advisor" element={<ProtectedRoute allowedRoles={['advisor', 'dil_admin']}><AppLayout><AdvisorDashboard /></AppLayout></ProtectedRoute>} />
            <Route path="/dashboard/admin" element={<ProtectedRoute allowedRoles={['dil_admin']}><AppLayout><AdminDashboard /></AppLayout></ProtectedRoute>} />
            <Route path="/cv-form" element={<ProtectedRoute allowedRoles={['student']}><CVForm /></ProtectedRoute>} />
            <Route path="/students" element={<ProtectedRoute allowedRoles={['advisor', 'dil_admin']}><Students /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute allowedRoles={['dil_admin']}><Admin /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
