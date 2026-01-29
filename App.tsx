import React, { useState, useEffect } from 'react';
import { LayoutDashboard, FileText, PieChart, FolderOpen, MessageSquare, Menu, X, Calculator, RefreshCw, LogOut, Loader2, User } from 'lucide-react';
import { FinanceManager } from './components/FinanceManager';
import { MinutesManager } from './components/MinutesManager';
import { DocumentAnalyzer } from './components/DocumentAnalyzer';
import { BudgetManager } from './components/BudgetManager';
import { AIChat } from './components/AIChat';
import { Auth } from './components/Auth';
import { ViewState, Transaction, FinancialMember, ExtractedTransaction, BudgetTransaction, AppUser } from './types';
import { auth, onAuthStateChanged, signOut } from './services/firebase';

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
     <path d="M21 12v-1c0-3.87-3.13-7-7-7-2.6 0-4.91 1.28-6.19 3.25C7.2 7.09 6.62 7 6 7c-2.76 0-5 2.24-5 5s2.24 5 5 5c.44 0 .86-.06 1.27-.16A6.98 6.98 0 0 0 14 20h2v-2h2v-2h-2v-1.1c2.39-.96 4.09-3.26 4.85-5.9H21z"/>
  </svg>
);

function App() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
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
    return saved ? JSON.parse(saved) : []; 
  });

  // Budget Transactions State
  const [budgetTransactions, setBudgetTransactions] = useState<BudgetTransaction[]>(() => {
    const saved = localStorage.getItem('budget_transactions');
    const parsed = saved ? JSON.parse(saved) : [];
    return parsed.map((t: any) => ({
      ...t,
      category: t.category || 'Uncategorized'
    }));
  });

  // Track historical member counts
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('fc_member_counts');
    return saved ? JSON.parse(saved) : {};
  });

  // --- FIREBASE AUTH LISTENER ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser) {
            // User is signed in.
            setUser({
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
                photoURL: firebaseUser.photoURL
            });
            setCurrentView(ViewState.DASHBOARD);
        } else {
            // User is signed out.
            setUser(null);
        }
        setAuthLoading(false);
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
      try {
        await signOut(auth);
        // State update handled by onAuthStateChanged
      } catch (error) {
          console.error("Error signing out", error);
      }
  };

  // Effects to save data whenever it changes
  useEffect(() => {
    localStorage.setItem('fc_members', JSON.stringify(members));
  }, [members]);

  useEffect(() => {
    localStorage.setItem('fc_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('budget_transactions', JSON.stringify(budgetTransactions));
  }, [budgetTransactions]);

  useEffect(() => {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    setMemberCounts(prev => {
        if (prev[currentMonth] === members.length) return prev;
        const updated = { ...prev, [currentMonth]: members.length };
        localStorage.setItem('fc_member_counts', JSON.stringify(updated));
        return updated;
    });
  }, [members]);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  // Derived Financial Stats
  const totalCollected = transactions.reduce((acc, curr) => acc + curr.totalPaid, 0);
  const totalArrears = members.reduce((acc, curr) => acc + curr.previousArrears, 0); 
  const activeMembers = members.length;
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
    setTransactions([newTransaction, ...transactions]);
    setMembers(prevMembers => prevMembers.map(m => {
      if (m.id === newTransaction.memberId) {
        return {
          ...m,
          previousArrears: newTransaction.currentArrears
        };
      }
      return m;
    }));
  };

  const handleUpdateBudgetTransactions = (updatedTransactions: BudgetTransaction[]) => {
      setBudgetTransactions(updatedTransactions);
  };

  const handleImportTransactions = (extractedData: ExtractedTransaction[]) => {
    const newTransactions: Transaction[] = [];
    const memberUpdates = new Map<string, number>();

    extractedData.forEach(item => {
      if (!item.matchedMemberId) return;

      const member = members.find(m => m.id === item.matchedMemberId);
      if (!member) return;

      const currentPrevArrears = memberUpdates.has(member.id) 
          ? memberUpdates.get(member.id)! 
          : member.previousArrears;
      
      const contributionCharge = 0; 
      const totalPaid = item.amount;
      const currentArrears = (currentPrevArrears + contributionCharge) - totalPaid;

      const tx: Transaction = {
        id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        memberId: member.id,
        memberName: member.name,
        date: item.date,
        timestamp: new Date(item.date).toISOString(),
        cashPaid: item.paymentMethod === 'Cash' ? item.amount : 0,
        eftPaid: item.paymentMethod === 'EFT' ? item.amount : 0,
        totalPaid: totalPaid,
        previousArrears: currentPrevArrears,
        currentArrears: currentArrears,
        category: 'Contribution'
      };

      newTransactions.push(tx);
      memberUpdates.set(member.id, currentArrears);
    });

    setTransactions(prev => [...newTransactions, ...prev]);
    setMembers(prev => prev.map(m => {
      if (memberUpdates.has(m.id)) {
        return { ...m, previousArrears: memberUpdates.get(m.id)! };
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
    setMembers(prev => prev.filter(m => m.id !== memberId));
    setTransactions(prev => prev.filter(t => t.memberId !== memberId));
  };

  const handleResetData = () => {
    if (confirm("Are you sure you want to delete all financial data and reset the app? This cannot be undone.")) {
      localStorage.removeItem('fc_members');
      localStorage.removeItem('fc_transactions');
      localStorage.removeItem('fc_member_counts');
      localStorage.removeItem('budget_transactions');
      setMembers(DEFAULT_MEMBERS);
      setTransactions([]);
      setMemberCounts({});
      setBudgetTransactions([]);
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

  // --- RENDERING ---

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-900 animate-spin" />
      </div>
    );
  }

  // Auth Guard: If no user, show Auth Component
  if (!user) {
    return <Auth />;
  }

  // Dashboard / Main App Layout
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row relative">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b p-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-2">
            <AppLogo className="w-8 h-8 text-[#8B2635]" />
            <div className="font-bold text-xl text-blue-900 tracking-tight">Karara Club</div>
        </div>
        <div className="flex items-center gap-3">
            {/* User Profile in Header for Mobile */}
            <div className="flex items-center gap-2 bg-slate-50 rounded-full pr-3 pl-1 py-1 border border-slate-100">
                {user.photoURL ? (
                    <img src={user.photoURL} alt="Profile" className="w-6 h-6 rounded-full object-cover" />
                ) : (
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700">
                        <User className="w-3 h-3" />
                    </div>
                )}
                 <span className="text-xs font-medium text-slate-700 max-w-[80px] truncate">{user.displayName || 'User'}</span>
            </div>
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-600">
                {isMobileMenuOpen ? <X /> : <Menu />}
            </button>
        </div>
      </div>

      {/* Backdrop for Mobile Menu */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          style={{ top: '70px' }} // Adjusted for header height
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`
        fixed md:sticky md:top-0 h-[calc(100vh-70px)] md:h-screen w-64 bg-white border-r border-slate-200 z-50 transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0 top-[70px]' : '-translate-x-full md:translate-x-0'}
        flex flex-col
      `}>
        <div className="p-6 border-b border-slate-100 hidden md:block">
          <div className="flex items-center gap-2 mb-2">
            <AppLogo className="w-8 h-8 text-[#8B2635]" />
            <div className="font-bold text-lg text-blue-900 tracking-tight leading-tight">Karara<br/>Family Club</div>
          </div>
          <p className="text-xs text-slate-400">Smart Management System</p>
          
          {/* User Profile Widget in Desktop Sidebar */}
          <div className="mt-6 pt-4 border-t border-slate-50 flex items-center gap-3">
             <div className="shrink-0">
                 {user.photoURL ? (
                     <img src={user.photoURL} alt="Profile" className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm" />
                 ) : (
                     <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 border-2 border-white shadow-sm">
                         <User className="w-5 h-5" />
                     </div>
                 )}
             </div>
             <div className="overflow-hidden">
                <p className="text-xs text-slate-400 mb-0.5">Welcome,</p>
                <p className="text-sm font-semibold text-slate-700 truncate" title={user.displayName || user.email || ''}>
                    {user.displayName || 'Member'}
                </p>
             </div>
          </div>
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
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 rounded-lg transition text-sm font-medium"
            >
              <LogOut className="w-4 h-4" /> Log Out
            </button>

            <button 
              onClick={handleResetData}
              className="w-full flex items-center justify-center gap-2 text-xs text-slate-400 hover:text-red-500 transition px-2 py-1"
            >
              <RefreshCw className="w-3 h-3" /> Reset App Data
            </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-[calc(100vh-70px)] md:h-screen z-0">
        <div className="max-w-7xl mx-auto animate-fade-in-up">
          {currentView === ViewState.DASHBOARD && (
             <FinanceManager 
                showContributionForm={false} 
                data={financeData}
                memberCounts={memberCounts}
             />
          )}
          {currentView === ViewState.FINANCE && (
            <FinanceManager 
                showContributionForm={true} 
                data={financeData}
                memberCounts={memberCounts}
                onRecordPayment={handleRecordPayment}
                onAddMember={handleAddMember}
                onDeleteMember={handleDeleteMember}
            />
          )}
          {currentView === ViewState.BUDGET && (
            <BudgetManager 
                transactions={budgetTransactions}
                onUpdateTransactions={handleUpdateBudgetTransactions}
            />
          )}
          {currentView === ViewState.MINUTES && (
            <MinutesManager 
              initialNextMeeting={nextMeeting}
              onNextMeetingChange={setNextMeeting} 
            />
          )}
          {currentView === ViewState.DOCUMENTS && (
            <DocumentAnalyzer 
                members={members} 
                onImportTransactions={handleImportTransactions} 
            />
          )}
          {currentView === ViewState.CHAT && (
            <AIChat 
                financeData={financeData}
                nextMeeting={nextMeeting}
                budgetTransactions={budgetTransactions}
            />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;