import { useState, useEffect } from 'react';
import { Plus, Calendar, Trash2, CreditCard as Edit2, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { scheduleService, ScheduleData } from '../services/schedule.service';

interface Schedule {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_type: 'exam' | 'deadline' | 'meeting' | 'other';
}

const EVENT_TYPE_COLORS = {
  exam: 'bg-red-100 text-red-700 border-red-300',
  deadline: 'bg-orange-100 text-orange-700 border-orange-300',
  meeting: 'bg-blue-100 text-blue-700 border-blue-300',
  other: 'bg-gray-100 text-gray-700 border-gray-300',
};

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
        <h3 className="text-2xl font-bold text-gray-900">Academic Schedule</h3>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-aurora-secondary-green text-white rounded-lg hover:bg-aurora-secondary-darkGreen transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Event
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-teal-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-900">
              {editingId ? 'Edit Event' : 'New Event'}
            </h4>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                placeholder="e.g., Math Final Exam"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none resize-none"
                placeholder="Additional details..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={formData.event_date}
                  onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={formData.event_type}
                  onChange={(e) => setFormData({ ...formData, event_type: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
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
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors"
              >
                {editingId ? 'Update Event' : 'Add Event'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {upcomingEvents.length === 0 ? (
          <div className="bg-gray-50 rounded-xl p-8 text-center">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No upcoming events</p>
            <p className="text-sm text-gray-500 mt-1">Add your first event to get started</p>
          </div>
        ) : (
          upcomingEvents.map((schedule) => (
            <div
              key={schedule.id}
              className={`bg-white rounded-xl p-4 shadow-sm border-2 transition-all hover:shadow-md ${
                EVENT_TYPE_COLORS[schedule.event_type]
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold uppercase tracking-wide">
                      {schedule.event_type}
                    </span>
                    <span className="text-sm text-gray-600">
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
                  <h4 className="font-semibold text-gray-900 mb-1">{schedule.title}</h4>
                  {schedule.description && (
                    <p className="text-sm text-gray-600">{schedule.description}</p>
                  )}
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleEdit(schedule)}
                    className="p-2 text-gray-600 hover:bg-white rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(schedule.id)}
                    className="p-2 text-gray-600 hover:bg-white rounded-lg transition-colors"
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
