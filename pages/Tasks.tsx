
import React, { useEffect, useState } from 'react';
import { Task, UserProfile } from '../types';
import { collection, query, where, getDocs, updateDoc, doc, increment } from 'firebase/firestore';
import { db } from '../services/firebase';

interface TasksProps {
  user: UserProfile;
}

const Tasks: React.FC<TasksProps> = ({ user }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTasks = async () => {
        const q = query(collection(db, "tasks"), where("status", "==", "active"));
        const snap = await getDocs(q);
        const list: Task[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() } as Task));
        setTasks(list);
        setLoading(false);
    };
    fetchTasks();
  }, []);

  const handleStartTask = async (task: Task) => {
    // 1. Open Link
    window.open(task.link, '_blank');
    
    // 2. Reward immediately (Timer logic removed as requested)
    try {
        await updateDoc(doc(db, "users", user.uid), { points: increment(task.reward) });
        alert(`Task Completed! ${task.reward} points added.`);
    } catch (e) {
        console.error(e);
        alert("Error updating balance. Please contact support.");
    }
  };

  return (
    <div className="px-5 pt-4 space-y-4">
        <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-xl text-gray-800 dark:text-white">Daily Surveys</h3>
            <span className="text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 px-3 py-1 rounded-full font-bold">
                {tasks.length} Available
            </span>
        </div>

        <div className="space-y-3">
            {loading && <div className="text-center text-gray-400 py-4">Loading tasks...</div>}
            {!loading && tasks.length === 0 && <div className="text-center text-gray-400 py-4">No tasks available right now</div>}
            
            {tasks.map(t => (
                <div key={t.id} className="bg-white dark:bg-gray-800 rounded-2xl p-4 flex justify-between items-center shadow-sm">
                    <div>
                        <h4 className="font-bold text-gray-800 dark:text-gray-200 text-sm">{t.title}</h4>
                        <p className="text-[10px] text-gray-500 truncate w-48">{t.description}</p>
                        <div className="flex gap-2 mt-1">
                            <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded font-bold">{t.reward} Pts</span>
                            <span className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded font-bold"><i className="fas fa-bolt"></i> Instant</span>
                        </div>
                    </div>
                    <button onClick={() => handleStartTask(t)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-md active:scale-95 transition hover:bg-indigo-700">
                        Start
                    </button>
                </div>
            ))}
        </div>
    </div>
  );
};

export default Tasks;
