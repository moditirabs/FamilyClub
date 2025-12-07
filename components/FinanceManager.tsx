import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ReferenceLine } from 'recharts';
import { Wallet, TrendingUp, Users, AlertCircle, Coins, Plus, Save, UserPlus, X, Trash2, ArrowUpDown, Download, AlertTriangle, Banknote, BarChart3, TrendingDown } from 'lucide-react';
import { Transaction, FinancialMember } from '../types';

interface FinanceManagerProps {
  showContributionForm?: boolean;
  data: {
    totalCollected: number;
    totalArrears: number;
    activeMembers: number;
    collectionRate: number;
    transactions: Transaction[];
    members: FinancialMember[];
  };
  memberCounts: Record<string, number>; // Maps YYYY-MM to number of active members
  onRecordPayment?: (transaction: Transaction) => void;
  onAddMember?: (name: string) => void;
  onDeleteMember?: (memberId: string) => void;
}

const COLORS = ['#10b981', '#ef4444'];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type SortConfig = {
  key: keyof Transaction | 'date_time'; // 'date_time' is a virtual key for sorting by timestamp
  direction: 'asc' | 'desc';
};

// Custom Tooltip for the Enhanced Bar Chart
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isSurplus = data.difference >= 0;
      
      return (
        <div className="bg-white p-4 border border-slate-200 shadow-lg rounded-xl z-50 min-w-[200px]">
          <h4 className="font-bold text-slate-800 mb-2 border-b border-slate-100 pb-2">{label}</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between items-center gap-4">
               <span className="text-slate-500 flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-600"/> Collected:</span>
               <span className="font-semibold text-blue-700">R{data.collected.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center gap-4">
               <span className="text-slate-500 flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-400"/> Expected:</span>
               <span className="font-semibold text-slate-600">R{data.expected.toLocaleString()}</span>
            </div>
             <div className="flex justify-between items-center gap-4">
               <span className="text-slate-500">Active Members:</span>
               <span className="font-medium text-slate-800">{data.activeMembers}</span>
            </div>
            <div className="pt-2 mt-2 border-t border-slate-100 flex justify-between items-center font-medium">
               <span className={isSurplus ? "text-green-600" : "text-red-500"}>
                 {isSurplus ? "Surplus" : "Deficit"}
               </span>
               <span className={isSurplus ? "text-green-600" : "text-red-600"}>
                 {isSurplus ? "+" : ""}R{data.difference.toLocaleString()}
               </span>
            </div>
             <div className="text-xs text-right text-slate-400 mt-1">
               Rate: {data.rate}%
             </div>
          </div>
        </div>
      );
    }
    return null;
  };

