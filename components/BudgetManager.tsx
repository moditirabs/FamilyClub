
import React, { useState, useRef } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Plus, Trash2, Search, TrendingUp, TrendingDown, PiggyBank, X, FileDown, Lock, Calendar, Filter } from 'lucide-react';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";
import { BudgetTransaction } from '../types';

interface BudgetManagerProps {
    transactions: BudgetTransaction[];
    onUpdateTransactions: (transactions: BudgetTransaction[]) => void;
}

const CATEGORIES = {
  income: ['Salary', 'Investment', 'Business', 'Gift', 'Other'],
  expense: ['Housing', 'Food', 'Transport', 'Utilities', 'Entertainment', 'Healthcare', 'Education', 'Debt', 'Other']
};

export const BudgetManager: React.FC<BudgetManagerProps> = ({ transactions, onUpdateTransactions }) => {
  const [filter, setFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'income' | 'expense'>('income');
  const [formData, setFormData] = useState({ amount: '', description: '', category: '' });
  
  // PDF Export State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportConfig, setExportConfig] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    includeSummary: true,
    includeChart: true,
    includeTransactions: true,
    password: '',
    excludedCategories: [] as string[]
  });
  const chartRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Calculations
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const savings = totalIncome - totalExpenses;

  // Chart Data
  const chartData = [
    { name: 'Income', value: totalIncome },
    { name: 'Expenses', value: totalExpenses },
  ];
  const COLORS = ['#10b981', '#ef4444']; 

  // Handlers
  const handleAddTransaction = () => {
    if (!formData.amount || !formData.description) return;

    const newTransaction: BudgetTransaction = {
      id: Date.now(),
      type: modalType,
      amount: parseFloat(formData.amount),
      description: formData.description,
      category: formData.category || 'Other',
      date: new Date().toLocaleDateString(),
    };

    onUpdateTransactions([newTransaction, ...transactions]);
    setFormData({ amount: '', description: '', category: '' });
    setIsModalOpen(false);
  };

  const handleDelete = (id: number) => {
    onUpdateTransactions(transactions.filter(t => t.id !== id));
  };

  const openModal = (type: 'income' | 'expense') => {
    setModalType(type);
    setFormData({ amount: '', description: '', category: CATEGORIES[type][0] });
    setIsModalOpen(true);
  };

  const filteredTransactions = transactions.filter(t => 
    (t.description.toLowerCase().includes(filter.toLowerCase()) || 
     t.category.toLowerCase().includes(filter.toLowerCase()))
  );

  // PDF Generation
  const generatePDF = async () => {
    setIsGeneratingPdf(true);
    try {
      // Filter data by date range and categories
      const startDate = new Date(exportConfig.startDate);
      const endDate = new Date(exportConfig.endDate);
      endDate.setHours(23, 59, 59); // End of day

      const reportData = transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate >= startDate && tDate <= endDate && !exportConfig.excludedCategories.includes(t.category);
      });

      const reportIncome = reportData.filter(t => t.type === 'income').reduce((acc, c) => acc + c.amount, 0);
      const reportExpense = reportData.filter(t => t.type === 'expense').reduce((acc, c) => acc + c.amount, 0);
      const reportSavings = reportIncome - reportExpense;

      // Initialize PDF
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
        encryption: exportConfig.password ? {
            userPassword: exportConfig.password,
            ownerPassword: exportConfig.password,
            userPermissions: ["print", "copy"]
        } : undefined
      });

      // Header
      const monthName = startDate.toLocaleString('default', { month: 'long', year: 'numeric' });
      doc.setFontSize(22);
      doc.setTextColor(30, 58, 138); // Blue 900
      doc.text(`Budget Report - ${monthName}`, 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 26);
      doc.text(`Period: ${exportConfig.startDate} to ${exportConfig.endDate}`, 14, 31);

      let yPos = 40;

      // 1. Summary Cards
      if (exportConfig.includeSummary) {
        const cardWidth = 45;
        const cardHeight = 25;
        const gap = 5;
        
        const drawCard = (x: number, title: string, value: number, color: [number, number, number]) => {
            doc.setFillColor(255, 255, 255);
            doc.setDrawColor(200, 200, 200);
            doc.roundedRect(x, yPos, cardWidth, cardHeight, 3, 3, 'FD');
            
            doc.setFontSize(9);
            doc.setTextColor(100);
            doc.text(title, x + 3, yPos + 8);
            
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(color[0], color[1], color[2]);
            doc.text(`R${value.toLocaleString()}`, x + 3, yPos + 18);
        };

        drawCard(14, "Income", reportIncome, [22, 163, 74]); // Green
        drawCard(14 + cardWidth + gap, "Expenses", reportExpense, [220, 38, 38]); // Red
        drawCard(14 + (cardWidth + gap) * 2, "Savings", reportSavings, reportSavings >= 0 ? [37, 99, 235] : [220, 38, 38]); // Blue/Red
        drawCard(14 + (cardWidth + gap) * 3, "Balance", reportSavings, [75, 85, 99]); // Grey

        yPos += 35;
      }

      // 2. Chart
      if (exportConfig.includeChart && chartRef.current) {
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text("Financial Overview", 14, yPos);
        yPos += 5;

        // Ensure chart is visible/sized for capture
        const canvas = await html2canvas(chartRef.current, { 
            scale: 2,
            logging: false, // Disable verbose logging
            useCORS: true
        });
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 180;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        doc.addImage(imgData, 'PNG', 15, yPos, imgWidth, imgHeight);
        yPos += imgHeight + 10;
      }

      // 3. Transactions Table
      if (exportConfig.includeTransactions) {
        if (yPos > 250) {
            doc.addPage();
            yPos = 20;
        }
        
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text("Detailed Transactions", 14, yPos);
        yPos += 5;

        const tableData = reportData.map(t => [
            t.date,
            t.description,
            t.category,
            t.type === 'income' ? 'Income' : 'Expense',
            `R${t.amount.toLocaleString()}`
        ]);

        autoTable(doc, {
            startY: yPos,
            head: [['Date', 'Description', 'Category', 'Type', 'Amount']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [37, 99, 235] },
            columnStyles: {
                4: { halign: 'right', fontStyle: 'bold' }
            }
        });
      }

      // Footer
      const pageCount = doc.getNumberOfPages();
      for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Page ${i} of ${pageCount}`, 190, 290, { align: 'right' });
      }

      // Save
      const fileName = `Budget_Report_${monthName.replace(' ', '_')}${exportConfig.password ? '_Protected' : ''}.pdf`;
      doc.save(fileName);
      setIsExportModalOpen(false);

    } catch (error) {
      console.error("PDF Export failed", error);
      alert("Failed to export PDF. Please try again.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <PiggyBank className="w-6 h-6 text-blue-600" />
          Monthly Budget
        </h2>
        <button 
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition"
        >
            <FileDown className="w-4 h-4" />
            Export Report
        </button>
      </div>

      {/* 1. TOP SECTION: Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl border border-green-100 shadow-sm relative overflow-hidden">
           <div className="relative z-10">
            <p className="text-sm font-medium text-slate-500 mb-1">Total Income</p>
            <h3 className="text-3xl font-bold text-slate-800">R{totalIncome.toLocaleString()}</h3>
           </div>
           <TrendingUp className="absolute right-4 bottom-4 w-16 h-16 text-green-50 opacity-50" />
           <div className="absolute top-0 right-0 w-2 h-full bg-green-500" />
        </div>

        <div className="bg-white p-6 rounded-xl border border-red-100 shadow-sm relative overflow-hidden">
           <div className="relative z-10">
            <p className="text-sm font-medium text-slate-500 mb-1">Total Expenses</p>
            <h3 className="text-3xl font-bold text-slate-800">R{totalExpenses.toLocaleString()}</h3>
           </div>
           <TrendingDown className="absolute right-4 bottom-4 w-16 h-16 text-red-50 opacity-50" />
           <div className="absolute top-0 right-0 w-2 h-full bg-red-500" />
        </div>

        <div className="bg-white p-6 rounded-xl border border-blue-100 shadow-sm relative overflow-hidden">
           <div className="relative z-10">
            <p className="text-sm font-medium text-slate-500 mb-1">Current Savings</p>
            <h3 className={`text-3xl font-bold ${savings >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                R{savings.toLocaleString()}
            </h3>
           </div>
           <PiggyBank className="absolute right-4 bottom-4 w-16 h-16 text-blue-50 opacity-50" />
           <div className={`absolute top-0 right-0 w-2 h-full ${savings >= 0 ? 'bg-blue-500' : 'bg-red-500'}`} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 2. CENTER SECTION: Interactive Pie Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-[350px] flex flex-col">
          <h3 className="text-lg font-semibold mb-4 text-slate-800">Income vs Expenses</h3>
          <div className="w-full h-[250px]" ref={chartRef}>
             {totalIncome === 0 && totalExpenses === 0 ? (
                 <div className="h-full flex items-center justify-center text-slate-400">
                     No data available
                 </div>
             ) : (
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                    <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={110}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                    >
                        {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip 
                        formatter={(value: number) => `R${value.toLocaleString()}`}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" />
                    </PieChart>
                </ResponsiveContainer>
             )}
          </div>
        </div>

        {/* 3. RIGHT SECTION: Action Buttons */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center space-y-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Quick Actions</h3>
            <button 
                onClick={() => openModal('income')}
                className="w-full flex items-center justify-between p-4 bg-green-50 text-green-700 rounded-xl hover:bg-green-100 transition border border-green-200 group"
            >
                <span className="font-semibold">Add Income</span>
                <div className="bg-white p-2 rounded-full shadow-sm group-hover:scale-110 transition">
                    <Plus className="w-5 h-5 text-green-600" />
                </div>
            </button>

            <button 
                onClick={() => openModal('expense')}
                className="w-full flex items-center justify-between p-4 bg-red-50 text-red-700 rounded-xl hover:bg-red-100 transition border border-red-200 group"
            >
                <span className="font-semibold">Add Expense</span>
                <div className="bg-white p-2 rounded-full shadow-sm group-hover:scale-110 transition">
                    <Plus className="w-5 h-5 text-red-600" />
                </div>
            </button>
            
            <div className="text-xs text-slate-400 text-center mt-4 pt-4 border-t border-slate-100">
                Data is automatically saved to your device.
            </div>
        </div>
      </div>

      {/* 4. BOTTOM SECTION: Transaction List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-4 flex-wrap">
            <h3 className="font-semibold text-slate-700">Transaction History</h3>
            <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Search transactions..." 
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="pl-9 pr-4 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                />
            </div>
        </div>
        
        <div className="max-h-[400px] overflow-y-auto">
            {filteredTransactions.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                    No transactions found. Start adding your finances!
                </div>
            ) : (
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 sticky top-0">
                        <tr>
                            <th className="px-6 py-3 font-medium">Description</th>
                            <th className="px-6 py-3 font-medium">Category</th>
                            <th className="px-6 py-3 font-medium">Date</th>
                            <th className="px-6 py-3 font-medium text-right">Amount</th>
                            <th className="px-6 py-3 font-medium text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredTransactions.map((t) => (
                            <tr key={t.id} className="hover:bg-slate-50/50 transition">
                                <td className="px-6 py-4 font-medium text-slate-700 flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${t.type === 'income' ? 'bg-green-500' : 'bg-red-500'}`} />
                                    {t.description}
                                </td>
                                <td className="px-6 py-4 text-slate-500">
                                    <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs">{t.category}</span>
                                </td>
                                <td className="px-6 py-4 text-slate-500">{t.date}</td>
                                <td className={`px-6 py-4 text-right font-semibold ${t.type === 'income' ? 'text-green-600' : 'text-slate-800'}`}>
                                    {t.type === 'income' ? '+' : '-'} R{t.amount.toLocaleString()}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <button 
                                        onClick={() => handleDelete(t.id)}
                                        className="text-slate-400 hover:text-red-500 transition p-1 rounded hover:bg-red-50"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
      </div>

      {/* Add Transaction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-slate-800 capitalize">Add {modalType}</h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                        <input 
                            type="text" 
                            className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                            placeholder="e.g. Salary, Groceries"
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                        <select 
                            className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                            value={formData.category}
                            onChange={(e) => setFormData({...formData, category: e.target.value})}
                        >
                            {CATEGORIES[modalType].map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Amount (R)</label>
                        <input 
                            type="number" 
                            className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                            placeholder="0.00"
                            value={formData.amount}
                            onChange={(e) => setFormData({...formData, amount: e.target.value})}
                        />
                    </div>
                    <button 
                        onClick={handleAddTransaction}
                        className={`w-full py-3 rounded-lg text-white font-semibold transition mt-2 ${
                            modalType === 'income' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                        }`}
                    >
                        Save {modalType}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Export Settings Modal */}
      {isExportModalOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <FileDown className="w-5 h-5 text-blue-600" />
                        Export Settings
                    </h3>
                    <button onClick={() => setIsExportModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                    {/* Date Range */}
                    <div>
                        <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-500" /> Date Range
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-slate-500 mb-1 block">Start Date</label>
                                <input 
                                    type="date" 
                                    value={exportConfig.startDate}
                                    onChange={(e) => setExportConfig({...exportConfig, startDate: e.target.value})}
                                    className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 mb-1 block">End Date</label>
                                <input 
                                    type="date" 
                                    value={exportConfig.endDate}
                                    onChange={(e) => setExportConfig({...exportConfig, endDate: e.target.value})}
                                    className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Content Selection */}
                    <div>
                        <h4 className="text-sm font-semibold text-slate-900 mb-3">Content to Include</h4>
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm text-slate-700">
                                <input 
                                    type="checkbox" 
                                    checked={exportConfig.includeSummary}
                                    onChange={(e) => setExportConfig({...exportConfig, includeSummary: e.target.checked})}
                                    className="rounded text-blue-600 focus:ring-blue-500"
                                />
                                Include Summary Cards
                            </label>
                            <label className="flex items-center gap-2 text-sm text-slate-700">
                                <input 
                                    type="checkbox" 
                                    checked={exportConfig.includeChart}
                                    onChange={(e) => setExportConfig({...exportConfig, includeChart: e.target.checked})}
                                    className="rounded text-blue-600 focus:ring-blue-500"
                                />
                                Include Pie Chart
                            </label>
                             <label className="flex items-center gap-2 text-sm text-slate-700">
                                <input 
                                    type="checkbox" 
                                    checked={exportConfig.includeTransactions}
                                    onChange={(e) => setExportConfig({...exportConfig, includeTransactions: e.target.checked})}
                                    className="rounded text-blue-600 focus:ring-blue-500"
                                />
                                Include Transaction Table
                            </label>
                        </div>
                    </div>

                     {/* Security */}
                     <div>
                        <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                            <Lock className="w-4 h-4 text-slate-500" /> Security
                        </h4>
                        <div className="space-y-2">
                            <input 
                                type="password" 
                                placeholder="Set Password (Optional)"
                                value={exportConfig.password}
                                onChange={(e) => setExportConfig({...exportConfig, password: e.target.value})}
                                className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                            />
                            <p className="text-xs text-slate-400">Leave blank for no password protection.</p>
                        </div>
                    </div>

                     {/* Category Filter */}
                     <div>
                        <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                            <Filter className="w-4 h-4 text-slate-500" /> Exclude Categories
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {[...CATEGORIES.income, ...CATEGORIES.expense, 'Uncategorized'].map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => {
                                        const excluded = exportConfig.excludedCategories.includes(cat)
                                            ? exportConfig.excludedCategories.filter(c => c !== cat)
                                            : [...exportConfig.excludedCategories, cat];
                                        setExportConfig({...exportConfig, excludedCategories: excluded});
                                    }}
                                    className={`text-xs px-2 py-1 rounded border transition ${
                                        exportConfig.excludedCategories.includes(cat)
                                            ? 'bg-red-50 border-red-200 text-red-600 line-through'
                                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button 
                        onClick={generatePDF}
                        disabled={isGeneratingPdf}
                        className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition flex justify-center items-center gap-2"
                    >
                        {isGeneratingPdf ? 'Generating...' : 'Download PDF Report'}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
