import { useState, useEffect } from "react";
import { 
  FileSpreadsheet, 
  Calendar, 
  Search, 
  TrendingDown, 
  Loader2, 
  CalendarDays, 
  Tags,
  DollarSign,
  Briefcase,
  AlertCircle,
  Trash2,
  Edit,
  Download
} from "lucide-react";
import { Expense } from "../types";

const getTodayStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getFirstOfMonthStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
};

export default function ExpenseReports({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const [startDate, setStartDate] = useState(() => getFirstOfMonthStr());
  const [endDate, setEndDate] = useState(() => getTodayStr());
  const [vendorFilter, setVendorFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchItem, setSearchItem] = useState("");

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);

  // Dynamic loaded vendors
  const [vendorsPreset, setVendorsPreset] = useState<string[]>([]);

  const fetchVendors = async () => {
    try {
      const res = await fetch("/api/vendors");
      if (res.ok) {
        const data = await res.json();
        setVendorsPreset(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  // Time Period Grouping Selection: Daily | Weekly | Monthly | Yearly
  const [groupingPeriod, setGroupingPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');

  const fetchFilteredExpenses = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({
        startDate,
        endDate,
        vendor: vendorFilter,
        category: categoryFilter,
        searchItem
      });
      const res = await fetch(`/api/expenses?${q.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setExpenses(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFilteredExpenses();
  }, [startDate, endDate, vendorFilter, categoryFilter, searchItem]);

  // Compute stats on the fly based on current filters
  const totalSpendFiltered = expenses.reduce((sum, e) => sum + e.total, 0);

  // Grouping operation depending on selected time selector
  const getGroupedData = () => {
    const groups: { [key: string]: { label: string; amount: number; invoiceCount: number } } = {};

    expenses.forEach((exp) => {
      let key = "";
      let label = "";

      const expDate = new Date(exp.date);
      if (isNaN(expDate.getTime())) return;

      if (groupingPeriod === "daily") {
        key = exp.date;
        label = exp.date;
      } else if (groupingPeriod === "weekly") {
        // Calculate week index or week range
        const firstDayOfYear = new Date(expDate.getFullYear(), 0, 1);
        const pastDaysOfYear = (expDate.getTime() - firstDayOfYear.getTime()) / 86400000;
        const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
        key = `Week-${weekNum}-${expDate.getFullYear()}`;
        label = `Week ${weekNum}, ${expDate.getFullYear()}`;
      } else if (groupingPeriod === "monthly") {
        const monthNum = expDate.toLocaleString("en-US", { month: "short" });
        key = `${expDate.getFullYear()}-${expDate.getMonth()}`;
        label = `${monthNum} ${expDate.getFullYear()}`;
      } else if (groupingPeriod === "yearly") {
        key = `${expDate.getFullYear()}`;
        label = `Year ${expDate.getFullYear()}`;
      }

      if (!groups[key]) {
        groups[key] = { label, amount: 0, invoiceCount: 0 };
      }
      groups[key].amount += exp.total;
      groups[key].invoiceCount += 1;
    });

    return Object.values(groups).sort((a, b) => a.label.localeCompare(b.label));
  };

  const groupedTrendArray = getGroupedData();

  // Find maximum grouping amount for percentage calculation in bar layouts
  const maxGroupValue = groupedTrendArray.length > 0
    ? Math.max(...groupedTrendArray.map(g => g.amount))
    : 1;

  // Compile categories shares for visually reporting distributions
  const categorySummary: { [cat: string]: number } = {};
  expenses.forEach(e => {
    e.items.forEach(it => {
      // Scale dynamic values
      const cost = it.price * it.qty;
      if (!categorySummary[it.category]) {
        categorySummary[it.category] = 0;
      }
      categorySummary[it.category] += cost;
    });
  });

  const categoriesPreset = ["Supplies", "Produce", "Utilities", "Dry Goods", "Maintenance", "Beverages"];

  const handleExportCSV = () => {
    let csvContent = "";
    csvContent += `MEZZ CANTEEN Expense Report\n`;
    csvContent += `Generated: ${new Date().toISOString().split("T")[0]}\n`;
    csvContent += `Date Range: ${startDate} to ${endDate}\n`;
    csvContent += `Vendor: ${vendorFilter === "all" ? "All Vendors" : vendorFilter}\n`;
    csvContent += `Category: ${categoryFilter === "all" ? "All Categories" : categoryFilter}\n\n`;

    // Headers
    csvContent += "Invoice Reference,Invoice Date,Item Title,Category,Vendor,Unit Price (DJF),Quantity,Line Total (DJF),Invoice Total (DJF)\n";

    expenses.forEach((exp) => {
      exp.items.forEach((item) => {
        const lineTotal = (item.price || 0) * (item.qty || 0);
        // Escape quotes
        const billNum = exp.billNumber.replace(/"/g, '""');
        const itemName = item.itemName.replace(/"/g, '""');
        const cat = item.category.replace(/"/g, '""');
        const vend = item.vendor.replace(/"/g, '""');

        csvContent += `"${billNum}","${exp.date}","${itemName}","${cat}","${vend}",${item.price},${item.qty},${lineTotal},${exp.total}\n`;
      });
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `MEZZ_CANTEEN_Expense_Report_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteInvoice = async (id: string, billNumber: string) => {
    if (!confirm(`Are you sure you want to delete Invoice ${billNumber}? This action cannot be undone and will restore budget balance.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/expenses/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        alert(`Invoice ${billNumber} successfully deleted.`);
        fetchFilteredExpenses();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete invoice.");
      }
    } catch (err) {
      console.error(err);
      alert("Network error deleting invoice.");
    }
  };

  const handleEditInvoice = (bill: Expense) => {
    localStorage.setItem("edit_expense_bill_id", bill.id);
    localStorage.setItem("edit_expense_bill_data", JSON.stringify(bill));
    if (onNavigate) {
      onNavigate("expenses");
    } else {
      alert("Please navigate to the 'Expenses Track' tab to complete editing.");
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-[#c5c5d3] shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-[#0d1c2d] flex items-center gap-2">
            <FileSpreadsheet className="text-[#00236f]" size={20} />
            Canteen Expenses Analytics Ledgers
          </h2>
          <p className="text-xs text-[#505f76] mt-0.5">Filter invoice entries, group totals, and audit expenditures by timeframe.</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="px-4 py-2.5 bg-[#00236f] text-white hover:bg-[#00236f]/90 transition-colors uppercase text-[11px] font-bold rounded-lg flex items-center gap-2 shadow-xs shrink-0 cursor-pointer"
        >
          <Download size={14} />
          Export Report (CSV)
        </button>
      </div>

      {/* Advanced Filter Control Room */}
      <div className="bg-white border border-[#c5c5d3] p-5 rounded-xl shadow-xs space-y-4">
        <h3 className="text-xs font-black text-[#505f76] uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <CalendarDays size={14} />
          Ledger Filter Criteria
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-4 items-end text-xs font-semibold">
          
          {/* Start Date */}
          <div className="md:col-span-3">
            <label className="text-[10px] font-bold text-slate-500 block mb-1">Interval Start Date</label>
            <input
              type="date"
              value={startDate}
              max={endDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-50 border border-[#c5c5d3] p-2 rounded-lg font-bold text-slate-700 focus:outline-[#00236f]"
            />
          </div>

          {/* End date */}
          <div className="md:col-span-3">
            <label className="text-[10px] font-bold text-slate-500 block mb-1">Interval End Date</label>
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-slate-50 border border-[#c5c5d3] p-2 rounded-lg font-bold text-slate-700 focus:outline-[#00236f]"
            />
          </div>

          {/* Vendor selection */}
          <div className="md:col-span-3">
            <label className="text-[10px] font-bold text-slate-500 block mb-1">Supplier / Vendor</label>
            <select
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
              className="w-full bg-slate-50 border border-[#c5c5d3] p-2 rounded-lg text-slate-700 focus:outline-[#00236f]"
            >
              <option value="all">All Vendors</option>
              {vendorsPreset.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          {/* Category Selection */}
          <div className="md:col-span-3">
            <label className="text-[10px] font-bold text-slate-500 block mb-1">Canteen Cost Center</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full bg-slate-50 border border-[#c5c5d3] p-2 rounded-lg text-slate-700 focus:outline-[#00236f]"
            >
              <option value="all">All Categories</option>
              {categoriesPreset.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

        </div>

        <div className="relative pt-1">
          <label className="text-[10px] font-bold text-slate-500 block mb-1">Search Keywords (Item name, invoice number, supplier details)</label>
          <Search size={14} className="absolute left-3.5 top-[35px] -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchItem}
            onChange={(e) => setSearchItem(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-[#c5c5d3] rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#00236f]"
            placeholder="Search within items (e.g., Letttuce, Milk, Basmati)..."
          />
        </div>
      </div>

      {/* KPI stats bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white border border-[#c5c5d3] p-5 rounded-xl shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Aggregate Interval Cost</span>
          <span className="text-3xl font-black text-[#00236f]">DJF {totalSpendFiltered.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <p className="text-[11px] text-[#505f76] mt-1.5 font-medium">Accumulated across selected criteria</p>
        </div>

        <div className="bg-white border border-[#c5c5d3] p-5 rounded-xl shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Invoices Audited</span>
          <span className="text-3xl font-black text-indigo-950">{expenses.length} Bills</span>
          <p className="text-[11px] text-[#505f76] mt-1.5 font-medium">Verified in the specified date range</p>
        </div>

        <div className="bg-white border border-[#c5c5d3] p-5 rounded-xl shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Cost Center Distribution</span>
          <div className="space-y-1 mt-1">
            {Object.entries(categorySummary).slice(0, 2).map(([cat, total]) => (
              <div key={cat} className="flex justify-between items-center text-[11px] font-bold text-slate-700">
                <span className="truncate max-w-[120px]">{cat}</span>
                <span>DJF {total.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
              </div>
            ))}
            {Object.keys(categorySummary).length === 0 && (
              <span className="text-xs text-slate-400 italic font-semibold">No category cost distribution</span>
            )}
          </div>
        </div>
      </div>

      {/* Time Grouping Selector Option + Graphical Bento Trend representation */}
      <div className="bg-white border border-[#c5c5d3] rounded-xl p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-sm font-bold text-[#0d1c2d] flex items-center gap-1.5">
              <TrendingDown size={16} className="text-[#00236f]" />
              Spend Allocation Breakdown By Timeframe Range
            </h3>
            <p className="text-xs text-[#505f76] mt-0.5 font-medium">Interactive timeline selector aggregates individual logs dynamically.</p>
          </div>

          {/* Time Selector Grouping filter buttons */}
          <div className="inline-flex rounded-lg border border-[#c5c5d3] p-0.5 bg-slate-50 print:hidden text-[11px] font-bold">
            <button
              onClick={() => setGroupingPeriod('daily')}
              className={`px-3 py-1.5 rounded-md transition-all ${groupingPeriod === 'daily' ? 'bg-[#00236f] text-white' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Daily
            </button>
            <button
              onClick={() => setGroupingPeriod('weekly')}
              className={`px-3 py-1.5 rounded-md transition-all ${groupingPeriod === 'weekly' ? 'bg-[#00236f] text-white' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Weekly
            </button>
            <button
              onClick={() => setGroupingPeriod('monthly')}
              className={`px-3 py-1.5 rounded-md transition-all ${groupingPeriod === 'monthly' ? 'bg-[#00236f] text-white' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setGroupingPeriod('yearly')}
              className={`px-3 py-1.5 rounded-md transition-all ${groupingPeriod === 'yearly' ? 'bg-[#00236f] text-white' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Yearly
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20 gap-2">
            <Loader2 className="animate-spin text-[#00236f]" size={20} />
            <span className="text-xs text-slate-500">Regrouping entries...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedTrendArray.map((group, idx) => {
              const widthPct = Math.max((group.amount / maxGroupValue) * 100, 3);
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-[#0d1c2d] font-bold">{group.label} ({group.invoiceCount} bill(s))</span>
                    <span className="text-[#00236f] font-black">
                      DJF {group.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="w-full h-4 bg-slate-150/45 rounded-lg overflow-hidden relative group">
                    <div 
                      className="h-full bg-indigo-500 rounded-lg group-hover:bg-[#00236f] transition-all duration-300"
                      style={{ width: `${widthPct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
            {groupedTrendArray.length === 0 && (
              <div className="text-center py-12 text-slate-400 font-semibold text-xs border border-dashed border-slate-200 rounded-xl">
                No processed expense invoices found matching the current selections.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Matching Individual Invoices Detailed Table */}
      <div className="bg-white border border-[#c5c5d3] rounded-xl overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="text-sm font-bold text-[#0d1c2d] flex items-center gap-1.5">
              <FileSpreadsheet size={16} className="text-[#00236f]" />
              Detailed Invoices Ledger ({expenses.length})
            </h3>
            <p className="text-xs text-[#505f76] mt-0.5">Audit individual transaction sheets, make changes, or purge entries with immediate budget reconciliation.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-[#c5c5d3]/60 text-[#505f76] text-[10px] font-bold uppercase tracking-wider">
                <th className="px-5 py-3">Bill Number</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Vendor</th>
                <th className="px-5 py-3">Primary Category</th>
                <th className="px-5 py-3 text-right">Amount</th>
                <th className="px-5 py-3 text-center print:hidden">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-xs">
              {expenses.map((bill) => {
                const primaryCat = bill.items[0]?.category || "Supplies";
                const primaryVendor = bill.items[0]?.vendor || "Vendor Provider";
                return (
                  <tr key={bill.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5 text-[#00236f] font-bold font-mono">{bill.billNumber}</td>
                    <td className="px-5 py-3.5 text-[#505f76]">{bill.date}</td>
                    <td className="px-5 py-3.5 text-[#0d1c2d]">{primaryVendor} {bill.items.length > 1 && <span className="text-[10px] font-medium text-slate-400">+{bill.items.length - 1} more</span>}</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] bg-slate-100 border border-slate-200 text-slate-700">
                        {primaryCat}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold text-slate-850">
                      DJF {bill.total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3.5 text-center space-x-1.5 print:hidden">
                      <button
                        onClick={() => handleEditInvoice(bill)}
                        className="p-1.5 text-indigo-700 hover:bg-indigo-50 rounded shrink-0"
                        title="Edit / Modify invoice details"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteInvoice(bill.id, bill.billNumber)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded shrink-0"
                        title="Permanently remove invoice"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {expenses.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400 font-medium">
                    No individual expense invoices match your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
