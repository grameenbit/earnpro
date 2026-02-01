import React, { useEffect, useState } from 'react';
import { UserProfile, AppConfig, Withdrawal } from '../types';
import { collection, query, where, onSnapshot, updateDoc, doc, increment, addDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

interface WalletProps {
  user: UserProfile;
  config: AppConfig;
}

const Wallet: React.FC<WalletProps> = ({ user, config }) => {
  const [history, setHistory] = useState<Withdrawal[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  
  // Form inputs
  const [method, setMethod] = useState('Bkash');
  const [amount, setAmount] = useState<string>('');
  const [number, setNumber] = useState('');

  useEffect(() => {
    // FIX: Removed orderBy and limit from the query to prevent "Index Required" error.
    // We now fetch all user withdrawals and sort/slice in memory.
    const q = query(
        collection(db, "withdrawals"), 
        where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
        const list: Withdrawal[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() } as Withdrawal));
        
        // Client-side sort (Newest first)
        list.sort((a, b) => {
            const dateA = a.date?.seconds || 0;
            const dateB = b.date?.seconds || 0;
            return dateB - dateA;
        });

        // Client-side limit (Top 10)
        setHistory(list.slice(0, 10));
        setLoadingHistory(false);
    }, (error) => {
        console.error("Wallet history error:", error);
        setLoadingHistory(false);
    });

    return () => unsubscribe();
  }, [user.uid]);

  const handleConvert = async () => {
    if (user.points < config.pointRate) return alert(`You need at least ${config.pointRate} points!`);
    const taka = Math.floor(user.points / config.pointRate);
    const usedPoints = taka * config.pointRate;
    
    try {
        await updateDoc(doc(db, "users", user.uid), { points: increment(-usedPoints), balance: increment(taka) });
        alert(`Conversion Successful: $${taka}`);
    } catch (e) {
        alert("Conversion failed");
    }
  };

  const handleWithdraw = async () => {
    const amtVal = Number(amount);
    if (!amount || amtVal < config.minWithdraw) return alert(`Minimum withdrawal is $${config.minWithdraw}`);
    if (!number) return alert("Please enter account details");
    if (user.balance < amtVal) return alert("Insufficient balance");

    try {
        await updateDoc(doc(db, "users", user.uid), { balance: increment(-amtVal) });
        await addDoc(collection(db, "withdrawals"), { 
            userId: user.uid, 
            amount: amtVal, 
            number: number, 
            method: method, 
            status: 'pending', 
            date: new Date(), 
            accountType: 'Personal' 
        });
        alert("Withdrawal request sent successfully!");
        setAmount('');
        setNumber('');
    } catch (e) {
        alert("Withdrawal failed");
    }
  };

  return (
    <div className="px-5 space-y-6 pt-4">
        {/* Converter Card */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 text-center border-t-4 border-green-500 shadow-lg">
            <h3 className="text-gray-500 dark:text-gray-400 text-sm mb-1">Convert Points</h3>
            <p className="text-xs text-green-500 font-bold mb-4">{config.pointRate} Points = $1</p>
            <button onClick={handleConvert} className="w-full bg-gray-900 dark:bg-white text-white dark:text-black py-3 rounded-xl font-bold shadow-lg hover:opacity-90 transition">
                Convert to Balance
            </button>
        </div>

        {/* Withdraw Form */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-lg">
            <h3 className="font-bold text-gray-800 dark:text-white mb-4 pb-2 border-b border-gray-100 dark:border-gray-700">Withdraw Money</h3>
            <div className="space-y-3">
                <select value={method} onChange={(e) => setMethod(e.target.value)} className="w-full p-3 rounded-xl bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 outline-none text-sm font-medium">
                    <option value="Bkash">bKash</option>
                    <option value="Nagad">Nagad</option>
                    <option value="Mobile Recharge">Mobile Recharge</option>
                    <option value="Crypto">USDT (TRC20)</option>
                </select>
                <input 
                    type="number" 
                    value={amount} 
                    onChange={(e) => setAmount(e.target.value)} 
                    placeholder="Amount ($)" 
                    className="w-full p-3 rounded-xl bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 outline-none transition focus:ring-2 focus:ring-indigo-500" 
                />
                <input 
                    type="text" 
                    value={number} 
                    onChange={(e) => setNumber(e.target.value)} 
                    placeholder="Account Number / ID" 
                    className="w-full p-3 rounded-xl bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 outline-none transition focus:ring-2 focus:ring-indigo-500" 
                />
                <button onClick={handleWithdraw} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 transition">
                    Withdraw
                </button>
            </div>
        </div>

        {/* History */}
        <div>
            <h3 className="font-bold text-gray-800 dark:text-white mb-3">Recent Withdrawals</h3>
            <div className="space-y-2">
                {loadingHistory && <div className="text-center text-xs text-gray-400 py-4">Loading history...</div>}
                {!loadingHistory && history.length === 0 && <div className="text-center text-xs text-gray-400 py-4">No withdrawals yet</div>}
                
                {history.map((item, index) => {
                    // Normalize status for display (Case Insensitive Check)
                    const status = item.status ? item.status.toLowerCase() : 'pending';
                    let statusColor = 'bg-yellow-100 text-yellow-600';
                    if (status === 'approved') statusColor = 'bg-green-100 text-green-600';
                    if (status === 'rejected') statusColor = 'bg-red-100 text-red-600';

                    return (
                        <div key={item.id || index} className="bg-white dark:bg-gray-800 p-3 rounded-xl flex justify-between items-center shadow-sm">
                            <div>
                                <p className="font-bold text-sm text-gray-800 dark:text-gray-200">{item.method} - ${item.amount}</p>
                                <p className="text-[10px] text-gray-400">{item.date ? new Date(item.date.seconds * 1000).toLocaleDateString() : 'Date N/A'}</p>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-1 rounded capitalize ${statusColor}`}>
                                {status}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    </div>
  );
};

export default Wallet; 
