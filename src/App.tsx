import { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Dashboard from "./components/Dashboard";
import EmployeeManagement from "./components/EmployeeManagement";
import AttendanceTracking from "./components/AttendanceTracking";
import AttendanceReports from "./components/AttendanceReports";
import ExpenseTracking from "./components/ExpenseTracking";
import ExpenseReports from "./components/ExpenseReports";
import BudgetTracking from "./components/BudgetTracking";
import BackupRestore from "./components/BackupRestore";
import Login from "./components/Login";

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<{ name: string } | null>(null);
  const [currentTab, setCurrentTab] = useState("dashboard");
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    // Check local storage for persistent auth session
    const storedToken = localStorage.getItem("canteen_admin_token");
    const storedUser = localStorage.getItem("canteen_admin_user");
    if (storedToken && storedUser) {
      setToken(storedToken);
      try {
        setUser(JSON.parse(storedUser));
      } catch (err) {
        console.error("Failed to parse user session", err);
      }
    }
    setInitializing(false);
  }, []);

  const handleLoginSuccess = (newToken: string, newUser: { name: string }) => {
    setToken(newToken);
    setUser(newUser);
    setCurrentTab("dashboard");
  };

  const handleLogout = () => {
    localStorage.removeItem("canteen_admin_token");
    localStorage.removeItem("canteen_admin_user");
    setToken(null);
    setUser(null);
  };

  if (initializing) {
    return (
      <div className="min-h-screen bg-[#f8f9ff] flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <svg className="animate-spin h-8 w-8 text-[#00236f]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-xs text-slate-500 font-bold">Booting MEZZ CANTEEN Ledger...</span>
        </div>
      </div>
    );
  }

  // Auth Guard
  if (!token) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Render correct tab page
  const renderTabPage = () => {
    switch (currentTab) {
      case "dashboard":
        return <Dashboard onNavigate={setCurrentTab} />;
      case "employees":
        return <EmployeeManagement />;
      case "attendance":
        return <AttendanceTracking />;
      case "reports-attendance":
        return <AttendanceReports />;
      case "expenses":
        return <ExpenseTracking onNavigate={setCurrentTab} />;
      case "reports-expenses":
        return <ExpenseReports onNavigate={setCurrentTab} />;
      case "budget":
        return <BudgetTracking />;
      case "backup":
        return <BackupRestore />;
      default:
        return <Dashboard onNavigate={setCurrentTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9ff]">
      {/* Navigation Panels */}
      <Sidebar 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab} 
        onLogout={handleLogout} 
      />

      {/* Main Content Area */}
      <div className="ml-[260px] min-h-screen flex flex-col print:ml-0 print:min-h-0 bg-[#f8f9ff]">
        <Header />

        {/* View Shell */}
        <main className="flex-1 p-6 max-w-[#1280px] mx-auto w-full space-y-6 print:p-0">
          {renderTabPage()}
        </main>
      </div>
    </div>
  );
}
