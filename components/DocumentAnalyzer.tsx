
import React, { useState, useRef, useEffect } from 'react';
import { analyzeDocument } from '../services/geminiService';
import { UploadCloud, FileSearch, Check, AlertCircle, Loader2, Table, Wallet, Download, CheckCircle2, AlertTriangle, Edit2, Search, ArrowRight, Trash2, Clock, RotateCcw } from 'lucide-react';
import { ExtractedTransaction, FinancialMember } from '../types';

interface DocumentAnalyzerProps {
  members: FinancialMember[];
  onImportTransactions: (transactions: ExtractedTransaction[]) => void;
}

const STORAGE_KEY = 'fc_document_analysis';

export const DocumentAnalyzer: React.FC<DocumentAnalyzerProps> = ({ members, onImportTransactions }) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [resultText, setResultText] = useState<string | null>(null); // The Markdown part
  const [extractedData, setExtractedData] = useState<ExtractedTransaction[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [lastAnalyzed, setLastAnalyzed] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'analysis' | 'contributions'>('analysis');
  const [filter, setFilter] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loadingStorage, setLoadingStorage] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load from LocalStorage on mount
  useEffect(() => {
    const loadSavedData = () => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                setPreview(parsed.preview || null);
                setResultText(parsed.resultText || null);
                setExtractedData(parsed.extractedData || []);
                setLastAnalyzed(parsed.timestamp || null);
                
                // Auto-switch to contributions if data exists
                if (parsed.extractedData && parsed.extractedData.length > 0) {
                    setActiveTab('contributions');
                }
            }
        } catch (e) {
            console.error("Failed to load saved analysis:", e);
        } finally {
            setLoadingStorage(false);
        }
    };
    loadSavedData();
  }, []);

  // Helper to save state to LocalStorage
  const persistResults = (
      newPreview: string | null, 
      newResultText: string | null, 
      newExtractedData: ExtractedTransaction[], 
      newTimestamp: string | null
  ) => {
      try {
          const dataToSave = {
              preview: newPreview,
              resultText: newResultText,
              extractedData: newExtractedData,
              timestamp: newTimestamp
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
      } catch (e) {
          console.warn("Storage quota exceeded. Saving results without image preview.");
          try {
              // Fallback: Save without the large preview string
              const dataToSaveNoImg = {
                  preview: null,
                  resultText: newResultText,
                  extractedData: newExtractedData,
                  timestamp: newTimestamp
              };
              localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSaveNoImg));
          } catch (e2) {
              console.error("Failed to save analysis results:", e2);
          }
      }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newPreview = reader.result as string;
        setPreview(newPreview);
        setResultText(null);
        setExtractedData([]);
        setLastAnalyzed(null);
        
        // Clear storage for new file
        localStorage.removeItem(STORAGE_KEY);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearResults = () => {
      if (window.confirm("Are you sure you want to clear the saved analysis results?")) {
          setPreview(null);
          setResultText(null);
          setExtractedData([]);
          setLastAnalyzed(null);
          localStorage.removeItem(STORAGE_KEY);
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  const handleAnalyze = async () => {
    if (!preview) return;
    
    setAnalyzing(true);
    setExtractedData([]);
    try {
      // Remove data:image/png;base64, prefix
      const base64Data = preview.split(',')[1];
      const mimeType = preview.split(';')[0].split(':')[1];
      
      const fullResponse = await analyzeDocument(base64Data, mimeType);
      
      // Parse Response: Separate JSON block from Text
      const jsonStart = fullResponse.indexOf('```json');
      const jsonEnd = fullResponse.lastIndexOf('```');
      
      let markdown = fullResponse;
      let jsonData: any[] = [];

      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        // Extract JSON
        const jsonString = fullResponse.substring(jsonStart + 7, jsonEnd).trim();
        try {
          jsonData = JSON.parse(jsonString);
          // Remove JSON block from display text to avoid duplication
          markdown = fullResponse.substring(0, jsonStart);
        } catch (e) {
          console.error("Failed to parse extracted JSON", e);
        }
      }

      // Process extracted data
      const processedTransactions: ExtractedTransaction[] = jsonData.map((item: any, index: number) => {
        // Smart Match: Try to find member by name
        let matchedMemberId = undefined;
        let status: 'Verified' | 'Needs Review' = 'Needs Review';
        
        if (item.memberName) {
            const match = members.find(m => m.name.toLowerCase() === item.memberName.toLowerCase());
            if (match) {
                matchedMemberId = match.id;
                status = 'Verified';
            }
        }

        return {
            id: `ext-${Date.now()}-${index}`,
            date: item.date,
            description: item.description,
            amount: item.amount,
            memberName: item.memberName,
            paymentMethod: item.paymentMethod,
            type: item.type,
            status: status,
            matchedMemberId
        };
      });
      
      const timestamp = new Date().toLocaleString();

      setResultText(markdown);
      setExtractedData(processedTransactions);
      setLastAnalyzed(timestamp);
      
      // Save to storage
      persistResults(preview, markdown, processedTransactions, timestamp);
      
      // Auto-switch tab if transactions found
      if (processedTransactions.length > 0) {
        setActiveTab('contributions');
      }

    } catch (error) {
      setResultText("Error analyzing document. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  // Helper: Update transaction when user edits or confirms
  const updateTransaction = (id: string, updates: Partial<ExtractedTransaction>) => {
    setExtractedData(prev => {
        const newData = prev.map(t => {
            if (t.id === id) {
                const updated = { ...t, ...updates };
                // Re-check match if name changed
                if (updates.memberName) {
                    const match = members.find(m => m.name.toLowerCase() === updates.memberName!.toLowerCase());
                    if (match) {
                        updated.matchedMemberId = match.id;
                        updated.status = 'Verified';
                    } else {
                        updated.matchedMemberId = undefined;
                        updated.status = 'Needs Review';
                    }
                }
                return updated;
            }
            return t;
        });
        
        // Save updates to storage
        persistResults(preview, resultText, newData, lastAnalyzed);
        return newData;
    });
  };

  const handleManualMatch = (id: string, memberId: string) => {
     const member = members.find(m => m.id === memberId);
     if (member) {
         updateTransaction(id, { 
             memberName: member.name, 
             matchedMemberId: member.id, 
             status: 'Verified' 
        });
     }
  };

  const handleImport = () => {
    const verified = extractedData.filter(t => t.status === 'Verified' && t.matchedMemberId);
    if (verified.length === 0) return;
    
    if (confirm(`Import ${verified.length} verified transactions to the financial records?`)) {
        onImportTransactions(verified);
        // Do we clear results after import? 
        // Let's keep them but maybe notify. 
        // For now, simpler to just alert.
        alert("Transactions successfully imported!");
    }
  };

  const handleExportCSV = () => {
    const headers = ["Date", "Member", "Description", "Method", "Amount", "Status"];
    const rows = extractedData.map(t => [
        t.date,
        t.memberName || "Unknown",
        `"${t.description}"`,
        t.paymentMethod,
        t.amount.toString(),
        t.status
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
        + headers.join(",") + "\n" 
        + rows.map(e => e.join(",")).join("\n");
        
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "extracted_contributions.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Stats
  const totalAmount = extractedData.reduce((acc, t) => acc + t.amount, 0);
  const totalVerified = extractedData.filter(t => t.status === 'Verified').length;
  const cashCount = extractedData.filter(t => t.paymentMethod === 'Cash').length;
  const eftCount = extractedData.filter(t => t.paymentMethod === 'EFT').length;

  const filteredData = extractedData.filter(t => 
    (t.memberName?.toLowerCase().includes(filter.toLowerCase()) || '') ||
    t.description.toLowerCase().includes(filter.toLowerCase())
  );

  if (loadingStorage) {
      return (
          <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
      );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileSearch className="w-6 h-6 text-purple-600" />
            Document Hub & Analysis
        </h2>
        
        {(resultText || extractedData.length > 0) && (
            <div className="flex items-center gap-3">
                 {lastAnalyzed && (
                    <div className="text-xs text-slate-500 flex items-center gap-1 bg-slate-100 px-3 py-1 rounded-full">
                        <Clock className="w-3 h-3" />
                        Last Analyzed: {lastAnalyzed}
                    </div>
                )}
                <button 
                    onClick={handleClearResults}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition"
                >
                    <Trash2 className="w-3 h-3" />
                    Clear Results
                </button>
            </div>
        )}
      </div>
      
      {/* Upload Section */}
      <div className={`bg-white rounded-xl border border-slate-200 shadow-sm text-center transition-all duration-300 ${resultText || extractedData.length > 0 ? 'p-4 flex flex-row items-center justify-between' : 'p-8'}`}>
        
        {/* Compact View when results exist */}
        {(resultText || extractedData.length > 0) ? (
            <div className="flex items-center gap-4 w-full">
                <div className="flex items-center gap-4 flex-1">
                    {preview ? (
                        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                             <img src={preview} alt="Doc" className="w-16 h-16 object-cover rounded border border-slate-200" />
                             <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded transition text-white text-xs">Change</div>
                        </div>
                    ) : (
                         <div onClick={() => fileInputRef.current?.click()} className="w-16 h-16 bg-slate-100 rounded flex items-center justify-center cursor-pointer hover:bg-slate-200">
                             <UploadCloud className="w-6 h-6 text-slate-400" />
                         </div>
                    )}
                    <div className="text-left">
                        <h4 className="font-semibold text-slate-700">Current Document</h4>
                        <p className="text-xs text-slate-500">Click image to upload new</p>
                    </div>
                </div>
                
                <button 
                    onClick={handleAnalyze} 
                    disabled={analyzing}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium text-sm disabled:opacity-50 transition"
                >
                    {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                    Re-Analyze
                </button>
            </div>
        ) : (
            /* Full View when no results */
            <>
                <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 rounded-lg p-12 hover:bg-slate-50 cursor-pointer transition flex flex-col items-center justify-center group"
                >
                {preview ? (
                    <img src={preview} alt="Preview" className="max-h-64 rounded shadow-md mb-4" />
                ) : (
                    <div className="bg-purple-100 p-4 rounded-full mb-4 text-purple-600 group-hover:scale-110 transition">
                    <UploadCloud className="w-8 h-8" />
                    </div>
                )}
                <p className="text-slate-600 font-medium">Click to upload Bank Statement or Invoice</p>
                <p className="text-slate-400 text-sm mt-2">Supports JPG, PNG</p>
                </div>
                
                {preview && (
                <div className="mt-6">
                    <button 
                    onClick={handleAnalyze} 
                    disabled={analyzing}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-lg flex items-center gap-2 font-medium mx-auto disabled:opacity-50 shadow-sm hover:shadow-md transition"
                    >
                    {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Analyze with AI
                    </button>
                </div>
                )}
            </>
        )}
        
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          className="hidden" 
          accept="image/*"
        />
      </div>

      {(resultText || extractedData.length > 0) && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in">
          {/* Tabs */}
          <div className="flex border-b border-slate-200 bg-slate-50">
            <button
              onClick={() => setActiveTab('analysis')}
              className={`px-6 py-3 text-sm font-medium transition ${
                activeTab === 'analysis' 
                  ? 'bg-white text-blue-600 border-b-2 border-blue-600' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              AI Analysis Result
            </button>
            <button
              onClick={() => setActiveTab('contributions')}
              className={`px-6 py-3 text-sm font-medium transition flex items-center gap-2 ${
                activeTab === 'contributions' 
                  ? 'bg-white text-blue-600 border-b-2 border-blue-600' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Member Contributions
              {extractedData.length > 0 && (
                <span className="bg-blue-100 text-blue-600 text-xs px-2 py-0.5 rounded-full">{extractedData.length}</span>
              )}
            </button>
          </div>

          <div className="p-6">
            {/* Tab 1: Text Analysis */}
            {activeTab === 'analysis' && resultText && (
               <div className="prose prose-slate max-w-none">
                 <h3 className="text-lg font-semibold mb-4 text-slate-800 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-indigo-600" />
                    Document Summary
                 </h3>
                 <div className="bg-slate-50 p-6 rounded-lg border border-slate-100 text-sm leading-relaxed whitespace-pre-wrap">
                    {resultText}
                 </div>
               </div>
            )}

            {/* Tab 2: Extracted Contributions */}
            {activeTab === 'contributions' && (
                <div className="space-y-6">
                    {extractedData.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                            <Wallet className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>No member contributions found in this document.</p>
                            <p className="text-xs mt-1">Try uploading a clearer bank statement.</p>
                        </div>
                    ) : (
                        <>
                            {/* Summary Stats Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                    <p className="text-xs text-blue-600 uppercase font-semibold mb-1">Total Found</p>
                                    <h3 className="text-2xl font-bold text-blue-900">R{totalAmount.toLocaleString()}</h3>
                                </div>
                                <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                                    <p className="text-xs text-green-600 uppercase font-semibold mb-1">Verified Members</p>
                                    <h3 className="text-2xl font-bold text-green-900">{totalVerified} <span className="text-sm font-normal text-green-600">/ {extractedData.length}</span></h3>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Method Breakdown</p>
                                    <div className="flex gap-3 text-sm font-medium">
                                        <span className="text-green-600">{cashCount} Cash</span>
                                        <span className="text-blue-600">{eftCount} EFT</span>
                                    </div>
                                </div>
                                <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 flex flex-col justify-center">
                                    <button 
                                        onClick={handleImport}
                                        disabled={totalVerified === 0}
                                        className="w-full bg-purple-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-purple-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
                                    >
                                        Import {totalVerified} Verified <ArrowRight className="w-4 h-4"/>
                                    </button>
                                </div>
                            </div>

                            {/* Toolbar */}
                            <div className="flex flex-wrap justify-between items-center gap-4">
                                <div className="relative flex-1 max-w-xs">
                                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input 
                                        type="text" 
                                        placeholder="Search name or description..." 
                                        value={filter}
                                        onChange={(e) => setFilter(e.target.value)}
                                        className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                                    />
                                </div>
                                <div className="flex gap-2">
                                     <button 
                                        onClick={handleExportCSV}
                                        className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition"
                                     >
                                        <Download className="w-4 h-4" /> Export CSV
                                     </button>
                                </div>
                            </div>

                            {/* Data Table */}
                            <div className="border border-slate-200 rounded-lg overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 text-slate-500 font-medium">
                                            <tr>
                                                <th className="px-4 py-3">Date</th>
                                                <th className="px-4 py-3">Member Name</th>
                                                <th className="px-4 py-3">Payment</th>
                                                <th className="px-4 py-3">Amount</th>
                                                <th className="px-4 py-3">Description</th>
                                                <th className="px-4 py-3">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {filteredData.map((t) => (
                                                <tr key={t.id} className="hover:bg-slate-50/50 transition">
                                                    <td className="px-4 py-3 whitespace-nowrap text-slate-600">{t.date}</td>
                                                    <td className="px-4 py-3">
                                                        {editingId === t.id ? (
                                                            <div className="flex gap-1 items-center">
                                                                <select 
                                                                    className="p-1 border rounded text-xs w-32"
                                                                    autoFocus
                                                                    onChange={(e) => {
                                                                        handleManualMatch(t.id, e.target.value);
                                                                        setEditingId(null);
                                                                    }}
                                                                    onBlur={() => setEditingId(null)}
                                                                >
                                                                    <option value="">Select Member...</option>
                                                                    {members.map(m => (
                                                                        <option key={m.id} value={m.id}>{m.name}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        ) : (
                                                            <div 
                                                                className="flex items-center gap-2 cursor-pointer group"
                                                                onClick={() => setEditingId(t.id)}
                                                            >
                                                                <span className={`font-medium ${t.memberName ? 'text-slate-800' : 'text-slate-400 italic'}`}>
                                                                    {t.memberName || "Unknown"}
                                                                </span>
                                                                <Edit2 className="w-3 h-3 text-slate-300 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition" />
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                            t.paymentMethod === 'Cash' 
                                                                ? 'bg-green-100 text-green-700' 
                                                                : 'bg-blue-100 text-blue-700'
                                                        }`}>
                                                            {t.paymentMethod}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 font-semibold text-slate-700">R{t.amount.toLocaleString()}</td>
                                                    <td className="px-4 py-3 text-xs text-slate-500 max-w-[200px] truncate" title={t.description}>
                                                        {t.description}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {t.status === 'Verified' ? (
                                                            <span className="flex items-center gap-1 text-green-600 text-xs font-medium">
                                                                <CheckCircle2 className="w-3 h-3" /> Verified
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center gap-1 text-orange-500 text-xs font-medium">
                                                                <AlertTriangle className="w-3 h-3" /> Review
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div className="text-center text-xs text-slate-400">
                                Click on a member name to manually assign if not automatically matched.
                            </div>
                        </>
                    )}
                </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
