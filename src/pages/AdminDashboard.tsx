import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { AttendanceBarChart, DepartmentDoughnut } from '@/components/dashboard/AttendanceChart';
import { EmployeeRow } from '@/components/employee/EmployeeCard';
import { mockEmployees, mockAttendance, mockLeaveRequests } from '@/data/mockData';
import { Users, UserCheck, Clock, Calendar, CheckCircle, XCircle, Search } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingLeave, setPendingLeave] = useState(
    mockLeaveRequests.filter(l => l.status === 'pending')
  );

  const today = new Date().toISOString().split('T')[0];
  const todayAttendance = mockAttendance.filter(a => a.date === today);
  
  const stats = {
    totalEmployees: mockEmployees.length,
    presentToday: todayAttendance.filter(a => a.punchIn).length,
    lateToday: todayAttendance.filter(a => a.loginStatus === 'late').length,
    absentToday: mockEmployees.length - todayAttendance.filter(a => a.punchIn).length,
    pendingRequests: pendingLeave.length,
  };

  // Weekly attendance data for chart
  const weeklyData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const onTime: number[] = [];
    const late: number[] = [];
    const absent: number[] = [];

    days.forEach((_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (4 - index));
      const dateStr = date.toISOString().split('T')[0];
      
      const dayAttendance = mockAttendance.filter(a => a.date === dateStr);
      onTime.push(dayAttendance.filter(a => a.loginStatus === 'on-time').length);
      late.push(dayAttendance.filter(a => a.loginStatus === 'late').length);
      absent.push(mockEmployees.length - dayAttendance.filter(a => a.punchIn).length);
    });

    return { labels: days, onTime, late, absent };
  }, []);

  // Department distribution
  const departmentData = useMemo(() => {
    const deptCounts: Record<string, number> = {};
    mockEmployees.forEach(emp => {
      deptCounts[emp.department] = (deptCounts[emp.department] || 0) + 1;
    });
    return {
      labels: Object.keys(deptCounts),
      values: Object.values(deptCounts),
    };
  }, []);

  const filteredEmployees = mockEmployees.filter(
    emp => emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
           emp.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleApprove = (requestId: string) => {
    setPendingLeave(prev => prev.filter(l => l.requestId !== requestId));
    toast.success('Leave request approved');
  };

  const handleReject = (requestId: string) => {
    setPendingLeave(prev => prev.filter(l => l.requestId !== requestId));
    toast.error('Leave request rejected');
  };

  const getEmployeeName = (employeeId: string) => {
    return mockEmployees.find(e => e.employeeId === employeeId)?.name || employeeId;
  };

  return (
    <DashboardLayout requireAdmin>
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of your organization</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <StatCard
            title="Total Employees"
            value={stats.totalEmployees}
            icon={Users}
            variant="primary"
          />
          <StatCard
            title="Present Today"
            value={stats.presentToday}
            icon={UserCheck}
            variant="success"
          />
          <StatCard
            title="Late Today"
            value={stats.lateToday}
            icon={Clock}
            variant="warning"
          />
          <StatCard
            title="Absent Today"
            value={stats.absentToday}
            icon={UserCheck}
            variant="destructive"
          />
          <StatCard
            title="Pending Leave"
            value={stats.pendingRequests}
            icon={Calendar}
            variant="accent"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 stat-card">
            <h3 className="font-display text-lg font-semibold text-foreground mb-4">Weekly Attendance Overview</h3>
            <AttendanceBarChart data={weeklyData} />
          </div>
          <div className="stat-card">
            <h3 className="font-display text-lg font-semibold text-foreground mb-4">Department Distribution</h3>
            <DepartmentDoughnut data={departmentData} />
          </div>
        </div>

        {/* Pending Leave Requests */}
        {pendingLeave.length > 0 && (
          <div className="stat-card">
            <h3 className="font-display text-lg font-semibold text-foreground mb-4">Pending Leave Requests</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="table-header pb-3">Employee</th>
                    <th className="table-header pb-3">Type</th>
                    <th className="table-header pb-3">Duration</th>
                    <th className="table-header pb-3">Reason</th>
                    <th className="table-header pb-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingLeave.map((request) => {
                    const employee = mockEmployees.find(e => e.employeeId === request.employeeId);
                    return (
                      <tr key={request.requestId} className="border-b border-border last:border-0">
                        <td className="table-cell">
                          <div 
                            className="flex items-center gap-3 cursor-pointer hover:opacity-80"
                            onClick={() => navigate(`/employees/${request.employeeId}`)}
                          >
                            <img
                              src={employee?.photoUrl}
                              alt={employee?.name}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                            <span className="font-medium">{employee?.name}</span>
                          </div>
                        </td>
                        <td className="table-cell capitalize">{request.type}</td>
                        <td className="table-cell text-muted-foreground">
                          {request.startDate} - {request.endDate}
                        </td>
                        <td className="table-cell text-muted-foreground max-w-xs truncate">
                          {request.reason}
                        </td>
                        <td className="table-cell">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApprove(request.requestId)}
                              className="p-2 rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleReject(request.requestId)}
                              className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Employee Directory */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-semibold text-foreground">Employee Directory</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="table-header pb-3">Employee</th>
                  <th className="table-header pb-3">Department</th>
                  <th className="table-header pb-3">Role</th>
                  <th className="table-header pb-3">Email</th>
                  <th className="table-header pb-3">Phone</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((employee) => (
                  <EmployeeRow
                    key={employee.employeeId}
                    employee={employee}
                    onClick={() => navigate(`/employees/${employee.employeeId}`)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
