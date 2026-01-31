import React, { useEffect, useState } from 'react';
import { UserProfile, AccountListing } from '../types';
import { collection, query, where, onSnapshot, addDoc, runTransaction, doc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';

interface MarketplaceProps {
  user: UserProfile;
}

const Marketplace: React.FC<MarketplaceProps> = ({ user }) => {
  const [tab, setTab] = useState<'buy' | 'sell' | 'my-orders'>('buy');
  const [listings, setListings] = useState<AccountListing[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Sell Form State
  const [sellType, setSellType] = useState<'instagram' | 'gmail'>('instagram');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');

  // Buy Confirm State
  const [selectedItem, setSelectedItem] = useState<AccountListing | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);

  useEffect(() => {
    setLoading(true);
    let q;

    try {
        if (tab === 'buy') {
            // Show APPROVED accounts
            // Note: We filter for "approved" status.
            // Sorting is done client-side to avoid complex index requirements during development.
            q = query(
                collection(db, "accountSales"), 
                where("status", "==", "approved")
            );
        } else if (tab === 'sell') {
            // Show MY listings
            q = query(
                collection(db, "accountSales"), 
                where("userId", "==", user.uid)
            );
        } else {
            // Show My Purchases
            q = query(
                collection(db, "accountSales"), 
                where("buyerId", "==", user.uid)
            );
        }

        const unsubscribe = onSnapshot(q, (snap) => {
            const list: AccountListing[] = [];
            snap.forEach(d => list.push({ id: d.id, ...d.data() } as AccountListing));
            
            // Client-side Sort: Newest First
            list.sort((a, b) => {
                const dateA = a.createdAt?.seconds || 0;
                const dateB = b.createdAt?.seconds || 0;
                return dateB - dateA;
            });

            setListings(list);
            setLoading(false);
        }, (err) => {
            console.error("Fetch error details:", err);
            // Don't show alert for permission errors continuously
            setLoading(false);
        });

        return () => unsubscribe();
    } catch (e) {
        console.error("Query setup error", e);
        setLoading(false);
    }
  }, [tab, user.uid]);

  // Close modal if selected item disappears from the list (e.g. sold to someone else)
  useEffect(() => {
      if (selectedItem && tab === 'buy') {
          const stillAvailable = listings.find(l => l.id === selectedItem.id);
          if (!stillAvailable) {
              setSelectedItem(null);
          }
      }
  }, [listings, selectedItem, tab]);

  const handleSellSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!identifier || !password || !price) return alert("Fill required fields");
      if (sellType === 'instagram' && (!title || !description)) return alert("Title & Description required for Instagram");

      try {
          await addDoc(collection(db, "accountSales"), {
              userId: user.uid,
              sellerName: user.name,
              type: sellType,
              title: sellType === 'instagram' ? title : 'Gmail Account',
              description: sellType === 'instagram' ? description : 'Fresh Gmail Account',
              identifier,
              password,
              price: Number(price),
              status: 'pending', // Requires Admin Approval
              createdAt: serverTimestamp() // Use server timestamp
          });
          alert("Listing Submitted! Waiting for Admin Approval.");
          setTab('sell'); // Switch to view status
          // Reset form
          setIdentifier(''); setPassword(''); setTitle(''); setDescription(''); setPrice('');
      } catch (e: any) {
          console.error("Submit Error:", e);
          alert("Error submitting listing: " + (e.message || "Unknown error"));
      }
  };

  const confirmPurchase = async () => {
      if (!selectedItem || !selectedItem.id) return;
      if (isPurchasing) return;
      
      if (user.balance < selectedItem.price) {
          alert("Insufficient Balance! Please recharge or convert points.");
          setSelectedItem(null);
          return;
      }

      setIsPurchasing(true);

      try {
          await runTransaction(db, async (transaction) => {
              // 1. Get fresh data
              const buyerRef = doc(db, "users", user.uid);
              const sellerRef = doc(db, "users", selectedItem.userId);
              const itemRef = doc(db, "accountSales", selectedItem.id!);

              const buyerDoc = await transaction.get(buyerRef);
              const itemDoc = await transaction.get(itemRef);

              if (!itemDoc.exists()) throw new Error("Item does not exist!");
              
              const itemData = itemDoc.data();
              if (itemData.status !== 'approved') {
                  throw new Error(itemData.status === 'sold' ? "Item already sold!" : "Item is not available.");
              }
              
              const buyerBalance = buyerDoc.data()?.balance || 0;
              if (buyerBalance < selectedItem.price) throw new Error("Insufficient Balance");

              // 2. Execute Transfers
              transaction.update(buyerRef, { balance: buyerBalance - selectedItem.price });
              transaction.update(sellerRef, { balance: increment(selectedItem.price) });
              transaction.update(itemRef, { status: 'sold', buyerId: user.uid });
          });

          alert("Purchase Successful! Check 'My Orders' for credentials.");
          setTab('my-orders');
          setSelectedItem(null);

      } catch (e: any) {
          console.error("Transaction Error", e);
          alert("Transaction Failed: " + (e.message || e));
          setSelectedItem(null);
      } finally {
          setIsPurchasing(false);
      }
  };

  return (
    <div className="px-4 pt-4 pb-20">
        {/* Tabs */}
        <div className="flex bg-white dark:bg-gray-800 rounded-xl p-1 mb-4 shadow-sm">
            <button onClick={() => setTab('buy')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${tab === 'buy' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500'}`}>Market</button>
            <button onClick={() => setTab('sell')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${tab === 'sell' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500'}`}>Sell</button>
            <button onClick={() => setTab('my-orders')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${tab === 'my-orders' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500'}`}>My Orders</button>
        </div>

        {/* --- BUY TAB --- */}
        {tab === 'buy' && (
            <div className="space-y-3">
                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-xl border border-indigo-100 dark:border-indigo-800 flex justify-between items-center">
                    <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">Your Balance</span>
                    <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">${user.balance}</span>
                </div>
                {loading ? <div className="text-center py-4 text-xs text-gray-400">Loading Market...</div> : 
                 listings.length === 0 ? <div className="text-center py-10 text-gray-400 text-sm">No accounts available currently.</div> :
                 listings.map(item => (
                     <div key={item.id} className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                         <div className="flex justify-between items-start mb-2">
                             <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${item.type === 'instagram' ? 'bg-pink-100 text-pink-600' : 'bg-red-100 text-red-600'}`}>
                                 {item.type}
                             </span>
                             <span className="font-black text-green-600 text-lg">${item.price}</span>
                         </div>
                         <h3 className="font-bold text-gray-800 dark:text-gray-200">{item.title}</h3>
                         <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.description}</p>
                         <button 
                            onClick={() => setSelectedItem(item)}
                            className="w-full mt-3 bg-gray-900 dark:bg-white text-white dark:text-black py-2 rounded-xl font-bold text-xs hover:opacity-90 transition">
                            Buy Now
                         </button>
                     </div>
                 ))
                }
            </div>
        )}

        {/* --- SELL TAB --- */}
        {tab === 'sell' && (
            <div className="space-y-6">
                {/* Form */}
                <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-lg">
                    <h3 className="font-bold text-lg mb-4 text-gray-800 dark:text-white border-b pb-2 border-gray-100 dark:border-gray-700">Sell Account</h3>
                    <form onSubmit={handleSellSubmit} className="space-y-3">
                        <div>
                            <label className="text-xs font-bold text-gray-500 ml-1">Account Type</label>
                            <select value={sellType} onChange={(e) => setSellType(e.target.value as any)} className="w-full p-3 rounded-xl bg-gray-100 dark:bg-gray-900 border-none text-sm font-bold">
                                <option value="instagram">Instagram Account</option>
                                <option value="gmail">Gmail Account</option>
                            </select>
                        </div>
                        
                        {sellType === 'instagram' && (
                            <>
                                <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Title (e.g. 10k Followers Active)" className="w-full p-3 rounded-xl bg-gray-100 dark:bg-gray-900 text-xs border-none" />
                                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (Followers, Niche, Age...)" className="w-full p-3 rounded-xl bg-gray-100 dark:bg-gray-900 text-xs border-none h-20"></textarea>
                            </>
                        )}

                        <input type="text" value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder={sellType === 'instagram' ? "Phone Number or Email" : "Gmail Address"} className="w-full p-3 rounded-xl bg-gray-100 dark:bg-gray-900 text-xs border-none" />
                        <input type="text" value={password} onChange={e => setPassword(e.target.value)} placeholder="Account Password" className="w-full p-3 rounded-xl bg-gray-100 dark:bg-gray-900 text-xs border-none" />
                        
                        <div className="relative">
                            <span className="absolute left-3 top-3 text-gray-500 text-xs font-bold">$</span>
                            <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="Selling Price" className="w-full p-3 pl-6 rounded-xl bg-gray-100 dark:bg-gray-900 text-xs border-none font-bold" />
                        </div>

                        <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-500/30">Submit for Approval</button>
                    </form>
                </div>

                {/* My Listings List */}
                <div>
                    <h4 className="font-bold text-gray-800 dark:text-white mb-2 ml-2">My Listings</h4>
                    {listings.map(item => (
                        <div key={item.id} className="bg-white dark:bg-gray-800 p-3 rounded-xl mb-2 flex justify-between items-center shadow-sm">
                            <div>
                                <p className="text-xs font-bold">{item.title}</p>
                                <p className="text-[10px] text-gray-500">${item.price} • {item.type}</p>
                            </div>
                            <span className={`text-[9px] px-2 py-1 rounded font-bold uppercase ${
                                item.status === 'approved' ? 'bg-blue-100 text-blue-600' :
                                item.status === 'sold' ? 'bg-green-100 text-green-600' :
                                item.status === 'rejected' ? 'bg-red-100 text-red-600' :
                                'bg-yellow-100 text-yellow-600'
                            }`}>
                                {item.status}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* --- MY ORDERS TAB --- */}
        {tab === 'my-orders' && (
            <div className="space-y-4">
                 {listings.length === 0 ? <div className="text-center py-10 text-gray-400 text-sm">You haven't purchased anything yet.</div> :
                 listings.map(item => (
                     <div key={item.id} className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border-l-4 border-green-500 relative overflow-hidden">
                         <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-gray-800 dark:text-gray-200">{item.title}</h3>
                            <span className="font-bold text-green-600">${item.price}</span>
                         </div>
                         <div className="bg-gray-100 dark:bg-gray-900 p-3 rounded-lg mt-2 space-y-1">
                             <div className="flex justify-between">
                                 <span className="text-[10px] text-gray-500">Username/Email</span>
                                 <span className="text-[10px] font-mono select-all">{item.identifier}</span>
                             </div>
                             <div className="flex justify-between">
                                 <span className="text-[10px] text-gray-500">Password</span>
                                 <span className="text-[10px] font-mono select-all">{item.password}</span>
                             </div>
                         </div>
                         <p className="text-[10px] text-center text-gray-400 mt-2">Purchased on {new Date(item.createdAt.seconds * 1000).toLocaleDateString()}</p>
                     </div>
                 ))}
            </div>
        )}

        {/* Confirmation Modal */}
        {selectedItem && (
            <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-6 backdrop-blur-sm">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl w-full max-w-sm animate-bounce-in text-center">
                    <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                        {isPurchasing ? <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div> : <i className="fas fa-shopping-cart"></i>}
                    </div>
                    <h3 className="text-xl font-bold mb-1 text-gray-800 dark:text-white">Confirm Purchase?</h3>
                    <p className="text-xs text-gray-500 mb-4">You are about to buy <b>{selectedItem.title}</b></p>
                    
                    <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl mb-6 flex justify-between items-center">
                        <span className="text-sm text-gray-500">Price</span>
                        <span className="text-xl font-black text-indigo-600">${selectedItem.price}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button disabled={isPurchasing} onClick={() => setSelectedItem(null)} className="py-3 rounded-xl font-bold text-gray-500 bg-gray-100 dark:bg-gray-700 disabled:opacity-50">Cancel</button>
                        <button disabled={isPurchasing} onClick={confirmPurchase} className="py-3 rounded-xl font-bold text-white bg-indigo-600 shadow-lg shadow-indigo-500/30 disabled:opacity-50">
                            {isPurchasing ? 'Processing...' : 'Yes, Buy'}
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default Marketplace;