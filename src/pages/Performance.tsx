import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { mockPerformance, mockEmployees } from '@/data/mockData';
import { PerformanceTask } from '@/types/hr';
import { Target, Plus, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function Performance() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';
  
  const [tasks, setTasks] = useState<PerformanceTask[]>(mockPerformance);
  const [showForm, setShowForm] = useState(false);
  const [newTask, setNewTask] = useState({
    employeeId: '',
    task: '',
    dueDate: ''
  });

  const myTasks = isAdmin ? tasks : tasks.filter(t => t.employeeId === user?.employeeId);
  const getEmployee = (employeeId: string) => mockEmployees.find(e => e.employeeId === employeeId);

  const handleAssignTask = (e: React.FormEvent) => {
    e.preventDefault();
    const task: PerformanceTask = {
      id: `TASK${Date.now()}`,
      ...newTask,
      status: 'pending'
    };
    setTasks(prev => [...prev, task]);
    setShowForm(false);
    setNewTask({ employeeId: '', task: '', dueDate: '' });
    toast.success('Task assigned successfully');
  };

  const handleUpdateStatus = (taskId: string, status: PerformanceTask['status']) => {
    setTasks(prev => prev.map(t => 
      t.id === taskId 
        ? { 
            ...t, 
            status, 
            completedDate: status === 'completed' ? new Date().toISOString().split('T')[0] : undefined 
          }
        : t
    ));
    toast.success(`Task ${status === 'completed' ? 'completed' : 'updated'}`);
  };

  const taskStats = {
    total: myTasks.length,
    completed: myTasks.filter(t => t.status === 'completed').length,
    inProgress: myTasks.filter(t => t.status === 'in-progress').length,
    overdue: myTasks.filter(t => t.status === 'overdue').length,
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Performance</h1>
            <p className="text-muted-foreground mt-1">Track and manage tasks</p>
          </div>
          {isAdmin && (
            <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Assign Task
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="stat-card text-center">
            <p className="text-2xl font-bold text-foreground">{taskStats.total}</p>
            <p className="text-sm text-muted-foreground">Total Tasks</p>
          </div>
          <div className="stat-card text-center">
            <p className="text-2xl font-bold text-success">{taskStats.completed}</p>
            <p className="text-sm text-muted-foreground">Completed</p>
          </div>
          <div className="stat-card text-center">
            <p className="text-2xl font-bold text-warning">{taskStats.inProgress}</p>
            <p className="text-sm text-muted-foreground">In Progress</p>
          </div>
          <div className="stat-card text-center">
            <p className="text-2xl font-bold text-destructive">{taskStats.overdue}</p>
            <p className="text-sm text-muted-foreground">Overdue</p>
          </div>
        </div>

        {/* Assign Task Form (Admin) */}
        {showForm && isAdmin && (
          <div className="stat-card">
            <h3 className="font-display text-lg font-semibold text-foreground mb-4">Assign New Task</h3>
            <form onSubmit={handleAssignTask} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Employee</label>
                <select
                  value={newTask.employeeId}
                  onChange={(e) => setNewTask(prev => ({ ...prev, employeeId: e.target.value }))}
                  className="input-field"
                  required
                >
                  <option value="">Select Employee</option>
                  {mockEmployees.filter(e => e.role !== 'admin').map(emp => (
                    <option key={emp.employeeId} value={emp.employeeId}>{emp.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Task Description</label>
                <input
                  type="text"
                  value={newTask.task}
                  onChange={(e) => setNewTask(prev => ({ ...prev, task: e.target.value }))}
                  className="input-field"
                  placeholder="Enter task description"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Due Date</label>
                <input
                  type="date"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask(prev => ({ ...prev, dueDate: e.target.value }))}
                  className="input-field"
                  required
                />
              </div>
              <div className="md:col-span-3 flex gap-3">
                <button type="submit" className="btn-primary">Assign Task</button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* Tasks Table */}
        <div className="stat-card">
          <h3 className="font-display text-lg font-semibold text-foreground mb-4">
            {isAdmin ? 'All Tasks' : 'My Tasks'}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {isAdmin && <th className="table-header pb-3">Employee</th>}
                  <th className="table-header pb-3">Task</th>
                  <th className="table-header pb-3">Due Date</th>
                  <th className="table-header pb-3">Completed</th>
                  <th className="table-header pb-3">Status</th>
                  <th className="table-header pb-3">Score</th>
                  {!isAdmin && <th className="table-header pb-3">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {myTasks.map((task) => {
                  const employee = getEmployee(task.employeeId);
                  return (
                    <tr key={task.id} className="border-b border-border last:border-0">
                      {isAdmin && (
                        <td className="table-cell">
                          <div 
                            className="flex items-center gap-3 cursor-pointer hover:opacity-80"
                            onClick={() => navigate(`/employees/${task.employeeId}`)}
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
                      {!isAdmin && task.status !== 'completed' && (
                        <td className="table-cell">
                          <div className="flex gap-2">
                            {task.status === 'pending' && (
                              <button
                                onClick={() => handleUpdateStatus(task.id, 'in-progress')}
                                className="btn-secondary text-xs py-1 px-2"
                              >
                                Start
                              </button>
                            )}
                            {task.status === 'in-progress' && (
                              <button
                                onClick={() => handleUpdateStatus(task.id, 'completed')}
                                className="btn-success text-xs py-1 px-2 flex items-center gap-1"
                              >
                                <CheckCircle className="w-3 h-3" />
                                Complete
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                      {!isAdmin && task.status === 'completed' && (
                        <td className="table-cell text-success">Done</td>
                      )}
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
