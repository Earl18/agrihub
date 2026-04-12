import { useState } from 'react';
import { Plus, MapPin, Calendar, CheckCircle, Clock, AlertTriangle, X, ArrowLeft, Save, Play, Eye, Edit2, RefreshCw, Users, Wrench, FileText, ChevronRight, Sprout, Droplets, Leaf, Scissors, Sun, Tractor } from 'lucide-react';

interface FarmTask {
  id: string;
  label: string;
  icon: 'sprout' | 'tractor' | 'droplets' | 'leaf' | 'scissors' | 'sun';
  completed: boolean;
}

interface ActiveOp {
  id: number;
  title: string;
  field: string;
  crop: string;
  startDate: string;
  progress: number;
  workers: number;
  equipment: string;
  priority: 'high' | 'medium' | 'low';
  notes: string;
  tasks: FarmTask[];
  quickStatus?: 'in-progress' | 'nearly-done' | 'completed';
}

interface PlannedOp {
  id: number;
  title: string;
  field: string;
  crop: string;
  startDate: string;
  workers: number;
  equipment: string;
  priority: 'high' | 'medium' | 'low';
  estimatedDuration: string;
}

interface CompletedOp {
  id: number;
  title: string;
  field: string;
  crop: string;
  completedDate: string;
  duration: string;
  workers: number;
  status: string;
  notes: string;
  startDate?: string;
  equipment?: string;
  priority?: string;
}

