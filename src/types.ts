export interface Employee {
  id: string;
  employeeId: string;
  name: string;
  department: string;
  status: 'Active' | 'Deactivated';
}

export type MealType = 'Breakfast' | 'Lunch' | 'Dinner';

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
}

export interface ExpenseItem {
  id: string;
  itemName: string;
  price: number;
  qty: number;
  vendor: string;
  category: string;
}

export interface Expense {
  id: string;
  billNumber: string;
  date: string; // YYYY-MM-DD
  items: ExpenseItem[];
  total: number;
}

export interface BudgetEntry {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  description: string;
}

export interface OperationalLog {
  id: string;
  type: 'attendance' | 'expense' | 'employee' | 'budget' | 'other';
  message: string;
  time: string;
  icon: string;
  color: string;
}
