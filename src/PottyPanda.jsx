import React, { useState, useEffect, useMemo } from 'react';
import { 
  Droplets, 
  Cookie, 
  History, 
  Settings, 
  Trash2, 
  Edit2, 
  X, 
  Check, 
  Baby, 
  AlertTriangle, 
  ArrowLeft,
  Coffee,
  Calendar,
  ChevronRight,
  Users,
  UserPlus,
  Share,
  MessageSquare,
  Heart,
  ExternalLink
} from 'lucide-react';

/* --- COMPONENT: Potty Panda ---
  A mobile-first potty training tracker.
  Features:
  - LocalStorage persistence
  - Child Profiles (Multi-user support)
  - Custom Modals for reliability (Replaces window.confirm)
  - Rename Profiles
  - Export Logs to Clipboard
  - Optional Notes per log
  - Tailwind CSS (auto-injected)
*/

export default function PottyPanda() 
{
  // --- 2. STATE MANAGEMENT ---
  
  // Navigation State
  const [view, setView] = useState('home'); // 'home', 'history', 'settings', 'edit'
  
  // Profiles State
  const [profiles, setProfiles] = useState(() => {
    try {
      const saved = localStorage.getItem('potty_panda_profiles');
      return saved ? JSON.parse(saved) : [{ id: 'default', name: 'My Child' }];
    } catch (e) { return [{ id: 'default', name: 'My Child' }]; }
  });

  const [activeProfileId, setActiveProfileId] = useState(() => {
    return localStorage.getItem('potty_panda_active_profile') || 'default';
  });

  // Logs State
  const [logs, setLogs] = useState(() => {
    try {
      const saved = localStorage.getItem('potty_panda_logs');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  // UI State
  const [status, setStatus] = useState('success'); 
  const [incidentType, setIncidentType] = useState('pee'); 
  const [note, setNote] = useState(''); // New State for capturing note
  const [editingLog, setEditingLog] = useState(null); 
  const [showToast, setShowToast] = useState(false);
  
  // Modal State
  const [modalConfig, setModalConfig] = useState(null); 
  
  // Profile Management UI State
  const [newProfileName, setNewProfileName] = useState('');
  const [editingProfileId, setEditingProfileId] = useState(null);
  const [renameText, setRenameText] = useState('');

  const [now, setNow] = useState(new Date()); 

  // --- 3. DERIVED STATE ---

  const activeProfile = useMemo(() => {
    return profiles.find(p => p.id === activeProfileId) || profiles[0];
  }, [profiles, activeProfileId]);

  const currentChildLogs = useMemo(() => {
    return logs.filter(log => {
      const logChildId = log.childId || 'default';
      return logChildId === activeProfile.id;
    });
  }, [logs, activeProfile]);

  // --- 4. EFFECTS ---

  useEffect(() => {
    localStorage.setItem('potty_panda_logs', JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    localStorage.setItem('potty_panda_profiles', JSON.stringify(profiles));
    localStorage.setItem('potty_panda_active_profile', activeProfileId);
  }, [profiles, activeProfileId]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // --- 5. LOGIC & HANDLERS ---

  const closeModal = () => setModalConfig(null);

  const addLog = (typeToLog) => {
    const newLog = {
      id: Date.now().toString(),
      childId: activeProfile.id,
      type: typeToLog,
      result: status,
      timestamp: new Date().toISOString(),
      note: note.trim() // Save the note
    };
    setLogs(prev => [newLog, ...prev]);
    setNote(''); // Clear the note input
  };

  const deleteLog = (id) => {
    setModalConfig({
      type: 'confirm',
      title: 'Delete Entry?',
      message: 'Are you sure you want to remove this log? This cannot be undone.',
      onConfirm: () => {
        setLogs(prev => prev.filter(log => log.id !== id));
        closeModal();
      }
    });
  };

  const saveEdit = (id, newType, newResult, newTime, newNote) => {
    setLogs(prev => prev.map(log => {
      if (log.id === id) {
        return { 
          ...log, 
          type: newType, 
          result: newResult, 
          timestamp: newTime,
          note: newNote ? newNote.trim() : ''
        };
      }
      return log;
    }));
    setEditingLog(null);
    setView('history');
  };

  const clearAllHistory = () => {
    const targetId = activeProfile.id;
    setModalConfig({
      type: 'confirm',
      title: `Clear History for ${activeProfile.name}?`,
      message: 'This will permanently delete ALL logs for this profile. This action cannot be undone.',
      onConfirm: () => {
        setLogs(prevLogs => prevLogs.filter(log => {
          const logChildId = log.childId || 'default';
          return logChildId !== targetId;
        }));
        setView('home');
        closeModal();
      }
    });
  };

  const handleAddProfile = () => {
    if (!newProfileName.trim()) return;
    const newId = Date.now().toString();
    const newProfile = { id: newId, name: newProfileName.trim() };
    setProfiles(prev => [...prev, newProfile]);
    setActiveProfileId(newId); 
    setNewProfileName('');
  };

  const handleDeleteProfile = (idToDelete, name) => {
    if (profiles.length <= 1) {
      setModalConfig({
        type: 'alert',
        title: 'Cannot Delete Profile',
        message: 'You must have at least one profile in the app.',
        onConfirm: closeModal
      });
      return;
    }
    
    setModalConfig({
      type: 'confirm',
      title: `Delete ${name}?`,
      message: 'This will remove the profile and permanently delete all their logs. This cannot be undone.',
      onConfirm: () => {
        const newProfiles = profiles.filter(p => p.id !== idToDelete);
        setProfiles(newProfiles);
        
        if (activeProfileId === idToDelete) {
          setActiveProfileId(newProfiles[0].id);
        }

        setLogs(prevLogs => prevLogs.filter(log => {
          const logChildId = log.childId || 'default';
          return logChildId !== idToDelete;
        }));
        
        closeModal();
      }
    });
  };

  const startRenaming = (profile) => {
    setEditingProfileId(profile.id);
    setRenameText(profile.name);
  };

  const saveRename = () => {
    if (!renameText.trim()) return;
    setProfiles(prev => prev.map(p => 
        p.id === editingProfileId ? { ...p, name: renameText.trim() } : p
    ));
    setEditingProfileId(null);
    setRenameText('');
  };

  const handleExport = () => {
    if (currentChildLogs.length === 0) {
      setModalConfig({
        type: 'alert',
        title: 'No Data',
        message: 'There are no logs to export for this profile.',
        onConfirm: closeModal
      });
      return;
    }

    let text = `Potty Panda Log for ${activeProfile.name}\nGenerated on: ${new Date().toLocaleDateString()}\n\n`;
    
    const grouped = {};
    const sortedForExport = [...currentChildLogs].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    sortedForExport.forEach(log => {
      const date = new Date(log.timestamp).toLocaleDateString();
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(log);
    });

    Object.keys(grouped).forEach(date => {
      text += `--- ${date} ---\n`;
      grouped[date].forEach(log => {
        const time = new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        const type = log.type.charAt(0).toUpperCase() + log.type.slice(1);
        const res = log.result === 'success' ? 'Success' : 'Missed';
        const noteStr = log.note ? ` [Note: ${log.note}]` : '';
        text += `[${time}] ${type} - ${res}${noteStr}\n`;
      });
      text += `\n`;
    });

    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err) {
      console.error("Copy failed", err);
      setModalConfig({
        type: 'alert',
        title: 'Copy Failed',
        message: 'Could not auto-copy to clipboard. Please take a screenshot instead.',
        onConfirm: closeModal
      });
    }
    document.body.removeChild(textArea);
  };

  const lastLog = currentChildLogs[0];
  const todayLogs = currentChildLogs.filter(l => new Date(l.timestamp).toDateString() === new Date().toDateString());
  
  const timeAgo = (dateString) => {
    if (!dateString) return "No data yet";
    const seconds = Math.floor((now - new Date(dateString)) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " mins ago";
    return "Just now";
  };

  // --- 6. SUB-COMPONENTS ---

  const Header = ({ title }) => (
    <div className="flex justify-between items-center mb-6">
      <div className="flex flex-col">
        <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
          <Baby className="text-blue-500" /> {title}
        </h1>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-8">
          {activeProfile.name}'s Log
        </span>
      </div>
      <div className="flex gap-2">
        <button onClick={() => setView('history')} className="p-2 bg-white rounded-full shadow-sm text-slate-600 active:bg-slate-100 transition-colors">
          <History size={24} />
        </button>
        <button onClick={() => setView('settings')} className="p-2 bg-white rounded-full shadow-sm text-slate-600 active:bg-slate-100 transition-colors">
          <Settings size={24} />
        </button>
      </div>
    </div>
  );

  const Toast = () => (
    <div className={`fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-full shadow-lg z-[60] flex items-center gap-3 transition-all duration-300 ${showToast ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
      <div className="bg-green-500 rounded-full p-1">
        <Check size={12} className="text-white" strokeWidth={3}/>
      </div>
      <span className="font-bold text-sm">Log copied to clipboard!</span>
    </div>
  );

  const ConfirmationModal = () => {
    if (!modalConfig) return null;
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 transform transition-all scale-100">
          <h3 className="text-xl font-black text-slate-800 mb-2">{modalConfig.title}</h3>
          <p className="text-slate-500 mb-6 font-medium leading-relaxed">{modalConfig.message}</p>
          <div className="flex gap-3">
            {modalConfig.type === 'confirm' && (
              <button 
                onClick={closeModal}
                className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl active:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
            )}
            <button 
              onClick={modalConfig.onConfirm}
              className={`flex-1 py-3 font-bold rounded-xl text-white shadow-lg transform active:scale-95 transition-all ${modalConfig.type === 'alert' ? 'bg-blue-500 hover:bg-blue-600' : 'bg-red-500 hover:bg-red-600'}`}
            >
              {modalConfig.type === 'alert' ? 'OK' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // VIEW: Edit Modal
  if (view === 'edit' && editingLog) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col p-6 animate-in fade-in zoom-in duration-200 font-sans">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => setView('history')} className="p-2 bg-white rounded-full shadow text-slate-600">
            <ArrowLeft />
          </button>
          <h2 className="text-xl font-bold text-slate-800">Edit Log</h2>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-6">
          <div className="text-center mb-2">
             <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full uppercase">
               For: {activeProfile.name}
             </span>
          </div>

          {/* Edit Type */}
          <div>
            <label className="block text-sm font-bold text-slate-500 mb-2">EVENT TYPE</label>
            <div className="flex gap-4">
              <button 
                type="button"
                onClick={() => setEditingLog({...editingLog, type: 'pee'})}
                className={`flex-1 p-4 rounded-xl border-2 flex justify-center items-center gap-2 font-bold transition-all ${editingLog.type === 'pee' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-200 text-slate-400'}`}
              >
                <Droplets size={20}/> Pee
              </button>
              <button 
                type="button"
                onClick={() => setEditingLog({...editingLog, type: 'poop'})}
                className={`flex-1 p-4 rounded-xl border-2 flex justify-center items-center gap-2 font-bold transition-all ${editingLog.type === 'poop' ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-slate-200 text-slate-400'}`}
              >
                <Cookie size={20}/> Poop
              </button>
            </div>
          </div>

          {/* Edit Result */}
          <div>
            <label className="block text-sm font-bold text-slate-500 mb-2">RESULT</label>
            <div className="flex gap-4">
              <button 
                type="button"
                onClick={() => setEditingLog({...editingLog, result: 'success'})}
                className={`flex-1 p-4 rounded-xl border-2 flex justify-center items-center gap-2 font-bold transition-all ${editingLog.result === 'success' ? 'border-green-500 bg-green-50 text-green-600' : 'border-slate-200 text-slate-400'}`}
              >
                <Check size={20}/> Success
              </button>
              <button 
                type="button"
                onClick={() => setEditingLog({...editingLog, result: 'accident'})}
                className={`flex-1 p-4 rounded-xl border-2 flex justify-center items-center gap-2 font-bold transition-all ${editingLog.result === 'accident' ? 'border-slate-500 bg-slate-100 text-slate-600' : 'border-slate-200 text-slate-400'}`}
              >
                <AlertTriangle size={20}/> Potty Missed
              </button>
            </div>
          </div>

          {/* Edit Time */}
          <div>
             <label className="block text-sm font-bold text-slate-500 mb-2">TIME</label>
             <input 
              type="datetime-local" 
              className="w-full p-4 bg-slate-50 rounded-xl border border-slate-200 font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={editingLog.timestamp.slice(0,16)}
              onChange={(e) => setEditingLog({...editingLog, timestamp: e.target.value})}
             />
          </div>

          {/* Edit Note */}
          <div>
             <label className="block text-sm font-bold text-slate-500 mb-2">NOTE</label>
             <input 
              type="text" 
              className="w-full p-4 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Add details (e.g. self-initiated)"
              value={editingLog.note || ''}
              onChange={(e) => setEditingLog({...editingLog, note: e.target.value})}
             />
          </div>

          <button 
            type="button"
            onClick={() => saveEdit(editingLog.id, editingLog.type, editingLog.result, editingLog.timestamp, editingLog.note)}
            className="w-full bg-slate-800 text-white font-bold text-lg py-4 rounded-xl mt-4 active:bg-slate-900 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    );
  }

  // VIEW: Settings
  if (view === 'settings') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col p-6 animate-in slide-in-from-right duration-200 font-sans relative">
        <ConfirmationModal />
        
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => setView('home')} className="p-2 bg-white rounded-full shadow text-slate-600">
            <ArrowLeft />
          </button>
          <h2 className="text-xl font-bold text-slate-800">Settings</h2>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
             <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
               <Users size={20} className="text-blue-500"/> Child Profiles
             </h3>
             <div className="space-y-3 mb-6">
               {profiles.map(profile => (
                 <div 
                   key={profile.id} 
                   onClick={() => !editingProfileId && setActiveProfileId(profile.id)}
                   className={`p-3 rounded-xl flex items-center justify-between cursor-pointer transition-all border-2 ${activeProfileId === profile.id ? 'border-blue-500 bg-blue-50' : 'border-slate-100 hover:border-blue-200'}`}
                 >
                   {editingProfileId === profile.id ? (
                     <div className="flex flex-1 items-center gap-2" onClick={e => e.stopPropagation()}>
                        <input 
                          type="text" 
                          value={renameText}
                          onChange={(e) => setRenameText(e.target.value)}
                          className="flex-1 p-2 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                        <button onClick={saveRename} className="p-2 bg-green-500 text-white rounded-lg">
                          <Check size={16}/>
                        </button>
                        <button onClick={() => setEditingProfileId(null)} className="p-2 bg-slate-200 text-slate-500 rounded-lg">
                          <X size={16}/>
                        </button>
                     </div>
                   ) : (
                     <>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs ${activeProfileId === profile.id ? 'bg-blue-500' : 'bg-slate-300'}`}>
                          {profile.name.charAt(0).toUpperCase()}
                        </div>
                        <span className={`font-bold ${activeProfileId === profile.id ? 'text-blue-700' : 'text-slate-600'}`}>
                          {profile.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={(e) => { e.stopPropagation(); startRenaming(profile); }}
                          className={`p-2 rounded-full hover:bg-black/5 ${activeProfileId === profile.id ? 'text-blue-400' : 'text-slate-300'}`}
                        >
                          <Edit2 size={16} />
                        </button>
                        {activeProfileId === profile.id && <Check size={18} className="text-blue-500"/>}
                      </div>
                     </>
                   )}
                 </div>
               ))}
             </div>

             <div>
               <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Add New Child</label>
               <div className="flex gap-2">
                 <input 
                   type="text" 
                   value={newProfileName}
                   onChange={(e) => setNewProfileName(e.target.value)}
                   placeholder="Name (e.g. Suzie)"
                   className="flex-1 p-3 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                 />
                 <button 
                   type="button"
                   onClick={handleAddProfile}
                   disabled={!newProfileName.trim()}
                   className="bg-slate-800 text-white p-3 rounded-xl disabled:opacity-50"
                 >
                   <UserPlus size={20}/>
                 </button>
               </div>
             </div>

             <div className="mt-4 pt-4 border-t border-slate-100">
               <button 
                 type="button"
                 onClick={() => handleDeleteProfile(activeProfileId, activeProfile.name)}
                 className="text-xs text-red-400 hover:text-red-600 font-bold flex items-center gap-1"
               >
                 <Trash2 size={12}/> Delete Profile: {activeProfile.name}
               </button>
             </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
             <h3 className="font-bold text-slate-800 mb-2">Data Management</h3>
             <p className="text-slate-500 text-sm mb-4">Clears logs ONLY for <strong>{activeProfile.name}</strong>.</p>
             <button 
              type="button"
              onClick={clearAllHistory}
              className="w-full py-3 border-2 border-red-100 text-red-500 font-bold rounded-xl active:bg-red-50 transition-colors"
             >
              Clear History for {activeProfile.name}
             </button>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
             <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
               <Coffee size={20} className="text-orange-400"/> Support Development
             </h3>
            <p className="text-sm text-slate-500 mb-4 leading-relaxed">
              Hi! I built this app for tired parents who are just trying to survive. If you find it useful, consider buying me a coffee to help cover the server costs!
            </p>
            <a
                href="https://ko-fi.com/robogirl96"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 bg-[#FF5E5B] hover:bg-[#ff4642] text-white font-bold rounded-lg transition-transform active:scale-95 shadow-lg shadow-red-900/20"
            >
              <Heart className="w-4 h-4 fill-white" />
              Buy me a Coffee
              <ExternalLink className="w-3 h-3 opacity-70" />
            </a>
          </div>
          
          <div className="text-center mt-8 text-slate-400 text-xs">
            v1.4.0 • Potty Panda
          </div>
        </div>
      </div>
    );
  }

  // VIEW: History
  if (view === 'history') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col p-6 animate-in slide-in-from-right duration-200 font-sans relative">
         <Toast />
         <ConfirmationModal />
         
         <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => setView('home')} className="p-2 bg-white rounded-full shadow text-slate-600">
              <ArrowLeft />
            </button>
            <div className="flex flex-col">
              <h2 className="text-xl font-bold text-slate-800">History Log</h2>
              <span className="text-xs font-bold text-slate-400 uppercase">{activeProfile.name}</span>
            </div>
          </div>
          
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-600 rounded-full font-bold text-sm hover:bg-blue-200 transition-colors"
          >
            <Share size={16} /> Export
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pb-8">
          {currentChildLogs.length === 0 ? (
            <div className="text-center text-slate-400 mt-20">
              <div className="w-16 h-16 bg-slate-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                <History size={32} className="opacity-50"/>
              </div>
              <p>No records for {activeProfile.name} yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {currentChildLogs.map((log) => (
                <div key={log.id} className="bg-white p-4 rounded-xl shadow-sm flex flex-col gap-2 border-l-4 border-transparent"
                     style={{ borderLeftColor: log.result === 'success' ? '#22c55e' : '#64748b' }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${log.type === 'pee' ? 'bg-blue-100 text-blue-500' : 'bg-orange-100 text-orange-500'}`}>
                        {log.type === 'pee' ? <Droplets size={20}/> : <Cookie size={20}/>}
                      </div>
                      <div>
                        <div className="font-bold text-slate-700 capitalize flex items-center gap-2">
                          {log.type}
                          {log.result === 'accident' && <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">Potty Missed</span>}
                        </div>
                        <div className="text-xs text-slate-400">
                          {new Date(log.timestamp).toLocaleDateString()} • {new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                       <button 
                        onClick={() => { setEditingLog(log); setView('edit'); }}
                        className="p-2 text-slate-300 hover:text-blue-500 transition-colors"
                       >
                         <Edit2 size={18} />
                       </button>
                       <button 
                        onClick={() => deleteLog(log.id)}
                        className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                       >
                         <Trash2 size={18} />
                       </button>
                    </div>
                  </div>
                  {/* Note Display in History */}
                  {log.note && (
                    <div className="bg-slate-50 p-2 rounded-lg text-xs text-slate-600 italic ml-14">
                      "{log.note}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // VIEW: Main Dashboard (Default)
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col p-6 max-w-md mx-auto relative font-sans">
      <ConfirmationModal />
      
      <Header title="Potty Panda" />

      {/* Last Went Indicator */}
      <div className="text-center mb-6 py-6 bg-white rounded-3xl shadow-sm border border-slate-100">
        <span className="text-slate-400 font-bold text-xs uppercase tracking-widest">Last went ({activeProfile.name})</span>
        <div className="text-4xl font-black text-slate-700 mt-2 mb-2">
          {lastLog ? timeAgo(lastLog.timestamp) : "..."}
        </div>
        {lastLog && (
           <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold ${lastLog.result === 'success' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-700'}`}>
             {lastLog.result === 'success' ? <Check size={14}/> : <AlertTriangle size={14}/>}
             <span className="uppercase">{lastLog.type} {lastLog.result === 'success' ? 'Success' : 'Missed'}</span>
           </div>
        )}
      </div>

      {/* Main Controls - Capture Block */}
      <div className="flex-1 flex flex-col gap-4">
        
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5 flex flex-col gap-6">
          
          {/* Row 1: What happened? (Type) */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">What happened?</label>
            <div className="flex gap-3">
              <button 
                type="button"
                onClick={() => setIncidentType('pee')}
                className={`flex-1 py-4 rounded-xl flex flex-col items-center justify-center gap-2 transition-all ${incidentType === 'pee' ? 'bg-blue-100 text-blue-600 border-2 border-blue-500 ring-2 ring-blue-200 shadow-sm' : 'bg-slate-50 text-slate-400 border-2 border-transparent'}`}
              >
                <Droplets size={28} strokeWidth={2.5}/>
                <span className="font-bold text-sm">Pee</span>
              </button>
              <button 
                type="button"
                onClick={() => setIncidentType('poop')}
                className={`flex-1 py-4 rounded-xl flex flex-col items-center justify-center gap-2 transition-all ${incidentType === 'poop' ? 'bg-orange-100 text-orange-600 border-2 border-orange-500 ring-2 ring-orange-200 shadow-sm' : 'bg-slate-50 text-slate-400 border-2 border-transparent'}`}
              >
                <Cookie size={28} strokeWidth={2.5}/>
                <span className="font-bold text-sm">Poop</span>
              </button>
            </div>
          </div>

          {/* Row 2: Result (Status) */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Result</label>
            <div className="flex gap-3">
              <button 
                type="button"
                onClick={() => setStatus('success')}
                className={`flex-1 py-4 rounded-xl font-bold flex flex-col md:flex-row items-center justify-center gap-2 transition-all ${status === 'success' ? 'bg-green-100 text-green-700 border-2 border-green-500 shadow-sm' : 'bg-slate-50 text-slate-400 border-2 border-transparent'}`}
              >
                <Check size={24} /> 
                <span className="text-sm">Success</span>
              </button>
              <button 
                type="button"
                onClick={() => setStatus('accident')}
                className={`flex-1 py-4 rounded-xl font-bold flex flex-col md:flex-row items-center justify-center gap-2 transition-all ${status === 'accident' ? 'bg-slate-200 text-slate-600 border-2 border-slate-400 shadow-sm' : 'bg-slate-50 text-slate-400 border-2 border-transparent'}`}
              >
                <AlertTriangle size={24} /> 
                <span className="text-sm">Missed</span>
              </button>
            </div>
          </div>

          {/* Row 2.5: Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Note (Optional)</label>
            <div className="relative">
              <MessageSquare className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Details (e.g. self-initiated, nap time)"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
              />
            </div>
          </div>

          {/* Row 3: Action */}
          <button 
            type="button"
            onClick={() => addLog(incidentType)}
            className="w-full bg-slate-800 text-white text-lg font-black py-5 rounded-2xl shadow-lg active:scale-95 active:bg-slate-900 transition-all flex items-center justify-center gap-3 mt-2"
          >
            <span>LOG INCIDENT FOR {activeProfile.name.toUpperCase()}</span>
            <ChevronRight size={24} strokeWidth={3} />
          </button>
        </div>

        {/* Quick Log Table (Today's Summary) */}
        <div className="mt-4">
          <div className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">Today for {activeProfile.name}</div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            {todayLogs.length === 0 ? (
               <div className="p-6 text-center text-slate-400 text-sm italic">No activity recorded today</div>
            ) : (
               <div className="divide-y divide-slate-100">
                 {todayLogs.map(log => (
                   <div key={log.id} className="p-4 flex flex-col gap-1 group">
                     <div className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                         <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${log.result === 'accident' ? 'bg-slate-400' : (log.type === 'pee' ? 'bg-blue-400' : 'bg-orange-400')}`}>
                           {log.type === 'pee' ? <Droplets size={14}/> : <Cookie size={14}/>}
                         </div>
                         <span className={`font-bold text-sm ${log.result === 'accident' ? 'text-slate-500' : 'text-slate-700'}`}>
                           {log.type.charAt(0).toUpperCase() + log.type.slice(1)} {log.result === 'success' ? 'Success' : 'Missed'}
                         </span>
                       </div>
                       <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-slate-400 mr-1">
                            {new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                          <div className="flex gap-1">
                            <button 
                              onClick={() => { setEditingLog(log); setView('edit'); }}
                              className="p-1.5 text-slate-300 hover:text-blue-500 transition-colors"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={() => deleteLog(log.id)}
                              className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                       </div>
                     </div>
                     {/* Note in Today View */}
                     {log.note && (
                       <div className="text-xs text-slate-500 italic ml-11">
                         "{log.note}"
                       </div>
                     )}
                   </div>
                 ))}
               </div>
            )}
          </div>
        </div>
		{/* Footer */}
      <footer className="py-6 text-center text-xs text-slate-600">
        <p>
          Part of the <a href="https://the-helpful-dev.vercel.app/" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-blue-400 transition-colors">The Helpful Dev</a> Network
        </p>
      </footer>

      </div>
    </div>
  );
}