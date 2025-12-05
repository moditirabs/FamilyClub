import React, { useState, useRef } from 'react';
import { analyzeDocument } from '../services/geminiService';
import { UploadCloud, FileSearch, Check, AlertCircle, Loader2 } from 'lucide-react';

export const DocumentAnalyzer: React.FC = () => {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
        setResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!preview) return;
    
    setAnalyzing(true);
    try {
      // Remove data:image/png;base64, prefix
      const base64Data = preview.split(',')[1];
      const mimeType = preview.split(';')[0].split(':')[1];
      
      const analysis = await analyzeDocument(base64Data, mimeType);
      setResult(analysis);
    } catch (error) {
      setResult("Error analyzing document. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
        <FileSearch className="w-6 h-6 text-purple-600" />
        Document Hub & Analysis
      </h2>
      
      <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center">
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 rounded-lg p-12 hover:bg-slate-50 cursor-pointer transition flex flex-col items-center justify-center"
        >
          {preview ? (
            <img src={preview} alt="Preview" className="max-h-64 rounded shadow-md mb-4" />
          ) : (
            <div className="bg-purple-100 p-4 rounded-full mb-4 text-purple-600">
               <UploadCloud className="w-8 h-8" />
            </div>
          )}
          <p className="text-slate-600 font-medium">Click to upload Bank Statement or Invoice</p>
          <p className="text-slate-400 text-sm mt-2">Supports JPG, PNG</p>
        </div>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          className="hidden" 
          accept="image/*"
        />

        {preview && (
          <div className="mt-6">
            <button 
              onClick={handleAnalyze} 
              disabled={analyzing}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-lg flex items-center gap-2 font-medium mx-auto disabled:opacity-50"
            >
              {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Analyze with AI
            </button>
          </div>
        )}
      </div>

      {result && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-fade-in">
          <h3 className="text-lg font-semibold mb-4 text-slate-800 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-indigo-600" />
            AI Analysis Result
          </h3>
          <div className="prose prose-slate max-w-none bg-slate-50 p-4 rounded-lg border border-slate-100">
            <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700">{result}</pre>
          </div>
        </div>
      )}
    </div>
  );
};
