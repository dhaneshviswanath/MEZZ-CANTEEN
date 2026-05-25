import { Search, Bell, Settings } from "lucide-react";

interface HeaderProps {
  onSearchChange?: (val: string) => void;
  searchValue?: string;
}

export default function Header({ onSearchChange, searchValue = "" }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-[#c5c5d3] shadow-xs flex justify-between items-center w-full px-6 py-3">
      <div className="flex items-center gap-6">
        <span className="text-xl font-bold text-[#00236f] tracking-tight">MEZZ CANTEEN</span>
        <div className="relative hidden md:block">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#757682]" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
            className="bg-[#e5efff] border-none rounded-full pl-10 pr-4 py-1.5 text-xs w-64 focus:ring-2 focus:ring-[#00236f] text-[#0d1c2d] placeholder-[#757682] outline-none transition-all"
            placeholder="Search employees, bills, vendors..."
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button 
          onClick={() => alert("All meal counts and inventory balances are healthy for today.")}
          className="p-2 text-[#505f76] hover:bg-[#eef4ff] rounded-full transition-colors relative"
        >
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full"></span>
        </button>
        <button 
          onClick={() => alert("MEZZ CANTEEN configuration settings v1.0. Auth defaults configured.")}
          className="p-2 text-[#505f76] hover:bg-[#eef4ff] rounded-full transition-colors"
        >
          <Settings size={18} />
        </button>
        <div className="h-6 w-px bg-[#c5c5d3] mx-2"></div>
        <div className="flex items-center gap-2 p-1 pr-3 rounded-full hover:bg-slate-50 transition-all cursor-pointer">
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDCS-QCCy5HSTj1wpM2WvfeT52rwJ80dZKVk8ZzI5NHvGiksTZv3PuJtIJMvk6XweK0hbjBZQlebYxSIg-TaLMf4tH4qVycKSCuYH3qWHGolGcfY52jvuZk0n_sNB7vSvF9THyp8mxN83BnuZ8bYkrEZkgQqhGFwXoy81QV28yl_NdO0ifQfSAwGYqNd0KoRuMua5DIKeqdmTfzV0BS_cw0YKANAVE6PWLK8JhSIW53FSgV57Qrly82Jb6wI77859z9dPY8trY0kRI"
            alt="Corporate Canteen Administrator Profile"
            referrerPolicy="no-referrer"
            className="w-8 h-8 rounded-full border border-[#c5c5d3]"
          />
          <span className="text-xs text-[#00236f] font-bold">Admin Panel</span>
        </div>
      </div>
    </header>
  );
}
