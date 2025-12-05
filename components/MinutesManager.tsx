import React, { useState, useEffect } from 'react';
import { generateMeetingMinutes, generateSpeech } from '../services/geminiService';
import { Loader2, Mic, Play, Square, FileText, Download, Copy, Check, Save, RotateCcw, Trash2 } from 'lucide-react';

interface MinutesManagerProps {
  initialNextMeeting?: string;
  onNextMeetingChange?: (value: string) => void;
}

export const MinutesManager: React.FC<MinutesManagerProps> = ({ 
  initialNextMeeting = '', 
  onNextMeetingChange 
}) => {
  const [mode, setMode] = useState<'create' | 'view'>('create');
  const [loading, setLoading] = useState(false);
  const [generatedMinutes, setGeneratedMinutes] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [draftAvailable, setDraftAvailable] = useState(false);
  
  // Audio state
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null); // eslint-disable-line @typescript-eslint/no-unused-vars
  const [audioSource, setAudioSource] = useState<AudioBufferSourceNode | null>(null);

  const [formData, setFormData] = useState({
    venue: '',
    date: new Date().toISOString().split('T')[0],
    host: '',
    attendance: '',
    absents: '',
    agenda: '',
    finances: '',
    mattersArising: '',
    newMatters: '',
    announcements: '',
    nextMeeting: initialNextMeeting,
    closure: ''
  });

  // Check for draft on mount
  useEffect(() => {
    const saved = localStorage.getItem('minutes_draft');
    if (saved) {
      setDraftAvailable(true);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    // Update parent state for Next Meeting sidebar display
    if (name === 'nextMeeting' && onNextMeetingChange) {
      onNextMeetingChange(value);
    }
  };

  const handleSaveDraft = () => {
    localStorage.setItem('minutes_draft', JSON.stringify(formData));
    setDraftAvailable(true);
    // Visual feedback could be added here, but button state change is often enough
    alert("Draft saved successfully!");
  };

  const handleLoadDraft = () => {
    const saved = localStorage.getItem('minutes_draft');
    if (saved) {
      const parsed = JSON.parse(saved);
      setFormData(parsed);
      // Update next meeting in parent if it was part of the draft
      if (parsed.nextMeeting && onNextMeetingChange) {
        onNextMeetingChange(parsed.nextMeeting);
      }
    }
  };

  const handleDiscardDraft = () => {
    localStorage.removeItem('minutes_draft');
    setDraftAvailable(false);
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const result = await generateMeetingMinutes(formData);
      setGeneratedMinutes(result);
      setMode('view');
    } catch (e) {
      alert("Error generating minutes");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([generatedMinutes], {type: 'text/markdown'});
    element.href = URL.createObjectURL(file);
    element.download = `Meeting_Minutes_${formData.date}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedMinutes);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleReadAloud = async () => {
    if (isPlaying) {
      audioSource?.stop();
      setIsPlaying(false);
      return;
    }

    if (!generatedMinutes) return;

    try {
      setIsPlaying(true);
      const buffer = await generateSpeech(generatedMinutes.substring(0, 500)); // Limit length for demo latency
      
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      setAudioContext(ctx);
      
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.onended = () => setIsPlaying(false);
      source.start();
      setAudioSource(source);

    } catch (error) {
      console.error(error);
      setIsPlaying(false);
      alert("Failed to generate speech");
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <FileText className="w-6 h-6 text-blue-600" />
          Minutes Manager
        </h2>
        <div className="flex gap-2">
            <button 
                onClick={() => setMode('create')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${mode === 'create' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border'}`}
            >
                Create
            </button>
             <button 
                onClick={() => setMode('view')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${mode === 'view' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border'}`}
                disabled={!generatedMinutes}
            >
                View Result
            </button>
        </div>
      </div>

      {mode === 'create' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-fade-in">
          {draftAvailable && (
            <div className="mb-6 bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-800">
                <FileText className="w-5 h-5" />
                <span className="font-medium">A saved draft was found.</span>
              </div>
              <div className="flex gap-2">
                 <button 
                  onClick={handleLoadDraft}
                  className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-2 transition"
                 >
                   <RotateCcw className="w-4 h-4" /> Load Draft
                 </button>
                 <button 
                  onClick={handleDiscardDraft}
                  className="px-3 py-1.5 bg-white text-red-600 border border-red-200 text-sm rounded-lg hover:bg-red-50 flex items-center gap-2 transition"
                 >
                   <Trash2 className="w-4 h-4" /> Discard
                 </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Venue</label>
                <input type="text" name="venue" value={formData.venue} onChange={handleInputChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. The Smith's Residence" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                <input type="date" name="date" value={formData.date} onChange={handleInputChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Host</label>
                <input type="text" name="host" value={formData.host} onChange={handleInputChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Attendees</label>
                <textarea name="attendance" value={formData.attendance} onChange={handleInputChange} className="w-full p-2 border rounded-lg h-24 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="John, Jane, Mike..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Absents / Apologies</label>
                <textarea name="absents" value={formData.absents} onChange={handleInputChange} className="w-full p-2 border rounded-lg h-24 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Sarah, Tom..." />
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Agenda Items</label>
                <textarea name="agenda" value={formData.agenda} onChange={handleInputChange} className="w-full p-2 border rounded-lg h-24 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="1. Welcome&#10;2. Finances..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Finances</label>
                <textarea name="finances" value={formData.finances} onChange={handleInputChange} className="w-full p-2 border rounded-lg h-24 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Total collected, Arrears report..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Matters Arising</label>
                <textarea name="mattersArising" value={formData.mattersArising} onChange={handleInputChange} className="w-full p-2 border rounded-lg h-24 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Discussion on previous minutes..." />
              </div>
               <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New Matters</label>
                <textarea name="newMatters" value={formData.newMatters} onChange={handleInputChange} className="w-full p-2 border rounded-lg h-24 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="New topics discussed..." />
              </div>
               <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Announcements</label>
                <textarea name="announcements" value={formData.announcements} onChange={handleInputChange} className="w-full p-2 border rounded-lg h-20 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Birthdays, Weddings..." />
              </div>
               <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Next Meeting</label>
                <input type="text" name="nextMeeting" value={formData.nextMeeting} onChange={handleInputChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Date and Venue" />
              </div>
               <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Closure</label>
                <input type="text" name="closure" value={formData.closure} onChange={handleInputChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Time ended" />
              </div>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
             <button 
                onClick={handleSaveDraft}
                className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg flex items-center gap-2 font-medium hover:bg-slate-50 transition"
            >
                <Save className="w-4 h-4" />
                Save Draft
            </button>
            <button 
                onClick={handleGenerate} 
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 font-medium disabled:opacity-50 transition"
            >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
                Generate Formal Minutes
            </button>
          </div>
        </div>
      )}

      {mode === 'view' && generatedMinutes && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-[70vh] animate-fade-in">
           {/* Toolbar */}
           <div className="flex flex-wrap gap-2 items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
                <h3 className="font-semibold text-slate-700 hidden md:block">Minutes Draft</h3>
                <div className="flex gap-2 w-full md:w-auto justify-end">
                    <button 
                        onClick={handleReadAloud}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition ${isPlaying ? 'bg-red-100 text-red-600' : 'bg-white text-slate-600 border hover:bg-slate-50'}`}
                    >
                        {isPlaying ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                        <span className="hidden sm:inline">{isPlaying ? 'Stop' : 'Read'}</span>
                    </button>
                    <button 
                        onClick={handleCopy}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-white text-slate-600 border hover:bg-slate-50 transition"
                    >
                        {isCopied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                        <span className="hidden sm:inline">{isCopied ? 'Copied' : 'Copy'}</span>
                    </button>
                    <button 
                        onClick={handleDownload}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition"
                    >
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline">Download</span>
                    </button>
                </div>
           </div>
           
           {/* Editable Area */}
           <textarea 
               className="flex-1 w-full p-8 resize-none focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-50/50 font-mono text-sm leading-relaxed text-slate-700 bg-white"
               value={generatedMinutes}
               onChange={(e) => setGeneratedMinutes(e.target.value)}
               placeholder="Minutes content will appear here..."
           />
           <div className="p-2 text-center text-xs text-slate-400 bg-slate-50 rounded-b-xl border-t border-slate-100">
               Edit the text above before downloading to save changes.
           </div>
        </div>
      )}
    </div>
  );
};