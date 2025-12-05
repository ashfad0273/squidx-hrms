import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { mockRatings, mockEmployees } from '@/data/mockData';
import { Rating } from '@/types/hr';
import { Star, Edit2, Save, X } from 'lucide-react';
import { toast } from 'sonner';

export default function Ratings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';
  
  const [ratings, setRatings] = useState<Rating[]>(mockRatings);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Rating | null>(null);

  const myRatings = isAdmin ? ratings : ratings.filter(r => r.employeeId === user?.employeeId);
  const getEmployee = (employeeId: string) => mockEmployees.find(e => e.employeeId === employeeId);

  const handleEdit = (rating: Rating) => {
    setEditingId(rating.employeeId);
    setEditForm({ ...rating });
  };

  const handleSave = () => {
    if (!editForm) return;
    setRatings(prev => prev.map(r => 
      r.employeeId === editForm.employeeId ? editForm : r
    ));
    setEditingId(null);
    setEditForm(null);
    toast.success('Ratings updated');
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const updateRating = (field: 'quality' | 'punctuality' | 'reliability' | 'deadlines', value: number) => {
    if (editForm) {
      setEditForm({ ...editForm, [field]: value });
    }
  };

  const RatingStars = ({ value, editable, onChange }: { value: number; editable?: boolean; onChange?: (v: number) => void }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!editable}
          onClick={() => editable && onChange?.(star)}
          className={`${editable ? 'cursor-pointer hover:scale-110 transition-transform' : ''}`}
        >
          <Star
            className={`w-5 h-5 ${
              star <= value ? 'text-warning fill-warning' : 'text-muted'
            }`}
          />
        </button>
      ))}
    </div>
  );

  const ratingFields: { key: 'quality' | 'punctuality' | 'reliability' | 'deadlines'; label: string }[] = [
    { key: 'quality', label: 'Quality' },
    { key: 'punctuality', label: 'Punctuality' },
    { key: 'reliability', label: 'Reliability' },
    { key: 'deadlines', label: 'Deadlines' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Ratings</h1>
          <p className="text-muted-foreground mt-1">
            {isAdmin ? 'View and update employee ratings' : 'View your performance ratings'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {myRatings.map((rating) => {
            const employee = getEmployee(rating.employeeId);
            const isEditing = editingId === rating.employeeId;
            const currentRating = isEditing && editForm ? editForm : rating;

            return (
              <div key={rating.employeeId} className="stat-card">
                <div className="flex items-start justify-between mb-4">
                  <div 
                    className={`flex items-center gap-3 ${isAdmin ? 'cursor-pointer hover:opacity-80' : ''}`}
                    onClick={() => isAdmin && navigate(`/employees/${rating.employeeId}`)}
                  >
                    <img
                      src={employee?.photoUrl}
                      alt={employee?.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div>
                      <p className="font-semibold text-foreground">{employee?.name}</p>
                      <p className="text-sm text-muted-foreground">{employee?.department}</p>
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-2">
                      {isEditing ? (
                        <>
                          <button
                            onClick={handleSave}
                            className="p-2 rounded-lg bg-success/10 text-success hover:bg-success/20"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleCancel}
                            className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleEdit(rating)}
                          className="p-2 rounded-lg bg-muted hover:bg-muted/80"
                        >
                          <Edit2 className="w-4 h-4 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {ratingFields.map((item) => (
                    <div key={item.key} className="flex items-center justify-between">
                      <span className="text-muted-foreground">{item.label}</span>
                      <div className="flex items-center gap-3">
                        <RatingStars
                          value={currentRating[item.key]}
                          editable={isEditing}
                          onChange={(v) => updateRating(item.key, v)}
                        />
                        <span className="w-8 text-right font-medium">{currentRating[item.key]}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-border">
                  {isEditing && editForm ? (
                    <textarea
                      value={editForm.notes}
                      onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                      className="input-field text-sm"
                      rows={2}
                      placeholder="Add notes..."
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">{rating.notes}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">Period: {rating.period}</p>
                </div>

                <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Average Rating</span>
                  <span className="text-xl font-bold text-foreground">
                    {((currentRating.quality + currentRating.punctuality + currentRating.reliability + currentRating.deadlines) / 4).toFixed(1)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {myRatings.length === 0 && (
          <div className="text-center py-12">
            <Star className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No ratings available</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