export function Operations() {
  const getProgressColor = (pct: number) => {
    if (pct <= 30) return { bar: 'bg-red-500', track: 'bg-red-100', bg: 'bg-red-50', text: 'text-red-700', textLight: 'text-red-600', label: 'Starting' };
    if (pct <= 70) return { bar: 'bg-amber-500', track: 'bg-amber-100', bg: 'bg-amber-50', text: 'text-amber-700', textLight: 'text-amber-600', label: 'In Progress' };
    return { bar: 'bg-green-600', track: 'bg-green-200', bg: 'bg-green-50', text: 'text-green-800', textLight: 'text-green-600', label: 'Almost Done' };
  };

  const [activeTab, setActiveTab] = useState<'active' | 'planned' | 'completed'>('active');

  // Detail views
  const [viewingCompleted, setViewingCompleted] = useState<CompletedOp | null>(null);

  // Update modal
  const [updatingOp, setUpdatingOp] = useState<ActiveOp | null>(null);
  const [updateTasks, setUpdateTasks] = useState<FarmTask[]>([]);

  // Edit modal
  const [editingOp, setEditingOp] = useState<PlannedOp | null>(null);
  const [editForm, setEditForm] = useState<PlannedOp | null>(null);

  // Start confirm
  const [startingOp, setStartingOp] = useState<PlannedOp | null>(null);

  // Complete confirm
  const [completingOp, setCompletingOp] = useState<ActiveOp | null>(null);

  const fields = [
    { id: 'A', name: 'Field A', area: 25, crop: 'Wheat', status: 'growing' },
    { id: 'B', name: 'Field B', area: 18, crop: 'Rice', status: 'preparing' },
    { id: 'C', name: 'Field C', area: 30, crop: 'Corn', status: 'harvesting' },
    { id: 'D', name: 'Field D', area: 20, crop: 'Barley', status: 'idle' },
  ];

  const [activeOperations, setActiveOperations] = useState<ActiveOp[]>([
    { id: 1, title: 'Wheat Harvesting', field: 'Field C', crop: 'Wheat', startDate: '2026-02-07', progress: 60, workers: 8, equipment: 'Combine Harvester', priority: 'high', notes: 'Weather conditions favorable. Expected completion by end of day.', tasks: [
      { id: '1-1', label: 'Land Preparation', icon: 'tractor', completed: true },
      { id: '1-2', label: 'Pre-Harvest Inspection', icon: 'sun', completed: true },
      { id: '1-3', label: 'Harvesting', icon: 'scissors', completed: true },
      { id: '1-4', label: 'Grain Collection', icon: 'sprout', completed: false },
      { id: '1-5', label: 'Transport to Storage', icon: 'tractor', completed: false },
    ], quickStatus: 'in-progress' },
    { id: 2, title: 'Irrigation System Check', field: 'Field A', crop: 'Wheat', startDate: '2026-02-07', progress: 40, workers: 2, equipment: 'None', priority: 'medium', notes: 'Regular maintenance schedule', tasks: [
      { id: '2-1', label: 'Inspect Main Lines', icon: 'droplets', completed: true },
      { id: '2-2', label: 'Check Sprinkler Heads', icon: 'droplets', completed: true },
      { id: '2-3', label: 'Test Water Pressure', icon: 'droplets', completed: false },
      { id: '2-4', label: 'Repair Leaks', icon: 'tractor', completed: false },
      { id: '2-5', label: 'System Flush', icon: 'droplets', completed: false },
    ], quickStatus: 'in-progress' },
    { id: 3, title: 'Fertilizer Application', field: 'Field B', crop: 'Rice', startDate: '2026-02-06', progress: 80, workers: 3, equipment: 'Sprayer', priority: 'high', notes: 'Using organic NPK fertilizer', tasks: [
      { id: '3-1', label: 'Soil Testing', icon: 'leaf', completed: true },
      { id: '3-2', label: 'Mix Fertilizer', icon: 'leaf', completed: true },
      { id: '3-3', label: 'Apply to Field', icon: 'sprout', completed: true },
      { id: '3-4', label: 'Irrigation After Application', icon: 'droplets', completed: true },
      { id: '3-5', label: 'Record & Cleanup', icon: 'sun', completed: false },
    ], quickStatus: 'nearly-done' },
  ]);

  const [plannedOperations, setPlannedOperations] = useState<PlannedOp[]>([
    { id: 4, title: 'Corn Planting', field: 'Field D', crop: 'Corn', startDate: '2026-02-10', workers: 6, equipment: 'Seed Drill', priority: 'high', estimatedDuration: '2 days' },
    { id: 5, title: 'Pest Control Spraying', field: 'Field A', crop: 'Wheat', startDate: '2026-02-12', workers: 2, equipment: 'Sprayer', priority: 'medium', estimatedDuration: '1 day' },
    { id: 6, title: 'Equipment Maintenance', field: 'Storage Area', crop: 'N/A', startDate: '2026-02-15', workers: 3, equipment: 'Various', priority: 'low', estimatedDuration: '3 days' },
  ]);

  const [completedOperations, setCompletedOperations] = useState<CompletedOp[]>([
    { id: 7, title: 'Rice Field Preparation', field: 'Field B', crop: 'Rice', completedDate: '2026-02-05', duration: '3 days', workers: 5, status: 'success', notes: 'Completed ahead of schedule', startDate: '2026-02-02', equipment: 'Tractor', priority: 'high' },
    { id: 8, title: 'Irrigation Installation', field: 'Field C', crop: 'Corn', completedDate: '2026-02-03', duration: '4 days', workers: 4, status: 'success', notes: 'New drip system installed successfully', startDate: '2026-01-30', equipment: 'Drilling Rig', priority: 'medium' },
    { id: 9, title: 'Weed Removal', field: 'Field A', crop: 'Wheat', completedDate: '2026-02-01', duration: '2 days', workers: 8, status: 'success', notes: 'Manual weeding completed', startDate: '2026-01-30', equipment: 'Hand Tools', priority: 'low' },
  ]);

  // ========== HANDLERS ==========
  const getDefaultTasks = (op: ActiveOp): FarmTask[] => {
    if (op.tasks && op.tasks.length > 0) return op.tasks;
    return [
      { id: `${op.id}-1`, label: 'Land Preparation', icon: 'tractor', completed: false },
      { id: `${op.id}-2`, label: 'Planting', icon: 'sprout', completed: false },
      { id: `${op.id}-3`, label: 'Irrigation', icon: 'droplets', completed: false },
      { id: `${op.id}-4`, label: 'Fertilizing', icon: 'leaf', completed: false },
      { id: `${op.id}-5`, label: 'Harvesting', icon: 'scissors', completed: false },
    ];
  };

  const calcProgressFromTasks = (tasks: FarmTask[]) => {
    if (!tasks || tasks.length === 0) return 0;
    return Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100);
  };

  const toggleUpdateTask = (taskId: string) => {
    setUpdateTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t));
  };

  const handleUpdate = () => {
    if (!updatingOp) return;
    const progress = calcProgressFromTasks(updateTasks);
    setActiveOperations(prev => prev.map(op =>
      op.id === updatingOp.id ? { ...op, tasks: updateTasks, progress } : op
    ));
    setUpdatingOp(null);
  };

  const handleComplete = (op: ActiveOp) => {
    setActiveOperations(prev => prev.filter(o => o.id !== op.id));
    setCompletedOperations(prev => [{
      id: op.id,
      title: op.title,
      field: op.field,
      crop: op.crop,
      completedDate: new Date().toISOString().split('T')[0],
      duration: `${Math.ceil((Date.now() - new Date(op.startDate).getTime()) / (1000 * 60 * 60 * 24))} days`,
      workers: op.workers,
      status: 'success',
      notes: op.notes,
      startDate: op.startDate,
      equipment: op.equipment,
      priority: op.priority,
    }, ...prev]);
    setCompletingOp(null);
    setActiveTab('completed');
  };

  const handleSaveEdit = () => {
    if (!editForm) return;
    setPlannedOperations(prev => prev.map(op => op.id === editForm.id ? editForm : op));
    setEditingOp(null);
    setEditForm(null);
  };

  const handleStartNow = (op: PlannedOp) => {
    setPlannedOperations(prev => prev.filter(o => o.id !== op.id));
    setActiveOperations(prev => [...prev, {
      id: op.id,
      title: op.title,
      field: op.field,
      crop: op.crop,
      startDate: new Date().toISOString().split('T')[0],
      progress: 0,
      workers: op.workers,
      equipment: op.equipment,
      priority: op.priority,
      notes: `Started from planned. Est. duration: ${op.estimatedDuration}`,
    }]);
    setStartingOp(null);
    setActiveTab('active');
  };

  // ========== COMPLETED DETAIL VIEW ==========
  if (viewingCompleted) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        <button onClick={() => setViewingCompleted(null)} className="inline-flex items-center space-x-2 text-gray-600 hover:text-green-600 transition-colors active:scale-[0.98]">
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back to Operations</span>
        </button>

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-8 text-white">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle className="w-6 h-6" />
                  <span className="text-green-100 text-sm font-medium">Completed Operation</span>
                </div>
                <h2 className="text-2xl font-bold">{viewingCompleted.title}</h2>
                <p className="text-green-100 mt-1">{viewingCompleted.crop} — {viewingCompleted.field}</p>
              </div>
              <span className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-white/20 text-white text-sm font-medium">
                <CheckCircle className="w-5 h-5" />
                <span>Completed</span>
              </span>
            </div>
          </div>

          <div className="p-6">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">Operation Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <DetailRow icon={<Calendar className="w-5 h-5 text-green-600" />} label="Completed Date" value={viewingCompleted.completedDate} />
              {viewingCompleted.startDate && (
                <DetailRow icon={<Play className="w-5 h-5 text-green-600" />} label="Start Date" value={viewingCompleted.startDate} />
              )}
              <DetailRow icon={<Clock className="w-5 h-5 text-green-600" />} label="Duration" value={viewingCompleted.duration} />
              <DetailRow icon={<Users className="w-5 h-5 text-green-600" />} label="Workers" value={`${viewingCompleted.workers} workers`} />
              <DetailRow icon={<MapPin className="w-5 h-5 text-green-600" />} label="Location" value={viewingCompleted.field} />
              {viewingCompleted.equipment && (
                <DetailRow icon={<Wrench className="w-5 h-5 text-green-600" />} label="Equipment" value={viewingCompleted.equipment} />
              )}
            </div>

            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Notes</h3>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-gray-700">{viewingCompleted.notes}</p>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-green-800">Operation Completed Successfully</p>
                <p className="text-sm text-green-600 mt-0.5">This operation was finished on {viewingCompleted.completedDate}.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ========== MAIN VIEW ==========
  return (
    <div className="space-y-6">
      {/* ===== UPDATE MODAL ===== */}
      {updatingOp && (() => {
        const completedCount = updateTasks.filter(t => t.completed).length;
        const totalCount = updateTasks.length;
        const taskProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

        return (
        <Modal onClose={() => setUpdatingOp(null)}>
          {/* Header */}
          <div className="text-center mb-5">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Sprout className="w-7 h-7 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Update Operation</h3>
            <p className="text-sm text-gray-500 mt-1">{updatingOp.title}</p>
            <p className="text-xs text-gray-400 mt-0.5">{updatingOp.field} — {updatingOp.crop}</p>
          </div>

          {/* Progress Summary Bar */}
          <div className={`${(() => { const c = getProgressColor(taskProgress); return c.bg; })()} rounded-xl p-3 mb-5 transition-colors duration-300`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-sm font-medium ${getProgressColor(taskProgress).text}`}>
                {completedCount} of {totalCount} tasks completed
              </span>
              <span className={`text-sm font-semibold ${getProgressColor(taskProgress).text}`}>
                {taskProgress}%
              </span>
            </div>
            <div className={`w-full ${getProgressColor(taskProgress).track} rounded-full h-3 transition-colors duration-300`}>
              <div className={`${getProgressColor(taskProgress).bar} h-3 rounded-full transition-all duration-300`} style={{ width: `${taskProgress}%` }} />
            </div>
            <p className={`text-xs mt-1.5 ${getProgressColor(taskProgress).textLight} font-medium`}>
              {getProgressColor(taskProgress).label}
            </p>
          </div>

          {/* Task Checklist */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-3">Farming Stages</label>
            <div className="space-y-1.5">
              {updateTasks.map((task, idx) => (
                <button
                  key={task.id}
                  onClick={() => toggleUpdateTask(task.id)}
                  className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl border transition-all active:scale-[0.98] ${
                    task.completed
                      ? 'bg-green-50 border-green-200 hover:bg-green-100'
                      : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-green-300'
                  }`}
                >
                  {/* Step Number / Check */}
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    task.completed ? 'bg-green-600' : 'bg-gray-200'
                  }`}>
                    {task.completed
                      ? <CheckCircle className="w-4 h-4 text-white" />
                      : <span className="text-xs font-medium text-gray-500">{idx + 1}</span>
                    }
                  </div>
                  {/* Icon */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    task.completed ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    <TaskIcon iconName={task.icon} completed={task.completed} />
                  </div>
                  {/* Label */}
                  <span className={`text-sm text-left flex-1 ${
                    task.completed ? 'text-green-700 font-medium' : 'text-gray-700'
                  }`}>
                    {task.label}
                  </span>
                  {/* Status text */}
                  <span className={`text-xs shrink-0 ${task.completed ? 'text-green-500' : 'text-gray-400'}`}>
                    {task.completed ? 'Done' : 'Pending'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button onClick={() => setUpdatingOp(null)} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 active:scale-[0.98] transition-all font-medium">
              Cancel
            </button>
            <button onClick={handleUpdate} className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 active:scale-[0.98] transition-all font-medium flex items-center justify-center space-x-2">
              <Save className="w-4 h-4" />
              <span>Save Update</span>
            </button>
          </div>
        </Modal>
        );
      })()}

      {/* ===== COMPLETE CONFIRMATION ===== */}
      {completingOp && (
        <Modal onClose={() => setCompletingOp(null)}>
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-7 h-7 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Mark as Complete?</h3>
            <p className="text-sm text-gray-500 mt-1">
              Are you sure you want to mark <strong>{completingOp.title}</strong> as completed?
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-sm text-gray-600 space-y-1">
            <p><span className="font-medium text-gray-700">Current Progress:</span> {completingOp.progress}%</p>
            <p><span className="font-medium text-gray-700">Field:</span> {completingOp.field}</p>
            <p><span className="font-medium text-gray-700">Workers:</span> {completingOp.workers}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setCompletingOp(null)} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 active:scale-[0.98] transition-all font-medium">
              Not Yet
            </button>
            <button onClick={() => handleComplete(completingOp)} className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 active:scale-[0.98] transition-all font-medium">
              Yes, Complete
            </button>
          </div>
        </Modal>
      )}

      {/* ===== EDIT MODAL ===== */}
      {editingOp && editForm && (
        <Modal onClose={() => { setEditingOp(null); setEditForm(null); }}>
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Edit2 className="w-7 h-7 text-orange-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Edit Operation</h3>
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Title</label>
              <input type="text" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Field</label>
                <select value={editForm.field} onChange={(e) => setEditForm({ ...editForm, field: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm bg-white">
                  {fields.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
                  <option value="Storage Area">Storage Area</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Start Date</label>
                <input type="date" value={editForm.startDate} onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Workers Needed</label>
                <input type="number" min="1" value={editForm.workers} onChange={(e) => setEditForm({ ...editForm, workers: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Duration</label>
                <input type="text" value={editForm.estimatedDuration} onChange={(e) => setEditForm({ ...editForm, estimatedDuration: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Priority</label>
              <div className="flex gap-2">
                {(['low', 'medium', 'high'] as const).map(p => (
                  <button key={p} onClick={() => setEditForm({ ...editForm, priority: p })}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${
                      editForm.priority === p
                        ? p === 'high' ? 'bg-red-50 border-red-300 text-red-700' :
                          p === 'medium' ? 'bg-yellow-50 border-yellow-300 text-yellow-700' :
                          'bg-gray-50 border-gray-300 text-gray-700'
                        : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Equipment</label>
              <input type="text" value={editForm.equipment} onChange={(e) => setEditForm({ ...editForm, equipment: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm" />
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => { setEditingOp(null); setEditForm(null); }} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 active:scale-[0.98] transition-all font-medium">
              Cancel
            </button>
            <button onClick={handleSaveEdit} className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 active:scale-[0.98] transition-all font-medium flex items-center justify-center space-x-2">
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </Modal>
      )}

      {/* ===== START NOW CONFIRMATION ===== */}
      {startingOp && (
        <Modal onClose={() => setStartingOp(null)}>
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Play className="w-7 h-7 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Start Operation Now?</h3>
            <p className="text-sm text-gray-500 mt-1">
              This will move <strong>{startingOp.title}</strong> to active operations.
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-sm text-gray-600 space-y-1">
            <p><span className="font-medium text-gray-700">Field:</span> {startingOp.field}</p>
            <p><span className="font-medium text-gray-700">Scheduled:</span> {startingOp.startDate}</p>
            <p><span className="font-medium text-gray-700">Workers:</span> {startingOp.workers}</p>
            <p><span className="font-medium text-gray-700">Est. Duration:</span> {startingOp.estimatedDuration}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStartingOp(null)} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 active:scale-[0.98] transition-all font-medium">
              Not Yet
            </button>
            <button onClick={() => handleStartNow(startingOp)} className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 active:scale-[0.98] transition-all font-medium flex items-center justify-center space-x-2">
              <Play className="w-4 h-4" />
              <span>Start Now</span>
            </button>
          </div>
        </Modal>
      )}

      {/* Fields Overview */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Farm Fields Overview</h3>
          <button className="text-sm text-green-600 hover:text-green-700">View Map</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {fields.map((field) => (
            <div key={field.id} className="border border-gray-200 rounded-lg p-4 hover:border-green-500 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold">{field.name}</h4>
                <span className={`text-xs px-2 py-1 rounded ${
                  field.status === 'growing' ? 'bg-green-100 text-green-700' :
                  field.status === 'harvesting' ? 'bg-orange-100 text-orange-700' :
                  field.status === 'preparing' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {field.status}
                </span>
              </div>
              <p className="text-sm text-gray-600">Crop: {field.crop}</p>
              <p className="text-sm text-gray-600">Area: {field.area} acres</p>
            </div>
          ))}
        </div>
      </div>

      {/* Operations Tabs */}
      <div className="bg-white rounded-lg shadow p-2 flex space-x-2">
        <button onClick={() => setActiveTab('active')}
          className={`flex-1 py-2 px-4 rounded-md transition-colors ${activeTab === 'active' ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
          Active ({activeOperations.length})
        </button>
        <button onClick={() => setActiveTab('planned')}
          className={`flex-1 py-2 px-4 rounded-md transition-colors ${activeTab === 'planned' ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
          Planned ({plannedOperations.length})
        </button>
        <button onClick={() => setActiveTab('completed')}
          className={`flex-1 py-2 px-4 rounded-md transition-colors ${activeTab === 'completed' ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
          Completed ({completedOperations.length})
        </button>
      </div>

      {/* Active Operations */}
      {activeTab === 'active' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Active Farm Operations</h3>
            <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 active:scale-[0.98] transition-all flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>New Operation</span>
            </button>
          </div>
          {activeOperations.length === 0 && (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No Active Operations</h3>
              <p className="text-sm text-gray-500">Start a planned operation or create a new one.</p>
            </div>
          )}
          {activeOperations.map((operation) => (
            <div key={operation.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex flex-col md:flex-row md:items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="text-lg font-semibold">{operation.title}</h4>
                    <PriorityBadge priority={operation.priority} />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                    <div className="flex items-center text-gray-600">
                      <MapPin className="w-4 h-4 mr-2" /><span>{operation.field}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Calendar className="w-4 h-4 mr-2" /><span>{operation.startDate}</span>
                    </div>
                    <div className="text-gray-600">Workers: {operation.workers}</div>
                    <div className="text-gray-600">Equipment: {operation.equipment}</div>
                  </div>
                  <div className="mb-2">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Progress ({getProgressColor(operation.progress).label})</span>
                      <span className={`font-semibold ${getProgressColor(operation.progress).text}`}>{operation.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className={`${getProgressColor(operation.progress).bar} h-2 rounded-full transition-all duration-500`} style={{ width: `${operation.progress}%` }} />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">{operation.notes}</p>
                </div>
                <div className="mt-4 md:mt-0 md:ml-4 flex space-x-2">
                  <button
                    onClick={() => { setUpdatingOp(operation); setUpdateTasks(getDefaultTasks(operation)); }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-green-400 active:scale-[0.98] transition-all font-medium text-sm"
                  >
                    Update
                  </button>
                  <button
                    onClick={() => setCompletingOp(operation)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 active:scale-[0.98] transition-all font-medium text-sm"
                  >
                    Complete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Planned Operations */}
      {activeTab === 'planned' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Planned Operations</h3>
            <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 active:scale-[0.98] transition-all flex items-center space-x-2">
              <Plus className="w-4 h-4" /><span>Schedule Operation</span>
            </button>
          </div>
          {plannedOperations.length === 0 && (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No Planned Operations</h3>
              <p className="text-sm text-gray-500">All planned operations have been started.</p>
            </div>
          )}
          {plannedOperations.map((operation) => (
            <div key={operation.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex flex-col md:flex-row md:items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <Clock className="w-5 h-5 text-blue-500" />
                    <h4 className="text-lg font-semibold">{operation.title}</h4>
                    <PriorityBadge priority={operation.priority} />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center text-gray-600">
                      <MapPin className="w-4 h-4 mr-2" /><span>{operation.field}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Calendar className="w-4 h-4 mr-2" /><span>{operation.startDate}</span>
                    </div>
                    <div className="text-gray-600">Duration: {operation.estimatedDuration}</div>
                    <div className="text-gray-600">Workers needed: {operation.workers}</div>
                  </div>
                </div>
                <div className="mt-4 md:mt-0 md:ml-4 flex space-x-2">
                  <button
                    onClick={() => { setEditingOp(operation); setEditForm({ ...operation }); }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-orange-400 active:scale-[0.98] transition-all font-medium text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setStartingOp(operation)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 active:scale-[0.98] transition-all font-medium text-sm"
                  >
                    Start Now
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Completed Operations */}
      {activeTab === 'completed' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Completed Operations</h3>
          {completedOperations.map((operation) => (
            <div key={operation.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex flex-col md:flex-row md:items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <h4 className="text-lg font-semibold">{operation.title}</h4>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-2">
                    <div className="flex items-center text-gray-600">
                      <MapPin className="w-4 h-4 mr-2" /><span>{operation.field}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Calendar className="w-4 h-4 mr-2" /><span>{operation.completedDate}</span>
                    </div>
                    <div className="text-gray-600">Duration: {operation.duration}</div>
                    <div className="text-gray-600">Workers: {operation.workers}</div>
                  </div>
                  <p className="text-sm text-gray-600">{operation.notes}</p>
                </div>
                <button
                  onClick={() => setViewingCompleted(operation)}
                  className="mt-4 md:mt-0 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-green-400 active:scale-[0.98] transition-all font-medium text-sm flex items-center space-x-1.5"
                >
                  <Eye className="w-4 h-4" />
                  <span>View Details</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ========== Sub-components ==========

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
          <X className="w-4 h-4 text-gray-500" />
        </button>
        {children}
      </div>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span className={`text-xs px-2 py-1 rounded font-medium ${
      priority === 'high' ? 'bg-red-100 text-red-700' :
      priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
      'bg-gray-100 text-gray-700'
    }`}>
      {priority} priority
    </span>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start space-x-3">
      <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center shrink-0">{icon}</div>
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
        <p className="font-medium text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function TaskIcon({ iconName, completed }: { iconName: 'sprout' | 'tractor' | 'droplets' | 'leaf' | 'scissors' | 'sun'; completed: boolean }) {
  switch (iconName) {
    case 'sprout':
      return completed ? <Sprout className="w-5 h-5 text-green-600" /> : <Sprout className="w-5 h-5 text-gray-500" />;
    case 'tractor':
      return completed ? <Tractor className="w-5 h-5 text-green-600" /> : <Tractor className="w-5 h-5 text-gray-500" />;
    case 'droplets':
      return completed ? <Droplets className="w-5 h-5 text-green-600" /> : <Droplets className="w-5 h-5 text-gray-500" />;
    case 'leaf':
      return completed ? <Leaf className="w-5 h-5 text-green-600" /> : <Leaf className="w-5 h-5 text-gray-500" />;
    case 'scissors':
      return completed ? <Scissors className="w-5 h-5 text-green-600" /> : <Scissors className="w-5 h-5 text-gray-500" />;
    case 'sun':
      return completed ? <Sun className="w-5 h-5 text-green-600" /> : <Sun className="w-5 h-5 text-gray-500" />;
    default:
      return <></>;
  }
}