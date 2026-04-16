import React, { useState, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { managerAPI } from '../../api/manager';
import { useSocket } from '../../context/SocketContext';
import { showToast } from '../../components/Toast';
import { AlertCircle, Calendar, Clock, AlignLeft, GripVertical, Loader2, CheckCircle2, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const columnsMap = {
  todo: 'To Do',
  in_progress: 'In Progress',
  under_review: 'Under Review',
  done: 'Completed'
};

const ManagerTasks = () => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();
  const navigate = useNavigate();

  const fetchTasks = useCallback(async () => {
    try {
      const res = await managerAPI.getTasks();
      setTasks(res.data.data || []);
    } catch (e) {
      console.error(e);
      showToast('Failed to load tasks', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => fetchTasks();
    socket.on('task:updated', handleUpdate);
    socket.on('task:status_updated', handleUpdate);
    return () => {
      socket.off('task:updated', handleUpdate);
      socket.off('task:status_updated', handleUpdate);
    }
  }, [socket, fetchTasks]);

  const onDragEnd = async (result: any) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId;
    const task = tasks.find(t => t._id === draggableId);

    // Optimistic UI update
    const previousTasks = [...tasks];
    setTasks(prev => prev.map(t => t._id === draggableId ? { ...t, status: newStatus } : t));

    try {
      await managerAPI.updateTask(draggableId, { status: newStatus });
      if (newStatus === 'under_review') {
        showToast('Moved to Under Review. Awaiting employee report.', 'success');
      }
    } catch (e) {
      setTasks(previousTasks);
      showToast('Failed to move task', 'error');
    }
  };

  const getUrgencyColor = (dateString: string) => {
    if (!dateString) return 'text-muted-foreground';
    const d = new Date(dateString);
    const now = new Date();
    d.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);

    if (d.getTime() < now.getTime()) return 'text-red-500';
    if (d.getTime() === now.getTime()) return 'text-yellow-500';
    return 'text-green-500';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-2xl font-bold font-heading">Team Tasks</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage and assign tasks for all your projects.</p>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pb-8 flex-1 items-start">
          {Object.entries(columnsMap).map(([columnId, columnTitle]) => {
            // Note: Employee uses "completed", original manager used "done" or "completed". We map done or completed to the last column.
            const columnTasks = tasks.filter(t =>
              columnId === 'done' ? (t.status === 'done' || t.status === 'completed') : t.status === columnId
            );

            return (
              <div key={columnId} className="bg-card border border-border rounded-2xl flex flex-col max-h-[80vh]">
                <div className="p-4 border-b border-border flex justify-between items-center bg-muted/30 rounded-t-2xl">
                  <h3 className="font-semibold">{columnTitle}</h3>
                  <span className="bg-background text-xs font-medium px-2 py-0.5 rounded-full border border-border">
                    {columnTasks.length}
                  </span>
                </div>

                <Droppable droppableId={columnId}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`p-3 flex-1 overflow-y-auto custom-scrollbar min-h-[150px] transition-colors ${snapshot.isDraggingOver ? 'bg-muted/50' : ''
                        }`}
                    >
                      {columnTasks.map((task, index) => (
                        <Draggable key={task._id} draggableId={task._id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onClick={() => {
                                if (columnId === 'under_review') {
                                  navigate('/manager/reports', { state: { taskId: task._id } });
                                }
                              }}
                              className={`bg-background border border-border rounded-xl p-4 mb-3 group hover:border-foreground/30 transition-all ${snapshot.isDragging ? 'shadow-lg ring-1 ring-foreground scale-[1.02]' : 'shadow-sm'
                                } ${columnId === 'under_review' ? 'cursor-pointer hover:bg-blue-500/5' : ''}`}
                            >
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <h4 className="font-semibold text-sm line-clamp-2">{task.title}</h4>
                                <GripVertical className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 cursor-grab active:cursor-grabbing" />
                              </div>

                              <p className="text-xs text-muted-foreground mb-3 line-clamp-1 flex items-center gap-1">
                                {task.project?.name || 'No Project'}
                              </p>

                              <div className="flex items-center justify-between mt-auto">
                                <div className="flex items-center gap-2">
                                  {task.assignedTo ? (
                                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold" title={task.assignedTo.fullName}>
                                      {task.assignedTo.fullName?.charAt(0)}
                                    </div>
                                  ) : (
                                    <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-[10px] font-bold">
                                      <User className="w-3 h-3" />
                                    </div>
                                  )}
                                  <div className={`flex items-center gap-1 font-medium text-[10px] ${getUrgencyColor(task.dueDate)}`}>
                                    <Calendar className="w-3 h-3" />
                                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No date'}
                                  </div>
                                </div>
                                <span className={`capitalize px-2 py-0.5 rounded-md text-[10px] font-semibold ${task.priority === 'high' ? 'bg-red-100 dark:bg-red-900/30 text-red-600' :
                                    task.priority === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600' :
                                      'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
                                  }`}>
                                  {task.priority || 'low'}
                                </span>
                              </div>
                              {columnId === 'under_review' && (
                                <div className="mt-3 text-center border-t border-border pt-2">
                                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Click to Review Report</p>
                                </div>
                              )}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
};

export default ManagerTasks;
