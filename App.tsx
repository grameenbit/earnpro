import React, { useEffect, useState, useRef } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, updateDoc, increment, query, collection, orderBy, limit } from 'firebase/firestore';
import { auth, db } from './services/firebase';
import { UserProfile, AppConfig, Notification } from './types';
import { AdManager } from './services/adManager';

// Components
import Auth from './components/Auth';
import Layout from './components/Layout';
import Home from './pages/Home';
import Wallet from './pages/Wallet';
import Tasks from './pages/Tasks';
import Marketplace from './pages/Marketplace';
import SpinWheel from './components/SpinWheel';

const DEFAULT_CONFIG: AppConfig = {
  pointRate: 1000,
  minWithdraw: 5,
  videoReward: 50,
  referralReward: 100,
  checkInReward: 20,
  maxDailyAds: 5,
  maxDailySpins: 3,
  spinValues: [10, 50, 0, 20, 0, 100]
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  
  // UI State
  const [activeTab, setActiveTab] = useState('home');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [spinModalOpen, setSpinModalOpen] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinTargetIndex, setSpinTargetIndex] = useState<number | null>(null);

  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [notifModalOpen, setNotifModalOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // Ad State
  const adManagerRef = useRef<AdManager | null>(null);
  const [isAdShowing, setIsAdShowing] = useState(false); 
  // Status: idle -> loading -> loaded -> playing -> finished
  const [adStatus, setAdStatus] = useState<'idle' | 'loading' | 'loaded' | 'playing' | 'finished'>('idle');
  
  const [lastAdTime, setLastAdTime] = useState(0);

  // Refs for Ad Container
  const videoRef = useRef<HTMLVideoElement>(null);
  const adContainerRef = useRef<HTMLDivElement>(null);

  // Initialize App
  useEffect(() => {
    // Theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.body.classList.add('dark');
    }

    // Config - Realtime
    const unsubConfig = onSnapshot(doc(db, "settings", "config"), (docSnap) => {
        if (docSnap.exists()) {
            setConfig({ ...DEFAULT_CONFIG, ...docSnap.data() });
        }
    }, (error) => {
        console.warn("Config sync failed:", error);
    });

    // Auth Listener
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        // Real-time user updates
        onSnapshot(doc(db, "users", user.uid), (docSnap) => {
          if (docSnap.exists()) {
             const data = docSnap.data() as UserProfile;
             setUserProfile({ ...data, uid: user.uid });
             
             // Check Ad Dates
             const today = new Date().toDateString();
             if (data.lastAdDate !== today) {
                updateDoc(doc(db, "users", user.uid), {
                    dailyAdsWatched: 0,
                    dailySpinsUsed: 0,
                    lastAdDate: today
                });
             }
          }
        }, (error) => {
             console.error("User sync error:", error);
        });

        // Notifications
        const notifQ = query(collection(db, "notifications"), orderBy("date", "desc"), limit(10));
        onSnapshot(notifQ, (snap) => {
             const list: Notification[] = [];
             snap.forEach(d => {
                 const n = d.data() as Notification;
                 if(n.target === 'ALL' || n.target === user.uid) list.push(n);
             });
             setNotifications(list);
        }, (error) => {
            console.warn("Notification sync failed:", error);
        });

      } else {
        setCurrentUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => {
        unsubscribe();
        unsubConfig();
    };
  }, []);

  // Initialize Ad Manager when refs are ready and loading is done
  useEffect(() => {
    if (!loading && videoRef.current && adContainerRef.current && !adManagerRef.current) {
        adManagerRef.current = new AdManager(videoRef.current, adContainerRef.current);
    }
  }, [loading]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    if (!isDarkMode) {
      document.body.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleWatchAd = () => {
    if (!userProfile) return;
    if (userProfile.dailyAdsWatched >= config.maxDailyAds) return alert("Daily limit reached!");
    if (Date.now() - lastAdTime < 5000) return alert("Please wait a few seconds.");

    triggerAd('watch');
  };

  const handleSpinClick = () => {
    if (!userProfile) return;
    if (userProfile.dailySpinsUsed >= config.maxDailySpins) return alert("Daily spin limit reached!");
    if (Date.now() - lastAdTime < 5000) return alert("Please wait a few seconds.");
    
    setSpinModalOpen(true);
  };

  const triggerSpinAd = () => {
      triggerAd('spin');
  };

  const triggerAd = (action: 'watch' | 'spin') => {
      let manager = adManagerRef.current;

      if (!manager) {
           if (videoRef.current && adContainerRef.current) {
               manager = new AdManager(videoRef.current, adContainerRef.current);
               adManagerRef.current = manager;
           } else {
               alert("Ad system loading, please try again in a moment.");
               return;
           }
      }
      proceedAdTrigger(manager, action);
  };

  const proceedAdTrigger = (manager: AdManager, action: 'watch' | 'spin') => {
      // 1. Initialize logic
      manager.initializeForUserAction();
      setIsAdShowing(true);
      setAdStatus('loading'); // Step 1: Ad Loading
      
      setTimeout(() => {
          manager.requestAd(
              // Success Callback (Ad Finished)
              async () => {
                  setAdStatus('finished'); // Step 4: Ad Finished
                  // Wait a bit so user sees "Finished"
                  setTimeout(() => {
                      setIsAdShowing(false);
                      setAdStatus('idle');
                      setLastAdTime(Date.now());
                      completeAdAction(action);
                  }, 1500);
              },
              // Error Callback
              () => {
                  setIsAdShowing(false);
                  setAdStatus('idle');
                  setLastAdTime(Date.now());
                  alert("Ad skipped or failed. No reward.");
              },
              // Start Callback (Ad Playing)
              () => {
                  setAdStatus('playing'); // Step 3: Ad Playing (Hide text)
              },
              // Loaded Callback (Ad Ready)
              () => {
                  setAdStatus('loaded'); // Step 2: Ad Loaded
              }
          );
      }, 100); // Increased timeout slightly to ensure CSS transition has started
  };

  const completeAdAction = async (action: 'watch' | 'spin') => {
      // Use auth.currentUser to ensure we have the ID even if userProfile is stale in closure
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      if (action === 'watch') {
         try {
             await updateDoc(doc(db, "users", uid), {
                points: increment(config.videoReward),
                dailyAdsWatched: increment(1)
             });
             alert(`Earned ${config.videoReward} points!`);
         } catch (e) {
             console.error("Ad reward failed", e);
             alert("Error updating points.");
         }
      } else if (action === 'spin') {
         performSpin();
      }
  };

  const performSpin = () => {
      if(isSpinning) return;
      
      const randIndex = Math.floor(Math.random() * config.spinValues.length);
      setSpinTargetIndex(randIndex);
      setIsSpinning(true);

      setTimeout(async () => {
          setIsSpinning(false);
          const points = config.spinValues[randIndex];
          const uid = auth.currentUser?.uid;
          
          if (uid) {
             try {
                 await updateDoc(doc(db, "users", uid), {
                    points: increment(points),
                    dailySpinsUsed: increment(1)
                 });
                 alert(points > 0 ? `You won ${points} points!` : "Better luck next time!");
             } catch (e) {
                 console.error("Spin reward failed", e);
             }
          }
          setSpinTargetIndex(null);
      }, 4500); 
  };

  const handleDailyCheckIn = async () => {
      if (!userProfile) return;
      const today = new Date().toDateString();
      if (userProfile.lastCheckIn === today) return;
      await updateDoc(doc(db, "users", userProfile.uid), {
          points: increment(config.checkInReward),
          lastCheckIn: today
      });
      alert(`Daily Bonus: +${config.checkInReward}`);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">Loading...</div>;

  if (!currentUser) return <Auth />;

  return (
    <>
        <Layout 
            user={userProfile} 
            activeTab={activeTab} 
            setActiveTab={setActiveTab}
            isDarkMode={isDarkMode}
            toggleTheme={toggleTheme}
            notificationsCount={notifications.length}
            openNotifications={() => setNotifModalOpen(true)}
            openProfile={() => setProfileModalOpen(true)}
        >
            {activeTab === 'home' && userProfile && (
                <Home 
                    user={userProfile} 
                    config={config} 
                    onCheckIn={handleDailyCheckIn}
                    onWatchAd={handleWatchAd}
                    onOpenSpin={handleSpinClick}
                    onSwitchTab={setActiveTab}
                    onCopyRef={() => {
                        navigator.clipboard.writeText(`Join EarnPro and use my code: ${userProfile.myRefCode}`);
                        alert("Copied!");
                    }}
                />
            )}
            {activeTab === 'wallet' && userProfile && <Wallet user={userProfile} config={config} />}
            {activeTab === 'tasks' && userProfile && <Tasks user={userProfile} />}
            {activeTab === 'marketplace' && userProfile && <Marketplace user={userProfile} />}
        </Layout>

        {/* Ad Container - Fullscreen Overlay */}
        {/* CHANGED: Use opacity/visibility instead of display:none to ensure IMA SDK can calculate dimensions during init */}
        <div 
            id="adContainerFull" 
            className={`fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center transition-all duration-300 ${isAdShowing ? 'opacity-100 visible pointer-events-auto' : 'opacity-0 invisible pointer-events-none'}`}
        >
             {/* The container explicitly for IMA SDK */}
            <div ref={adContainerRef} className="absolute inset-0 w-full h-full z-10"></div>
            
            {/* The video element required by IMA SDK */}
            <video ref={videoRef} className="absolute inset-0 w-full h-full object-contain bg-black z-0" playsInline></video>
            
            {/* Status Messages Overlay */}
            {(adStatus === 'loading' || adStatus === 'loaded' || adStatus === 'finished') && (
                <div className="absolute z-20 flex flex-col items-center animate-fade-in-up">
                    <div className="bg-black/60 backdrop-blur-md text-white px-6 py-3 rounded-full font-bold text-lg shadow-xl border border-white/20 flex items-center gap-3">
                        {adStatus === 'loading' && (
                            <>
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                <span>Ad Loading...</span>
                            </>
                        )}
                        {adStatus === 'loaded' && (
                            <>
                                <i className="fas fa-check-circle text-green-400"></i>
                                <span>Ad Loaded!</span>
                            </>
                        )}
                        {adStatus === 'finished' && (
                            <>
                                <i className="fas fa-gift text-yellow-400"></i>
                                <span>Ad Finished! Points Added.</span>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>

        {/* Spin Modal */}
        {spinModalOpen && (
            <SpinWheel 
                onSpin={triggerSpinAd} 
                isSpinning={isSpinning}
                onClose={() => !isSpinning && setSpinModalOpen(false)}
                spinValues={config.spinValues}
                targetIndex={spinTargetIndex}
            />
        )}

        {/* Profile Modal */}
        {profileModalOpen && userProfile && (
            <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-6">
                <div className="bg-white dark:bg-gray-800 p-6 w-full max-w-sm rounded-3xl animate-bounce-in relative">
                    <button onClick={() => setProfileModalOpen(false)} className="absolute top-4 right-4 text-gray-400"><i className="fas fa-times"></i></button>
                    <div className="text-center mb-6">
                        <div className="w-20 h-20 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center text-3xl text-white mx-auto mb-3 shadow-lg"><i className="fas fa-user-astronaut"></i></div>
                        <h2 className="font-bold text-gray-800 dark:text-white text-xl">{userProfile.name}</h2>
                        <p className="text-xs text-gray-500">{userProfile.email}</p>
                    </div>
                    <div className="space-y-2">
                        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl flex justify-between items-center">
                            <span className="text-sm text-gray-500">My Referral Code</span>
                            <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono">{userProfile.myRefCode}</span>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl flex justify-between items-center">
                            <span className="text-sm text-gray-500">Account Status</span>
                            <span className="font-bold text-green-600 text-xs bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-md">Active</span>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Notifications Modal */}
        {notifModalOpen && (
            <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-6">
                <div className="bg-white dark:bg-gray-800 p-6 w-full max-w-sm rounded-3xl animate-bounce-in relative">
                     <button onClick={() => setNotifModalOpen(false)} className="absolute top-4 right-4 text-gray-400"><i className="fas fa-times"></i></button>
                     <h3 className="font-bold text-lg text-gray-800 dark:text-white mb-4">Notifications</h3>
                     <div className="space-y-3 max-h-60 overflow-y-auto">
                         {notifications.length === 0 ? <p className="text-gray-400 text-center text-sm py-4">No notifications</p> : (
                             notifications.map((n, i) => (
                                 <div key={i} className="bg-gray-50 dark:bg-gray-900 p-3 rounded-xl text-xs text-gray-700 dark:text-gray-300 border-l-4 border-indigo-500 mb-2 shadow-sm">
                                     {n.message}
                                 </div>
                             ))
                         )}
                     </div>
                </div>
            </div>
        )}
    </>
  );
};

export default App;