export const FinanceManager: React.FC<FinanceManagerProps> = ({ 
  showContributionForm = true,
  data,
  memberCounts,
  onRecordPayment,
  onAddMember,
  onDeleteMember
}) => {
  // Local state for the form
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [cashPaid, setCashPaid] = useState('');
  const [eftPaid, setEftPaid] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modals
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSameMonthModalOpen, setIsSameMonthModalOpen] = useState(false);
  
  const [newMemberName, setNewMemberName] = useState('');
  
  // Sorting State
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'date_time', direction: 'desc' });

  // Calculations for the selected member
  const selectedMember = data.members.find(m => m.id === selectedMemberId);
  const prevArrears = selectedMember?.previousArrears || 0;
  const standardContributionDue = selectedMember?.contributionDue || 500;
  
  const cashVal = parseFloat(cashPaid) || 0;
  const eftVal = parseFloat(eftPaid) || 0;
  const totalPaid = cashVal + eftVal;

  // Calculate Total Cash Collected for Dashboard View
  const totalCashCollected = useMemo(() => {
    return data.transactions.reduce((acc, t) => acc + (t.cashPaid || 0), 0);
  }, [data.transactions]);

  // --- DYNAMIC CHART DATA GENERATION ---
  const { chartData } = useMemo(() => {
    if (data.transactions.length === 0) {
        return { chartData: [] };
    }

    const months = new Set<string>();
    // Collect all unique months from transaction history
    data.transactions.forEach(t => {
        // Handle both ISO timestamp and YYYY-MM-DD
        const dateStr = t.timestamp ? t.timestamp : t.date;
        months.add(dateStr.slice(0, 7)); // YYYY-MM
    });
    
    // Ensure current month is always displayed even if empty
    const currentMonthKey = new Date().toISOString().slice(0, 7);
    months.add(currentMonthKey);

    // Convert Set to Array and Sort Chronologically
    const sortedMonths = Array.from(months).sort();

    // Map to chart data structure
    const mappedData = sortedMonths.map(month => {
        const [year, monthIndex] = month.split('-');
        
        // 1. Calculate Collected for this month
        const monthlyTransactions = data.transactions.filter(t => {
             const tDate = t.timestamp ? t.timestamp : t.date;
             return tDate.startsWith(month);
        });
        const collected = monthlyTransactions.reduce((sum, t) => sum + t.totalPaid, 0);

        // 2. Determine Active Members
        // Use historical snapshot from App.tsx or fallback to current if not found (e.g. older data)
        const activeCount = memberCounts[month] || data.members.length;

        // 3. Calculate Expected
        const expected = activeCount * 500;

        return {
            monthKey: month,
            name: `${MONTH_NAMES[parseInt(monthIndex) - 1]} ${year.slice(2)}`, // "Oct 24"
            fullDate: `${MONTH_NAMES[parseInt(monthIndex) - 1]} ${year}`,
            collected,
            expected,
            activeMembers: activeCount,
            difference: collected - expected,
            rate: expected > 0 ? Math.round((collected / expected) * 100) : 0
        };
    });

    return { 
        chartData: mappedData
    };
  }, [data.transactions, data.members.length, memberCounts]);

  // Filter Logic for Ledger: Show only latest transaction per member for current month
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const latestMap = new Map<string, Transaction>();

    data.transactions.forEach(t => {
      const tDate = new Date(t.timestamp || t.date);
      // Scope: Current Month & Year
      if (tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear) {
        // De-duplicate: Keep only the latest by timestamp
        const existing = latestMap.get(t.memberId);
        if (!existing) {
          latestMap.set(t.memberId, t);
        } else {
           const tTime = tDate.getTime();
           const existingTime = new Date(existing.timestamp || existing.date).getTime();
           if (tTime > existingTime) {
             latestMap.set(t.memberId, t);
           }
        }
      }
    });

    return Array.from(latestMap.values());
  }, [data.transactions]);

  // Ledger Sorting Logic
  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    let aVal: any = a[sortConfig.key as keyof Transaction];
    let bVal: any = b[sortConfig.key as keyof Transaction];

    if (sortConfig.key === 'date_time') {
        aVal = new Date(a.timestamp || a.date).getTime();
        bVal = new Date(b.timestamp || b.date).getTime();
    }

    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (key: keyof Transaction | 'date_time') => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handlePreSubmitCheck = () => {
    setError('');
    
    if (!selectedMember) {
        setError('Please select a member.');
        return;
    }
    if (totalPaid === 0) {
        setError('Please enter a payment amount.');
        return;
    }

    // Check for existing transaction in current month
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const hasPaidThisMonth = data.transactions.some(t => {
        if (t.memberId !== selectedMemberId) return false;
        const tDate = new Date(t.timestamp || t.date);
        return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
    });

    if (hasPaidThisMonth) {
        setIsSameMonthModalOpen(true);
    } else {
        processPayment(standardContributionDue);
    }
  };

  const processPayment = (contributionToCharge: number) => {
    if (!selectedMember || !onRecordPayment) return;

    const currentArrears = (prevArrears + contributionToCharge) - totalPaid;
    const now = new Date();

    const newTransaction: Transaction = {
      id: Date.now().toString(),
      memberId: selectedMember.id,
      memberName: selectedMember.name,
      date: now.toISOString().split('T')[0],
      timestamp: now.toISOString(),
      cashPaid: cashVal,
      eftPaid: eftVal,
      totalPaid: totalPaid,
      previousArrears: prevArrears,
      currentArrears: currentArrears,
      category: 'Contribution'
    };

    onRecordPayment(newTransaction);
    
    // Reset form
    setCashPaid('');
    setEftPaid('');
    setIsSameMonthModalOpen(false);
    setSuccessMsg('Payment recorded successfully!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleAddNewMember = () => {
    if (!newMemberName.trim()) return;
    if (onAddMember) {
      onAddMember(newMemberName);
      setNewMemberName('');
      setIsAddMemberModalOpen(false);
      setSuccessMsg('Member added successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  const confirmDeleteMember = () => {
    if (selectedMemberId && onDeleteMember) {
        onDeleteMember(selectedMemberId);
        setSelectedMemberId('');
        setIsDeleteModalOpen(false);
        setSuccessMsg('Member and history deleted.');
        setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  const exportToCSV = () => {
    if (sortedTransactions.length === 0) return;
    
    const headers = ["Date & Time", "Member Name", "Prev Arrears", "Cash Paid", "EFT Paid", "Total Paid", "Current Arrears"];
    const rows = sortedTransactions.map(t => [
        `"${new Date(t.timestamp || t.date).toLocaleString()}"`,
        `"${t.memberName}"`,
        t.previousArrears,
        t.cashPaid,
        t.eftPaid,
        t.totalPaid,
        t.currentArrears
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
        + headers.join(",") + "\n" 
        + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "transaction_ledger.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
        <Wallet className="w-6 h-6 text-green-600" />
        Financial Overview
      </h2>

      {/* Stats Cards - Always visible */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-slate-500">Total Collected</p>
                    <h3 className="text-2xl font-bold text-slate-900">R{data.totalCollected.toLocaleString()}</h3>
                </div>
                <div className="p-2 bg-green-100 rounded-full text-green-600">
                    <Coins className="w-5 h-5" />
                </div>
            </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-slate-500">Total Arrears</p>
                    <h3 className="text-2xl font-bold text-red-600">R{data.totalArrears.toLocaleString()}</h3>
                </div>
                <div className="p-2 bg-red-100 rounded-full text-red-600">
                    <AlertCircle className="w-5 h-5" />
                </div>
            </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-slate-500">Collection Rate</p>
                    <h3 className="text-2xl font-bold text-blue-600">{data.collectionRate}%</h3>
                </div>
                <div className="p-2 bg-blue-100 rounded-full text-blue-600">
                    <TrendingUp className="w-5 h-5" />
                </div>
            </div>
        </div>
        
        {/* Conditional 4th Card: Dashboard = Active Members | Financials = Cash Collected */}
        {!showContributionForm ? (
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-slate-500">Active Members</p>
                        <h3 className="text-2xl font-bold text-slate-900">{data.activeMembers}</h3>
                    </div>
                    <div className="p-2 bg-purple-100 rounded-full text-purple-600">
                        <Users className="w-5 h-5" />
                    </div>
                </div>
            </div>
        ) : (
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-slate-500">Cash Collected</p>
                        <h3 className="text-2xl font-bold text-emerald-600">R{totalCashCollected.toLocaleString()}</h3>
                    </div>
                    <div className="p-2 bg-emerald-100 rounded-full text-emerald-600">
                        <Banknote className="w-5 h-5" />
                    </div>
                </div>
            </div>
        )}
      </div>

      {/* Dashboard View: Show Charts / Hide Form */}
      {!showContributionForm && (
        <div className="grid grid-cols-1 gap-6">
            
            {/* Overall Distribution Pie Chart (MOVED TO TOP) */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col relative min-w-0">
                <h3 className="text-lg font-semibold mb-4 text-slate-800">Overall Collection Distribution</h3>
                <div className="w-full h-[300px]">
                    {data.totalCollected === 0 && data.totalArrears === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-400">
                        No data available
                    </div>
                    ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                            data={[
                                { name: 'Collected', value: data.totalCollected },
                                { name: 'Arrears', value: data.totalArrears },
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={80}
                            outerRadius={110}
                            fill="#8884d8"
                            paddingAngle={5}
                            dataKey="value"
                            >
                            {data.members.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => `R${value.toLocaleString()}`} />
                            <Legend verticalAlign="bottom" height={36} iconType="circle"/>
                        </PieChart>
                    </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Collection Status Bar Chart (MOVED TO BOTTOM) */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col relative min-w-0">
                <h3 className="text-lg font-semibold mb-4 text-slate-800 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-slate-500" />
                    Collection Status & Trends
                </h3>
                
                {chartData.length > 0 ? (
                    <div className="w-full h-[350px] mb-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={chartData}
                                margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
                                barSize={24} // 30% thinner than standard
                            >
                                <defs>
                                    <pattern id="stripe-pattern" patternUnits="userSpaceOnUse" width="4" height="4" patternTransform="rotate(45)">
                                        <rect width="2" height="4" transform="translate(0,0)" fill="white" opacity={0.3} />
                                    </pattern>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis 
                                    dataKey="name" 
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontSize: 12 }}
                                    dy={10}
                                />
                                <YAxis 
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontSize: 12 }}
                                    tickFormatter={(value) => `R${value}`}
                                />
                                <Tooltip content={<CustomTooltip />} cursor={{fill: 'transparent'}} />
                                <Legend 
                                    verticalAlign="top" 
                                    align="right" 
                                    height={36} 
                                    iconType="circle"
                                    formatter={(value) => <span className="text-slate-600 text-sm font-medium ml-1">{value}</span>}
                                />
                                <Bar 
                                    dataKey="collected" 
                                    name="Collected" 
                                    radius={[4, 4, 0, 0]}
                                    animationDuration={1500}
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell 
                                            key={`cell-${index}`} 
                                            fill={entry.collected >= entry.expected ? '#16a34a' : '#2563eb'} 
                                        />
                                    ))}
                                </Bar>
                                <Bar 
                                    dataKey="expected" 
                                    name="Expected" 
                                    fill="#f97316" 
                                    radius={[4, 4, 0, 0]}
                                    fillOpacity={0.8}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    // EMPTY STATE
                    <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
                        <div className="bg-slate-100 p-4 rounded-full mb-4">
                            <BarChart3 className="w-10 h-10 text-slate-300" />
                        </div>
                        <h4 className="text-lg font-bold text-slate-700">No collection data available</h4>
                        <p className="text-sm text-slate-500 mt-2 mb-6 max-w-[250px]">
                            Add member contributions to see visualization of your club's financial performance.
                        </p>
                        {/* Visual Cue - kept minimal */}
                        <div className="flex gap-2 mb-6 opacity-40 grayscale">
                             <div className="w-4 h-12 bg-blue-400 rounded-t"></div>
                             <div className="w-4 h-16 bg-orange-400 rounded-t"></div>
                             <div className="w-4 h-8 bg-blue-400 rounded-t"></div>
                             <div className="w-4 h-20 bg-orange-400 rounded-t"></div>
                        </div>
                    </div>
                )}
            </div>

        </div>
      )}

      {/* Financial View: Show Form & Ledger / Hide Charts */}
      {showContributionForm && (
        <div className="space-y-6 animate-fade-in">
            {/* Quick Contribution Entry Form */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold text-slate-800">Record New Contribution</h3>
                    {successMsg && <div className="text-green-600 text-sm font-medium bg-green-50 px-3 py-1 rounded-full">{successMsg}</div>}
                    {error && <div className="text-red-600 text-sm font-medium bg-red-50 px-3 py-1 rounded-full">{error}</div>}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Member</label>
                          <div className="flex gap-1">
                            {onAddMember && (
                                <button 
                                onClick={() => setIsAddMemberModalOpen(true)}
                                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium bg-blue-50 px-2 py-0.5 rounded transition"
                                >
                                <Plus className="w-3 h-3" /> Add New
                                </button>
                            )}
                            {onDeleteMember && selectedMemberId && (
                                <button 
                                onClick={() => setIsDeleteModalOpen(true)}
                                className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1 font-medium bg-red-50 px-2 py-0.5 rounded transition"
                                title="Delete Member"
                                >
                                <Trash2 className="w-3 h-3" />
                                </button>
                            )}
                          </div>
                        </div>
                        <select 
                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            value={selectedMemberId}
                            onChange={(e) => setSelectedMemberId(e.target.value)}
                        >
                            <option value="">Select Member...</option>
                            {data.members.map(m => {
                                // Find last payment info for this member to display in dropdown
                                const lastTx = data.transactions
                                    .filter(t => t.memberId === m.id)
                                    .sort((a,b) => new Date(b.timestamp || b.date).getTime() - new Date(a.timestamp || a.date).getTime())[0];
                                const lastPaid = lastTx ? new Date(lastTx.timestamp || lastTx.date).toLocaleDateString() : 'Never';
                                return (
                                    <option key={m.id} value={m.id}>
                                        {m.name} (Arrears: R{m.previousArrears})
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    <div className="space-y-1">
                         <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Prev Arrears</label>
                         <div className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-600">
                            R{prevArrears.toLocaleString()}
                         </div>
                    </div>

                    <div className="space-y-1">
                         <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Contribution Due</label>
                         <div className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-600">
                            R{standardContributionDue.toLocaleString()}
                         </div>
                    </div>

                    <div className="space-y-1 hidden lg:block">
                        {/* Spacer or additional info */}
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cash Paid</label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-slate-400">R</span>
                            <input 
                                type="number" 
                                className="w-full pl-8 p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="0.00"
                                value={cashPaid}
                                onChange={(e) => setCashPaid(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">EFT Paid</label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-slate-400">R</span>
                            <input 
                                type="number" 
                                className="w-full pl-8 p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="0.00"
                                value={eftPaid}
                                onChange={(e) => setEftPaid(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Paid</label>
                        <div className="w-full p-2.5 bg-green-50 border border-green-100 text-green-700 font-semibold rounded-lg">
                            R{totalPaid.toLocaleString()}
                        </div>
                    </div>

                    {/* This is a preview, final calculation happens on submit */}
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Est. New Balance</label>
                        <div className="w-full p-2.5 bg-slate-100 border-slate-200 text-slate-500 rounded-lg border">
                           R{((prevArrears + standardContributionDue) - totalPaid).toLocaleString()}
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex justify-end">
                    <button 
                        onClick={handlePreSubmitCheck}
                        className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium transition shadow-sm hover:shadow-md"
                    >
                        <Save className="w-4 h-4" /> Record Payment
                    </button>
                </div>
            </div>

            {/* Ledger Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-wrap justify-between items-center gap-4">
                    <h3 className="font-semibold text-slate-700">Transaction Ledger <span className="text-xs font-normal text-slate-500 ml-2">(Current Month Only)</span></h3>
                    <button 
                        onClick={exportToCSV}
                        className="flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 bg-white border border-slate-200 hover:border-blue-200 px-3 py-1.5 rounded transition"
                    >
                        <Download className="w-4 h-4" /> Export CSV
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium">
                            <tr>
                                <th onClick={() => handleSort('date_time')} className="px-6 py-3 cursor-pointer hover:bg-slate-100">
                                    <div className="flex items-center gap-1">Date & Time <ArrowUpDown className="w-3 h-3"/></div>
                                </th>
                                <th onClick={() => handleSort('memberName')} className="px-6 py-3 cursor-pointer hover:bg-slate-100">
                                    <div className="flex items-center gap-1">Member <ArrowUpDown className="w-3 h-3"/></div>
                                </th>
                                <th className="px-6 py-3">Prev. Arrears</th>
                                <th className="px-6 py-3">Cash Paid</th>
                                <th className="px-6 py-3">EFT Paid</th>
                                <th onClick={() => handleSort('totalPaid')} className="px-6 py-3 font-semibold text-slate-700 cursor-pointer hover:bg-slate-100">
                                    <div className="flex items-center gap-1">Total Paid <ArrowUpDown className="w-3 h-3"/></div>
                                </th>
                                <th onClick={() => handleSort('currentArrears')} className="px-6 py-3 cursor-pointer hover:bg-slate-100">
                                    <div className="flex items-center gap-1">Current Arrears <ArrowUpDown className="w-3 h-3"/></div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {sortedTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400 bg-slate-50/50">
                                      <div className="flex flex-col items-center justify-center gap-2">
                                        <Wallet className="w-8 h-8 opacity-20" />
                                        <p>No transactions recorded for this month.</p>
                                        <p className="text-xs opacity-60">Use the form above to record payment.</p>
                                      </div>
                                    </td>
                                </tr>
                            ) : (
                                sortedTransactions.map((t) => {
                                    // Row coloring logic
                                    let rowClass = "hover:bg-slate-50/50 transition";
                                    if (t.currentArrears <= 0) rowClass += " bg-green-50/20";
                                    else if (t.currentArrears > 1000) rowClass += " bg-red-50/20";
                                    
                                    return (
                                    <tr key={t.id} className={rowClass}>
                                        <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                                            {t.timestamp ? new Date(t.timestamp).toLocaleString(undefined, {
                                                year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'
                                            }) : t.date}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-700">{t.memberName}</td>
                                        <td className="px-6 py-4 text-slate-500">R{t.previousArrears.toLocaleString()}</td>
                                        <td className="px-6 py-4 text-slate-500">R{t.cashPaid.toLocaleString()}</td>
                                        <td className="px-6 py-4 text-slate-500">R{t.eftPaid.toLocaleString()}</td>
                                        <td className="px-6 py-4 text-green-600 font-semibold">R{t.totalPaid.toLocaleString()}</td>
                                        <td className={`px-6 py-4 font-medium flex items-center gap-2 ${t.currentArrears > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            R{t.currentArrears.toLocaleString()}
                                            {t.currentArrears > 1000 && <AlertCircle className="w-4 h-4 text-red-500" />}
                                        </td>
                                    </tr>
                                )})
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      )}

      {/* Add Member Modal */}
      {isAddMemberModalOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
             <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-slate-800">Add New Member</h3>
                <button onClick={() => setIsAddMemberModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                   <X className="w-5 h-5" />
                </button>
             </div>
             <div className="p-5 space-y-4">
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                   <input 
                      type="text" 
                      value={newMemberName}
                      onChange={(e) => setNewMemberName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      autoFocus
                   />
                </div>
                <button 
                  onClick={handleAddNewMember}
                  disabled={!newMemberName.trim()}
                  className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
                >
                   <UserPlus className="w-4 h-4" /> Add Member
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Delete Member Confirmation Modal */}
      {isDeleteModalOpen && selectedMember && (
         <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
                <div className="p-6 text-center space-y-4">
                    <div className="bg-red-100 p-3 rounded-full w-fit mx-auto">
                        <AlertTriangle className="w-8 h-8 text-red-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Delete Member?</h3>
                        <p className="text-sm text-slate-500 mt-2">
                            Are you sure you want to delete <strong>{selectedMember.name}</strong>? 
                            This will also delete ALL their transaction history. This action cannot be undone.
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <button 
                            onClick={() => setIsDeleteModalOpen(false)}
                            className="w-full py-2.5 border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={confirmDeleteMember}
                            className="w-full py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition"
                        >
                            Delete Permanently
                        </button>
                    </div>
                </div>
            </div>
         </div>
      )}

      {/* Same Month Payment Warning Modal */}
      {isSameMonthModalOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
                <div className="p-6">
                    <div className="flex items-start gap-4">
                         <div className="bg-yellow-100 p-2 rounded-full shrink-0">
                            <AlertCircle className="w-6 h-6 text-yellow-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Payment Detected for This Month</h3>
                            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                                You are recording a payment for {selectedMember?.name} in the current month.
                            </p>
                            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                                Would you like to add this payment <strong>without adding a new monthly contribution fee (R{standardContributionDue})</strong>?
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 mt-6">
                        <button 
                            onClick={() => processPayment(0)} // 0 means do not add contribution fee
                            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition text-left px-4 flex justify-between items-center"
                        >
                            <span>Yes, Update Existing</span>
                            <span className="text-xs bg-blue-500 px-2 py-1 rounded">No Extra Fee</span>
                        </button>
                        <button 
                             onClick={() => processPayment(standardContributionDue)} // Add standard fee
                             className="w-full py-3 bg-white border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition text-left px-4 flex justify-between items-center"
                        >
                             <span>Add New Month</span>
                             <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500">+ R{standardContributionDue} Fee</span>
                        </button>
                        <button 
                            onClick={() => setIsSameMonthModalOpen(false)}
                            className="w-full py-2 text-center text-slate-500 text-sm hover:text-slate-700 mt-1"
                        >
                            Cancel Edit
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};