import { useState, useEffect, FormEvent } from "react";
import { 
  Plus, 
  Wallet, 
  Calendar, 
  Check, 
  Loader2, 
  ArrowUpRight, 
  AlertTriangle,
  History,
  FileText
} from "lucide-react";
import { BudgetEntry } from "../types";

const getTodayStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function BudgetTracking() {
  const [entries, setEntries] = useState<BudgetEntry[]>([]);
  const [stats, setStats] = useState<{
    totalAllocated: number;
    totalSpent: number;
    remaining: number;
    remainingPercent: number;
    isLowBalance: boolean;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [amount, setAmount] = useState("");
  const [budgetDate, setBudgetDate] = useState(() => getTodayStr()); // system current local date
  const [description, setDescription] = useState("");

  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchBudgetData = async () => {
    setLoading(true);
    try {
      const [listRes, statsRes] = await Promise.all([
        fetch("/api/budget/entries"),
        fetch("/api/budget/stats")
      ]);

      if (listRes.ok && statsRes.ok) {
        const list = await listRes.json();
        const stat = await statsRes.json();
        // Sort chronologically reverse
        setEntries(list.reverse());
        setStats(stat.budget);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgetData();
  }, []);

  const handleAddBudget = async (e: FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert("Please enter a valid positive number for supplemental amount.");
      return;
    }

    setSaving(true);
    try {
      const url = editingEntryId ? `/api/budget/entries/${editingEntryId}` : "/api/budget/entries";
      const method = editingEntryId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountNum,
          date: budgetDate,
          description: description || "Budget Supplement Added"
        })
      });

      if (res.ok) {
        if (editingEntryId) {
          setSuccess("Budget entry successfully updated and synchronized.");
          setEditingEntryId(null);
        } else {
          setSuccess("Supplemental budget successfully allocated and updated in system logs.");
        }
        setAmount("");
        setDescription("");
        fetchBudgetData();
        setTimeout(() => setSuccess(null), 5000);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to commit budget.");
      }
    } catch (err) {
      console.error(err);
      alert("System communication error.");
    } finally {
      setSaving(false);
    }
  };

  const budget = stats || {
    totalAllocated: 25000,
    totalSpent: 21450,
    remaining: 3550,
    remainingPercent: 14.2,
    isLowBalance: true
  };

  return (
    <div className="space-y-6">
      
      {/* Success Alert Banner */}
      {success && (
        <div className="bg-emerald-50 border border-emerald-250 p-4 rounded-xl text-emerald-800 flex items-center gap-3 text-xs font-bold shadow-xs animate-fadeIn">
          <div className="bg-emerald-500 text-white rounded-full p-1 animate-pulse">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span>{success}</span>
        </div>
      )}

      {/* KPI banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        
        <div className="bg-white border border-[#c5c5d3] p-5 rounded-xl shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Total Budget Allocated</span>
          <span className="text-3xl font-black text-[#00236f]">DJF {budget.totalAllocated.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <p className="text-[11px] text-[#505f76] mt-1.5 font-medium">Sum of all approved fiscal allocations</p>
        </div>

        <div className="bg-white border border-[#c5c5d3] p-5 rounded-xl shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Total Spent Canteen Bill</span>
          <span className="text-3xl font-black text-rose-700">DJF {budget.totalSpent.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <p className="text-[11px] text-[#505f76] mt-1.5 font-medium">Accumulated invoice line sums to date</p>
        </div>

        <div className={`border p-5 rounded-xl shadow-xs ${budget.isLowBalance ? 'bg-red-50/50 border-red-200' : 'bg-white border-[#c5c5d3]'}`}>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Remaining Safe Balance</span>
          <span className={`text-3xl font-black ${budget.isLowBalance ? 'text-red-600' : 'text-green-700'}`}>
            DJF {budget.remaining.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <div className="flex justify-between items-center mt-1.5 text-[11px]">
            <span className="font-bold text-slate-500">Depletion: {(100 - budget.remainingPercent).toFixed(1)}%</span>
            {budget.isLowBalance && (
              <span className="text-red-700 font-bold flex items-center gap-0.5">
                <AlertTriangle size={12} />
                Low Balance (&lt; 20%)
              </span>
            )}
          </div>
        </div>

      </div>

      {/* Low balance warning block banner inside Budget tab */}
      {budget.isLowBalance && (
        <div className="bg-[#ffdad6] border border-red-200/55 p-4 rounded-xl flex items-center gap-3 text-red-950 text-xs font-semibold shadow-xs">
          <AlertTriangle className="text-red-700 shrink-0" size={18} />
          <span>Notice: Canteen funds have spent { (100 - budget.remainingPercent).toFixed(1) }% of allocation. Action required: Load capital to avoid procurement delays.</span>
        </div>
      )}

      {/* Grid: Form vs History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Allocation Form */}
        <div className="col-span-12 lg:col-span-5 bg-white border border-[#c5c5d3] p-6 rounded-xl shadow-xs space-y-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#00236f] pb-3 border-b border-[#c5c5d3]/40 flex items-center justify-between gap-1.5">
              <span className="flex items-center gap-1.5">
                <Wallet size={16} />
                {editingEntryId ? "Modify Allocated Funds" : "Inject Budget Supplement"}
              </span>
              {editingEntryId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingEntryId(null);
                    setAmount("");
                    setDescription("");
                  }}
                  className="text-[10px] font-bold text-rose-600 hover:text-[#ba1a1a] hover:underline"
                >
                  Cancel Edit
                </button>
              )}
            </h3>
            <p className="text-xs text-[#505f76] mt-1.5 font-medium">
              {editingEntryId 
                ? "You are currently updating an existing supplemental log. Saving changes will automatically recalculate safe balances and KPIs." 
                : "Approved increments instantly adjust remaining balances and update the main system KPI graphs."}
            </p>
          </div>

          <form onSubmit={handleAddBudget} className="space-y-4 pt-4">
            <div>
              <label className="block text-xs font-bold text-[#0d1c2d] mb-1.5">
                Allocation Amount (DJF)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold font-mono">DJF</span>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-7 block w-full border border-[#c5c5d3] rounded-lg p-2.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#00236f]"
                  placeholder="5000.00"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0d1c2d] mb-1.5">
                Funding Allocation Date
              </label>
              <div className="relative">
                <Calendar size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  required
                  value={budgetDate}
                  onChange={(e) => setBudgetDate(e.target.value)}
                  className="pl-9 block w-full border border-[#c5c5d3] rounded-lg p-2 text-xs font-bold text-slate-750 outline-none focus:ring-2 focus:ring-[#00236f]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0d1c2d] mb-1.5">
                Allocation Reason / Label
              </label>
              <input
                type="text"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="block w-full border border-[#c5c5d3] rounded-lg p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#00236f] text-slate-800"
                placeholder="e.g. Supplementary Jun Catering Budget Allocation"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 bg-[#00236f] text-white hover:bg-[#00236f]/90 transition-all rounded-lg text-xs font-bold shadow-xs flex items-center justify-center gap-1"
            >
              <span>{editingEntryId ? "Save Contribution Changes" : "Allocating Funds"}</span>
              <ArrowUpRight size={14} />
            </button>
          </form>
        </div>

        {/* Chronology History */}
        <div className="col-span-12 lg:col-span-7 bg-white border border-[#c5c5d3] p-5 rounded-xl shadow-xs space-y-4">
          <h3 className="text-xs font-black text-[#505f76] uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-1.5">
            <History size={14} />
            Funding Chronology Ledger
          </h3>

          {loading ? (
            <div className="flex justify-center items-center py-12 gap-2">
              <Loader2 className="animate-spin text-[#00236f]" size={18} />
              <span className="text-xs text-slate-400">Loading ledger...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-[#c5c5d3]/50">
                    <th className="px-4 py-3 text-[10px] font-bold text-[#757682] uppercase">Date</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-[#757682] uppercase">Label / Reason</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-[#00236f] uppercase text-right">Amount</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-[#757682] uppercase text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {entries.map(entry => (
                    <tr key={entry.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3.5 font-bold text-[#505f76] flex items-center gap-1">
                        <Calendar size={12} className="text-slate-400" />
                        {entry.date}
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-[#0d1c2d] truncate max-w-[160px]">{entry.description}</td>
                      <td className="px-4 py-3.5 text-right font-black text-green-700 bg-green-50/15">
                        +DJF {entry.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-2.5 text-center flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingEntryId(entry.id);
                            setAmount(entry.amount.toString());
                            setBudgetDate(entry.date);
                            setDescription(entry.description);
                          }}
                          className="p-1 text-blue-600 hover:bg-blue-50 hover:text-[#00236f] rounded transition-all cursor-pointer"
                          title="Modify Contribution"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!confirm("Are you sure you want to permanently delete this supplemental allocation?")) return;
                            try {
                              const res = await fetch(`/api/budget/entries/${entry.id}`, { method: "DELETE" });
                              if (res.ok) {
                                setSuccess("Supplemental allocation deleted successfully.");
                                fetchBudgetData();
                                setTimeout(() => setSuccess(null), 4000);
                              } else {
                                const err = await res.json();
                                alert(err.error || "Failed to delete.");
                              }
                            } catch (e) {
                              console.error(e);
                            }
                          }}
                          className="p-1 text-rose-600 hover:bg-rose-50 hover:text-red-700 rounded transition-all cursor-pointer"
                          title="Delete Contribution"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {entries.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-slate-400 font-semibold italic">
                        No budget entries registered.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
