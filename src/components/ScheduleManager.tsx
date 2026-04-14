import { useState, useEffect } from 'react';
import { Plus, Calendar, Trash2, CreditCard as Edit2, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { scheduleService, ScheduleData } from '../services/schedule';
import { EVENT_TYPE_COLORS } from '../utils/emotions'

interface Schedule {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_type: 'exam' | 'deadline' | 'meeting' | 'other';
}

export default function ScheduleManager() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ScheduleData>({
    title: '',
    description: '',
    event_date: '',
    event_type: 'other',
  });

  useEffect(() => {
    if (user) {
      loadSchedules();
    }
  }, [user]);

  const loadSchedules = async () => {
    if (!user) return;
    const data = await scheduleService.getSchedules(user.id);
    setSchedules(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      if (editingId) {
        await scheduleService.updateSchedule(editingId, formData);
      } else {
        await scheduleService.createSchedule(user.id, formData);
      }
      await loadSchedules();
      resetForm();
    } catch (error) {
      console.error('Error saving schedule:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    await scheduleService.deleteSchedule(id);
    await loadSchedules();
  };

  const handleEdit = (schedule: Schedule) => {
    setEditingId(schedule.id);
    setFormData({
      title: schedule.title,
      description: schedule.description || '',
      event_date: schedule.event_date,
      event_type: schedule.event_type,
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      event_date: '',
      event_type: 'other',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const upcomingEvents = schedules.filter(
    s => new Date(s.event_date) >= new Date()
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold text-white">Academic Schedule</h3>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#22C55E] text-white rounded-lg hover:bg-[#16a34a] transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Event
        </button>
      </div>

      {showForm && (
        <div className="bg-[#10143C] rounded-xl p-6 border border-white/8">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-white">
              {editingId ? 'Edit Event' : 'New Event'}
            </h4>
            <button onClick={resetForm} className="text-[#7B8EC8] hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#7B8EC8] mb-1">
                Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border border-white/8 rounded-lg bg-aurora-card-dark text-white placeholder:text-[#4B5693] focus:ring-2 focus:ring-[#2D6BFF]/30 focus:border-[#2D6BFF] outline-hidden"
                placeholder="e.g., Math Final Exam"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#7B8EC8] mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-white/8 rounded-lg bg-aurora-card-dark text-white placeholder:text-[#4B5693] focus:ring-2 focus:ring-[#2D6BFF]/30 focus:border-[#2D6BFF] outline-hidden resize-none"
                placeholder="Additional details..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#7B8EC8] mb-1">
                  Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={formData.event_date}
                  onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                  className="w-full px-4 py-2 border border-white/8 rounded-lg bg-aurora-card-dark text-white focus:ring-2 focus:ring-[#2D6BFF]/30 focus:border-[#2D6BFF] outline-hidden scheme-dark"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#7B8EC8] mb-1">
                  Type
                </label>
                <select
                  value={formData.event_type}
                  onChange={(e) => setFormData({ ...formData, event_type: e.target.value as any })}
                  className="w-full px-4 py-2 border border-white/8 rounded-lg bg-aurora-card-dark text-white focus:ring-2 focus:ring-[#2D6BFF]/30 focus:border-[#2D6BFF] outline-hidden"
                >
                  <option value="exam">Exam</option>
                  <option value="deadline">Deadline</option>
                  <option value="meeting">Meeting</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border border-white/8 text-[#7B8EC8] rounded-lg hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-[#2D6BFF] text-white rounded-lg hover:bg-[#4D8BFF] transition-colors"
              >
                {editingId ? 'Update Event' : 'Add Event'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {upcomingEvents.length === 0 ? (
          <div className="bg-[#10143C] rounded-xl p-8 text-center border border-white/8">
            <Calendar className="w-12 h-12 text-[#4B5693] mx-auto mb-3" />
            <p className="text-[#7B8EC8]">No upcoming events</p>
            <p className="text-sm text-[#4B5693] mt-1">Add your first event to get started</p>
          </div>
        ) : (
          upcomingEvents.map((schedule) => (
            <div
              key={schedule.id}
              className={`bg-[#10143C] rounded-xl p-4 border transition-all hover:border-white/12 ${
                EVENT_TYPE_COLORS[schedule.event_type]
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-[#7B8EC8]">
                      {schedule.event_type}
                    </span>
                    <span className="text-sm text-[#7B8EC8]">
                      {new Date(schedule.event_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                      {' at '}
                      {new Date(schedule.event_date).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <h4 className="font-semibold text-white mb-1">{schedule.title}</h4>
                  {schedule.description && (
                    <p className="text-sm text-[#7B8EC8]">{schedule.description}</p>
                  )}
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleEdit(schedule)}
                    className="p-2 text-[#7B8EC8] hover:bg-white/5 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(schedule.id)}
                    className="p-2 text-[#7B8EC8] hover:bg-white/5 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
