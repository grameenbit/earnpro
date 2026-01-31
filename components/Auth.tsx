import React, { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, updateDoc, increment, getDocs, query, collection, where } from 'firebase/firestore';
import { auth, db } from '../services/firebase';

const Auth: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    
    // Form State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [refCode, setRefCode] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error: any) {
            alert("Login Error: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !email || !password) return alert("Please fill all fields");
        
        setLoading(true);
        try {
            const res = await createUserWithEmailAndPassword(auth, email, password);
            const myRefCode = Math.floor(100000 + Math.random() * 900000).toString();
            const today = new Date().toDateString();
            
            await setDoc(doc(db, "users", res.user.uid), {
                name, email, points: 0, balance: 0, status: 'active', 
                createdAt: new Date(), myRefCode, lastCheckIn: null,
                dailyAdsWatched: 0, dailySpinsUsed: 0, lastAdDate: today
            });

            if (refCode.trim()) {
                const q = query(collection(db, "users"), where("myRefCode", "==", refCode.trim()));
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    const referrerDoc = querySnapshot.docs[0];
                    await updateDoc(doc(db, "users", referrerDoc.id), { points: increment(100) }); // Default 100, updated by config later
                }
            }
        } catch (error: any) {
            alert("Registration Error: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 flex flex-col justify-center p-6 min-h-screen">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-3xl shadow-2xl animate-fade-in-up">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-tr from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg animate-bounce-slow">
                        <i className="fas fa-bolt text-white"></i>
                    </div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">EarnPro BD</h1>
                    <p className="text-gray-300 text-sm mt-2">Earn money easily</p>
                </div>

                {isLogin ? (
                    <form onSubmit={handleLogin} className="space-y-4">
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email Address" className="w-full p-4 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 outline-none focus:ring-2 focus:ring-indigo-500 transition" />
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full p-4 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 outline-none focus:ring-2 focus:ring-indigo-500 transition" />
                        <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-xl font-bold shadow-lg hover:shadow-indigo-500/30 transition transform active:scale-95 disabled:opacity-50">
                            {loading ? 'Processing...' : 'Login Now'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleRegister} className="space-y-3">
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your Name" className="w-full p-4 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 outline-none focus:ring-2 focus:ring-indigo-500 transition" />
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email Address" className="w-full p-4 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 outline-none focus:ring-2 focus:ring-indigo-500 transition" />
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create Password" className="w-full p-4 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 outline-none focus:ring-2 focus:ring-indigo-500 transition" />
                        <input type="text" value={refCode} onChange={(e) => setRefCode(e.target.value)} placeholder="Referral Code (Optional)" className="w-full p-4 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 outline-none focus:ring-2 focus:ring-green-500 transition" />
                        <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 rounded-xl font-bold shadow-lg hover:shadow-green-500/30 transition transform active:scale-95 disabled:opacity-50">
                             {loading ? 'Processing...' : 'Register Now'}
                        </button>
                    </form>
                )}

                <p className="text-center mt-6 text-gray-300 text-sm">
                    {isLogin ? "New here? " : "Already have an account? "}
                    <span onClick={() => setIsLogin(!isLogin)} className="text-white font-bold cursor-pointer hover:underline">
                        {isLogin ? "Create Account" : "Login"}
                    </span>
                </p>
            </div>
        </div>
    );
};

export default Auth;