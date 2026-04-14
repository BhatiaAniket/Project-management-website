import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { SocketProvider } from "./context/SocketContext";
import ToastContainer from "./components/Toast";
import ProtectedRoute from "./components/ProtectedRoute";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";
import ChangePassword from "./pages/auth/ChangePassword";

// Company Admin Pages
import CompanyAdminLayout from "./components/layout/CompanyAdminLayout";
import DashboardOverview from "./pages/company/DashboardOverview";
import PeopleManagement from "./pages/company/PeopleManagement";
import Projects from "./pages/company/Projects";
import Performance from "./pages/company/Performance";
import Meetings from "./pages/company/Meetings";
import MeetingRoom from "./pages/company/MeetingRoom";
import Chat from "./pages/company/Chat";
import Notifications from "./pages/company/Notifications";
import Settings from "./pages/company/Settings";

// Manager Pages
import ManagerLayout from "./components/layout/ManagerLayout";
import ManagerOverview from "./pages/manager/ManagerOverview";
import ManagerProjects from "./pages/manager/ManagerProjects";
import ManagerTasks from "./pages/manager/ManagerTasks";
import ManagerPerformance from "./pages/manager/ManagerPerformance";
import ManagerMeetings from "./pages/manager/ManagerMeetings";
import ManagerChat from "./pages/manager/ManagerChat";
import ManagerNotifications from "./pages/manager/ManagerNotifications";
import ManagerProfile from "./pages/manager/ManagerProfile";
import ManagerSettings from "./pages/manager/ManagerSettings";
import ManagerEmployees from "./pages/manager/ManagerEmployees";
import ManagerDailyReports from "./pages/manager/ManagerDailyReports";
import ManagerFiles from "./pages/manager/ManagerFiles";


// Employee Pages
import EmployeeLayout from "./components/layout/EmployeeLayout";
import EmployeeOverview from "./pages/employee/EmployeeOverview";
import EmployeeTasks from "./pages/employee/EmployeeTasks";
import EmployeeDailyReport from "./pages/employee/EmployeeDailyReport";
import EmployeeMeetings from "./pages/employee/EmployeeMeetings";
import EmployeeChat from "./pages/employee/EmployeeChat"; /* To be created or replace with EmployeeChat placeholder if I created one... wait did I? No, I'll create the remaining one */
import EmployeeFiles from "./pages/employee/EmployeeFiles";
import EmployeeNotifications from "./pages/employee/EmployeeNotifications";
import EmployeePerformance from "./pages/employee/EmployeePerformance";
import EmployeeProfile from "./pages/employee/EmployeeProfile";
import EmployeeSettings from "./pages/employee/EmployeeSettings";


const queryClient = new QueryClient();

const DashboardStub = ({ role }: { role: string }) => (
  <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
    <h1 className="text-3xl font-bold font-heading mb-4 capitalize">{role} Dashboard</h1>
    <p className="text-muted-foreground mb-8">Successfully routed to protected area.</p>
    <a href="/" className="px-6 py-3 rounded-full bg-foreground text-background font-medium hover:scale-[1.02] transition-transform">Back to Home</a>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <TooltipProvider>
            <ToastContainer />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/verify-email" element={<VerifyEmail />} />

                {/* Change Password (forced first login) */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/change-password" element={<ChangePassword />} />
                </Route>

                {/* Company Admin Dashboard */}
                <Route element={<ProtectedRoute allowedRoles={['company_admin']} />}>
                  <Route path="/company" element={<CompanyAdminLayout />}>
                    <Route path="dashboard" element={<DashboardOverview />} />
                    <Route path="people" element={<PeopleManagement />} />
                    <Route path="projects" element={<Projects />} />
                    <Route path="performance" element={<Performance />} />
                    <Route path="meetings" element={<Meetings />} />
                    <Route path="meetings/:id" element={<MeetingRoom />} />
                    <Route path="chat" element={<Chat />} />
                    <Route path="notifications" element={<Notifications />} />
                    <Route path="settings" element={<Settings />} />
                  </Route>
                </Route>

                {/* Manager Dashboard */}
                <Route element={<ProtectedRoute allowedRoles={['manager']} />}>
                  <Route path="/manager" element={<ManagerLayout />}>
                    <Route path="dashboard" element={<ManagerOverview />} />
                    <Route path="projects" element={<ManagerProjects />} />
                    <Route path="tasks" element={<ManagerTasks />} />
                    <Route path="employees" element={<ManagerEmployees />} />
                    <Route path="reports" element={<ManagerDailyReports />} />
                    <Route path="files" element={<ManagerFiles />} />
                    <Route path="performance" element={<ManagerPerformance />} />
                    <Route path="meetings" element={<ManagerMeetings />} />
                    <Route path="meetings/:id" element={<MeetingRoom />} />
                    <Route path="chat" element={<ManagerChat />} />
                    <Route path="notifications" element={<ManagerNotifications />} />
                    <Route path="profile" element={<ManagerProfile />} />
                    <Route path="settings" element={<ManagerSettings />} />
                  </Route>
                </Route>

                {/* Employee Dashboard */}
                <Route element={<ProtectedRoute allowedRoles={['employee']} />}>
                  <Route path="/employee" element={<EmployeeLayout />}>
                    <Route path="dashboard" element={<EmployeeOverview />} />
                    <Route path="tasks" element={<EmployeeTasks />} />
                    <Route path="reports" element={<EmployeeDailyReport />} />
                    <Route path="meetings" element={<EmployeeMeetings />} />
                    <Route path="meetings/:id" element={<MeetingRoom />} />
                    <Route path="chat" element={<EmployeeChat />} />
                    <Route path="files" element={<EmployeeFiles />} />
                    <Route path="notifications" element={<EmployeeNotifications />} />
                    <Route path="performance" element={<EmployeePerformance />} />
                    <Route path="profile" element={<EmployeeProfile />} />
                    <Route path="settings" element={<EmployeeSettings />} />
                  </Route>
                </Route>

                {/* Other dashboards (stubs for now) */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/dashboard/super-admin" element={<DashboardStub role="Super Admin" />} />
                  <Route path="/dashboard/client" element={<DashboardStub role="Client" />} />
                </Route>

                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
