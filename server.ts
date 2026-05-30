import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { Employee, AttendanceRecord, Expense, BudgetEntry, OperationalLog } from "./src/types";

// Helper to Safely Read and Write File Database
const DB_PATH = path.join(process.cwd(), "data", "db.json");

function readDB() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      // Return a default structure with standard fallback departments and vendors
      return { 
        employees: [], 
        attendance: [], 
        expenses: [], 
        budgetEntries: [], 
        operationalLog: [],
        departments: ["Asian", "Europian"],
        vendors: ["Algamil", "L'Hyper", "Coubeche", "Cash Center", "Fratacci", "Casino", "Naugaprix", "Riyad"]
      };
    }
    const data = fs.readFileSync(DB_PATH, "utf-8");
    const json = JSON.parse(data);
    
    // Supplement missing keys dynamically
    if (!json.employees) json.employees = [];
    if (!json.attendance) json.attendance = [];
    if (!json.expenses) json.expenses = [];
    if (!json.budgetEntries) json.budgetEntries = [];
    if (!json.operationalLog) json.operationalLog = [];
    if (!json.departments || !Array.isArray(json.departments)) {
      json.departments = ["Asian", "Europian"];
    }
    if (!json.vendors || !Array.isArray(json.vendors)) {
      json.vendors = ["Algamil", "L'Hyper", "Coubeche", "Cash Center", "Fratacci", "Casino", "Naugaprix", "Riyad"];
    }
    return json;
  } catch (err) {
    console.error("Error reading db.json", err);
    return { 
      employees: [], 
      attendance: [], 
      expenses: [], 
      budgetEntries: [], 
      operationalLog: [],
      departments: ["Asian", "Europian"],
      vendors: ["Algamil", "L'Hyper", "Coubeche", "Cash Center", "Fratacci", "Casino", "Naugaprix", "Riyad"]
    };
  }
}

