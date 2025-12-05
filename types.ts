export interface Member {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Member';
}

export interface FinancialMember {
  id: string;
  name: string;
  previousArrears: number;
  contributionDue: number;
}

export interface Transaction {
  id: string;
  memberId: string;
  memberName: string;
  date: string;
  timestamp: string; // ISO String YYYY-MM-DDTHH:mm:ss.sssZ
  cashPaid: number;
  eftPaid: number;
  totalPaid: number;
  previousArrears: number; // Snapshot at time of payment
  currentArrears: number; // Result after payment
  category: 'Contribution' | 'Fine' | 'Other';
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