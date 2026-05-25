import { useState, useEffect, FormEvent } from "react";
import { 
  Coffee, 
  UtensilsCrossed, 
  Moon, 
  Info, 
  AlertTriangle, 
  Plus, 
  TrendingUp, 
  ArrowRight,
  Loader2,
  DollarSign
} from "lucide-react";
import { OperationalLog, Expense } from "../types";

interface DashboardProps {
  onNavigate: (tab: string) => void;
}

interface StatsData {
  budget: {
    totalAllocated: number;
    totalSpent: number;
    remaining: number;
    remainingPercent: number;
    isLowBalance: boolean;
  };
  meals: {
    breakfast: number;
    lunch: number;
    dinner: number;
  };
  trend: { day: string; amount: number }[];
  operationalLog: OperationalLog[];
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
  const [showAddBudgetModal, setShowAddBudgetModal] = useState(false);
  const [addAmount, setAddAmount] = useState("");
  const [addDesc, setAddDesc] = useState("Corporate Budget Supplement");

  const [savingBudget, setSavingBudget] = useState(false);

  // Fetch Stats and Recent Expenses
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, expRes] = await Promise.all([
        fetch("/api/budget/stats"),
        fetch("/api/expenses?limit=4")
      ]);

      if (statsRes.ok && expRes.ok) {
        const statsData = await statsRes.json();
        const expensesData = await expRes.json();
        setStats(statsData);
        // Show top 4 raw invoices
        setRecentExpenses(expensesData.slice(0, 4));
      }
    } catch (err) {
      console.error("Error loading dashboard stats", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleAddBudget = async (e: FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(addAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert("Please enter a valid positive number for the amount.");
      return;
    }

    setSavingBudget(true);
    try {
      const res = await fetch("/api/budget/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountNum,
          description: addDesc,
          date: new Date().toISOString().split("T")[0]
        })
      });

      if (res.ok) {
        setShowAddBudgetModal(false);
        setAddAmount("");
        fetchDashboardData();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to add budget allocation.");
      }
    } catch (err) {
      console.error(err);
      alert("Network error adding budget.");
    } finally {
      setSavingBudget(false);
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="animate-spin text-[#00236f]" size={32} />
        <span className="text-sm text-[#505f76] font-semibold">Gathering operational data...</span>
      </div>
    );
  }

  const budget = stats?.budget || {
    totalAllocated: 25000,
    totalSpent: 21450,
    remaining: 3550,
    remainingPercent: 14.2,
    isLowBalance: true
  };

  const meals = stats?.meals || {
    breakfast: 124,
    lunch: 482,
    dinner: 89
  };

  const operationalLog = stats?.operationalLog || [];

  return (
    <div className="space-y-6">
      {/* Critical Budget Warning Alert */}
      {budget.isLowBalance && (
        <div className="bg-[#ffdad6] border border-red-200 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs" id="lowBalanceWarning">
          <div className="flex items-start gap-3 text-[#93000a]">
            <AlertTriangle className="text-red-700 shrink-0 mt-0.5" size={22} />
            <div>
              <p className="font-bold text-sm sm:text-base text-[#ba1a1a]">
                Critical: Low Budget Warning
              </p>
              <p className="text-xs sm:text-sm text-red-950 opacity-90 mt-0.5">
                Remaining monthly budget is currently {budget.remainingPercent.toFixed(1)}%. Please review recent expenses and add funds to restore balance.
              </p>
            </div>
          </div>
          <button 
            onClick={() => setShowAddBudgetModal(true)}
            className="shrink-0 bg-red-700 text-white px-5 py-2 rounded-lg font-bold text-xs hover:bg-red-800 transition-all shadow-xs"
          >
            Add Funds
          </button>
        </div>
      )}

      {/* Bento Grid layout */}
      <div className="grid grid-cols-12 gap-6">
        
        {/* KPI: Today's Meals */}
        <div className="col-span-12 lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          {/* Breakfast card */}
          <div className="bg-white border border-[#c5c5d3] p-5 rounded-xl shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <span className="p-2.5 bg-[#dce1ff] text-[#00164e] rounded-lg">
                <Coffee size={20} />
              </span>
              <span className="text-[10px] font-bold text-[#757682] uppercase tracking-wider">Breakfast</span>
            </div>
            <h3 className="text-3xl font-bold text-[#00236f]">{meals.breakfast}</h3>
            <p className="text-xs text-[#505f76] mt-2 font-medium">
              +12% from yesterday
            </p>
            <div className="absolute top-1/2 right-0 translate-x-3 -translate-y-4 opacity-5 bg-[#00236f] w-16 h-16 rounded-full"></div>
          </div>

          {/* Lunch card */}
          <div className="bg-white border border-[#c5c5d3] p-5 rounded-xl shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <span className="p-2.5 bg-[#d0e1fb] text-[#54647a] rounded-lg">
                <UtensilsCrossed size={20} />
              </span>
              <span className="text-[10px] font-bold text-[#757682] uppercase tracking-wider">Lunch</span>
            </div>
            <h3 className="text-3xl font-bold text-[#00236f]">{meals.lunch}</h3>
            <p className="text-xs text-[#505f76] mt-2 font-medium">
              Peak traffic: 12:45 PM
            </p>
            <div className="absolute top-1/2 right-0 translate-x-3 -translate-y-4 opacity-5 bg-[#00236f] w-16 h-16 rounded-full"></div>
          </div>

          {/* Dinner card */}
          <div className="bg-white border border-[#c5c5d3] p-5 rounded-xl shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <span className="p-2.5 bg-[#ffdbcb] text-[#773205] rounded-lg">
                <Moon size={20} />
              </span>
              <span className="text-[10px] font-bold text-[#757682] uppercase tracking-wider">Dinner</span>
            </div>
            <h3 className="text-3xl font-bold text-[#00236f]">{meals.dinner}</h3>
            <p className="text-xs text-[#505f76] mt-2 font-medium">
              Expected: 115
            </p>
            <div className="absolute top-1/2 right-0 translate-x-3 -translate-y-4 opacity-5 bg-[#00236f] w-16 h-16 rounded-full"></div>
          </div>

        </div>

        {/* Budget Health and Analytics */}
        <div className="col-span-12 lg:col-span-4 bg-white border border-[#c5c5d3] p-5 rounded-xl shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6">
              <h4 className="font-bold text-sm tracking-tight text-[#0d1c2d] flex items-center gap-1.5">
                <TrendingUp size={16} className="text-[#00236f]" />
                Budget Health
              </h4>
              <button 
                onClick={() => alert("Corporate budgets are automatically decremented upon publishing new bill expenses.")}
                className="text-[#757682] hover:text-[#00236f]"
              >
                <Info size={16} />
              </button>
            </div>
             <div className="space-y-4">
              <div className="flex justify-between text-xs font-semibold text-[#505f76]">
                <span>Total Budget Allocation</span>
                <span className="text-[#00236f] font-bold">DJF {budget.totalAllocated.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-xs font-semibold text-[#505f76]">
                <span>Total Spent to Date</span>
                <span className="text-red-700 font-bold">DJF {budget.totalSpent.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-xs font-semibold text-[#505f76] pt-1 border-t border-slate-100">
                <span>Remaining Balance</span>
                <span className={`font-bold ${budget.isLowBalance ? 'text-red-600' : 'text-green-700'}`}>
                  DJF {budget.remaining.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex justify-between text-[11px] font-bold mb-1.5">
              <span className="text-amber-700">{(100 - budget.remainingPercent).toFixed(1)}% Expended</span>
              <span className="text-[#505f76]">{budget.remainingPercent.toFixed(1)}% Remaining</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${budget.isLowBalance ? 'bg-red-600' : 'bg-[#00236f]'}`}
                style={{ width: `${Math.min(100 - budget.remainingPercent, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Chart Section */}
        <div className="col-span-12 lg:col-span-8 bg-white border border-[#c5c5d3] p-5 rounded-xl shadow-xs">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h4 className="font-bold text-sm text-[#0d1c2d]">Weekly Expense Trend</h4>
              <p className="text-xs text-[#505f76] mt-0.5">Variance levels for canteen operations</p>
            </div>
            <select className="bg-slate-100 border-none text-[11px] font-bold rounded-lg py-1 px-3 text-[#505f76] focus:ring-1 focus:ring-[#00236f]">
              <option>Last 7 Days</option>
            </select>
          </div>

          <div className="h-64 flex items-end justify-between gap-4 pb-4 border-b border-dashed border-slate-200">
            {stats?.trend.map((dayData, idx) => {
              // High point mapping
              const isHigh = dayData.day === "Thu";
              const percentHeight = (dayData.amount / 2500) * 100;
              return (
                <div key={idx} className="flex flex-col items-center flex-1 group">
                  <div 
                    className={`w-full rounded-t-lg cursor-pointer relative transition-all duration-350 min-h-[10%] ${
                      isHigh ? 'bg-[#00236f]' : 'bg-[#00236f]/20 group-hover:bg-[#00236f]'
                    }`}
                    style={{ height: `${percentHeight}%` }}
                  >
                    <div className={`absolute -top-8 left-1/2 -translate-x-1/2 bg-[#0d1c2d] text-white text-[10px] py-1 px-2 rounded-md font-bold transition-opacity whitespace-nowrap ${
                      isHigh ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}>
                      DJF {dayData.amount}
                    </div>
                  </div>
                  <span className="mt-3 text-[11px] text-[#757682] font-semibold">{dayData.day}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Operational logs */}
        <div className="col-span-12 lg:col-span-4 bg-white border border-[#c5c5d3] p-5 rounded-xl shadow-xs">
          <h4 className="font-bold text-sm text-[#0d1c2d] mb-6">Operational Log</h4>
          <div className="space-y-4 max-h-[260px] overflow-y-auto pr-1">
            {operationalLog.map((log) => (
              <div key={log.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                    log.type === "expense" ? "bg-amber-500" :
                    log.type === "attendance" ? "bg-[#00236f]" :
                    log.type === "employee" ? "bg-indigo-500" :
                    log.type === "budget" ? "bg-emerald-600" : "bg-neutral-400"
                  }`}></span>
                  <div className="w-px flex-grow bg-slate-100 min-h-[24px] mt-1"></div>
                </div>
                <div>
                  <p className="text-xs font-bold text-[#0d1c2d]">{log.message}</p>
                  <p className="text-[10px] text-[#757682] font-semibold mt-0.5">{log.time}</p>
                </div>
              </div>
            ))}
            {operationalLog.length === 0 && (
              <span className="text-xs text-slate-400 block text-center py-6">No recent logs</span>
            )}
          </div>
        </div>

        {/* Recent Transaction Summary */}
        <div className="col-span-12 bg-white border border-[#c5c5d3] rounded-xl shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-[#c5c5d3]/60 flex justify-between items-center bg-slate-50">
            <h4 className="font-bold text-sm text-[#0d1c2d]">Recent Transaction Summary</h4>
            <button 
              onClick={() => onNavigate("expenses")}
              className="text-xs font-bold text-[#00236f] hover:underline flex items-center gap-1"
            >
              View All Invoices
              <ArrowRight size={14} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-[#c5c5d3]/50">
                  <th className="px-5 py-3 text-[10px] font-bold text-[#757682] uppercase">Invoice ID</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-[#757682] uppercase">Vendor / Service</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-[#757682] uppercase">Date</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-[#757682] uppercase">Category</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-[#757682] uppercase text-right">Amount</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-[#757682] uppercase text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentExpenses.map((exp, idx) => {
                  // status selection algorithm
                  const statusLabel = 
                    idx === 0 ? "Processed" :
                    idx === 1 ? "Pending Approval" :
                    idx === 3 ? "Flagged" : "Processed";

                  const pillColor = 
                    statusLabel === "Processed" ? "bg-green-150 text-green-700 font-bold" :
                    statusLabel === "Pending Approval" ? "bg-amber-100 text-amber-700 font-bold" :
                    "bg-rose-100 text-red-700 font-bold";

                  return (
                    <tr key={exp.id} className="hover:bg-[#eef4ff]/50 transition-colors">
                      <td className="px-5 py-4 text-xs font-bold text-[#00236f]">{exp.billNumber}</td>
                      <td className="px-5 py-4 text-xs text-[#0d1c2d] font-semibold">{exp.items[0]?.vendor || "Vendor"}</td>
                      <td className="px-5 py-4 text-xs text-[#505f76]">{exp.date}</td>
                      <td className="px-5 py-4 text-xs text-[#505f76]">{exp.items[0]?.category || "Category"}</td>
                      <td className="px-5 py-4 text-xs text-right font-bold text-slate-800">
                        DJF {exp.total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] ${pillColor}`}>
                          {statusLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Floating Action Button */}
      <button 
        onClick={() => onNavigate("expenses")}
        className="fixed bottom-6 right-6 w-14 h-14 bg-[#00236f] text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center z-30 group"
        title="Add Expense Bill"
      >
        <Plus size={24} />
      </button>

      {/* Add Funds/Budget Modal */}
      {showAddBudgetModal && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md border border-[#c5c5d3] overflow-hidden">
            <div className="bg-[#00236f] px-6 py-4 text-white flex justify-between items-center">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Plus size={18} />
                Load Funds / Suppplement Budget
              </h3>
              <button 
                onClick={() => setShowAddBudgetModal(false)}
                className="text-slate-200 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddBudget} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#0d1c2d] mb-1">
                  Budget Incremental Amount (DJF)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-bold">DJF</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={addAmount}
                    onChange={(e) => setAddAmount(e.target.value)}
                    className="pl-7 block w-full border border-[#c5c5d3] rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-[#00236f]"
                    placeholder="10000.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0d1c2d] mb-1">
                  Description / Justification
                </label>
                <input
                  type="text"
                  required
                  value={addDesc}
                  onChange={(e) => setAddDesc(e.target.value)}
                  className="block w-full border border-[#c5c5d3] rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-[#00236f]"
                  placeholder="Supplementary Budget Allocation"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddBudgetModal(false)}
                  className="px-4 py-2 border border-[#c5c5d3] rounded-lg text-xs font-bold text-[#505f76] hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingBudget}
                  className="px-4 py-2 bg-[#00236f] text-white rounded-lg text-xs font-bold hover:bg-[#00236f]/90 flex items-center gap-1"
                >
                  {savingBudget ? "Saving..." : "Inject Budget"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
