import React, { useState, useEffect } from 'react';
import { LayoutDashboard, FileText, PieChart, FolderOpen, MessageSquare, Menu, X, Calculator, RefreshCw } from 'lucide-react';
import { FinanceManager } from './components/FinanceManager';
import { MinutesManager } from './components/MinutesManager';
import { DocumentAnalyzer } from './components/DocumentAnalyzer';
import { BudgetManager } from './components/BudgetManager';
import { AIChat } from './components/AIChat';
import { ViewState, Transaction, FinancialMember } from './types';

// Default members list (Clean state)
const DEFAULT_MEMBERS: FinancialMember[] = [
  { id: '1', name: 'Bafana Kekana', previousArrears: 0, contributionDue: 500 },
  { id: '2', name: 'Steve Kgamane', previousArrears: 0, contributionDue: 500 },
  { id: '3', name: 'Mokgoshi Kekana', previousArrears: 0, contributionDue: 500 },
  { id: '4', name: 'Columbus Kekana', previousArrears: 0, contributionDue: 500 },
  { id: '5', name: 'Archie Poto', previousArrears: 0, contributionDue: 500 },
  { id: '6', name: 'John Rabalago', previousArrears: 0, contributionDue: 500 },
  { id: '7', name: 'Darlington Masalesa', previousArrears: 0, contributionDue: 500 },
  { id: '8', name: 'Kamogelo Kekana', previousArrears: 0, contributionDue: 500 },
  { id: '9', name: 'Lucas Lekgoathi', previousArrears: 0, contributionDue: 500 },
  { id: '10', name: 'Bongani Maphoso', previousArrears: 0, contributionDue: 500 },
  { id: '11', name: 'Lucas Kekana', previousArrears: 0, contributionDue: 500 },
  { id: '12', name: 'Thatego Themane', previousArrears: 0, contributionDue: 500 },
  { id: '13', name: 'Klaas Legoabe', previousArrears: 0, contributionDue: 500 },
  { id: '14', name: 'Oupa Tladi', previousArrears: 0, contributionDue: 500 },
  { id: '15', name: 'James Kekana', previousArrears: 0, contributionDue: 500 },
  { id: '16', name: 'Moditi Rabalao', previousArrears: 0, contributionDue: 500 },
  { id: '17', name: 'Shakes Kekana', previousArrears: 0, contributionDue: 500 },
  { id: '18', name: 'Ephraim Rabalao', previousArrears: 0, contributionDue: 500 },
  { id: '19', name: 'Joshua Kekana', previousArrears: 0, contributionDue: 500 },
];

const AppLogo = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="currentColor"
    className={className}
  >
     <path d="M16 5c0-1.66-1.34-3-3-3c-1.31 0-2.42.83-2.83 2H9C6.24 4 4 6.24 4 9c0 .48.07.95.19 1.4C2.98 11.11 2.02 12.44 2 14c0 2.21 1.79 4 4 4h2v2c0 .83.67 1.5 1.5 1.5h1c.83 0 1.5-.67 1.5-1.5V18h4v2.5c0 .83.67 1.5 1.5 1.5h1c.83 0 1.5-.67 1.5-1.5V14c0-2.21-1.79-4-4-4h-.5C15.8 9.4 16 8.73 16 8V5z"/>
  </svg>
);

