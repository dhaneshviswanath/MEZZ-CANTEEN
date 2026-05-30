import { useState, useEffect } from "react";
import { 
  ClipboardCheck, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Loader2, 
  Check, 
  X,
  AlertCircle,
  Clock
} from "lucide-react";

interface AttendanceItem {
  id: string;
  employeeId: string;
  name: string;
  department: string;
  status: string;
  date: string;
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
  hasRecord: boolean;
}

const getTodayStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function AttendanceTracking() {
  const [targetDate, setTargetDate] = useState(() => getTodayStr());

  const [attendance, setAttendance] = useState<AttendanceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Departments List
  const [departments, setDepartments] = useState<string[]>([]);

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkMeal, setBulkMeal] = useState<'Breakfast' | 'Lunch' | 'Dinner'>('Lunch');
  const [bulkValue, setBulkValue] = useState(true);
  const [bulkSaving, setBulkSaving] = useState(false);

  // Filter department in view
  const [deptFilter, setDeptFilter] = useState("all");

  const todayStr = getTodayStr(); // Constant tracking current local system time

  const fetchDepartments = async () => {
    try {
      const res = await fetch("/api/departments");
      if (res.ok) {
        const list = await res.json();
        setDepartments(list);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAttendance = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/attendance?date=${targetDate}`);
      if (res.ok) {
        const data = await res.json();
        setAttendance(data);
        // Clear old selection array
        setSelectedIds([]);
      } else {
        setError("Failed to fetch attendance sheet.");
      }
    } catch (err) {
      setError("Network error loading attendance sheet.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, [targetDate]);

  // Handle single meal togglers
  const handleToggleMeal = async (empId: string, meal: 'Breakfast' | 'Lunch' | 'Dinner', currentVal: boolean) => {
    if (targetDate > todayStr) {
      alert("MEZZ CANTEEN rules prevent marking meal attendance for speculative future dates.");
      return;
    }

    try {
      const res = await fetch("/api/attendance/single", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: empId,
          date: targetDate,
          meal,
          value: !currentVal
        })
      });

      if (res.ok) {
        // Optimistic state update in UI
        setAttendance(prev => 
          prev.map(item => {
            if (item.employeeId === empId) {
              return {
                ...item,
                [meal.toLowerCase()]: !currentVal
              };
            }
            return item;
          })
        );
      } else {
        const data = await res.json();
        alert(data.error || "Failed to mark attendance.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Bulk submit
  const handleBulkSubmit = async () => {
    if (selectedIds.length === 0) {
      alert("Please select at least one employee using the row checkboxes.");
      return;
    }

    if (targetDate > todayStr) {
      alert("Cannot bulk mark meal attendance for future dates.");
      return;
    }

    setBulkSaving(true);
    try {
      const res = await fetch("/api/attendance/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeIds: selectedIds,
          date: targetDate,
          meals: {
            [bulkMeal]: bulkValue
          }
        })
      });

      if (res.ok) {
        setSuccess(`Successfully marked ${bulkMeal} as ${bulkValue ? 'ATTENDED' : 'NOT ATTENDED'} for ${selectedIds.length} staff members.`);
        fetchAttendance();
        setTimeout(() => setSuccess(null), 5000);
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Failed bulk operations.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBulkSaving(false);
    }
  };

  // Navigation arrows for dates
  const handleDayOffset = (offset: number) => {
    const d = new Date(targetDate);
    d.setDate(d.getDate() + offset);
    const nextDateStr = d.toISOString().split("T")[0];
    
    // Future date guard
    if (nextDateStr > todayStr) {
      alert("Future attendance logging is blocked. Please select today or historical dates.");
      return;
    }
    setTargetDate(nextDateStr);
  };

  const handleSelectAll = (checked: boolean, filteredList: AttendanceItem[]) => {
    if (checked) {
      setSelectedIds(filteredList.map(item => item.employeeId));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (empId: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, empId]);
    } else {
      setSelectedIds(prev => prev.filter(id => id !== empId));
    }
  };

  const filteredAttendance = deptFilter === "all" 
    ? attendance 
    : attendance.filter(item => item.department === deptFilter);

  const isFutureDate = targetDate > todayStr;

  return (
    <div className="space-y-6">
      
      {/* Date Control Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-xl border border-[#c5c5d3] shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-[#0d1c2d] flex items-center gap-2">
            <ClipboardCheck className="text-[#00236f]" size={20} />
            Daily Meal Tracker
          </h2>
          <p className="text-xs text-[#505f76] mt-0.5">Maintain precision meal quotas. Mark breakfast, lunch, and dinner attendance.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleDayOffset(-1)}
            className="p-2 border border-[#c5c5d3] hover:bg-slate-100 rounded-lg text-slate-700 font-bold transition-all"
          >
            <ChevronLeft size={16} />
          </button>

          <div className="relative">
            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="date"
              value={targetDate}
              max={todayStr}
              onChange={(e) => {
                if (e.target.value > todayStr) {
                  alert("Future dates are inactive. Select today index or older logs.");
                  return;
                }
                setTargetDate(e.target.value);
              }}
              className="pl-9 pr-3 py-1.5 border border-[#c5c5d3] rounded-lg text-xs font-bold text-slate-800 focus:outline-[#00236f]"
            />
          </div>

          <button
            onClick={() => handleDayOffset(1)}
            disabled={targetDate === todayStr}
            className="p-2 border border-[#c5c5d3] hover:bg-slate-100 rounded-lg text-slate-700 font-bold transition-all disabled:opacity-40"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

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

      {isFutureDate && (
        <div className="bg-[#ffdad6] border border-red-250 p-3.5 rounded-xl text-[#ba1a1a] flex items-center gap-2 text-xs font-semibold">
          <AlertCircle size={16} />
          <span>Notice: Selected date is in the future. Editing meal attendance logs is disabled for speculative days.</span>
        </div>
      )}

      {/* Bulk Marking Control Cabin */}
      <div className="bg-[#eef4ff] border border-[#d0e1fb] p-5 rounded-xl shadow-xs">
        <h4 className="text-xs font-bold text-[#00236f] uppercase tracking-wider mb-3">Bulk Mass Operations Manager</h4>
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[#505f76] font-semibold">Mark selected employees (No. {selectedIds.length}) for:</span>
            <select
              value={bulkMeal}
              onChange={(e) => setBulkMeal(e.target.value as any)}
              className="bg-white border border-[#c5c5d3] rounded-lg p-2 font-bold text-slate-700 focus:ring-1 focus:ring-[#00236f]"
            >
              <option value="Breakfast">Breakfast ☕</option>
              <option value="Lunch">Lunch 🍔</option>
              <option value="Dinner">Dinner 🌙</option>
            </select>
            
            <span className="text-slate-400">as</span>

            <select
              value={bulkValue ? "yes" : "no"}
              onChange={(e) => setBulkValue(e.target.value === "yes")}
              className="bg-white border border-[#c5c5d3] rounded-lg p-2 font-bold text-slate-700 focus:ring-1 focus:ring-[#00236f]"
            >
              <option value="yes">Attended (YES)</option>
              <option value="no">Not Attended (NO)</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleBulkSubmit}
            disabled={bulkSaving || selectedIds.length === 0 || isFutureDate}
            className="md:ml-auto w-full md:w-auto px-5 py-2.5 bg-[#00236f] text-white hover:bg-[#00236f]/90 transition-all rounded-lg font-bold shadow-xs disabled:opacity-45"
          >
            {bulkSaving ? "Updating bulk records..." : "Apply Batch Command"}
          </button>
        </div>
      </div>

      {/* Roster & Grid filter */}
      <div className="flex justify-between items-center bg-white px-5 py-4 border border-[#c5c5d3] rounded-xl shadow-xs">
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-[#505f76]" />
          <span className="text-xs font-bold text-[#505f76]">Sheet Date:</span>
          <span className="text-xs font-bold text-[#00236f] bg-[#eef4ff] px-2.5 py-1 rounded-full">{targetDate}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#505f76]">Dept Filter:</span>
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="text-xs font-bold text-slate-700 bg-slate-50 border border-[#c5c5d3] rounded-lg p-1.5 focus:outline-none"
          >
            <option value="all">All Departments</option>
            {departments.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-2 text-xs font-semibold">
          <Clock size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Main Attendance Sheet Table */}
      <div className="bg-white border border-[#c5c5d3] rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-20 gap-2">
            <Loader2 className="animate-spin text-[#00236f]" size={20} />
            <span className="text-xs text-slate-500 font-semibold">Loading daily sheets...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-[#c5c5d3]/50">
                  <th className="px-5 py-3.5 text-center w-12">
                    <input
                      type="checkbox"
                      checked={filteredAttendance.length > 0 && selectedIds.length === filteredAttendance.length}
                      onChange={(e) => handleSelectAll(e.target.checked, filteredAttendance)}
                      className="rounded border-[#c5c5d3] text-[#00236f] focus:ring-[#00236f]"
                    />
                  </th>
                  <th className="px-5 py-3.5 text-[10px] font-bold text-[#757682] uppercase w-28">Employee ID</th>
                  <th className="px-5 py-3.5 text-[10px] font-bold text-[#757682] uppercase">Staff Name</th>
                  <th className="px-5 py-3.5 text-[10px] font-bold text-[#757682] uppercase w-32">Department</th>
                  <th className="px-5 py-3.5 text-[10px] font-bold text-[#757682] uppercase text-center w-28">Breakfast ☕</th>
                  <th className="px-5 py-3.5 text-[10px] font-bold text-[#757682] uppercase text-center w-28">Lunch 🍔</th>
                  <th className="px-5 py-3.5 text-[10px] font-bold text-[#757682] uppercase text-center w-28">Dinner 🌙</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredAttendance.map((emp) => {
                  const isChecked = selectedIds.includes(emp.employeeId);
                  return (
                    <tr key={emp.employeeId} className={`transition-colors ${isChecked ? 'bg-[#eef4ff]/30' : 'hover:bg-slate-50/50'}`}>
                      <td className="px-5 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => handleSelectRow(emp.employeeId, e.target.checked)}
                          className="rounded border-[#c5c5d3] text-[#00236f] focus:ring-[#00236f]"
                        />
                      </td>
                      <td className="px-5 py-4 font-bold text-[#00236f]">{emp.employeeId}</td>
                      <td className="px-5 py-4 font-semibold text-[#0d1c2d]">{emp.name}</td>
                      <td className="px-5 py-4 text-[#505f76] font-medium">{emp.department}</td>
                      
                      {/* Breakfast Toggle */}
                      <td className="px-5 py-4 text-center">
                        <button
                          type="button"
                          disabled={isFutureDate}
                          onClick={() => handleToggleMeal(emp.employeeId, "Breakfast", emp.breakfast)}
                          className={`inline-flex items-center justify-center p-2 rounded-lg border transition-all ${
                            emp.breakfast 
                              ? 'bg-green-150 border-green-300 text-green-700 shadow-2xs font-bold' 
                              : 'bg-slate-50 border-slate-200 text-slate-300 hover:border-[#00236f]/30 hover:text-[#00236f]'
                          }`}
                          title="Toggle Breakfast"
                        >
                          {emp.breakfast ? <Check size={14} strokeWidth={2.5} /> : <X size={14} />}
                        </button>
                      </td>

                      {/* Lunch Toggle */}
                      <td className="px-5 py-4 text-center">
                        <button
                          type="button"
                          disabled={isFutureDate}
                          onClick={() => handleToggleMeal(emp.employeeId, "Lunch", emp.lunch)}
                          className={`inline-flex items-center justify-center p-2 rounded-lg border transition-all ${
                            emp.lunch 
                              ? 'bg-[#d3e4fe] border-indigo-300 text-[#00236f] shadow-2xs font-bold' 
                              : 'bg-slate-50 border-slate-200 text-slate-300 hover:border-[#00236f]/30 hover:text-[#00236f]'
                          }`}
                          title="Toggle Lunch"
                        >
                          {emp.lunch ? <Check size={14} strokeWidth={2.5} /> : <X size={14} />}
                        </button>
                      </td>

                      {/* Dinner Toggle */}
                      <td className="px-5 py-4 text-center">
                        <button
                          type="button"
                          disabled={isFutureDate}
                          onClick={() => handleToggleMeal(emp.employeeId, "Dinner", emp.dinner)}
                          className={`inline-flex items-center justify-center p-2 rounded-lg border transition-all ${
                            emp.dinner 
                              ? 'bg-[#ffdbcb] border-amber-300 text-[#773205] shadow-2xs font-bold' 
                              : 'bg-slate-50 border-slate-200 text-slate-300 hover:border-[#00236f]/30 hover:text-[#00236f]'
                          }`}
                          title="Toggle Dinner"
                        >
                          {emp.dinner ? <Check size={14} strokeWidth={2.5} /> : <X size={14} />}
                        </button>
                      </td>

                    </tr>
                  );
                })}
                {filteredAttendance.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-slate-400 font-semibold">
                      No active staff roster found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
