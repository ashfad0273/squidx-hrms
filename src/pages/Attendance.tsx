import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { mockAttendance, mockEmployees } from '@/data/mockData';
import { Calendar, Download, Filter } from 'lucide-react';

export default function Attendance() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';
  
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');

  const departments = [...new Set(mockEmployees.map(e => e.department))];

  const filteredRecords = useMemo(() => {
    let records = isAdmin 
      ? mockAttendance 
      : mockAttendance.filter(a => a.employeeId === user?.employeeId);

    if (dateFrom) {
      records = records.filter(r => r.date >= dateFrom);
    }
    if (dateTo) {
      records = records.filter(r => r.date <= dateTo);
    }
    if (statusFilter !== 'all') {
      records = records.filter(r => r.loginStatus === statusFilter);
    }
    if (departmentFilter !== 'all' && isAdmin) {
      const deptEmployees = mockEmployees.filter(e => e.department === departmentFilter).map(e => e.employeeId);
      records = records.filter(r => deptEmployees.includes(r.employeeId));
    }

    return records.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 100);
  }, [dateFrom, dateTo, statusFilter, departmentFilter, isAdmin, user?.employeeId]);

  const getEmployee = (employeeId: string) => mockEmployees.find(e => e.employeeId === employeeId);

  const exportCSV = () => {
    const headers = ['Date', 'Employee ID', 'Name', 'Punch In', 'Punch Out', 'Status', 'Hours Worked'];
    const rows = filteredRecords.map(r => {
      const emp = getEmployee(r.employeeId);
      return [r.date, r.employeeId, emp?.name || '', r.punchIn || '', r.punchOut || '', r.loginStatus, r.hoursWorked.toString()];
    });
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'attendance.csv';
    a.click();
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Attendance</h1>
            <p className="text-muted-foreground mt-1">Track attendance records</p>
          </div>
          <button onClick={exportCSV} className="btn-secondary flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        {/* Filters */}
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-semibold text-foreground">Filters</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm text-muted-foreground mb-2">From Date</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-2">To Date</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input-field"
              >
                <option value="all">All Status</option>
                <option value="on-time">On Time</option>
                <option value="late">Late</option>
                <option value="absent">Absent</option>
              </select>
            </div>
            {isAdmin && (
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Department</label>
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="input-field"
                >
                  <option value="all">All Departments</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Records Table */}
        <div className="stat-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="table-header pb-3">Date</th>
                  {isAdmin && <th className="table-header pb-3">Employee</th>}
                  <th className="table-header pb-3">Punch In</th>
                  <th className="table-header pb-3">Punch Out</th>
                  <th className="table-header pb-3">Status</th>
                  <th className="table-header pb-3">Hours Worked</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record, idx) => {
                  const employee = getEmployee(record.employeeId);
                  return (
                    <tr key={`${record.employeeId}-${record.date}-${idx}`} className="border-b border-border last:border-0">
                      <td className="table-cell">{record.date}</td>
                      {isAdmin && (
                        <td className="table-cell">
                          <div 
                            className="flex items-center gap-3 cursor-pointer hover:opacity-80"
                            onClick={() => navigate(`/employees/${record.employeeId}`)}
                          >
                            <img
                              src={employee?.photoUrl}
                              alt={employee?.name}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                            <div>
                              <p className="font-medium">{employee?.name}</p>
                              <p className="text-xs text-muted-foreground">{employee?.department}</p>
                            </div>
                          </div>
                        </td>
                      )}
                      <td className="table-cell">{record.punchIn || '-'}</td>
                      <td className="table-cell">{record.punchOut || '-'}</td>
                      <td className="table-cell">
                        <span className={`
                          ${record.loginStatus === 'on-time' ? 'badge-success' : ''}
                          ${record.loginStatus === 'late' ? 'badge-warning' : ''}
                          ${record.loginStatus === 'absent' ? 'badge-destructive' : ''}
                        `}>
                          {record.loginStatus}
                        </span>
                      </td>
                      <td className="table-cell">{record.hoursWorked || '-'} hrs</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
