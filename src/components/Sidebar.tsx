import { 
  LayoutDashboard, 
  Users, 
  ClipboardCheck, 
  BarChart3, 
  Receipt, 
  FileSpreadsheet,
  Wallet, 
  Database,
  HelpCircle, 
  LogOut 
} from "lucide-react";

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onLogout: () => void;
}

export default function Sidebar({ currentTab, setCurrentTab, onLogout }: SidebarProps) {
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "employees", label: "Employees", icon: Users },
    { id: "attendance", label: "Attendance Tracking", icon: ClipboardCheck },
    { id: "reports-attendance", label: "Attendance Reports", icon: BarChart3 },
    { id: "expenses", label: "Expenses Track", icon: Receipt },
    { id: "reports-expenses", label: "Expense Reports", icon: FileSpreadsheet },
    { id: "budget", label: "Budget & Income", icon: Wallet },
    { id: "backup", label: "Database Backup", icon: Database }
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-[260px] bg-[#f8f9ff] border-r border-[#c5c5d3] flex flex-col p-4 gap-2 z-40">
      <div className="flex flex-col gap-1 mb-6 px-2">
        <h1 className="text-lg font-bold text-[#00236f] tracking-tight flex items-center gap-2">
          <svg className="h-6 w-6 text-[#00236f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          MEZZ CANTEEN
        </h1>
        <p className="text-xs text-[#505f76] font-medium tracking-wider uppercase">Operational Hub</p>
      </div>

      <nav className="flex-grow space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-150 ease-in-out text-left ${
                isActive
                  ? "bg-[#d3e4fe] text-[#0b1c30] shadow-xs"
                  : "text-[#444651] hover:bg-[#eaf2ff] hover:text-[#00236f]"
              }`}
            >
              <Icon size={18} className={isActive ? "text-[#00236f]" : "text-[#757682]"} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-[#c5c5d3] pt-4 space-y-1">
        <button
          onClick={() => alert("MEZZ CANTEEN operational reference user guide. Accessible only by authorized administrators.")}
          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-[#444651] hover:bg-[#eaf2ff] hover:text-[#00236f] rounded-lg transition-all text-left"
        >
          <HelpCircle size={18} className="text-[#757682]" />
          <span>Help Center</span>
        </button>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-rose-700 hover:bg-rose-50 rounded-lg transition-all text-left"
        >
          <LogOut size={18} className="text-rose-600" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