function App() {
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [nextMeeting, setNextMeeting] = useState("The Smiths Home, Oct 24, 14:00 PM");

  // State initialization with Persistence Logic
  const [members, setMembers] = useState<FinancialMember[]>(() => {
    const saved = localStorage.getItem('fc_members');
    return saved ? JSON.parse(saved) : DEFAULT_MEMBERS;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('fc_transactions');
    // Initialize as EMPTY array to solve the dummy data issue
    return saved ? JSON.parse(saved) : []; 
  });

  // Effects to save data whenever it changes
  useEffect(() => {
    localStorage.setItem('fc_members', JSON.stringify(members));
  }, [members]);

  useEffect(() => {
    localStorage.setItem('fc_transactions', JSON.stringify(transactions));
  }, [transactions]);

  // Derived Financial Stats
  const totalCollected = transactions.reduce((acc, curr) => acc + curr.totalPaid, 0);
  const totalArrears = members.reduce((acc, curr) => acc + curr.previousArrears, 0); 
  const activeMembers = members.length;
  // Calculate collection rate
  const collectionRate = members.length > 0 ? Math.round((transactions.length / members.length) * 100) : 0;

  const financeData = {
    totalCollected,
    totalArrears,
    activeMembers,
    collectionRate,
    transactions,
    members
  };

  const handleRecordPayment = (newTransaction: Transaction) => {
    // 1. Add Transaction
    setTransactions([newTransaction, ...transactions]);

    // 2. Update Member's Arrears (Optimistic Update)
    setMembers(prevMembers => prevMembers.map(m => {
      if (m.id === newTransaction.memberId) {
        return {
          ...m,
          previousArrears: newTransaction.currentArrears // The new ending balance becomes the state
        };
      }
      return m;
    }));
  };

  const handleAddMember = (name: string) => {
    const newMember: FinancialMember = {
      id: Date.now().toString(),
      name,
      previousArrears: 0,
      contributionDue: 500
    };
    setMembers(prev => [...prev, newMember]);
  };

  const handleDeleteMember = (memberId: string) => {
    // Remove member
    setMembers(prev => prev.filter(m => m.id !== memberId));
    // Remove all transactions associated with this member
    setTransactions(prev => prev.filter(t => t.memberId !== memberId));
  };

  const handleResetData = () => {
    if (confirm("Are you sure you want to delete all financial data and reset the app? This cannot be undone.")) {
      localStorage.removeItem('fc_members');
      localStorage.removeItem('fc_transactions');
      setMembers(DEFAULT_MEMBERS);
      setTransactions([]);
      window.location.reload();
    }
  };

  const NavItem = ({ view, icon: Icon, label }: { view: ViewState; icon: any; label: string }) => (
    <button
      onClick={() => {
        setCurrentView(view);
        setIsMobileMenuOpen(false);
      }}
      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
        currentView === view
          ? 'bg-blue-900 text-white shadow-md shadow-blue-900/20'
          : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      <Icon className="w-5 h-5" />
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b p-4 flex justify-between items-center sticky top-0 z-20">
        <div className="flex items-center gap-2">
            <AppLogo className="w-8 h-8 text-[#8B2635]" />
            <div className="font-bold text-xl text-blue-900 tracking-tight">Karara Family Club</div>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-600">
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed md:sticky md:top-0 h-[calc(100vh-64px)] md:h-screen w-full md:w-64 bg-white border-r border-slate-200 z-10 transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0 top-[64px]' : '-translate-x-full md:translate-x-0'}
        flex flex-col
      `}>
        <div className="p-6 border-b border-slate-100 hidden md:block">
          <div className="flex items-center gap-2 mb-2">
            <AppLogo className="w-8 h-8 text-[#8B2635]" />
            <div className="font-bold text-lg text-blue-900 tracking-tight leading-tight">Karara<br/>Family Club</div>
          </div>
          <p className="text-xs text-slate-400">Smart Management System</p>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <NavItem view={ViewState.DASHBOARD} icon={LayoutDashboard} label="Dashboard" />
          <NavItem view={ViewState.MINUTES} icon={FileText} label="Minutes" />
          <NavItem view={ViewState.FINANCE} icon={PieChart} label="Financials" />
          <NavItem view={ViewState.BUDGET} icon={Calculator} label="Budget Tracker" />
          <NavItem view={ViewState.DOCUMENTS} icon={FolderOpen} label="Documents" />
          <NavItem view={ViewState.CHAT} icon={MessageSquare} label="AI Assistant" />
        </nav>
        
        <div className="p-4 border-t border-slate-100 space-y-4">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <p className="text-xs font-semibold text-blue-900 uppercase mb-2">Next Meeting</p>
                <p className="text-sm font-medium text-slate-800 whitespace-pre-wrap">{nextMeeting}</p>
            </div>
            
            <button 
              onClick={handleResetData}
              className="w-full flex items-center justify-center gap-2 text-xs text-slate-400 hover:text-red-500 transition px-2 py-1"
            >
              <RefreshCw className="w-3 h-3" /> Reset App Data
            </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-[calc(100vh-64px)] md:h-screen">
        <div className="max-w-7xl mx-auto animate-fade-in-up">
          {currentView === ViewState.DASHBOARD && (
             <FinanceManager 
                showContributionForm={false} 
                data={financeData}
             />
          )}
          {currentView === ViewState.FINANCE && (
            <FinanceManager 
                showContributionForm={true} 
                data={financeData}
                onRecordPayment={handleRecordPayment}
                onAddMember={handleAddMember}
                onDeleteMember={handleDeleteMember}
            />
          )}
          {currentView === ViewState.BUDGET && <BudgetManager />}
          {currentView === ViewState.MINUTES && (
            <MinutesManager 
              initialNextMeeting={nextMeeting}
              onNextMeetingChange={setNextMeeting} 
            />
          )}
          {currentView === ViewState.DOCUMENTS && <DocumentAnalyzer />}
          {currentView === ViewState.CHAT && <AIChat />}
        </div>
      </main>
    </div>
  );
}

export default App;