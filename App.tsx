import React, { useState } from 'react';
import { LayoutDashboard, FileText, PieChart, FolderOpen, MessageSquare, Menu, X, Calculator } from 'lucide-react';
import { FinanceManager } from './components/FinanceManager';
import { MinutesManager } from './components/MinutesManager';
import { DocumentAnalyzer } from './components/DocumentAnalyzer';
import { BudgetManager } from './components/BudgetManager';
import { AIChat } from './components/AIChat';
import { ViewState } from './types';

function App() {
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // State to track next meeting details across the app
  const [nextMeeting, setNextMeeting] = useState("The Smiths Home, Oct 24, 14:00 PM");

  const NavItem = ({ view, icon: Icon, label }: { view: ViewState; icon: any; label: string }) => (
    <button
      onClick={() => {
        setCurrentView(view);
        setIsMobileMenuOpen(false);
      }}
      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
        currentView === view
          ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
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
        <div className="font-bold text-xl text-blue-900 tracking-tight">FamilyClub OS</div>
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
          <div className="font-bold text-2xl text-blue-900 tracking-tight">FamilyClub OS</div>
          <p className="text-xs text-slate-400 mt-1">Smart Management System</p>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <NavItem view={ViewState.DASHBOARD} icon={LayoutDashboard} label="Dashboard" />
          <NavItem view={ViewState.MINUTES} icon={FileText} label="Minutes" />
          <NavItem view={ViewState.FINANCE} icon={PieChart} label="Financials" />
          <NavItem view={ViewState.BUDGET} icon={Calculator} label="Budget Tracker" />
          <NavItem view={ViewState.DOCUMENTS} icon={FolderOpen} label="Documents" />
          <NavItem view={ViewState.CHAT} icon={MessageSquare} label="AI Assistant" />
        </nav>
        
        <div className="p-4 border-t border-slate-100">
            <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-blue-800 uppercase mb-2">Next Meeting</p>
                <p className="text-sm font-medium text-slate-800 whitespace-pre-wrap">{nextMeeting}</p>
            </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-[calc(100vh-64px)] md:h-screen">
        <div className="max-w-7xl mx-auto animate-fade-in-up">
          {currentView === ViewState.DASHBOARD && <FinanceManager showContributionForm={false} />}
          {currentView === ViewState.FINANCE && <FinanceManager showContributionForm={true} />}
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