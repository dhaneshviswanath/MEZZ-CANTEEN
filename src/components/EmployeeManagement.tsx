import { useState, useEffect, FormEvent } from "react";
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  X, 
  Edit, 
  UserX, 
  UserCheck, 
  Loader2,
  AlertCircle
} from "lucide-react";
import { Employee } from "../types";

export default function EmployeeManagement() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Edit/Add Modals State
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentEmp, setCurrentEmp] = useState<Partial<Employee> | null>(null);

  // Departments List
  const [departments, setDepartments] = useState<string[]>([]);
  const [showAddDept, setShowAddDept] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");
  const [addingDept, setAddingDept] = useState(false);

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

  const fetchEmployees = async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({
        search,
        department: deptFilter,
        status: statusFilter
      });
      const res = await fetch(`/api/employees?${q.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEmployees(data);
      } else {
        setError("Failed to fetch employee records.");
      }
    } catch (err) {
      setError("Network error loading employees.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [search, deptFilter, statusFilter]);

  const handleOpenAdd = () => {
    setIsEditing(false);
    setCurrentEmp({ name: "", employeeId: "", department: departments[0] || "MTW", status: "Active" });
    setShowModal(true);
  };

  const handleOpenEdit = (emp: Employee) => {
    setIsEditing(true);
    setCurrentEmp(emp);
    setShowModal(true);
  };

  const handleAddDepartmentSubmit = async () => {
    if (!newDeptName.trim()) return;
    setAddingDept(true);
    try {
      const res = await fetch("/api/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newDeptName.trim() })
      });
      if (res.ok) {
        const data = await res.json();
        setDepartments(data.departments);
        if (currentEmp) {
          setCurrentEmp({ ...currentEmp, department: newDeptName.trim() });
        }
        setNewDeptName("");
        setShowAddDept(false);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to add department");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAddingDept(false);
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentEmp?.name?.trim()) {
      alert("Employee Name is required.");
      return;
    }

    if (!isEditing && !currentEmp?.employeeId?.trim()) {
      alert("Manual Employee ID is required.");
      return;
    }

    try {
      let url = "/api/employees";
      let method = "POST";

      if (isEditing && currentEmp?.id) {
        url = `/api/employees/${currentEmp.id}`;
        method = "PUT";
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(currentEmp)
      });

      if (res.ok) {
        setSuccess(isEditing ? `Profile for "${currentEmp.name}" successfully updated and synchronized.` : `New staff member "${currentEmp.name}" successfully registered with ID ${currentEmp.employeeId}.`);
        setShowModal(false);
        setCurrentEmp(null);
        fetchEmployees();
        setTimeout(() => setSuccess(null), 5000);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to save employee.");
      }
    } catch (err) {
      console.error(err);
      alert("Error occurred while saving employee record.");
    }
  };

  const handleToggleDeactivate = async (emp: Employee) => {
    const nextStatus = emp.status === "Active" ? "Deactivated" : "Active";
    const confirmMessage = `Are you sure you want to set status of ${emp.name} to '${nextStatus}'?`;
    if (!window.confirm(confirmMessage)) return;

    try {
      const res = await fetch(`/api/employees/${emp.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });

      if (res.ok) {
        fetchEmployees();
      } else {
        alert("Failed to modify employee status.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#0d1c2d]">Employee Administration</h2>
          <p className="text-xs text-[#505f76] mt-0.5">CRUD management and filters of registered catering attendees</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="bg-[#00236f] text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 hover:bg-[#00236f]/90 transition-all shadow-xs"
        >
          <Plus size={14} />
          Register New Staff
        </button>
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

      {/* Filter / Search Bar banner */}
      <div className="bg-white border border-[#c5c5d3] p-4 rounded-xl shadow-xs grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* Search */}
        <div className="md:col-span-5 relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-[#c5c5d3] rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00236f] transition-all placeholder-slate-400"
            placeholder="Search by ID, name or department..."
          />
        </div>

        {/* Dept Filter */}
        <div className="md:col-span-3 flex items-center gap-2">
          <Filter size={14} className="text-slate-400 shrink-0" />
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-[#c5c5d3] rounded-lg p-2 focus:ring-1 focus:ring-[#00236f] focus:outline-none"
          >
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="md:col-span-4 flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-[#c5c5d3] rounded-lg p-2 focus:ring-1 focus:ring-[#00236f] focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="Active">Active Only</option>
            <option value="Deactivated">Deactivated Only</option>
          </select>

          {/* Clear Filters helper */}
          {(search || deptFilter !== "all" || statusFilter !== "all") && (
            <button
              onClick={() => {
                setSearch("");
                setDeptFilter("all");
                setStatusFilter("all");
              }}
              className="px-2.5 py-2 bg-slate-100 border border-slate-200 hover:bg-slate-200 rounded-lg text-xs font-semibold text-[#505f76] flex items-center gap-1 shrink-0"
              title="Reset Search & Filters"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-xl flex items-center gap-2 text-xs font-semibold">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Employees Table view */}
      <div className="bg-white border border-[#c5c5d3] rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-16 gap-2">
            <Loader2 className="animate-spin text-[#00236f]" size={20} />
            <span className="text-xs text-slate-500 font-semibold">Updating rosters...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-[#c5c5d3]/50">
                  <th className="px-5 py-3.5 text-[10px] font-bold text-[#757682] uppercase">Employee ID</th>
                  <th className="px-5 py-3.5 text-[10px] font-bold text-[#757682] uppercase">Staff Name</th>
                  <th className="px-5 py-3.5 text-[10px] font-bold text-[#757682] uppercase">Department</th>
                  <th className="px-5 py-3.5 text-[10px] font-bold text-[#757682] uppercase text-center">Status</th>
                  <th className="px-5 py-3.5 text-[10px] font-bold text-[#757682] uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {employees.map((emp) => {
                  const isActive = emp.status === "Active";
                  return (
                    <tr key={emp.id} className="hover:bg-[#eef4ff]/30 transition-colors">
                      <td className="px-5 py-4 font-bold text-[#00236f]">{emp.employeeId}</td>
                      <td className="px-5 py-4 font-semibold text-[#0d1c2d]">{emp.name}</td>
                      <td className="px-5 py-4 text-[#505f76] font-medium">{emp.department}</td>
                      <td className="px-5 py-4 text-center">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          isActive ? "bg-green-100 text-green-700" : "bg-neutral-100 text-neutral-500"
                        }`}>
                          {emp.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right flex justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(emp)}
                          className="p-1 px-2.5 bg-slate-50 border border-[#c5c5d3] text-[#505f76] hover:bg-slate-100 hover:text-[#00236f] rounded-lg transition-all flex items-center gap-1 font-bold text-[10px]"
                          title="Edit Details"
                        >
                          <Edit size={12} />
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleDeactivate(emp)}
                          className={`p-1 px-2.5 border rounded-lg transition-all flex items-center gap-1 font-bold text-[10px] ${
                            isActive 
                              ? "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100"
                              : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                          }`}
                          title={isActive ? "Deactivate employee" : "Activate employee"}
                        >
                          {isActive ? <UserX size={12} /> : <UserCheck size={12} />}
                          {isActive ? "Deactivate" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {employees.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-slate-400 font-semibold">
                      No staff matching the search queries found. Click "Register New Staff" to add.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && currentEmp && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md border border-[#c5c5d3] overflow-hidden">
            <div className="bg-[#00236f] px-6 py-4 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Users size={16} />
                {isEditing ? `Edit Staff Member (${currentEmp.employeeId})` : "Register New Staff Member"}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-slate-200 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#0d1c2d] mb-1">
                  Manual Employee ID
                </label>
                <input
                  type="text"
                  required
                  disabled={isEditing}
                  value={currentEmp.employeeId || ""}
                  onChange={(e) => setCurrentEmp({ ...currentEmp, employeeId: e.target.value })}
                  className="block w-full border border-[#c5c5d3] rounded-lg p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#00236f] text-slate-800 disabled:bg-slate-50 disabled:text-slate-500 font-mono font-bold"
                  placeholder="e.g., EMP-1011"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0d1c2d] mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={currentEmp.name || ""}
                  onChange={(e) => setCurrentEmp({ ...currentEmp, name: e.target.value })}
                  className="block w-full border border-[#c5c5d3] rounded-lg p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#00236f] text-slate-800"
                  placeholder="e.g., Jane Watson"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-[#0d1c2d]">
                    Department Allocation
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddDept(!showAddDept)}
                    className="text-[10px] font-bold text-[#00236f] hover:underline"
                  >
                    {showAddDept ? "✕ Hide Options" : "+ Add Department"}
                  </button>
                </div>

                {showAddDept && (
                  <div className="flex items-center gap-2 mt-1 mb-2 bg-[#eef4ff] p-2 rounded-lg border border-indigo-150 animate-fadeIn">
                    <input
                      type="text"
                      value={newDeptName}
                      onChange={(e) => setNewDeptName(e.target.value)}
                      placeholder="e.g. BVEN Support"
                      className="block w-full bg-white border border-[#c5c5d3] rounded-lg p-1.5 text-xs outline-none focus:ring-1 focus:ring-[#00236f] text-slate-800"
                    />
                    <button
                      type="button"
                      disabled={addingDept || !newDeptName.trim()}
                      onClick={handleAddDepartmentSubmit}
                      className="px-2.5 py-1.5 bg-[#00236f] text-white rounded-md text-xs font-bold disabled:opacity-45 hover:bg-[#00236f]/90 shrink-0"
                    >
                      {addingDept ? "..." : "Add"}
                    </button>
                  </div>
                )}

                <select
                  value={currentEmp.department || (departments[0] || "MTW")}
                  onChange={(e) => setCurrentEmp({ ...currentEmp, department: e.target.value })}
                  className="block w-full border border-[#c5c5d3] rounded-lg p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#00236f] text-slate-800 bg-white"
                >
                  {departments.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0d1c2d] mb-1">
                  Catering Authorization Status
                </label>
                <select
                  value={currentEmp.status || "Active"}
                  onChange={(e) => setCurrentEmp({ ...currentEmp, status: e.target.value as any })}
                  className="block w-full border border-[#c5c5d3] rounded-lg p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#00236f] text-slate-800 bg-white"
                >
                  <option value="Active">Active</option>
                  <option value="Deactivated">Deactivated</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-[#c5c5d3] rounded-lg text-xs font-bold text-[#505f76] hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#00236f] text-white rounded-lg text-xs font-bold hover:bg-[#00236f]/90"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
