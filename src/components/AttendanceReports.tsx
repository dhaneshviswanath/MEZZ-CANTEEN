import { useState, useEffect } from "react";
import { 
  BarChart3, 
  Download, 
  Printer, 
  CalendarRange, 
  FileText,
  Loader2,
  Calendar,
  Layers
} from "lucide-react";

interface MonthlyAttendeeRow {
  employeeId: string;
  name: string;
  department: string;
  status: string;
  breakfast: number;
  lunch: number;
  dinner: number;
  totalMeals: number;
}

interface HistoricalSummary {
  breakfast: number;
  lunch: number;
  dinner: number;
  total: number;
}

interface DynamicTrendRow {
  date: string;
  Breakfast: number;
  Lunch: number;
  Dinner: number;
  Total: number;
}

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

export default function AttendanceReports() {
  const [activeReportTab, setActiveReportTab] = useState<'monthly' | 'historical'>('monthly');

  // Month selectors State
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(() => String(new Date().getMonth() + 1).padStart(2, "0"));

  // Date range selectors state
  const [startDate, setStartDate] = useState(() => getFirstOfMonthStr());
  const [endDate, setEndDate] = useState(() => getTodayStr());

  // Query Results
  const [monthlyRows, setMonthlyRows] = useState<MonthlyAttendeeRow[]>([]);
  const [historicalSum, setHistoricalSum] = useState<HistoricalSummary | null>(null);
  const [historicalTrend, setHistoricalTrend] = useState<DynamicTrendRow[]>([]);

  const [loading, setLoading] = useState(false);

  const monthsList = [
    { value: "01", name: "January" },
    { value: "02", name: "February" },
    { value: "03", name: "March" },
    { value: "04", name: "April" },
    { value: "05", name: "May" },
    { value: "06", name: "June" },
    { value: "07", name: "July" },
    { value: "08", name: "August" },
    { value: "09", name: "September" },
    { value: "10", name: "October" },
    { value: "11", name: "November" },
    { value: "12", name: "December" }
  ];

  // Fetch Monthly summary
  const fetchMonthlySummary = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/monthly?year=${selectedYear}&month=${selectedMonth}`);
      if (res.ok) {
        const data = await res.json();
        setMonthlyRows(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Historical range summary
  const fetchHistoricalSummary = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/historical?startDate=${startDate}&endDate=${endDate}`);
      if (res.ok) {
        const data = await res.json();
        setHistoricalSum(data.summary);
        setHistoricalTrend(data.dailyTrend);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeReportTab === "monthly") {
      fetchMonthlySummary();
    } else {
      fetchHistoricalSummary();
    }
  }, [activeReportTab, selectedYear, selectedMonth, startDate, endDate]);

  const handlePrint = () => {
    window.print();
  };

  // Trigger browser compiled CSV download vector
  const handleExportCSV = () => {
    let csvContent = "";
    if (activeReportTab === "monthly") {
      csvContent += `MEZZ CANTEEN Attendance Monthly Report - ${monthsList.find(m => m.value === selectedMonth)?.name} ${selectedYear}\n`;
      csvContent += "Employee ID,Staff Name,Department,Breakfast counts,Lunch counts,Dinner counts,Total Meals\n";
      monthlyRows.forEach(row => {
        csvContent += `"${row.employeeId}","${row.name}","${row.department}",${row.breakfast},${row.lunch},${row.dinner},${row.totalMeals}\n`;
      });
    } else {
      csvContent += `MEZZ CANTEEN Attendance Historical Trend (${startDate} to ${endDate})\n`;
      csvContent += "Date,Breakfast count,Lunch count,Dinner count,Total Day Meals\n";
      historicalTrend.forEach(row => {
        csvContent += `"${row.date}",${row.Breakfast},${row.Lunch},${row.Dinner},${row.Total}\n`;
      });
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `MEZZ_CANTEEN_Report_${activeReportTab === "monthly" ? "Monthly" : "Historical"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const currentMonthName = monthsList.find(m => m.value === selectedMonth)?.name || "May";

  return (
    <div className="space-y-6 print:p-0">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-xl font-bold text-[#0d1c2d]">Compliance & Attendance Analytics</h2>
          <p className="text-xs text-[#505f76] mt-0.5">Audit dietary metrics, export meal sheets, and verify compliance statistics.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 bg-white border border-[#c5c5d3] rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1"
          >
            <Download size={14} />
            Export CSV
          </button>
          <button
            onClick={handlePrint}
            className="px-3 py-2 bg-[#00236f] text-white rounded-lg text-xs font-bold hover:bg-[#00236f]/90 transition-colors flex items-center gap-1 shadow-xs"
          >
            <Printer size={14} />
            Print / PDF
          </button>
        </div>
      </div>

      {/* Tabs list */}
      <div className="border-b border-[#c5c5d3] flex gap-6 print:hidden">
        <button
          onClick={() => setActiveReportTab('monthly')}
          className={`pb-3 font-bold text-sm tracking-tight transition-all relative ${
            activeReportTab === 'monthly' ? 'text-[#00236f] font-bold' : 'text-[#757682] hover:text-[#0d1c2d]'
          }`}
        >
          Monthly Summary
          {activeReportTab === 'monthly' && <div className="absolute h-0.5 bg-[#00236f] left-0 right-0 bottom-0 rounded-full"></div>}
        </button>
        <button
          onClick={() => setActiveReportTab('historical')}
          className={`pb-3 font-bold text-sm tracking-tight transition-all relative ${
            activeReportTab === 'historical' ? 'text-[#00236f] font-bold' : 'text-[#757682] hover:text-[#0d1c2d]'
          }`}
        >
          Historical Range Audit
          {activeReportTab === 'historical' && <div className="absolute h-0.5 bg-[#00236f] left-0 right-0 bottom-0 rounded-full"></div>}
        </button>
      </div>

      {/* Primary configuration controls */}
      <div className="bg-white border border-[#c5c5d3] p-5 rounded-xl shadow-xs print:hidden">
        {activeReportTab === 'monthly' ? (
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <CalendarRange size={16} className="text-[#505f76]" />
              <label className="text-xs font-bold text-slate-700">Target Month:</label>
            </div>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-slate-50 border border-[#c5c5d3] rounded-lg p-1.5 text-xs font-bold text-slate-700"
            >
              {monthsList.map((m) => (
                <option key={m.value} value={m.value}>{m.name}</option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="bg-slate-50 border border-[#c5c5d3] rounded-lg p-1.5 text-xs font-bold text-slate-700"
            >
              <option value="2026">2026</option>
              <option value="2025">2025</option>
            </select>
            
            <span className="text-xs text-[#505f76] font-medium italic">
              Compiles aggregate dinner, lunch, and breakfast attendance tallies for the month.
            </span>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <CalendarRange size={16} className="text-[#505f76]" />
              <label className="text-xs font-bold text-slate-700">Set Date Range:</label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                max={endDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-50 border border-[#c5c5d3] rounded-lg p-1.5 text-xs font-semibold text-slate-800 focus:outline-[#00236f]"
              />
              <span className="text-xs text-slate-400 font-bold">to</span>
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-50 border border-[#c5c5d3] rounded-lg p-1.5 text-xs font-semibold text-slate-800 focus:outline-[#00236f]"
              />
            </div>

            <span className="text-xs text-[#505f76] font-medium sm:ml-auto">
              Selected interval spans <b className="text-slate-700">{Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 3600 * 24)) + 1} day(s)</b>.
            </span>
          </div>
        )}
      </div>

      {/* Visual Report Container optimized for Print output */}
      <div className="bg-white border border-[#c5c5d3] rounded-xl shadow-xs overflow-hidden p-6 space-y-6">
        
        {/* Print Header */}
        <div className="hidden print:flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-xl font-bold text-[#00236f]">MEZZ CANTEEN Attendance Report</h1>
            <p className="text-slate-500 font-bold text-xs">MEZZ CANTEEN Administrative Invoice</p>
          </div>
          <div className="text-right text-xs">
            <p className="font-bold text-slate-700">Generated: {new Date().toISOString().split("T")[0]}</p>
            <p className="text-slate-400">Status: Administrative Approved Compliance</p>
          </div>
        </div>

        {activeReportTab === 'monthly' ? (
          <div className="space-y-4">
            {/* Title Block */}
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#00236f] flex items-center gap-1.5">
                <FileText size={18} />
                Monthly Statement: {currentMonthName} {selectedYear}
              </h3>
              <span className="text-xs font-bold text-slate-400">Total Rows: {monthlyRows.length}</span>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-20 gap-2">
                <Loader2 className="animate-spin text-[#00236f]" size={20} />
                <span className="text-xs text-slate-500">Compiling database ledgers...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-[#c5c5d3]/50">
                      <th className="px-5 py-3 text-[10px] font-bold text-[#757682] uppercase w-24">ID</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-[#757682] uppercase">Staff Name</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-[#757682] uppercase w-32">Department</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-[#757682] uppercase text-center w-28">Breakfast ☕</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-[#757682] uppercase text-center w-28">Lunch 🍔</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-[#757682] uppercase text-center w-28">Dinner 🌙</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-[#00236f] uppercase text-right w-32">Total Meals</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {monthlyRows.map((row) => (
                      <tr key={row.employeeId} className="hover:bg-slate-55/40">
                        <td className="px-5 py-3.5 font-bold text-[#00236f]">{row.employeeId}</td>
                        <td className="px-5 py-3.5 font-semibold text-[#0d1c2d]">{row.name}</td>
                        <td className="px-5 py-3.5 font-medium text-[#505f76]">{row.department}</td>
                        <td className="px-5 py-3.5 text-center font-bold text-slate-600">{row.breakfast}</td>
                        <td className="px-5 py-3.5 text-center font-bold text-slate-600">{row.lunch}</td>
                        <td className="px-5 py-3.5 text-center font-bold text-slate-600">{row.dinner}</td>
                        <td className="px-5 py-3.5 text-right font-black text-[#00236f] bg-[#eef4ff]/20">
                          {row.totalMeals}
                        </td>
                      </tr>
                    ))}
                    {monthlyRows.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-5 py-12 text-center text-slate-400 font-semibold">
                          No attendance data found for {currentMonthName} {selectedYear}.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Range Card indicators */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Breakfast</span>
                <span className="text-2xl font-black text-[#00236f]">{historicalSum?.breakfast || 0}</span>
              </div>
              <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl text-center">
                <span className="text-[10px] font-bold text-[#505f76] uppercase tracking-widest block mb-1">Lunch</span>
                <span className="text-2xl font-black text-[#00236f]">{historicalSum?.lunch || 0}</span>
              </div>
              <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl text-center">
                <span className="text-[10px] font-bold text-amber-900 uppercase tracking-widest block mb-1">Dinner</span>
                <span className="text-2xl font-black text-[#00236f]">{historicalSum?.dinner || 0}</span>
              </div>
              <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl text-center">
                <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest block mb-1">Aggregate Meals Combined</span>
                <span className="text-2xl font-black text-indigo-950">{historicalSum?.total || 0}</span>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-[#0d1c2d] flex items-center gap-1.5">
                <Layers size={16} />
                Daily Compliance Ledger ({startDate} to {endDate})
              </h3>

              {loading ? (
                <div className="flex justify-center items-center py-20 gap-2">
                  <Loader2 className="animate-spin text-[#00236f]" size={20} />
                  <span className="text-xs text-slate-500">Querying daily summaries...</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-[#c5c5d3]/50">
                        <th className="px-5 py-3 text-[10px] font-bold text-[#757682] uppercase">Meal Log Date</th>
                        <th className="px-5 py-3 text-[10px] font-bold text-[#757682] uppercase text-center w-36">Breakfast Count</th>
                        <th className="px-5 py-3 text-[10px] font-bold text-[#757682] uppercase text-center w-36">Lunch Count</th>
                        <th className="px-5 py-3 text-[10px] font-bold text-[#757682] uppercase text-center w-36">Dinner Count</th>
                        <th className="px-5 py-3 text-[10px] font-bold text-[#041130] uppercase text-right w-40">Day Log Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                      {historicalTrend.map((row) => (
                        <tr key={row.date} className="hover:bg-slate-50">
                          <td className="px-5 py-3 font-semibold text-slate-800 flex items-center gap-2">
                            <Calendar size={14} className="text-slate-400" />
                            {row.date}
                          </td>
                          <td className="px-5 py-3 text-center">{row.Breakfast}</td>
                          <td className="px-5 py-3 text-center">{row.Lunch}</td>
                          <td className="px-5 py-3 text-center">{row.Dinner}</td>
                          <td className="px-5 py-3 text-right font-bold text-[#00236f] bg-[#eef4ff]/20">
                            {row.Total} Meals
                          </td>
                        </tr>
                      ))}
                      {historicalTrend.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-5 py-12 text-center text-slate-400 font-semibold">
                            No attendance records filed within this active date interval.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

        {/* Print Footer */}
        <div className="hidden print:block pt-12 text-center text-[10px] text-slate-400 font-medium">
          <p>CONFIDENTIAL CLIENT AUDIT REPORT - FOR ADMINISTRATIVE COUNTERPART ONLY</p>
          <p className="mt-1">MEZZ CANTEEN System • Operations Registry • Page 1 of 1</p>
        </div>

      </div>

    </div>
  );
}
