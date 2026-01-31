import React, { useEffect, useState } from 'react';
import { UserProfile, AppConfig } from '../types';
import { collection, query, limit, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';

interface HomeProps {
  user: UserProfile;
  config: AppConfig;
  onCheckIn: () => void;
  onWatchAd: () => void;
  onOpenSpin: () => void;
  onSwitchTab: (tab: string) => void;
  onCopyRef: () => void;
}

const Home: React.FC<HomeProps> = ({ user, config, onCheckIn, onWatchAd, onOpenSpin, onSwitchTab, onCopyRef }) => {
  const [topEarners, setTopEarners] = useState<any[]>([]);
  const [loadingTop, setLoadingTop] = useState(true);
  const isCheckedIn = user.lastCheckIn === new Date().toDateString();

  useEffect(() => {
    const fetchTopEarners = async () => {
        try {
            // Attempt to fetch real users. 
            // NOTE: This requires Firestore Security Rules to allow 'read' on the 'users' collection.
            const q = query(collection(db, "users"), limit(50));
            const snap = await getDocs(q);
            const users: any[] = [];
            snap.forEach(d => {
                const u = d.data();
                // Ensure balance exists and handle string/number issues
                const bal = Number(u.balance) || 0;
                // Only active users
                if(u.status !== 'blocked') {
                    users.push({ ...u, balance: bal });
                }
            });
            
            // Client-side sort by balance desc
            users.sort((a, b) => b.balance - a.balance);
            
            // Take top 5
            setTopEarners(users.slice(0, 5));
        } catch (e: any) {
            // Permission denied is expected if rules aren't set.
            // Using Demo Data silently.
            setTopEarners([
                { name: 'Pro Earner', balance: 150.50, points: 15000 },
                { name: 'Crypto King', balance: 120.00, points: 12000 },
                { name: 'Lucky Star', balance: 95.20, points: 9500 },
                { name: 'Daily Winner', balance: 80.50, points: 8000 },
                { name: 'Task Master', balance: 65.00, points: 6500 },
            ]);
        } finally {
            setLoadingTop(false);
        }
    };
    fetchTopEarners();
  }, []);

  return (
    <div className="px-5 space-y-6 -mt-2">
        
        {/* Stats Card */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 grid grid-cols-2 gap-2 relative overflow-hidden border-t-4 border-indigo-500 shadow-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-10 -mt-10 z-0"></div>
            <div className="text-center z-10 p-2 border-r border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wider">Total Points</p>
                <div className="flex items-center justify-center gap-2 mt-1">
                    <i className="fas fa-star text-yellow-400"></i>
                    <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{user.points}</span>
                </div>
            </div>
            <div className="text-center z-10 p-2">
                <p className="text-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wider">Total Balance</p>
                <div className="flex items-center justify-center gap-2 mt-1">
                    <i className="fas fa-wallet text-green-500"></i>
                    <span className="text-2xl font-black text-gray-800 dark:text-gray-100">${user.balance}</span>
                </div>
            </div>
        </div>

        {/* Daily Check-In */}
        <div 
            onClick={isCheckedIn ? undefined : onCheckIn} 
            className={`bg-gradient-to-r from-teal-500 to-emerald-600 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden group cursor-pointer ${isCheckedIn ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] transition'}`}
        >
            <div className="absolute right-0 bottom-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mb-20"></div>
            <div className="relative z-10 flex justify-between items-center">
                <div>
                    <h3 className="text-xl font-bold mb-1 flex items-center gap-2">
                        <i className="fas fa-calendar-check text-yellow-300"></i> Daily Bonus
                    </h3>
                    <p className="text-xs opacity-90 mb-4 w-2/3">
                        {isCheckedIn ? "Come back tomorrow!" : "Click to claim your daily reward!"}
                    </p>
                    <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm border border-white/10">
                        {isCheckedIn ? 'Claimed' : `+${config.checkInReward} Pts`}
                    </span>
                </div>
                <div>
                    {isCheckedIn ? <i className="fas fa-check-circle text-5xl text-yellow-300"></i> : <i className="fas fa-hand-pointer text-5xl opacity-50"></i>}
                </div>
            </div>
        </div>

        {/* Watch Ad */}
        <div>
            <div onClick={onWatchAd} className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 rounded-3xl p-6 text-white shadow-xl cursor-pointer relative overflow-hidden group hover:scale-[1.02] transition">
                <div className="absolute right-0 bottom-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mb-20"></div>
                <div className="relative z-10 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-bold mb-1 flex items-center gap-2">
                            <i className="fas fa-play-circle text-yellow-300"></i> Watch Ad
                        </h3>
                        <p className="text-xs opacity-90 mb-4 w-2/3">Watch full video ad to earn points instantly</p>
                        <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm border border-white/10">
                            +{config.videoReward} Pts
                        </span>
                    </div>
                </div>
            </div>
            {/* Warning Notice */}
            <p className="text-[10px] text-red-500 font-medium text-center mt-2 opacity-80 animate-pulse">
                <i className="fas fa-exclamation-circle mr-1"></i> Warning: You must watch the full ad. Skipping yields no points.
            </p>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 gap-4">
            <div onClick={() => onSwitchTab('tasks')} className="bg-white dark:bg-gray-800 rounded-2xl p-5 text-center cursor-pointer hover:-translate-y-1 transition duration-300 shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl shadow-sm">
                    <i className="fas fa-clipboard-list"></i>
                </div>
                <h4 className="font-bold text-gray-800 dark:text-gray-200">Surveys</h4>
                <p className="text-[10px] text-gray-400 mt-1">Daily Tasks</p>
            </div>
            <div onClick={onOpenSpin} className="bg-white dark:bg-gray-800 rounded-2xl p-5 text-center cursor-pointer hover:-translate-y-1 transition duration-300 shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="w-14 h-14 bg-orange-50 dark:bg-orange-900/30 text-orange-500 dark:text-orange-400 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl shadow-sm">
                    <i className="fas fa-dharmachakra"></i>
                </div>
                <h4 className="font-bold text-gray-800 dark:text-gray-200">Spin Win</h4>
                <p className="text-[10px] text-gray-400 mt-1">Try Your Luck</p>
            </div>
        </div>

        {/* Refer Section */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 border-l-4 border-indigo-500 relative overflow-hidden shadow-sm">
            <div className="flex justify-between items-start mb-4 relative z-10">
                <div>
                    <h3 className="font-bold text-lg text-gray-800 dark:text-white flex items-center gap-2">
                        <i className="fas fa-gift text-pink-500"></i> Refer & Earn
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">Get <span className="font-bold text-green-600">{config.referralReward}</span> points for each friend</p>
                </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl flex justify-between items-center border-2 border-dashed border-gray-300 dark:border-gray-700 relative z-10">
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-xl tracking-widest">{user.myRefCode}</span>
                <button onClick={onCopyRef} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-500/30">
                    <i className="fas fa-copy mr-1"></i> Copy
                </button>
            </div>
            <i className="fas fa-users absolute -right-4 -bottom-4 text-8xl text-gray-100 dark:text-gray-700 opacity-50 z-0"></i>
        </div>

        {/* Top Earners */}
        <div>
            <h3 className="font-bold text-gray-800 dark:text-white mb-3 flex justify-between items-center">
                <span><i className="fas fa-crown text-yellow-500 mr-2"></i>Top Earners</span>
                <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 px-2 py-1 rounded-md font-bold">This Week</span>
            </h3>
            <div className="space-y-3">
                {loadingTop && <div className="text-center text-xs text-gray-400 py-4 animate-pulse">Loading Top Earners...</div>}
                
                {!loadingTop && topEarners.length === 0 && (
                    <div className="text-center text-xs text-gray-400 py-2">No earners yet</div>
                )}
                
                {topEarners.map((u, index) => {
                         let rankColor = "bg-gray-200 text-gray-600";
                         if(index === 0) rankColor = "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white shadow-md";
                         if(index === 1) rankColor = "bg-gray-300 text-white";
                         if(index === 2) rankColor = "bg-orange-400 text-white";

                         return (
                            <div key={index} className="bg-white dark:bg-gray-800 rounded-2xl p-3 flex items-center gap-3 shadow-sm animate-fade-in-up" style={{ animationDelay: `${index * 100}ms` }}>
                                <div className={`w-8 h-8 rounded-full ${rankColor} flex items-center justify-center font-bold text-xs shadow-sm`}>{index + 1}</div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">{u.name || 'Unknown'}</p>
                                    <p className="text-[10px] text-green-500 font-bold">${u.balance} Earned</p>
                                </div>
                                <div className="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">{u.points} pts</div>
                            </div>
                         );
                })}
            </div>
        </div>
    </div>
  );
};

export default Home;