function writeDB(data: any) {
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing db.json", err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON Body Parser with ample limit
  app.use(express.json());

  // 1. Simple Admin Auth API
  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body;
    if (username === "admin" && password === "admin123") {
      res.json({ success: true, token: "admin_token_jwt_mock", user: { name: "Admin Panel" } });
    } else {
      res.status(401).json({ success: false, error: "Invalid credentials. Try admin / admin123" });
    }
  });

  // 2. Employee CRUD API
  app.get("/api/employees", (req, res) => {
    const db = readDB();
    const { search, department, status } = req.query;
    let list = db.employees as Employee[];

    if (search) {
      const q = (search as string).toLowerCase();
      list = list.filter(e => 
        e.name.toLowerCase().includes(q) || 
        e.employeeId.toLowerCase().includes(q)
      );
    }
    if (department && department !== "all") {
      list = list.filter(e => e.department === department);
    }
    if (status && status !== "all") {
      list = list.filter(e => e.status === status);
    }

    res.json(list);
  });

  app.post("/api/employees", (req, res) => {
    const db = readDB();
    const { name, department, status, employeeId } = req.body;

    if (!name || !department) {
      return res.status(400).json({ error: "Name and department are required." });
    }

    if (!employeeId || !employeeId.trim()) {
      return res.status(400).json({ error: "Manual Employee ID is required." });
    }

    const trimmedEmpId = employeeId.trim();

    // Check for duplicate employeeId
    const isDuplicate = db.employees.some((e: any) => e.employeeId.toLowerCase() === trimmedEmpId.toLowerCase());
    if (isDuplicate) {
      return res.status(400).json({ error: `Employee ID "${trimmedEmpId}" already exists in the system.` });
    }

    const newEmp: Employee = {
      id: `emp_${Date.now()}`,
      employeeId: trimmedEmpId,
      name,
      department,
      status: status || "Active"
    };

    db.employees.push(newEmp);

    // Add activity log
    const log: OperationalLog = {
      id: `log_${Date.now()}`,
      type: "employee",
      message: `Employee Created: ${name}`,
      time: `Today • ID: ${trimmedEmpId}`,
      icon: "person_add",
      color: "text-secondary"
    };
    db.operationalLog.unshift(log);
    if (db.operationalLog.length > 25) db.operationalLog.pop();

    writeDB(db);
    res.json(newEmp);
  });

  app.put("/api/employees/:id", (req, res) => {
    const db = readDB();
    const { id } = req.params;
    const { name, department, status } = req.body;

    const index = db.employees.findIndex((e: any) => e.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Employee not found." });
    }

    const updated = {
      ...db.employees[index],
      name: name ?? db.employees[index].name,
      department: department ?? db.employees[index].department,
      status: status ?? db.employees[index].status
    };

    db.employees[index] = updated;

    // Add activity log
    const log: OperationalLog = {
      id: `log_${Date.now()}`,
      type: "employee",
      message: `Staff Profile Updated`,
      time: `Just now • ID: ${updated.employeeId}`,
      icon: "person_add",
      color: "text-secondary"
    };
    db.operationalLog.unshift(log);
    if (db.operationalLog.length > 25) db.operationalLog.pop();

    writeDB(db);
    res.json(updated);
  });

  app.delete("/api/employees/:id", (req, res) => {
    const db = readDB();
    const { id } = req.params;
    
    const index = db.employees.findIndex((e: any) => e.id === id);
    if (index === -1) {
      return res.status(444).json({ error: "Employee not found." });
    }
    
    const [removed] = db.employees.splice(index, 1);
    writeDB(db);
    res.json({ success: true, removed });
  });

  // 3. Attendance Tracking API
  // Get active lists of attendance for a specified date
  app.get("/api/attendance", (req, res) => {
    const db = readDB();
    const date = (req.query.date as string) || new Date().toISOString().split("T")[0];

    // Map each current active employee to their attendance on this date
    const employees = db.employees.filter((e: Employee) => e.status === "Active");
    const records = db.attendance.filter((att: AttendanceRecord) => att.date === date);

    const result = employees.map((emp: Employee) => {
      const match = records.find((rec: AttendanceRecord) => rec.employeeId === emp.employeeId);
      return {
        id: match ? match.id : `temp_${emp.employeeId}_${date}`,
        employeeId: emp.employeeId,
        name: emp.name,
        department: emp.department,
        status: emp.status,
        date,
        breakfast: match ? match.breakfast : false,
        lunch: match ? match.lunch : false,
        dinner: match ? match.dinner : false,
        hasRecord: !!match
      };
    });

    res.json(result);
  });

  // Toggle meal attendance for a single employee + date
  app.post("/api/attendance/single", (req, res) => {
    const db = readDB();
    const { employeeId, date, meal, value } = req.body;

    if (!employeeId || !date || !meal) {
      return res.status(400).json({ error: "Missing required parameters employeeId, date, meal." });
    }

    // Check future date limit (prevent future dates)
    const todayStr = new Date().toISOString().split("T")[0];
    if (date > todayStr) {
      return res.status(400).json({ error: "Cannot mark attendance for future dates." });
    }

    // Find if record exists
    let matchIdx = db.attendance.findIndex((att: any) => att.employeeId === employeeId && att.date === date);

    if (matchIdx !== -1) {
      db.attendance[matchIdx][meal.toLowerCase()] = !!value;
      // If all meals are false, we can let it remain or delete it, standard toggle update
    } else {
      const newRec: AttendanceRecord = {
        id: `att_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        employeeId,
        date,
        breakfast: meal === "Breakfast" ? !!value : false,
        lunch: meal === "Lunch" ? !!value : false,
        dinner: meal === "Dinner" ? !!value : false
      };
      db.attendance.push(newRec);
    }

    // Log the operation
    const emp = db.employees.find((e: any) => e.employeeId === employeeId);
    const log: OperationalLog = {
      id: `log_${Date.now()}`,
      type: "attendance",
      message: `${meal} Attendance Marked`,
      time: `Just now • Dept: ${emp ? emp.department : "NA"} (${employeeId})`,
      icon: "check_circle",
      color: "text-primary"
    };
    db.operationalLog.unshift(log);
    if (db.operationalLog.length > 25) db.operationalLog.pop();

    writeDB(db);
    res.json({ success: true });
  });

  // Bulk Mark Attendance Option
  app.post("/api/attendance/bulk", (req, res) => {
    const db = readDB();
    const { employeeIds, date, meals } = req.body; // meals: { Breakfast: boolean, Lunch: boolean, Dinner: boolean }

    if (!employeeIds || !Array.isArray(employeeIds) || !date || !meals) {
      return res.status(400).json({ error: "Invalid parameters." });
    }

    // Future date prevention
    const todayStr = new Date().toISOString().split("T")[0];
    if (date > todayStr) {
      return res.status(400).json({ error: "Cannot mark attendance for future dates." });
    }

    employeeIds.forEach((empId: string) => {
      let idx = db.attendance.findIndex((att: any) => att.employeeId === empId && att.date === date);

      if (idx !== -1) {
        if (meals.Breakfast !== undefined) db.attendance[idx].breakfast = !!meals.Breakfast;
        if (meals.Lunch !== undefined) db.attendance[idx].lunch = !!meals.Lunch;
        if (meals.Dinner !== undefined) db.attendance[idx].dinner = !!meals.Dinner;
      } else {
        const newRec: AttendanceRecord = {
          id: `att_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
          employeeId: empId,
          date,
          breakfast: meals.Breakfast !== undefined ? !!meals.Breakfast : false,
          lunch: meals.Lunch !== undefined ? !!meals.Lunch : false,
          dinner: meals.Dinner !== undefined ? !!meals.Dinner : false
        };
        db.attendance.push(newRec);
      }
    });

    const activeEmpCount = employeeIds.length;
    const log: OperationalLog = {
      id: `log_${Date.now()}`,
      type: "attendance",
      message: `Bulk Attendance Marked`,
      time: `Today • Marked ${activeEmpCount} employee(s) for multiple meals`,
      icon: "check_circle",
      color: "text-primary"
    };
    db.operationalLog.unshift(log);
    if (db.operationalLog.length > 25) db.operationalLog.pop();

    writeDB(db);
    res.json({ success: true, count: activeEmpCount });
  });

  // 4. Monthly Reports API
  app.get("/api/reports/monthly", (req, res) => {
    const db = readDB();
    const year = parseInt(req.query.year as string) || 2026;
    const month = req.query.month as string; // '01' - '12' or month text

    if (!month) {
      return res.status(400).json({ error: "Month parameter is required (01-12)." });
    }

    // Filter attendance records falling within target year-month prefix
    // E.g., date starts with "2026-05"
    const prefix = `${year}-${month.toString().padStart(2, "0")}`;
    const monthlyRecords = db.attendance.filter((att: AttendanceRecord) => att.date.startsWith(prefix));

    // Compile counts per employee
    const report = db.employees.map((emp: Employee) => {
      const empRecords = monthlyRecords.filter((att: AttendanceRecord) => att.employeeId === emp.employeeId);
      
      let breakfastCount = 0;
      let lunchCount = 0;
      let dinnerCount = 0;

      empRecords.forEach((rec: AttendanceRecord) => {
        if (rec.breakfast) breakfastCount++;
        if (rec.lunch) lunchCount++;
        if (rec.dinner) dinnerCount++;
      });

      return {
        employeeId: emp.employeeId,
        name: emp.name,
        department: emp.department,
        status: emp.status,
        breakfast: breakfastCount,
        lunch: lunchCount,
        dinner: dinnerCount,
        totalMeals: breakfastCount + lunchCount + dinnerCount
      };
    });

    res.json(report);
  });

  // Historical date range reports API
  app.get("/api/reports/historical", (req, res) => {
    const db = readDB();
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: "startDate and endDate are required." });
    }

    const start = startDate as string;
    const end = endDate as string;

    const records = db.attendance.filter((att: AttendanceRecord) => att.date >= start && att.date <= end);

    // Group by Date to show daily trends
    const dayStats: { [date: string]: { date: string; Breakfast: number; Lunch: number; Dinner: number; Total: number } } = {};

    records.forEach((r: AttendanceRecord) => {
      if (!dayStats[r.date]) {
        dayStats[r.date] = { date: r.date, Breakfast: 0, Lunch: 0, Dinner: 0, Total: 0 };
      }
      if (r.breakfast) {
        dayStats[r.date].Breakfast++;
        dayStats[r.date].Total++;
      }
      if (r.lunch) {
        dayStats[r.date].Lunch++;
        dayStats[r.date].Total++;
      }
      if (r.dinner) {
        dayStats[r.date].Dinner++;
        dayStats[r.date].Total++;
      }
    });

    const dailyTrend = Object.values(dayStats).sort((a: any, b: any) => a.date.localeCompare(b.date));

    // Summary counts
    let totalBreakfast = 0;
    let totalLunch = 0;
    let totalDinner = 0;

    records.forEach((r: AttendanceRecord) => {
      if (r.breakfast) totalBreakfast++;
      if (r.lunch) totalLunch++;
      if (r.dinner) totalDinner++;
    });

    res.json({
      summary: {
        breakfast: totalBreakfast,
        lunch: totalLunch,
        dinner: totalDinner,
        total: totalBreakfast + totalLunch + totalDinner
      },
      dailyTrend
    });
  });

  // 5. Expense Management API
  app.get("/api/expenses", (req, res) => {
    const db = readDB();
    const { startDate, endDate, vendor, category, searchItem } = req.query;
    let list = db.expenses as Expense[];

    // Do not show the hidden aggregate base expense in standard listing to keep it clean,
    // unless filter explicitly asks or we want to show it. Actually, showing standard invoices is cleaner!
    // But we need the totals of all expenses to include invoice bases so the budget logic adds up perfectly.
    // Let's filter out "INV-BASE" from list view, but keep it in database calculations!
    list = list.filter(e => e.billNumber !== "INV-BASE");

    if (startDate) {
      list = list.filter(e => e.date >= (startDate as string));
    }
    if (endDate) {
      list = list.filter(e => e.date <= (endDate as string));
    }
    if (vendor && vendor !== "all") {
      list = list.filter(e => e.items.some(it => it.vendor === vendor));
    }
    if (category && category !== "all") {
      list = list.filter(e => e.items.some(it => it.category === category));
    }
    if (searchItem) {
      const qi = (searchItem as string).toLowerCase();
      list = list.filter(e => 
        e.billNumber.toLowerCase().includes(qi) ||
        e.items.some(it => it.itemName.toLowerCase().includes(qi) || it.vendor.toLowerCase().includes(qi))
      );
    }

    res.json(list);
  });

  // Add a new bill with multiple line items
  app.post("/api/expenses", (req, res) => {
    const db = readDB();
    const { billNumber, date, items } = req.body;

    if (!billNumber || !date || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Bill Number, date and at least one line item are required." });
    }

    // Validate prices and quantities (prevent negative values)
    for (const item of items) {
      if (!item.itemName || !item.vendor || !item.category) {
        return res.status(400).json({ error: "All items must have a name, vendor, and category." });
      }
      if (typeof item.price !== "number" || item.price <= 0) {
        return res.status(400).json({ error: "Item Price must be a positive number." });
      }
      if (typeof item.qty !== "number" || item.qty <= 0) {
        return res.status(400).json({ error: "Item Quantity must be a positive integer." });
      }
    }

    // Auto-calculate total
    const itemWithIds = items.map((it: any) => ({
      ...it,
      id: it.id || `item_${Date.now()}_${Math.floor(Math.random() * 1000)}`
    }));

    const billTotal = itemWithIds.reduce((sum: number, it: any) => sum + (it.price * it.qty), 0);

    const newExpense: Expense = {
      id: `exp_${Date.now()}`,
      billNumber,
      date,
      items: itemWithIds,
      total: billTotal
    };

    // Store expense
    db.expenses.push(newExpense);

    // Create Operational Log
    const log: OperationalLog = {
      id: `log_${Date.now()}`,
      type: "expense",
      message: `New Inventory Expense`,
      time: `Just now • Total: $${billTotal.toFixed(2)}`,
      icon: "receipt",
      color: "text-tertiary"
    };
    db.operationalLog.unshift(log);
    if (db.operationalLog.length > 25) db.operationalLog.pop();

    writeDB(db);

    res.json({ success: true, expense: newExpense });
  });

  // Modify Expense/Bill
  app.put("/api/expenses/:id", (req, res) => {
    const db = readDB();
    const { id } = req.params;
    const { billNumber, date, items } = req.body;

    const index = db.expenses.findIndex((e: any) => e.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Expense/Bill not found." });
    }

    if (!billNumber || !date || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Bill Number, date and at least one line item are required." });
    }

    // Validate prices and quantities
    for (const item of items) {
      if (!item.itemName || !item.vendor || !item.category) {
        return res.status(400).json({ error: "All items must have a name, vendor, and category." });
      }
      if (typeof item.price !== "number" || item.price <= 0) {
        return res.status(400).json({ error: "Item Price must be a positive number." });
      }
      if (typeof item.qty !== "number" || item.qty <= 0) {
        return res.status(400).json({ error: "Item Quantity must be a positive integer." });
      }
    }

    const itemWithIds = items.map((it: any) => ({
      ...it,
      id: it.id || `item_${Date.now()}_${Math.floor(Math.random() * 1000)}`
    }));

    const billTotal = itemWithIds.reduce((sum: number, it: any) => sum + (it.price * it.qty), 0);

    const updatedExpense: Expense = {
      id,
      billNumber,
      date,
      items: itemWithIds,
      total: billTotal
    };

    db.expenses[index] = updatedExpense;

    // Create Operational Log
    const log: OperationalLog = {
      id: `log_${Date.now()}`,
      type: "expense",
      message: `Modified Bill ${billNumber}`,
      time: `Just now • New Total: DJF ${billTotal.toFixed(2)}`,
      icon: "receipt",
      color: "text-tertiary"
    };
    db.operationalLog.unshift(log);
    if (db.operationalLog.length > 25) db.operationalLog.pop();

    writeDB(db);

    res.json({ success: true, expense: updatedExpense });
  });

  // Delete Expense/Bill
  app.delete("/api/expenses/:id", (req, res) => {
    const db = readDB();
    const { id } = req.params;

    const index = db.expenses.findIndex((e: any) => e.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Expense/Bill not found." });
    }

    const removed = db.expenses[index];
    db.expenses.splice(index, 1);

    // Create Operational Log
    const log: OperationalLog = {
      id: `log_${Date.now()}`,
      type: "expense",
      message: `Deleted Bill ${removed.billNumber}`,
      time: `Just now • Removed Total: DJF ${removed.total.toFixed(2)}`,
      icon: "receipt",
      color: "text-tertiary"
    };
    db.operationalLog.unshift(log);
    if (db.operationalLog.length > 25) db.operationalLog.pop();

    writeDB(db);

    res.json({ success: true, removed });
  });

  // 6. Budget/Income Tracking and Stats API
  app.get("/api/budget/stats", (req, res) => {
    const db = readDB();

    // Budget Health calculation
    const totalAllocated = db.budgetEntries.reduce((sum: number, b: BudgetEntry) => sum + b.amount, 0);
    const totalSpent = db.expenses.reduce((sum: number, e: Expense) => sum + e.total, 0);
    
    const remaining = totalAllocated - totalSpent;
    const remainingPercent = totalAllocated > 0 ? (remaining / totalAllocated) * 100 : 0;
    const isLowBalance = remainingPercent < 20.0;

    // Daily meal aggregates for Dashboard KPIs
    // Count breakfast / lunch / dinner marked for today's date
    const todayStr = new Date().toISOString().split("T")[0];
    const todayRecords = db.attendance.filter((att: AttendanceRecord) => att.date === todayStr);

    let bCount = 0;
    let lCount = 0;
    let dCount = 0;

    todayRecords.forEach((r: AttendanceRecord) => {
      if (r.breakfast) bCount++;
      if (r.lunch) lCount++;
      if (r.dinner) dCount++;
    });

    // Make the dashboard return clean live counts only (starting at zero for empty DB)
    const activeBreakfast = bCount;
    const activeLunch = lCount;
    const activeDinner = dCount;

    // Weekly trend graph dynamically calculated from real expenses in db.json
    const trendDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const trendMap: { [key: string]: number } = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
    
    db.expenses.forEach((e: Expense) => {
      if (e.billNumber === "INV-BASE") return;
      const dateObj = new Date(e.date);
      if (!isNaN(dateObj.getTime())) {
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const dayName = days[dateObj.getDay()];
        if (trendMap[dayName] !== undefined) {
          trendMap[dayName] += e.total;
        }
      }
    });

    const trend = trendDays.map(day => ({
      day,
      amount: trendMap[day]
    }));

    res.json({
      budget: {
        totalAllocated,
        totalSpent,
        remaining,
        remainingPercent,
        isLowBalance
      },
      meals: {
        breakfast: activeBreakfast,
        lunch: activeLunch,
        dinner: activeDinner
      },
      trend,
      operationalLog: db.operationalLog
    });
  });

  // Add Budget Allocation Entry
  app.post("/api/budget/entries", (req, res) => {
    const db = readDB();
    const { amount, date, description } = req.body;

    if (!amount || typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({ error: "Valid positive amount is required." });
    }

    const newBud: BudgetEntry = {
      id: `bud_${Date.now()}`,
      date: date || new Date().toISOString().split("T")[0],
      amount,
      description: description || "Budget Supplement Added"
    };

    db.budgetEntries.push(newBud);

    // Create Operational Log
    const log: OperationalLog = {
      id: `log_${Date.now()}`,
      type: "budget",
      message: `Budget Allocation Increased`,
      time: `Just now • Amount: +$${amount.toFixed(2)}`,
      icon: "account_balance_wallet",
      color: "text-primary"
    };
    db.operationalLog.unshift(log);
    if (db.operationalLog.length > 25) db.operationalLog.pop();

    writeDB(db);

    res.json({ success: true, entry: newBud });
  });

  // Get list of budget entries
  app.get("/api/budget/entries", (req, res) => {
    const db = readDB();
    res.json(db.budgetEntries);
  });

  // Edit Budget Allocation Entry
  app.put("/api/budget/entries/:id", (req, res) => {
    const db = readDB();
    const { id } = req.params;
    const { amount, date, description } = req.body;

    const index = db.budgetEntries.findIndex((e: any) => e.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Budget entry not found" });
    }

    if (!amount || typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({ error: "Valid positive amount is required." });
    }

    db.budgetEntries[index] = {
      ...db.budgetEntries[index],
      amount,
      date: date || db.budgetEntries[index].date,
      description: description || db.budgetEntries[index].description
    };

    // Create Operational Log
    const log: OperationalLog = {
      id: `log_${Date.now()}`,
      type: "budget",
      message: `Budget Allocation Modified`,
      time: `Just now • New: $${amount.toFixed(2)}`,
      icon: "account_balance_wallet",
      color: "text-primary"
    };
    db.operationalLog.unshift(log);
    if (db.operationalLog.length > 25) db.operationalLog.pop();

    writeDB(db);
    res.json({ success: true, entry: db.budgetEntries[index] });
  });

  // Delete Budget Allocation Entry
  app.delete("/api/budget/entries/:id", (req, res) => {
    const db = readDB();
    const { id } = req.params;

    const index = db.budgetEntries.findIndex((e: any) => e.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Budget entry not found" });
    }

    const [removed] = db.budgetEntries.splice(index, 1);

    // Create Operational Log
    const log: OperationalLog = {
      id: `log_${Date.now()}`,
      type: "budget",
      message: `Budget Allocation Deleted`,
      time: `Just now • Cancelled: $${removed.amount.toFixed(2)}`,
      icon: "account_balance_wallet",
      color: "text-rose-600"
    };
    db.operationalLog.unshift(log);
    if (db.operationalLog.length > 25) db.operationalLog.pop();

    writeDB(db);
    res.json({ success: true, removed });
  });

  // 7. Dynamic Dropdown Management API
  app.get("/api/departments", (req, res) => {
    const db = readDB();
    res.json(db.departments || ["MTW", "Store", "BVEN Office", "BVEN Lab", "CLDJ", "Japan Base", "French Base", "Nagad"]);
  });

  app.post("/api/departments", (req, res) => {
    const db = readDB();
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Department name is required" });
    }
    const trimmed = name.trim();
    if (!db.departments) {
      db.departments = ["MTW", "Store", "BVEN Office", "BVEN Lab", "CLDJ", "Japan Base", "French Base", "Nagad"];
    }
    if (db.departments.some((d: string) => d.toLowerCase() === trimmed.toLowerCase())) {
      return res.status(400).json({ error: "Department already exists" });
    }
    db.departments.push(trimmed);
    writeDB(db);
    res.json({ success: true, departments: db.departments });
  });

  app.get("/api/vendors", (req, res) => {
    const db = readDB();
    res.json(db.vendors || ["Algamil", "L'Hyper", "Coubeche", "Cash Center", "Fratacci", "Casino", "Naugaprix", "Riyad"]);
  });

  app.post("/api/vendors", (req, res) => {
    const db = readDB();
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Vendor name is required" });
    }
    const trimmed = name.trim();
    if (!db.vendors) {
      db.vendors = ["Algamil", "L'Hyper", "Coubeche", "Cash Center", "Fratacci", "Casino", "Naugaprix", "Riyad"];
    }
    if (db.vendors.some((v: string) => v.toLowerCase() === trimmed.toLowerCase())) {
      return res.status(400).json({ error: "Vendor already exists" });
    }
    db.vendors.push(trimmed);
    writeDB(db);
    res.json({ success: true, vendors: db.vendors });
  });

  // 7. Backup and Restore Database APIs
  app.get("/api/backup", (req, res) => {
    try {
      const db = readDB();
      res.json(db);
    } catch (err) {
      res.status(500).json({ error: "Failed to read database backup." });
    }
  });

  app.post("/api/restore", (req, res) => {
    try {
      const parsedData = req.body;
      if (!parsedData || typeof parsedData !== "object") {
        return res.status(400).json({ error: "Invalid backup file structure." });
      }

      // Check for existence of the main data keys
      const requiredKeys = ["employees", "attendance", "expenses", "budgetEntries", "operationalLog"];
      for (const key of requiredKeys) {
        if (!parsedData[key] || !Array.isArray(parsedData[key])) {
          return res.status(400).json({ error: `Malformed backup. Missing required collection: '${key}'` });
        }
      }

      // Write parsed data to DB
      writeDB(parsedData);

      // Log a backup restoration operational log
      const db = readDB();
      const log: OperationalLog = {
        id: `log_${Date.now()}`,
        type: "other",
        message: `Database Restored from Backup`,
        time: `Just now`,
        icon: "cloud_upload",
        color: "text-amber-600"
      };
      db.operationalLog.unshift(log);
      if (db.operationalLog.length > 25) db.operationalLog.pop();
      writeDB(db);

      res.json({ success: true, message: "Database successfully restored from backup file." });
    } catch (err: any) {
      console.error("Failed to restore backup", err);
      res.status(500).json({ error: err.message || "Failed to process database restore request." });
    }
  });

  // Serve static files and mount Vite dev server
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Canteen Server running on http://localhost:${PORT}`);
  });
}

startServer();
