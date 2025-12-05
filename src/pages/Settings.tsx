import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { mockSettings } from '@/data/mockData';
import { Settings as SettingsIcon, Save, Plus, X } from 'lucide-react';
import { toast } from 'sonner';

export default function Settings() {
  const [settings, setSettings] = useState(mockSettings);
  const [newHoliday, setNewHoliday] = useState('');

  const handleSave = () => {
    toast.success('Settings saved successfully');
  };

  const addHoliday = () => {
    if (newHoliday && !settings.holidays.includes(newHoliday)) {
      setSettings(prev => ({
        ...prev,
        holidays: [...prev.holidays, newHoliday].sort()
      }));
      setNewHoliday('');
    }
  };

  const removeHoliday = (holiday: string) => {
    setSettings(prev => ({
      ...prev,
      holidays: prev.holidays.filter(h => h !== holiday)
    }));
  };

  const toggleWorkingDay = (day: string) => {
    setSettings(prev => ({
      ...prev,
      workingDays: prev.workingDays.includes(day)
        ? prev.workingDays.filter(d => d !== day)
        : [...prev.workingDays, day]
    }));
  };

  const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <DashboardLayout requireAdmin>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Settings</h1>
            <p className="text-muted-foreground mt-1">Configure office rules and policies</p>
          </div>
          <button onClick={handleSave} className="btn-primary flex items-center gap-2">
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Office Hours */}
          <div className="stat-card">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-primary/10">
                <SettingsIcon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground">Office Hours</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Start Time</label>
                <input
                  type="time"
                  value={settings.startTime}
                  onChange={(e) => setSettings(prev => ({ ...prev, startTime: e.target.value }))}
                  className="input-field"
                />
                <p className="text-xs text-muted-foreground mt-1">Employees arriving after this time will be marked late</p>
              </div>
              
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Paid Leave Per Month</label>
                <input
                  type="number"
                  value={settings.paidLeavePerMonth}
                  onChange={(e) => setSettings(prev => ({ ...prev, paidLeavePerMonth: parseInt(e.target.value) || 0 }))}
                  className="input-field"
                  min="0"
                  max="10"
                />
              </div>
            </div>
          </div>

          {/* Working Days */}
          <div className="stat-card">
            <h3 className="font-display text-lg font-semibold text-foreground mb-6">Working Days</h3>
            <div className="grid grid-cols-2 gap-3">
              {allDays.map(day => (
                <button
                  key={day}
                  onClick={() => toggleWorkingDay(day)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    settings.workingDays.includes(day)
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background text-muted-foreground hover:border-muted'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          {/* Holidays */}
          <div className="stat-card lg:col-span-2">
            <h3 className="font-display text-lg font-semibold text-foreground mb-6">Company Holidays</h3>
            
            <div className="flex gap-3 mb-4">
              <input
                type="date"
                value={newHoliday}
                onChange={(e) => setNewHoliday(e.target.value)}
                className="input-field flex-1"
              />
              <button onClick={addHoliday} className="btn-primary flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Holiday
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {settings.holidays.map(holiday => (
                <div
                  key={holiday}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted"
                >
                  <span className="text-sm text-foreground">{holiday}</span>
                  <button
                    onClick={() => removeHoliday(holiday)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {settings.holidays.length === 0 && (
              <p className="text-muted-foreground text-sm">No holidays configured</p>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
