import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { useAuth } from '@/contexts/AuthContext';
import { mockAttendance, mockLeaveRequests, mockRatings, mockPerformance, mockSettings } from '@/data/mockData';
import { Clock, Calendar, Star, Target, LogIn, LogOut } from 'lucide-react';
import { toast } from 'sonner';

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [todayAttendance, setTodayAttendance] = useState<{
    punchIn: string | null;
    punchOut: string | null;
  }>({ punchIn: null, punchOut: null });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const today = new Date().toISOString().split('T')[0];
  
  const myAttendance = mockAttendance.filter(a => a.employeeId === user?.employeeId);
  const todayRecord = myAttendance.find(a => a.date === today);
  
  const monthlyStats = myAttendance.slice(0, 22).reduce(
    (acc, record) => {
      if (record.loginStatus === 'on-time') acc.onTime++;
      else if (record.loginStatus === 'late') acc.late++;
      else acc.absent++;
      return acc;
    },
    { onTime: 0, late: 0, absent: 0 }
  );

  const myLeave = mockLeaveRequests.filter(l => l.employeeId === user?.employeeId);
  const pendingLeave = myLeave.filter(l => l.status === 'pending').length;
  const approvedLeave = myLeave.filter(l => l.status === 'approved').length;
  const remainingLeave = mockSettings.paidLeavePerMonth * 12 - approvedLeave;

  const myRatings = mockRatings.find(r => r.employeeId === user?.employeeId);
  const avgRating = myRatings
    ? ((myRatings.quality + myRatings.punctuality + myRatings.reliability + myRatings.deadlines) / 4).toFixed(1)
    : 'N/A';

  const myTasks = mockPerformance.filter(t => t.employeeId === user?.employeeId);
  const completedTasks = myTasks.filter(t => t.status === 'completed').length;
  const totalTasks = myTasks.length;

  const handlePunchIn = () => {
    const time = currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    setTodayAttendance(prev => ({ ...prev, punchIn: time }));
    toast.success(`Punched in at ${time}`);
  };

  const handlePunchOut = () => {
    const time = currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    setTodayAttendance(prev => ({ ...prev, punchOut: time }));
    toast.success(`Punched out at ${time}`);
  };

  const punchIn = todayAttendance.punchIn || todayRecord?.punchIn;
  const punchOut = todayAttendance.punchOut || todayRecord?.punchOut;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              Good {currentTime.getHours() < 12 ? 'Morning' : currentTime.getHours() < 17 ? 'Afternoon' : 'Evening'}, {user?.name?.split(' ')[0]}!
            </h1>
            <p className="text-muted-foreground mt-1">Here's your daily overview</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-display font-bold text-foreground">
              {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </p>
            <p className="text-sm text-muted-foreground">
              {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Punch In/Out Section */}
        <div className="stat-card">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <h2 className="font-display text-xl font-semibold text-foreground">Today's Attendance</h2>
              <p className="text-muted-foreground">Track your working hours</p>
            </div>
            
            <div className="flex items-center gap-8">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Punch In</p>
                <p className="text-xl font-semibold text-foreground">{punchIn || '--:--'}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Punch Out</p>
                <p className="text-xl font-semibold text-foreground">{punchOut || '--:--'}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Status</p>
                <span className={`${punchIn ? (punchIn <= '09:15' ? 'badge-success' : 'badge-warning') : 'badge-muted'}`}>
                  {punchIn ? (punchIn <= '09:15' ? 'On Time' : 'Late') : 'Not Punched'}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handlePunchIn}
                disabled={!!punchIn}
                className="punch-btn punch-btn-in disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
              >
                <LogIn className="w-5 h-5" />
                Punch In
              </button>
              <button
                onClick={handlePunchOut}
                disabled={!punchIn || !!punchOut}
                className="punch-btn punch-btn-out disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
              >
                <LogOut className="w-5 h-5" />
                Punch Out
              </button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Monthly Attendance"
            value={`${monthlyStats.onTime + monthlyStats.late}/${monthlyStats.onTime + monthlyStats.late + monthlyStats.absent}`}
            icon={Clock}
            variant="primary"
            trend={{ value: monthlyStats.onTime, label: 'days on time', positive: true }}
          />
          <StatCard
            title="Leave Balance"
            value={remainingLeave}
            icon={Calendar}
            variant="accent"
            trend={{ value: pendingLeave, label: 'pending requests', positive: false }}
          />
          <StatCard
            title="Performance"
            value={`${completedTasks}/${totalTasks}`}
            icon={Target}
            variant="success"
          />
          <StatCard
            title="Average Rating"
            value={avgRating}
            icon={Star}
            variant="warning"
          />
        </div>

        {/* Detailed Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Attendance Summary */}
          <div className="stat-card">
            <h3 className="font-display text-lg font-semibold text-foreground mb-4">Monthly Attendance Summary</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">On Time</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-success rounded-full"
                      style={{ width: `${(monthlyStats.onTime / 22) * 100}%` }}
                    />
                  </div>
                  <span className="text-foreground font-medium w-8">{monthlyStats.onTime}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Late</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-warning rounded-full"
                      style={{ width: `${(monthlyStats.late / 22) * 100}%` }}
                    />
                  </div>
                  <span className="text-foreground font-medium w-8">{monthlyStats.late}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Absent</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-destructive rounded-full"
                      style={{ width: `${(monthlyStats.absent / 22) * 100}%` }}
                    />
                  </div>
                  <span className="text-foreground font-medium w-8">{monthlyStats.absent}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Ratings Snapshot */}
          {myRatings && (
            <div className="stat-card">
              <h3 className="font-display text-lg font-semibold text-foreground mb-4">Ratings Snapshot</h3>
              <div className="space-y-4">
                {[
                  { label: 'Quality', value: myRatings.quality },
                  { label: 'Punctuality', value: myRatings.punctuality },
                  { label: 'Reliability', value: myRatings.reliability },
                  { label: 'Deadlines', value: myRatings.deadlines },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-muted-foreground">{item.label}</span>
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              star <= item.value
                                ? 'text-warning fill-warning'
                                : 'text-muted'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-foreground font-medium w-8">{item.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Recent Tasks */}
        <div className="stat-card">
          <h3 className="font-display text-lg font-semibold text-foreground mb-4">My Tasks</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="table-header pb-3">Task</th>
                  <th className="table-header pb-3">Due Date</th>
                  <th className="table-header pb-3">Status</th>
                  <th className="table-header pb-3">Score</th>
                </tr>
              </thead>
              <tbody>
                {myTasks.map((task) => (
                  <tr key={task.id} className="border-b border-border last:border-0">
                    <td className="table-cell font-medium">{task.task}</td>
                    <td className="table-cell text-muted-foreground">{task.dueDate}</td>
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
