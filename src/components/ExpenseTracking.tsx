import { useState, useEffect, FormEvent } from "react";
import { 
  Plus, 
  Trash2, 
  Receipt, 
  Calendar, 
  Calculator, 
  AlertTriangle, 
  Loader2, 
  Check,
  FileSpreadsheet,
  Edit,
  Search,
  X
} from "lucide-react";
import { ExpenseItem, Expense } from "../types";

const getTodayStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function ExpenseTracking({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [billNumber, setBillNumber] = useState("");
  const [expenseDate, setExpenseDate] = useState(() => getTodayStr()); // system current local date
  const [searchQuery, setSearchQuery] = useState("");

  // Line items state
  const [lineItems, setLineItems] = useState<Partial<ExpenseItem>[]>([
    { itemName: "", price: 0, qty: 1, vendor: "", category: "Supplies" }
  ]);

  const [saving, setSaving] = useState(false);
  const [recentBills, setRecentBills] = useState<Expense[]>([]);
  const [loadingBills, setLoadingBills] = useState(false);

  const categories = ["Supplies", "Produce", "Utilities", "Dry Goods", "Maintenance", "Beverages"];
  
  // Dynamic Vendors state
  const [vendors, setVendors] = useState<string[]>([]);
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [newVendorName, setNewVendorName] = useState("");
  const [addingVendor, setAddingVendor] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchVendors = async () => {
    try {
      const res = await fetch("/api/vendors");
      if (res.ok) {
        const data = await res.json();
        setVendors(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddVendorSubmit = async () => {
    if (!newVendorName.trim()) return;
    setAddingVendor(true);
    try {
      const res = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newVendorName.trim() })
      });
      if (res.ok) {
        const data = await res.json();
        setVendors(data.vendors);
        setNewVendorName("");
        setShowAddVendor(false);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to add vendor");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAddingVendor(false);
    }
  };

  const fetchRecentBills = async () => {
    setLoadingBills(true);
    try {
      const res = await fetch("/api/expenses");
      if (res.ok) {
        const data = await res.json();
        // Load all expenses and sort reverse-chronological by date
        setRecentBills(data.reverse());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingBills(false);
    }
  };

  useEffect(() => {
    fetchRecentBills();
    fetchVendors();

    const storedEditId = localStorage.getItem("edit_expense_bill_id");
    const storedEditData = localStorage.getItem("edit_expense_bill_data");

    if (storedEditId && storedEditData) {
      try {
        const parsed = JSON.parse(storedEditData) as Expense;
        setEditingExpenseId(storedEditId);
        setBillNumber(parsed.billNumber);
        setExpenseDate(parsed.date);
        setLineItems(parsed.items);
      } catch (err) {
        console.error("Error loading prefilled invoice edit data", err);
      } finally {
        localStorage.removeItem("edit_expense_bill_id");
        localStorage.removeItem("edit_expense_bill_data");
      }
    } else {
      setBillNumber(`INV-${Math.floor(10000 + Math.random() * 90000)}`);
    }
  }, []);

  const handleStartEdit = (bill: Expense) => {
    setEditingExpenseId(bill.id);
    setBillNumber(bill.billNumber);
    setExpenseDate(bill.date);
    setLineItems(bill.items);
  };

  const handleCancelEdit = () => {
    setEditingExpenseId(null);
    setLineItems([{ itemName: "", price: 0, qty: 1, vendor: "", category: "Supplies" }]);
    setBillNumber(`INV-${Math.floor(10000 + Math.random() * 90000)}`);
  };

  const handleDeleteBill = async (id: string, code: string) => {
    if (!confirm(`Are you sure you want to permanently delete Invoice ${code}?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/expenses/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        alert(`Invoice ${code} successfully deleted.`);
        fetchRecentBills();
        if (editingExpenseId === id) {
          handleCancelEdit();
        }
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddLineRow = () => {
    // Copy the vendor of the last item if filled to make speed entry extremely swift!
    const lastVendor = lineItems[lineItems.length - 1]?.vendor || "";
    setLineItems(prev => [
      ...prev,
      { itemName: "", price: 0, qty: 1, vendor: lastVendor, category: "Supplies" }
    ]);
  };

  const handleRemoveLineRow = (index: number) => {
    if (lineItems.length === 1) {
      alert("At least one line item is required to log a bill.");
      return;
    }
    setLineItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateLineField = (index: number, field: keyof ExpenseItem, val: any) => {
    setLineItems(prev => prev.map((item, idx) => {
      if (idx === index) {
        return {
          ...item,
          [field]: val
        };
      }
      return item;
    }));
  };

  // Compile totals
  const autoBillTotal = lineItems.reduce((sum, item) => {
    const pr = parseFloat(String(item.price)) || 0;
    const qt = parseInt(String(item.qty)) || 0;
    return sum + (pr * qt);
  }, 0);

  const handleSubmitBill = async (e: FormEvent) => {
    e.preventDefault();

    if (!billNumber.trim()) {
      alert("Bill Number is required.");
      return;
    }

    // Comprehensive client-side validations
    for (const [idx, item] of lineItems.entries()) {
      if (!item.itemName?.trim()) {
        alert(`Line ${idx + 1}: Item name is required.`);
        return;
      }
      if (!item.vendor?.trim()) {
        alert(`Line ${idx + 1}: Vendor is required.`);
        return;
      }
      const pr = parseFloat(String(item.price));
      if (isNaN(pr) || pr <= 0) {
        alert(`Line ${idx + 1}: Price must be a positive decimal higher than zero.`);
        return;
      }
      const qt = parseInt(String(item.qty));
      if (isNaN(qt) || qt <= 0) {
        alert(`Line ${idx + 1}: Quantity must be a positive integer higher than zero.`);
        return;
      }
    }

    setSaving(true);
    try {
      const url = editingExpenseId ? `/api/expenses/${editingExpenseId}` : "/api/expenses";
      const method = editingExpenseId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billNumber,
          date: expenseDate,
          items: lineItems
        })
      });

      if (res.ok) {
        if (editingExpenseId) {
          setSuccess(`Invoice "${billNumber}" successfully updated and synchronized in the system.`);
          handleCancelEdit();
        } else {
          setSuccess(`Bill "${billNumber}" successfully logged into transaction ledger for a total value of DJF ${autoBillTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`);
          // Reset states
          setLineItems([{ itemName: "", price: 0, qty: 1, vendor: "", category: "Supplies" }]);
          setBillNumber(`INV-${Math.floor(10000 + Math.random() * 90000)}`);
        }
        fetchRecentBills();
        setTimeout(() => setSuccess(null), 7000);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to commit invoice records.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to reach server to save invoice.");
    } finally {
      setSaving(false);
    }
  };

  const filteredBills = recentBills.filter(bill => 
    bill.billNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bill.items.some(it => 
      (it.itemName || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
      (it.vendor || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (it.category || "").toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-5 rounded-xl border border-[#c5c5d3] shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-[#0d1c2d] flex items-center gap-2">
            <Receipt className="text-[#00236f]" size={20} />
            Expense Bill Capture Console
          </h2>
          <p className="text-xs text-[#505f76] mt-0.5">Register new vendor invoices, track canteen stock imports, and compile line entries.</p>
        </div>
      </div>

      {/* Success Notification Banner */}
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

      <div className="grid grid-cols-12 gap-6">
        
        {/* Bill Entry Console */}
        <form onSubmit={handleSubmitBill} className="col-span-12 lg:col-span-8 bg-white border border-[#c5c5d3] p-6 rounded-xl shadow-xs space-y-6">
          <h3 className="text-sm font-bold text-[#00236f] pb-3 border-b border-slate-100 flex items-center justify-between gap-1.5">
            <span className="flex items-center gap-1.5">
              <Calculator size={16} />
              {editingExpenseId ? "Modify Existing Invoice Statement" : "Bill Metadata & Multi-Line Records"}
            </span>
            {editingExpenseId && (
              <span className="bg-[#eef4ff] text-[#00236f] text-[10px] font-bold px-2 py-1 rounded">
                Edit Mode Active
              </span>
            )}
          </h3>

          {editingExpenseId && (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3.5 rounded-xl flex items-center justify-between gap-3 text-xs font-semibold">
              <div className="flex items-center gap-2">
                <AlertTriangle className="text-amber-600 shrink-0" size={16} />
                <span>
                  You are editing <strong>{billNumber}</strong>. Modifying these entries will recalculate aggregate canteen inventory spends and re-harmonize safe balances dynamically.
                </span>
              </div>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="text-[10px] font-black uppercase text-amber-800 hover:text-amber-950 flex items-center gap-1 cursor-pointer shrink-0"
              >
                <X size={12} />
                Cancel
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#0d1c2d] mb-1.5">
                Bill Number / Reference
              </label>
              <input
                type="text"
                required
                value={billNumber}
                onChange={(e) => setBillNumber(e.target.value)}
                className="w-full border border-[#c5c5d3] p-2.5 rounded-lg text-xs font-bold text-[#0d1c2d] outline-none focus:ring-2 focus:ring-[#00236f]"
                placeholder="e.g. INV-98231"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0d1c2d] mb-1.5">
                Invoice Date
              </label>
              <div className="relative">
                <Calendar size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  required
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="pl-9 w-full border border-[#c5c5d3] p-2 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#00236f]"
                />
              </div>
            </div>
          </div>

          {/* Line items Dynamic Grid */}
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-50">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-[#505f76]">Invoice Line Items Bundle</span>
                <button
                  type="button"
                  onClick={() => setShowAddVendor(!showAddVendor)}
                  className="text-[10px] font-bold text-[#00236f] hover:underline cursor-pointer"
                >
                  {showAddVendor ? "✕ Hide Form" : "+ Add New Vendor"}
                </button>
              </div>
              <button
                type="button"
                onClick={handleAddLineRow}
                className="text-[11px] font-bold text-[#00236f] hover:underline flex items-center gap-1"
              >
                <Plus size={12} />
                Add Item Statement Row
              </button>
            </div>

            {showAddVendor && (
              <div className="flex items-center gap-2 mt-1 mb-3 bg-[#eef4ff] p-3 rounded-lg border border-indigo-150 animate-fadeIn">
                <div className="flex-1">
                  <span className="text-[10px] font-bold text-slate-500 block mb-0.5">Register Global Vendor</span>
                  <input
                    type="text"
                    value={newVendorName}
                    onChange={(e) => setNewVendorName(e.target.value)}
                    placeholder="e.g. Riyad Supermarket"
                    className="block w-full bg-white border border-[#c5c5d3] rounded-lg p-1.5 text-xs outline-none focus:ring-1 focus:ring-[#00236f] text-slate-800"
                  />
                </div>
                <button
                  type="button"
                  disabled={addingVendor || !newVendorName.trim()}
                  onClick={handleAddVendorSubmit}
                  className="self-end px-4 py-2 bg-[#00236f] text-white rounded-md text-xs font-bold disabled:opacity-45 hover:bg-[#00236f]/90 shrink-0"
                >
                  {addingVendor ? "⌛" : "Register"}
                </button>
              </div>
            )}

            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
              {lineItems.map((item, idx) => (
                <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200/55 flex flex-col gap-3 relative">
                  <div className="absolute top-4 right-4 print:hidden">
                    <button
                      type="button"
                      onClick={() => handleRemoveLineRow(idx)}
                      className="p-1 px-1.5 text-rose-600 hover:bg-rose-50 rounded"
                      title="Delete line"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <span className="text-[10px] font-black text-[#505f76] uppercase tracking-wider block">Line Row #{idx + 1}</span>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mt-1.5">
                    
                    {/* Item Name */}
                    <div className="md:col-span-5">
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Item Title / Description</label>
                      <input
                        type="text"
                        required
                        value={item.itemName || ""}
                        onChange={(e) => handleUpdateLineField(idx, "itemName", e.target.value)}
                        className="w-full bg-white border border-[#c5c5d3] text-xs p-1.5 rounded-lg focus:ring-1 focus:ring-[#00236f] focus:outline-none"
                        placeholder="e.g. Whole Milk Gallons"
                      />
                    </div>

                    {/* Price */}
                    <div className="md:col-span-3">
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Unit Price (DJF)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        value={item.price || ""}
                        onChange={(e) => handleUpdateLineField(idx, "price", parseFloat(e.target.value))}
                        className="w-full bg-white border border-[#c5c5d3] text-xs p-1.5 rounded-lg focus:ring-1 focus:ring-[#00236f] focus:outline-none"
                        placeholder="0.00"
                      />
                    </div>

                    {/* Qty */}
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={item.qty || ""}
                        onChange={(e) => handleUpdateLineField(idx, "qty", parseInt(e.target.value))}
                        className="w-full bg-white border border-[#c5c5d3] text-xs p-1.5 rounded-lg focus:ring-1 focus:ring-[#00236f] focus:outline-none"
                        placeholder="1"
                      />
                    </div>

                    {/* Multiply Line outcome */}
                    <div className="md:col-span-2 flex flex-col justify-end text-right pr-6 py-2">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Line Total</span>
                      <span className="text-xs font-bold text-slate-700">
                        DJF {((item.price || 0) * (item.qty || 0)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits:2 })}
                      </span>
                    </div>

                  </div>

                  {/* Vendor and Category */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Vendor Provider</label>
                      <input
                        type="text"
                        required
                        value={item.vendor || ""}
                        onChange={(e) => handleUpdateLineField(idx, "vendor", e.target.value)}
                        className="w-full bg-white border border-[#c5c5d3] text-xs p-1.5 rounded-lg focus:ring-1 focus:ring-[#00236f]"
                        placeholder="Supplier name"
                        list="vendorPresetList"
                      />
                      <datalist id="vendorPresetList">
                        {vendors.map(v => <option key={v} value={v} />)}
                      </datalist>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Operational Category</label>
                      <select
                        value={item.category || "Supplies"}
                        onChange={(e) => handleUpdateLineField(idx, "category", e.target.value)}
                        className="w-full bg-white border border-[#c5c5d3] text-xs p-1.5 rounded-lg focus:ring-1 focus:ring-[#00236f] focus:outline-none"
                      >
                        {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>
                  </div>

                </div>
              ))}
            </div>

          </div>

          {/* Aggregate sum board */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 font-bold block">Consolidated Bill Total</span>
              <span className="text-2xl font-black text-[#00236f]">
                DJF {autoBillTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex items-center">
              {editingExpenseId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="mr-3 px-4 py-2.5 border border-[#c5c5d3] hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel Edit
                </button>
              )}
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-[#00236f] text-white hover:bg-[#00236f]/95 rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-45 cursor-pointer font-sans"
              >
                {saving ? (
                  editingExpenseId ? "Saving changes..." : "Publishing raw invoice..."
                ) : (
                  editingExpenseId ? "Save & Update Invoice" : "Commit Bill Records"
                )}
              </button>
            </div>
          </div>

        </form>

        {/* Recent Bills Ledger summary on right panel */}
        <div className="col-span-12 lg:col-span-4 bg-white border border-[#c5c5d3] p-5 rounded-xl shadow-xs space-y-4">
          <div className="pb-2 border-b border-slate-100 flex flex-col gap-2">
            <h3 className="text-xs font-black text-[#505f76] uppercase tracking-wider flex items-center gap-1.5">
              <FileSpreadsheet size={14} />
              Published Inflow History
            </h3>
            
            {/* Search filter input inside ledger */}
            <div className="relative mt-1">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ledger reference or vendor..."
                className="w-full pl-7 pr-3 py-1 bg-slate-50 border border-[#c5c5d3] rounded-lg text-xs font-semibold focus:bg-white focus:outline-[#00236f]"
              />
            </div>
          </div>

          {loadingBills ? (
            <div className="flex justify-center items-center py-10 gap-2">
              <Loader2 className="animate-spin text-[#00236f]" size={16} />
              <span className="text-xs text-slate-400">Loading ledger...</span>
            </div>
          ) : (
            <div className="space-y-3.5 max-h-[480px] overflow-y-auto pr-1">
              {filteredBills.map(bill => (
                <div key={bill.id} className="p-3 border border-slate-150 rounded-xl space-y-1 bg-slate-50/50 hover:bg-slate-50 transition-all">
                  <div className="flex justify-between font-bold text-xs">
                    <span className="text-[#00236f]">{bill.billNumber}</span>
                    <span className="text-slate-800">DJF {bill.total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits:2 })}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 font-semibold font-mono">
                    <span>{bill.date}</span>
                    <span>{bill.items[0]?.category || "Supplies"}</span>
                  </div>
                  <p className="text-[11px] text-[#505f76] truncate mt-1">Vendor: {bill.items[0]?.vendor || "Vendor Preset"}</p>
                  
                  {/* Inline Edit/Delete micro controls */}
                  <div className="flex justify-end gap-1.5 pt-2 border-t border-slate-100 mt-2 print:hidden">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(bill)}
                      className="p-1 px-2 text-[10px] font-bold text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50 border border-indigo-100 rounded transition-all flex items-center gap-1 cursor-pointer"
                      title="Edit Invoice"
                    >
                      <Edit size={10} />
                      Modify
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteBill(bill.id, bill.billNumber)}
                      className="p-1 px-2 text-[10px] font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50 border border-rose-100 rounded transition-all flex items-center gap-1 cursor-pointer"
                      title="Delete Invoice"
                    >
                      <Trash2 size={10} />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {filteredBills.length === 0 && (
                <span className="text-xs text-slate-400 block text-center py-10 font-semibold">
                  {searchQuery ? "No matching invoices." : "No expenses logged yet."}
                </span>
              )}
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
