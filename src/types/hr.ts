export interface Employee {
  employeeId: string;
  name: string;
  phone: string;
  email: string;
  photoUrl: string;
  joinDate: string;
  birthday: string;
  department: string;
  role: 'admin' | 'employee';
  password: string;
}

export interface Settings {
  startTime: string;
  workingDays: string[];
  paidLeavePerMonth: number;
  holidays: string[];
}

export interface AttendanceRecord {
  employeeId: string;
  date: string;
  punchIn: string | null;
  punchOut: string | null;
  loginStatus: 'on-time' | 'late' | 'absent';
  hoursWorked: number;
}

export interface LeaveRequest {
  requestId: string;
  employeeId: string;
  type: 'sick' | 'vacation' | 'personal' | 'other';
  startDate: string;
  endDate: string;
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
  approvedBy?: string;
  approvedOn?: string;
}

export interface Rating {
  employeeId: string;
  quality: number;
  punctuality: number;
  reliability: number;
  deadlines: number;
  notes: string;
  period: string;
}

export interface PerformanceTask {
  id: string;
  employeeId: string;
  task: string;
  dueDate: string;
  completedDate?: string;
  status: 'pending' | 'in-progress' | 'completed' | 'overdue';
  score?: number;
  notes?: string;
}

export interface AuthUser {
  employeeId: string;
  name: string;
  role: 'admin' | 'employee';
  photoUrl: string;
  department: string;
}
