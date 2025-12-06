import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Wallet, TrendingUp, Users, AlertCircle, Coins, Plus, Save, UserPlus, X, Trash2, ArrowUpDown, Download, AlertTriangle, Banknote } from 'lucide-react';
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
  onRecordPayment?: (transaction: Transaction) => void;
  onAddMember?: (name: string) => void;
  onDeleteMember?: (memberId: string) => void;
}

const COLORS = ['#10b981', '#ef4444'];

// Mock data for dashboard charts (unchanged logic)
const dataPie = [
  { name: 'Collected', value: 8500 },
  { name: 'Arrears', value: 1500 },
];

const dataBar = [
  { name: 'Jan', collected: 2000, expected: 2500 },
  { name: 'Feb', collected: 2200, expected: 2500 },
  { name: 'Mar', collected: 1800, expected: 2500 },
  { name: 'Apr', collected: 2500, expected: 2500 },
];

type SortConfig = {
  key: keyof Transaction | 'date_time'; // 'date_time' is a virtual key for sorting by timestamp
  direction: 'asc' | 'desc';
};

export const FinanceManager: React.FC<FinanceManagerProps> = ({ 
  showContributionForm = true,
  data,
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

  // Filter Logic: Show only latest transaction per member for current month
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col relative min-w-0">
            <h3 className="text-lg font-semibold mb-4 text-slate-800">Collection Status</h3>
            <div className="w-full h-[250px]">
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
                          innerRadius={60}
                          outerRadius={100}
                          fill="#8884d8"
                          paddingAngle={5}
                          dataKey="value"
                          >
                          {dataPie.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                          </Pie>
                          <Tooltip />
                          <Legend verticalAlign="bottom" height={36}/>
                      </PieChart>
                  </ResponsiveContainer>
                )}
            </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col relative min-w-0">
            <h3 className="text-lg font-semibold mb-4 text-slate-800">Monthly Contribution Trends</h3>
            <div className="w-full h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={dataBar}
                        margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                        }}
                    >
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={36}/>
                        <Bar dataKey="collected" fill="#10b981" name="Collected" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="expected" fill="#e2e8f0" name="Expected" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
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