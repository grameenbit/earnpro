
export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  points: number;
  balance: number;
  status: 'active' | 'blocked';
  myRefCode: string;
  lastCheckIn: string | null;
  dailyAdsWatched: number;
  dailySpinsUsed: number;
  lastAdDate: string;
  createdAt: any;
}

export interface AppConfig {
  pointRate: number;
  minWithdraw: number;
  videoReward: number;
  referralReward: number;
  checkInReward: number;
  maxDailyAds: number;
  maxDailySpins: number;
  spinValues: number[];
}

export interface Task {
  id: string;
  title: string;
  description: string;
  reward: number;
  timer: number;
  link: string;
  status: 'active' | 'inactive';
}

export interface Withdrawal {
  id?: string;
  userId: string;
  amount: number;
  number: string;
  method: string;
  status: 'pending' | 'approved' | 'rejected';
  date: any;
}

export interface Notification {
  id: string;
  message: string;
  target: 'ALL' | string;
  date: any;
}

export interface AccountListing {
  id?: string;
  userId: string; // Changed from sellerId to match generic rules
  sellerName: string;
  type: 'instagram' | 'gmail';
  title?: string; // For Instagram
  description?: string; // For Instagram
  identifier: string; // Email or Phone
  password: string; // Stored (In a real app, this should be encrypted)
  price: number;
  status: 'pending' | 'approved' | 'rejected' | 'sold';
  buyerId?: string;
  createdAt: any;
}
