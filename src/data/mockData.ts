import type { Employee, AttendanceRecord, LeaveRequest, Rating, PerformanceTask, Settings } from '@/types/hr';

export const mockEmployees: Employee[] = [
  {
    employeeId: 'EMP001',
    name: 'John Smith',
    phone: '+1 (555) 123-4567',
    email: 'john.smith@company.com',
    photoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    joinDate: '2022-03-15',
    birthday: '1990-06-20',
    department: 'Engineering',
    role: 'admin',
    password: 'admin123'
  },
  {
    employeeId: 'EMP002',
    name: 'Sarah Johnson',
    phone: '+1 (555) 234-5678',
    email: 'sarah.johnson@company.com',
    photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face',
    joinDate: '2021-08-01',
    birthday: '1988-11-15',
    department: 'Design',
    role: 'employee',
    password: 'emp123'
  },
  {
    employeeId: 'EMP003',
    name: 'Michael Chen',
    phone: '+1 (555) 345-6789',
    email: 'michael.chen@company.com',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    joinDate: '2023-01-10',
    birthday: '1992-04-08',
    department: 'Marketing',
    role: 'employee',
    password: 'emp123'
  },
  {
    employeeId: 'EMP004',
    name: 'Emily Davis',
    phone: '+1 (555) 456-7890',
    email: 'emily.davis@company.com',
    photoUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    joinDate: '2022-07-22',
    birthday: '1995-09-30',
    department: 'Engineering',
    role: 'employee',
    password: 'emp123'
  },
  {
    employeeId: 'EMP005',
    name: 'David Wilson',
    phone: '+1 (555) 567-8901',
    email: 'david.wilson@company.com',
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
    joinDate: '2021-11-05',
    birthday: '1987-02-14',
    department: 'Sales',
    role: 'employee',
    password: 'emp123'
  },
  {
    employeeId: 'EMP006',
    name: 'Lisa Anderson',
    phone: '+1 (555) 678-9012',
    email: 'lisa.anderson@company.com',
    photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face',
    joinDate: '2023-04-18',
    birthday: '1993-12-25',
    department: 'HR',
    role: 'employee',
    password: 'emp123'
  }
];

export const mockSettings: Settings = {
  startTime: '09:00',
  workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  paidLeavePerMonth: 2,
  holidays: ['2024-01-01', '2024-07-04', '2024-12-25']
};

function generateAttendanceData(): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];
  const today = new Date();
  
  mockEmployees.forEach(emp => {
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;
      
      const random = Math.random();
      let punchIn: string | null = null;
      let punchOut: string | null = null;
      let loginStatus: 'on-time' | 'late' | 'absent' = 'absent';
      let hoursWorked = 0;
      
      if (random > 0.1) {
        const hour = random > 0.7 ? 9 : Math.floor(Math.random() * 2) + 8;
        const minute = Math.floor(Math.random() * 60);
        punchIn = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        
        const outHour = 17 + Math.floor(Math.random() * 2);
        const outMinute = Math.floor(Math.random() * 60);
        punchOut = `${outHour.toString().padStart(2, '0')}:${outMinute.toString().padStart(2, '0')}`;
        
        loginStatus = hour >= 9 && minute > 15 ? 'late' : 'on-time';
        hoursWorked = outHour - hour + (outMinute - minute) / 60;
      }
      
      records.push({
        employeeId: emp.employeeId,
        date: dateStr,
        punchIn,
        punchOut,
        loginStatus,
        hoursWorked: Math.round(hoursWorked * 10) / 10
      });
    }
  });
  
  return records;
}

export const mockAttendance: AttendanceRecord[] = generateAttendanceData();

export const mockLeaveRequests: LeaveRequest[] = [
  {
    requestId: 'LV001',
    employeeId: 'EMP002',
    type: 'vacation',
    startDate: '2024-12-20',
    endDate: '2024-12-27',
    status: 'pending',
    reason: 'Family vacation for the holidays'
  },
  {
    requestId: 'LV002',
    employeeId: 'EMP003',
    type: 'sick',
    startDate: '2024-12-10',
    endDate: '2024-12-11',
    status: 'approved',
    reason: 'Feeling unwell',
    approvedBy: 'EMP001',
    approvedOn: '2024-12-09'
  },
  {
    requestId: 'LV003',
    employeeId: 'EMP004',
    type: 'personal',
    startDate: '2024-12-15',
    endDate: '2024-12-15',
    status: 'approved',
    reason: 'Personal appointment',
    approvedBy: 'EMP001',
    approvedOn: '2024-12-13'
  },
  {
    requestId: 'LV004',
    employeeId: 'EMP005',
    type: 'vacation',
    startDate: '2024-12-23',
    endDate: '2024-12-31',
    status: 'pending',
    reason: 'Year-end vacation'
  }
];

export const mockRatings: Rating[] = [
  {
    employeeId: 'EMP002',
    quality: 4.5,
    punctuality: 4.2,
    reliability: 4.8,
    deadlines: 4.3,
    notes: 'Excellent work on the recent project redesign',
    period: '2024-Q4'
  },
  {
    employeeId: 'EMP003',
    quality: 4.0,
    punctuality: 3.8,
    reliability: 4.2,
    deadlines: 4.0,
    notes: 'Good progress in marketing campaigns',
    period: '2024-Q4'
  },
  {
    employeeId: 'EMP004',
    quality: 4.7,
    punctuality: 4.5,
    reliability: 4.6,
    deadlines: 4.8,
    notes: 'Outstanding technical contributions',
    period: '2024-Q4'
  },
  {
    employeeId: 'EMP005',
    quality: 4.2,
    punctuality: 4.0,
    reliability: 4.4,
    deadlines: 4.1,
    notes: 'Strong sales performance this quarter',
    period: '2024-Q4'
  }
];

export const mockPerformance: PerformanceTask[] = [
  {
    id: 'TASK001',
    employeeId: 'EMP002',
    task: 'Complete homepage redesign',
    dueDate: '2024-12-15',
    completedDate: '2024-12-14',
    status: 'completed',
    score: 95,
    notes: 'Delivered ahead of schedule with excellent quality'
  },
  {
    id: 'TASK002',
    employeeId: 'EMP002',
    task: 'Design mobile app mockups',
    dueDate: '2024-12-20',
    status: 'in-progress',
    notes: 'On track for completion'
  },
  {
    id: 'TASK003',
    employeeId: 'EMP003',
    task: 'Q4 marketing report',
    dueDate: '2024-12-18',
    status: 'pending'
  },
  {
    id: 'TASK004',
    employeeId: 'EMP004',
    task: 'API integration testing',
    dueDate: '2024-12-12',
    completedDate: '2024-12-11',
    status: 'completed',
    score: 88
  },
  {
    id: 'TASK005',
    employeeId: 'EMP005',
    task: 'Client presentation preparation',
    dueDate: '2024-12-10',
    status: 'overdue'
  }
];
