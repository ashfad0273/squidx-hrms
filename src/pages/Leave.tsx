import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { mockLeaveRequests, mockEmployees, mockSettings } from '@/data/mockData';
import { LeaveRequest } from '@/types/hr';
import { Calendar, Plus, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function Leave() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';
  
  const [showForm, setShowForm] = useState(false);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(mockLeaveRequests);
  const [newRequest, setNewRequest] = useState({
    type: 'vacation' as LeaveRequest['type'],
    startDate: '',
    endDate: '',
    reason: ''
  });

  const myRequests = isAdmin ? leaveRequests : leaveRequests.filter(l => l.employeeId === user?.employeeId);
  const pendingRequests = leaveRequests.filter(l => l.status === 'pending');

  const getEmployee = (employeeId: string) => mockEmployees.find(e => e.employeeId === employeeId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const request: LeaveRequest = {
      requestId: `LV${Date.now()}`,
      employeeId: user?.employeeId || '',
      ...newRequest,
      status: 'pending'
    };
    setLeaveRequests(prev => [...prev, request]);
    setShowForm(false);
    setNewRequest({ type: 'vacation', startDate: '', endDate: '', reason: '' });
    toast.success('Leave request submitted');
  };

  const handleApprove = (requestId: string) => {
    setLeaveRequests(prev => prev.map(l => 
      l.requestId === requestId 
        ? { ...l, status: 'approved', approvedBy: user?.employeeId, approvedOn: new Date().toISOString().split('T')[0] }
        : l
    ));
    toast.success('Leave approved');
  };

  const handleReject = (requestId: string) => {
    setLeaveRequests(prev => prev.map(l => 
      l.requestId === requestId ? { ...l, status: 'rejected' } : l
    ));
    toast.error('Leave rejected');
  };

  const approvedThisYear = myRequests.filter(l => l.status === 'approved').length;
  const remainingLeave = mockSettings.paidLeavePerMonth * 12 - approvedThisYear;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Leave Management</h1>
            <p className="text-muted-foreground mt-1">Manage leave requests</p>
          </div>
          {!isAdmin && (
            <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Request Leave
            </button>
          )}
        </div>

        {/* Leave Balance Card (Employee only) */}
        {!isAdmin && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="stat-card">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Calendar className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{remainingLeave}</p>
                  <p className="text-sm text-muted-foreground">Remaining Leave Days</p>
                </div>
              </div>
            </div>
            <div className="stat-card">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-success/10">
                  <CheckCircle className="w-6 h-6 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{myRequests.filter(l => l.status === 'approved').length}</p>
                  <p className="text-sm text-muted-foreground">Approved Requests</p>
                </div>
              </div>
            </div>
            <div className="stat-card">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-warning/10">
                  <Calendar className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{myRequests.filter(l => l.status === 'pending').length}</p>
                  <p className="text-sm text-muted-foreground">Pending Requests</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* New Request Form */}
        {showForm && (
          <div className="stat-card">
            <h3 className="font-display text-lg font-semibold text-foreground mb-4">New Leave Request</h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Leave Type</label>
                <select
                  value={newRequest.type}
                  onChange={(e) => setNewRequest(prev => ({ ...prev, type: e.target.value as LeaveRequest['type'] }))}
                  className="input-field"
                  required
                >
                  <option value="vacation">Vacation</option>
                  <option value="sick">Sick Leave</option>
                  <option value="personal">Personal</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Start Date</label>
                <input
                  type="date"
                  value={newRequest.startDate}
                  onChange={(e) => setNewRequest(prev => ({ ...prev, startDate: e.target.value }))}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-2">End Date</label>
                <input
                  type="date"
                  value={newRequest.endDate}
                  onChange={(e) => setNewRequest(prev => ({ ...prev, endDate: e.target.value }))}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Reason</label>
                <input
                  type="text"
                  value={newRequest.reason}
                  onChange={(e) => setNewRequest(prev => ({ ...prev, reason: e.target.value }))}
                  className="input-field"
                  placeholder="Brief reason for leave"
                  required
                />
              </div>
              <div className="md:col-span-2 flex gap-3">
                <button type="submit" className="btn-primary">Submit Request</button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* Pending Requests (Admin) */}
        {isAdmin && pendingRequests.length > 0 && (
          <div className="stat-card">
            <h3 className="font-display text-lg font-semibold text-foreground mb-4">Pending Approval</h3>
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
                  {pendingRequests.map((request) => {
                    const employee = getEmployee(request.employeeId);
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
                        <td className="table-cell text-muted-foreground max-w-xs truncate">{request.reason}</td>
                        <td className="table-cell">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApprove(request.requestId)}
                              className="p-2 rounded-lg bg-success/10 text-success hover:bg-success/20"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleReject(request.requestId)}
                              className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20"
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

        {/* All Requests */}
        <div className="stat-card">
          <h3 className="font-display text-lg font-semibold text-foreground mb-4">
            {isAdmin ? 'All Leave Requests' : 'My Leave Requests'}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {isAdmin && <th className="table-header pb-3">Employee</th>}
                  <th className="table-header pb-3">Type</th>
                  <th className="table-header pb-3">Duration</th>
                  <th className="table-header pb-3">Reason</th>
                  <th className="table-header pb-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {myRequests.map((request) => {
                  const employee = getEmployee(request.employeeId);
                  return (
                    <tr key={request.requestId} className="border-b border-border last:border-0">
                      {isAdmin && (
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
                      )}
                      <td className="table-cell capitalize">{request.type}</td>
                      <td className="table-cell text-muted-foreground">
                        {request.startDate} - {request.endDate}
                      </td>
                      <td className="table-cell text-muted-foreground max-w-xs truncate">{request.reason}</td>
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
