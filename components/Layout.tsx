import React, { useState } from 'react';
import { UserProfile } from '../types';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebase';

interface LayoutProps {
  children: React.ReactNode;
  user: UserProfile | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  notificationsCount: number;
  openNotifications: () => void;
  openProfile: () => void;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, user, activeTab, setActiveTab, isDarkMode, toggleTheme, notificationsCount, openNotifications, openProfile 
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    signOut(auth).then(() => window.location.reload());
  };

  const openWhatsApp = () => {
    window.open("https://api.whatsapp.com/send/?phone=8801607205462&text&type=phone_number&app_absent=0&wame_ctl=1", "_blank");
  };

  return (
    <div className={`min-h-screen max-w-[480px] mx-auto relative overflow-hidden transition-colors duration-300 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      
      {/* Sidebar Overlay */}
      <div 
        className={`fixed inset-0 bg-black/60 z-50 transition-opacity duration-300 ${sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setSidebarOpen(false)}
      ></div>

      {/* Sidebar */}
      <div className={`fixed top-0 left-0 h-full w-[280px] z-[60] bg-white dark:bg-gray-800 shadow-2xl transition-transform duration-300 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-500 to-indigo-700 opacity-10"></div>
            <div className="w-20 h-20 bg-gradient-to-tr from-indigo-500 to-purple-500 text-white rounded-2xl flex items-center justify-center text-3xl mb-4 shadow-xl mx-auto z-10">
              <i className="fas fa-user-astronaut"></i>
            </div>
            <h2 className="font-bold text-xl z-10 relative">{user?.name || 'User'}</h2>
            <p className="text-xs opacity-60 z-10 relative mt-1">{user?.email}</p>
        </div>
        
        <div className="p-4 space-y-2 flex-1 overflow-y-auto">
             <button onClick={() => { setActiveTab('home'); setSidebarOpen(false); }} className="w-full text-left p-4 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-4 font-medium transition">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 flex items-center justify-center"><i className="fas fa-home text-sm"></i></div>Home
            </button>
            <button onClick={() => { setActiveTab('marketplace'); setSidebarOpen(false); }} className="w-full text-left p-4 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-4 font-medium transition">
                <div className="w-8 h-8 rounded-lg bg-pink-100 dark:bg-pink-900 text-pink-600 dark:text-pink-400 flex items-center justify-center"><i className="fas fa-store text-sm"></i></div>Marketplace
            </button>
            <button onClick={() => { setActiveTab('wallet'); setSidebarOpen(false); }} className="w-full text-left p-4 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-4 font-medium transition">
                <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 flex items-center justify-center"><i className="fas fa-wallet text-sm"></i></div>Wallet
            </button>
            <button onClick={() => { openProfile(); setSidebarOpen(false); }} className="w-full text-left p-4 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-4 font-medium transition">
                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 flex items-center justify-center"><i className="fas fa-cog text-sm"></i></div>Settings
            </button>
            
            <div className="border-t my-2 border-gray-200 dark:border-gray-700"></div>

            <button onClick={openWhatsApp} className="w-full text-left p-4 rounded-xl bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40 flex items-center gap-4 font-medium transition">
                <div className="w-8 h-8 rounded-lg bg-green-500 text-white flex items-center justify-center"><i className="fab fa-whatsapp text-lg"></i></div>
                <div>
                    <div className="text-sm font-bold text-gray-800 dark:text-gray-200">Contact Support</div>
                    <div className="text-[10px] text-gray-500">Chat on WhatsApp</div>
                </div>
            </button>

            <button onClick={handleLogout} className="w-full text-left p-4 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-4 text-red-500 font-medium transition">
              <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 flex items-center justify-center"><i className="fas fa-sign-out-alt text-sm"></i></div>Logout
            </button>
        </div>
      </div>

      {/* Header */}
      <header className="glass-header p-4 flex justify-between items-center sticky top-0 z-30 text-white shadow-lg">
          <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(true)} className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-full hover:bg-white/20 transition">
                <i className="fas fa-bars text-lg"></i>
              </button>
              <div>
                <p className="text-xs opacity-80">Welcome back,</p>
                <h2 className="font-bold text-lg leading-tight">{user?.name?.split(' ')[0]}</h2>
              </div>
          </div>
          <div className="flex gap-3 items-center">
              <button onClick={toggleTheme} className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-full hover:bg-white/20 transition text-white">
                <i className={`fas ${isDarkMode ? 'fa-sun' : 'fa-moon'}`}></i>
              </button>
              <button onClick={openNotifications} className="relative w-10 h-10 flex items-center justify-center bg-white/10 rounded-full hover:bg-white/20 transition">
                <i className="fas fa-bell"></i>
                {notificationsCount > 0 && (
                  <>
                    <span className="absolute top-2 right-2 bg-red-500 text-[9px] w-2 h-2 rounded-full animate-ping"></span>
                    <span className="absolute top-2 right-2 bg-red-500 text-[9px] w-2 h-2 rounded-full"></span>
                  </>
                )}
              </button>
          </div>
      </header>

      {/* Main Content */}
      <div className="pb-24">
        {children}
      </div>

      {/* Bottom Nav */}
      <nav className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 fixed bottom-0 w-full max-w-[480px] flex justify-around padding-safe pb-6 pt-3 z-40 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
          <button 
            onClick={() => setActiveTab('home')} 
            className={`flex flex-col items-center text-[11px] transition duration-300 ${activeTab === 'home' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-gray-400'}`}
          >
            <i className={`fas fa-home text-xl mb-1 ${activeTab === 'home' ? '-translate-y-1' : ''} transition-transform`}></i>
            Home
          </button>
          <button 
            onClick={() => setActiveTab('marketplace')} 
            className={`flex flex-col items-center text-[11px] transition duration-300 ${activeTab === 'marketplace' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-gray-400'}`}
          >
            <i className={`fas fa-store text-xl mb-1 ${activeTab === 'marketplace' ? '-translate-y-1' : ''} transition-transform`}></i>
            Shop
          </button>
          <button 
            onClick={() => setActiveTab('tasks')} 
            className={`flex flex-col items-center text-[11px] transition duration-300 ${activeTab === 'tasks' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-gray-400'}`}
          >
            <i className={`fas fa-th-list text-xl mb-1 ${activeTab === 'tasks' ? '-translate-y-1' : ''} transition-transform`}></i>
            Tasks
          </button>
          <button 
            onClick={() => setActiveTab('wallet')} 
            className={`flex flex-col items-center text-[11px] transition duration-300 ${activeTab === 'wallet' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-gray-400'}`}
          >
            <i className={`fas fa-wallet text-xl mb-1 ${activeTab === 'wallet' ? '-translate-y-1' : ''} transition-transform`}></i>
            Wallet
          </button>
      </nav>
    </div>
  );
};

export default Layout;