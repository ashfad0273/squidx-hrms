import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { mockEmployees, mockAttendance, mockLeaveRequests, mockRatings, mockPerformance } from '@/data/mockData';
import { ArrowLeft, Mail, Phone, Calendar, Building2, Star, Clock, Target } from 'lucide-react';
import { useState } from 'react';

type TabType = 'attendance' | 'leave' | 'performance' | 'ratings';

export default function EmployeeDetail() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('attendance');

  const employee = mockEmployees.find(e => e.employeeId === employeeId);
  
  if (!employee) {
    return (
      <DashboardLayout requireAdmin>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-foreground">Employee not found</h2>
          <button onClick={() => navigate(-1)} className="btn-primary mt-4">
            Go Back
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const attendance = mockAttendance.filter(a => a.employeeId === employeeId).slice(0, 20);
  const leaveRequests = mockLeaveRequests.filter(l => l.employeeId === employeeId);
  const ratings = mockRatings.find(r => r.employeeId === employeeId);
  const tasks = mockPerformance.filter(t => t.employeeId === employeeId);

  const attendanceStats = attendance.reduce(
    (acc, record) => {
      if (record.loginStatus === 'on-time') acc.onTime++;
      else if (record.loginStatus === 'late') acc.late++;
      else acc.absent++;
      return acc;
    },
    { onTime: 0, late: 0, absent: 0 }
  );

  const tabs = [
    { id: 'attendance', label: 'Attendance', icon: Clock },
    { id: 'leave', label: 'Leave History', icon: Calendar },
    { id: 'performance', label: 'Performance', icon: Target },
    { id: 'ratings', label: 'Ratings', icon: Star },
  ];

  return (
    <DashboardLayout requireAdmin>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <h1 className="font-display text-2xl font-bold text-foreground">Employee Details</h1>
        </div>

        {/* Profile Card */}
        <div className="stat-card">
          <div className="flex flex-col md:flex-row gap-6">
            <img
              src={employee.photoUrl}
              alt={employee.name}
              className="w-32 h-32 rounded-2xl object-cover ring-4 ring-border"
            />
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-display text-2xl font-bold text-foreground">{employee.name}</h2>
                  <p className="text-muted-foreground">{employee.employeeId}</p>
                  <span className={`inline-block mt-2 text-xs px-3 py-1 rounded-full ${
                    employee.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                  }`}>
                    {employee.role === 'admin' ? 'Admin' : 'Employee'}
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Mail className="w-5 h-5" />
                  <span className="text-sm">{employee.email}</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Phone className="w-5 h-5" />
                  <span className="text-sm">{employee.phone}</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Building2 className="w-5 h-5" />
                  <span className="text-sm">{employee.department}</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Calendar className="w-5 h-5" />
                  <span className="text-sm">Joined: {employee.joinDate}</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Calendar className="w-5 h-5" />
                  <span className="text-sm">Birthday: {employee.birthday}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="stat-card text-center">
            <p className="text-2xl font-bold text-success">{attendanceStats.onTime}</p>
            <p className="text-sm text-muted-foreground">On Time</p>
          </div>
          <div className="stat-card text-center">
            <p className="text-2xl font-bold text-warning">{attendanceStats.late}</p>
            <p className="text-sm text-muted-foreground">Late</p>
          </div>
          <div className="stat-card text-center">
            <p className="text-2xl font-bold text-destructive">{attendanceStats.absent}</p>
            <p className="text-sm text-muted-foreground">Absent</p>
          </div>
          <div className="stat-card text-center">
            <p className="text-2xl font-bold text-primary">{tasks.filter(t => t.status === 'completed').length}</p>
            <p className="text-sm text-muted-foreground">Tasks Done</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="stat-card">
          <div className="flex gap-1 border-b border-border mb-6 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'attendance' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="table-header pb-3">Date</th>
                    <th className="table-header pb-3">Punch In</th>
                    <th className="table-header pb-3">Punch Out</th>
                    <th className="table-header pb-3">Status</th>
                    <th className="table-header pb-3">Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((record, idx) => (
                    <tr key={idx} className="border-b border-border last:border-0">
                      <td className="table-cell">{record.date}</td>
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
                      <td className="table-cell">{record.hoursWorked || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'leave' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="table-header pb-3">Type</th>
                    <th className="table-header pb-3">Duration</th>
                    <th className="table-header pb-3">Reason</th>
                    <th className="table-header pb-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveRequests.length > 0 ? leaveRequests.map((request) => (
                    <tr key={request.requestId} className="border-b border-border last:border-0">
                      <td className="table-cell capitalize">{request.type}</td>
                      <td className="table-cell text-muted-foreground">
                        {request.startDate} - {request.endDate}
                      </td>
                      <td className="table-cell text-muted-foreground max-w-xs truncate">
                        {request.reason}
                      </td>
                      <td className="table-cell">
                        <span className={`
                          ${request.status === 'approved' ? 'badge-success' : ''}
                          ${request.status === 'pending' ? 'badge-warning' : ''}
                          ${request.status === 'rejected' ? 'badge-destructive' : ''}
                        `}>
                          {request.status}
                        </span>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="table-cell text-center text-muted-foreground">
                        No leave requests found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'performance' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="table-header pb-3">Task</th>
                    <th className="table-header pb-3">Due Date</th>
                    <th className="table-header pb-3">Completed</th>
                    <th className="table-header pb-3">Status</th>
                    <th className="table-header pb-3">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.length > 0 ? tasks.map((task) => (
                    <tr key={task.id} className="border-b border-border last:border-0">
                      <td className="table-cell font-medium">{task.task}</td>
                      <td className="table-cell text-muted-foreground">{task.dueDate}</td>
                      <td className="table-cell text-muted-foreground">{task.completedDate || '-'}</td>
                      <td className="table-cell">
                        <span className={`
                          ${task.status === 'completed' ? 'badge-success' : ''}
                          ${task.status === 'in-progress' ? 'badge-warning' : ''}
                          ${task.status === 'pending' ? 'badge-muted' : ''}
                          ${task.status === 'overdue' ? 'badge-destructive' : ''}
                        `}>
                          {task.status}
                        </span>
                      </td>
                      <td className="table-cell">{task.score || '-'}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="table-cell text-center text-muted-foreground">
                        No tasks found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'ratings' && (
            <div>
              {ratings ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    {[
                      { label: 'Quality', value: ratings.quality },
                      { label: 'Punctuality', value: ratings.punctuality },
                      { label: 'Reliability', value: ratings.reliability },
                      { label: 'Deadlines', value: ratings.deadlines },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                        <span className="font-medium text-foreground">{item.label}</span>
                        <div className="flex items-center gap-3">
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-5 h-5 ${
                                  star <= item.value
                                    ? 'text-warning fill-warning'
                                    : 'text-muted'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-foreground font-semibold">{item.value}/5</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-semibold text-foreground mb-2">Notes</h4>
                    <p className="text-muted-foreground">{ratings.notes}</p>
                    <p className="text-sm text-muted-foreground mt-4">Period: {ratings.period}</p>
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No ratings available</p>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
