export interface Member {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Member';
}

export interface Transaction {
  id: string;
  memberId: string;
  memberName: string;
  date: string;
  amount: number;
  type: 'Cash' | 'EFT';
  category: 'Contribution' | 'Fine' | 'Other';
  status: 'Paid' | 'Pending';
}

export interface Meeting {
  id: string;
  venue: string;
  date: string;
  host: string;
  agenda: string;
  minutesContent?: string;
  attendees: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  groundingMetadata?: {
    search?: { uri: string; title: string }[];
    maps?: { uri: string; title: string }[];
  };
}

export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  MINUTES = 'MINUTES',
  FINANCE = 'FINANCE',
  BUDGET = 'BUDGET',
  DOCUMENTS = 'DOCUMENTS',
  CHAT = 'CHAT'
}