import React, { useState, useEffect, useMemo } from 'react';
import {
  Droplets, Cookie, History, Settings, Trash2, Edit2, X, Check,
  AlertTriangle, ArrowLeft, Coffee, ChevronRight, Users, UserPlus,
  Share, MessageSquare, Heart, ExternalLink, Home, Download, Copy,
  Shield, Plus, ChevronDown, BarChart2, Calendar, BookOpen
} from 'lucide-react';

/* --- Potty Panda v2 ---
  Redesigned UX: bottom nav, Inter font, new colour palette,
  grouped history, weekly trend chart, Children tab, export bottom sheet.
  All data stored 100% client-side in localStorage.
*/

const PROFILE_COLORS = ['#4F7FFA', '#34C77B', '#F0935A', '#A78BFA', '#FB7185', '#FBBF24'];

// Colour tokens (mirrors redesign_plan.md)
const C = {
  brand:    '#4F7FFA',
  success:  '#34C77B',
  miss:     '#F5A623',
  pee:      '#60AEFF',
  poop:     '#F0935A',
  bg:       '#F4F6FB',
  surface:  '#FFFFFF',
  primary:  '#1A1D2E',
  muted:    '#7A82A0',
  border:   '#E8ECF4',
  danger:   '#E05252',
};

// Tiny helpers for alpha hex backgrounds
const alpha = (hex, pct) => hex + Math.round(pct * 2.55).toString(16).padStart(2, '0');

// ── Curated potty-training articles (SEO resource hub) ──────────────────────
const BLOG_ARTICLES = [
  {
    category: 'Readiness & Getting Started',
    items: [
      {
        title: 'Toilet Training: HealthyChildren.org Guide',
        source: 'American Academy of Pediatrics',
        badge: 'AAP',
        description: 'Official AAP guidance on signs of readiness, timing, and a step-by-step approach recommended by pediatricians.',
        url: 'https://www.healthychildren.org/English/ages-stages/toddler/toilet-training/Pages/default.aspx',
      },
      {
        title: 'Toilet Training: How to Get the Job Done',
        source: 'Mayo Clinic',
        badge: 'Mayo Clinic',
        description: 'Expert-reviewed signs of readiness, equipment tips, and what to do when things don\'t go as planned.',
        url: 'https://www.mayoclinic.org/healthy-lifestyle/infant-and-toddler-health/in-depth/potty-training/art-20045230',
      },
    ],
  },
  {
    category: 'Step-by-Step Guides',
    items: [
      {
        title: 'Potty Training: A Complete Step-by-Step Guide',
        source: 'What to Expect',
        badge: 'WTE',
        description: 'From choosing the right potty seat to celebrating wins — a thorough walkthrough for first-time parents.',
        url: 'https://www.whattoexpect.com/toddler-development/potty-training.aspx',
      },
      {
        title: 'The Ultimate Potty Training Guide',
        source: 'BabyCenter',
        badge: 'BabyCenter',
        description: 'Covers every method — child-led, parent-led, and the popular 3-day method — with real parent tips.',
        url: 'https://www.babycenter.com/toddler/potty-training',
      },
    ],
  },
  {
    category: 'Night Training',
    items: [
      {
        title: 'Bedwetting: What Parents Need to Know',
        source: 'American Academy of Pediatrics',
        badge: 'AAP',
        description: 'AAP guidance on nocturnal enuresis — when it\'s normal, when to see a doctor, and overnight strategies.',
        url: 'https://www.healthychildren.org/English/ages-stages/toddler/toilet-training/Pages/Bedwetting.aspx',
      }
    ],
  },
];

export default function PottyPanda() {

  // ── STATE ───────────────────────────────────────────────────────────────────

  const [view, setView] = useState('home'); // 'home' | 'history' | 'children' | 'settings' | 'edit'

  const [profiles, setProfiles] = useState(() => {
    try {
      const saved = localStorage.getItem('potty_panda_profiles');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Migrate: add colour to profiles created before v2
        return parsed.map((p, i) => ({ color: PROFILE_COLORS[i % PROFILE_COLORS.length], ...p }));
      }
      return [{ id: 'default', name: 'My Child', color: PROFILE_COLORS[0] }];
    } catch { return [{ id: 'default', name: 'My Child', color: PROFILE_COLORS[0] }]; }
  });

  const [activeProfileId, setActiveProfileId] = useState(() =>
    localStorage.getItem('potty_panda_active_profile') || 'default'
  );

  const [logs, setLogs] = useState(() => {
    try {
      const saved = localStorage.getItem('potty_panda_logs');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // Logging form state
  const [incidentType, setIncidentType] = useState('pee');
  const [status, setStatus]             = useState('success');
  const [note, setNote]                 = useState('');
  const [showNote, setShowNote]         = useState(false);

  // Edit state
  const [editingLog, setEditingLog] = useState(null);

  // Toast
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Modal
  const [modalConfig, setModalConfig] = useState(null);

  // Export bottom sheet
  const [showExportModal, setShowExportModal] = useState(false);

  // Profile management
  const [newProfileName, setNewProfileName]   = useState('');
  const [editingProfileId, setEditingProfileId] = useState(null);
  const [renameText, setRenameText]           = useState('');

  // Clock (drives timeAgo refresh every minute)
  const [now, setNow] = useState(new Date());

  // ── DERIVED STATE ───────────────────────────────────────────────────────────

  const activeProfile = useMemo(
    () => profiles.find(p => p.id === activeProfileId) || profiles[0],
    [profiles, activeProfileId]
  );

  const currentChildLogs = useMemo(
    () => logs.filter(l => (l.childId || 'default') === activeProfile.id),
    [logs, activeProfile]
  );

  // History grouped by calendar day, newest first
  const groupedHistory = useMemo(() => {
    const groups = {};
    currentChildLogs.forEach(log => {
      const key = new Date(log.timestamp).toDateString();
      if (!groups[key]) groups[key] = { date: new Date(log.timestamp), logs: [] };
      groups[key].logs.push(log);
    });
    return Object.values(groups).sort((a, b) => b.date - a.date);
  }, [currentChildLogs]);

  // Last 7 days bar chart data
  const weeklyData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const dateStr = d.toDateString();
      const dayLogs = currentChildLogs.filter(l => new Date(l.timestamp).toDateString() === dateStr);
      days.push({
        label:     d.toLocaleDateString('en-US', { weekday: 'short' }),
        total:     dayLogs.length,
        successes: dayLogs.filter(l => l.result === 'success').length,
        isToday:   i === 0,
      });
    }
    return days;
  }, [currentChildLogs]);

  const lastLog   = currentChildLogs[0];
  const todayLogs = useMemo(
    () => currentChildLogs.filter(l => new Date(l.timestamp).toDateString() === new Date().toDateString()),
    [currentChildLogs]
  );

  // ── EFFECTS ─────────────────────────────────────────────────────────────────

  useEffect(() => { localStorage.setItem('potty_panda_logs', JSON.stringify(logs)); }, [logs]);
  useEffect(() => {
    localStorage.setItem('potty_panda_profiles', JSON.stringify(profiles));
    localStorage.setItem('potty_panda_active_profile', activeProfileId);
  }, [profiles, activeProfileId]);
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  // ── HANDLERS ────────────────────────────────────────────────────────────────

  const closeModal = () => setModalConfig(null);

  const toast = (msg) => {
    setToastMessage(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2500);
  };

  const addLog = () => {
    setLogs(prev => [{
      id:        Date.now().toString(),
      childId:   activeProfile.id,
      type:      incidentType,
      result:    status,
      timestamp: new Date().toISOString(),
      note:      note.trim(),
    }, ...prev]);
    setNote('');
    setShowNote(false);
    toast(`${incidentType === 'pee' ? 'Pee' : 'Poop'} logged for ${activeProfile.name}`);
  };

  const deleteLog = (id) => setModalConfig({
    type:         'confirm',
    title:        'Delete Entry?',
    message:      'Are you sure you want to remove this log? This cannot be undone.',
    confirmLabel: 'Delete Entry',
    onConfirm:    () => { setLogs(prev => prev.filter(l => l.id !== id)); closeModal(); },
  });

  const saveEdit = (id, type, result, timestamp, note) => {
    setLogs(prev => prev.map(l => l.id === id ? { ...l, type, result, timestamp, note: (note || '').trim() } : l));
    setEditingLog(null);
    setView('history');
  };

  const clearAllHistory = () => {
    const targetId = activeProfile.id;
    setModalConfig({
      type:         'confirm',
      title:        `Clear History for ${activeProfile.name}?`,
      message:      'This will permanently delete ALL logs for this profile. This cannot be undone.',
      confirmLabel: 'Clear History',
      onConfirm:    () => {
        setLogs(prev => prev.filter(l => (l.childId || 'default') !== targetId));
        setView('home');
        closeModal();
      },
    });
  };

  const handleAddProfile = () => {
    if (!newProfileName.trim()) return;
    const newId    = Date.now().toString();
    const newColor = PROFILE_COLORS[profiles.length % PROFILE_COLORS.length];
    setProfiles(prev => [...prev, { id: newId, name: newProfileName.trim(), color: newColor }]);
    setActiveProfileId(newId);
    setNewProfileName('');
  };

  const handleDeleteProfile = (id, name) => {
    if (profiles.length <= 1) {
      setModalConfig({ type: 'alert', title: 'Cannot Delete', message: 'You must keep at least one profile.', confirmLabel: 'OK', onConfirm: closeModal });
      return;
    }
    setModalConfig({
      type:         'confirm',
      title:        `Delete ${name}?`,
      message:      'This removes the profile and permanently deletes all their logs.',
      confirmLabel: 'Delete Profile',
      onConfirm:    () => {
        const next = profiles.filter(p => p.id !== id);
        setProfiles(next);
        if (activeProfileId === id) setActiveProfileId(next[0].id);
        setLogs(prev => prev.filter(l => (l.childId || 'default') !== id));
        closeModal();
      },
    });
  };

  const saveRename = () => {
    if (!renameText.trim()) return;
    setProfiles(prev => prev.map(p => p.id === editingProfileId ? { ...p, name: renameText.trim() } : p));
    setEditingProfileId(null);
    setRenameText('');
  };

  const buildExportText = () => {
    let text = `Potty Panda Log for ${activeProfile.name}\nGenerated: ${new Date().toLocaleDateString()}\n\n`;
    const grouped = {};
    [...currentChildLogs]
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .forEach(l => {
        const date = new Date(l.timestamp).toLocaleDateString();
        if (!grouped[date]) grouped[date] = [];
        grouped[date].push(l);
      });
    Object.keys(grouped).forEach(date => {
      text += `--- ${date} ---\n`;
      grouped[date].forEach(l => {
        const t    = new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const type = l.type.charAt(0).toUpperCase() + l.type.slice(1);
        const res  = l.result === 'success' ? 'Success' : 'Missed';
        text += `[${t}] ${type} - ${res}${l.note ? ` [Note: ${l.note}]` : ''}\n`;
      });
      text += '\n';
    });
    return text;
  };

  const handleCopyToClipboard = () => {
    const text = buildExportText();
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    try {
      document.execCommand('copy');
      setShowExportModal(false);
      toast('Log copied to clipboard!');
    } catch {
      setModalConfig({ type: 'alert', title: 'Copy Failed', message: 'Could not copy. Try downloading instead.', confirmLabel: 'OK', onConfirm: closeModal });
    }
    document.body.removeChild(el);
  };

  const handleDownloadTxt = () => {
    const text = buildExportText();
    const blob = new Blob([text], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `potty-panda-${activeProfile.name.toLowerCase().replace(/\s+/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportModal(false);
    toast('Log downloaded!');
  };

  // ── UTILITIES ────────────────────────────────────────────────────────────────

  const timeAgo = (dateString) => {
    if (!dateString) return 'No data yet';
    const secs = Math.floor((now - new Date(dateString)) / 1000);
    if (secs < 60) return 'Just now';
    for (const [s, label] of [[31536000,'year'],[2592000,'month'],[86400,'day'],[3600,'hr'],[60,'min']]) {
      const n = Math.floor(secs / s);
      if (n >= 1) return `${n} ${label}${n > 1 ? 's' : ''} ago`;
    }
    return 'Just now';
  };

  const fmtTime = (ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const fmtDayHeader = (date) => {
    const today = new Date();
    const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === today.toDateString())     return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  };

  // ── SHARED SUB-COMPONENTS ────────────────────────────────────────────────────

  // Fixed bottom nav bar
  const BottomNav = () => {
    const tabs = [
      { id: 'home',     Icon: Home,     label: 'Home'     },
      { id: 'history',  Icon: History,  label: 'History'  },
      { id: 'blog',     Icon: BookOpen, label: 'Blog'     },
      { id: 'children', Icon: Users,    label: 'Children' },
      { id: 'settings', Icon: Settings, label: 'Settings' },
    ];
    return (
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t"
        style={{ borderColor: C.border, paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="max-w-sm mx-auto flex">
          {tabs.map(({ id, Icon, label }) => {
            const active = view === id || (id === 'history' && view === 'edit');
            return (
              <button
                key={id}
                onClick={() => setView(id)}
                className="flex-1 flex flex-col items-center gap-1 py-3 transition-colors"
                style={{ color: active ? C.brand : C.muted }}
                aria-label={label}
              >
                <Icon size={21} strokeWidth={active ? 2.5 : 1.8} />
                <span className="text-[10px] font-semibold tracking-wide">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    );
  };

  // App header: logo + active child pill
  const AppHeader = () => (
    <header className="bg-white border-b px-5 py-4 flex items-center justify-between" style={{ borderColor: C.border }}>
      <div className="flex items-center gap-3">
        <img src="/icon.png" alt="Potty Panda" className="w-9 h-9 object-contain rounded-xl" />
        <span className="text-lg font-black tracking-tight" style={{ color: C.primary }}>Potty Panda</span>
      </div>
      <button
        onClick={() => setView('children')}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full border bg-white shadow-sm transition-colors active:bg-slate-50"
        style={{ borderColor: C.border }}
        aria-label={`Switch child — current: ${activeProfile.name}`}
      >
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-black flex-shrink-0"
          style={{ backgroundColor: activeProfile.color }}
        >
          {activeProfile.name.charAt(0).toUpperCase()}
        </div>
        <span className="text-sm font-semibold" style={{ color: C.primary }}>{activeProfile.name}</span>
        <ChevronDown size={13} style={{ color: C.muted }} />
      </button>
    </header>
  );

  // Top-anchored slide-down toast
  const Toast = () => (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none transition-all duration-300"
      style={{ transform: toastVisible ? 'translateY(0)' : 'translateY(-120%)', opacity: toastVisible ? 1 : 0 }}
    >
      <div
        className="mt-3 mx-4 max-w-sm w-full px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3"
        style={{ backgroundColor: C.primary, color: '#fff' }}
      >
        <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: C.success }}>
          <Check size={11} strokeWidth={3} color="#fff" />
        </div>
        <span className="text-sm font-semibold">{toastMessage}</span>
      </div>
    </div>
  );

  // Confirmation / alert modal
  const Modal = () => {
    if (!modalConfig) return null;
    const isDanger = modalConfig.type === 'confirm';
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}>
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6">
          <h3 className="text-xl font-black mb-2" style={{ color: C.primary }}>{modalConfig.title}</h3>
          <p className="font-medium leading-relaxed mb-6" style={{ color: C.muted }}>{modalConfig.message}</p>
          <div className="flex gap-3">
            {modalConfig.type === 'confirm' && (
              <button onClick={closeModal} className="flex-1 py-3 bg-slate-100 font-bold rounded-xl active:bg-slate-200 transition-colors" style={{ color: C.primary }}>
                Cancel
              </button>
            )}
            <button
              onClick={modalConfig.onConfirm}
              className="flex-1 py-3 font-bold rounded-xl text-white transition-colors active:opacity-90"
              style={{ backgroundColor: isDanger ? C.danger : C.brand }}
            >
              {modalConfig.confirmLabel || 'OK'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Export bottom sheet
  const ExportSheet = () => {
    if (!showExportModal) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}>
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 mb-2">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-black" style={{ color: C.primary }}>Export Log</h3>
            <button onClick={() => setShowExportModal(false)} className="p-1.5 rounded-full bg-slate-100 active:bg-slate-200 transition-colors" aria-label="Close export">
              <X size={16} color={C.muted} />
            </button>
          </div>
          {currentChildLogs.length === 0 ? (
            <p className="text-sm text-center py-4" style={{ color: C.muted }}>No logs to export for {activeProfile.name}.</p>
          ) : (
            <div className="space-y-3">
              <button onClick={handleCopyToClipboard} className="w-full flex items-center gap-4 p-4 rounded-2xl border active:bg-slate-50 transition-colors text-left" style={{ borderColor: C.border }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: alpha(C.brand, 12) }}>
                  <Copy size={20} color={C.brand} />
                </div>
                <div>
                  <div className="font-bold text-sm" style={{ color: C.primary }}>Copy to Clipboard</div>
                  <div className="text-xs" style={{ color: C.muted }}>Paste anywhere</div>
                </div>
              </button>
              <button onClick={handleDownloadTxt} className="w-full flex items-center gap-4 p-4 rounded-2xl border active:bg-slate-50 transition-colors text-left" style={{ borderColor: C.border }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: alpha(C.success, 12) }}>
                  <Download size={20} color={C.success} />
                </div>
                <div>
                  <div className="font-bold text-sm" style={{ color: C.primary }}>Download as .txt</div>
                  <div className="text-xs" style={{ color: C.muted }}>Save directly to your device</div>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Shared log row used in Today list and History view
  const LogRow = ({ log }) => (
    <div className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: log.type === 'pee' ? alpha(C.pee, 15) : alpha(C.poop, 15),
                     color: log.type === 'pee' ? C.brand : C.poop }}
          >
            {log.type === 'pee' ? <Droplets size={18} /> : <Cookie size={18} />}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm capitalize" style={{ color: C.primary }}>{log.type}</span>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: log.result === 'success' ? alpha(C.success, 15) : alpha(C.miss, 15),
                  color:           log.result === 'success' ? C.success : C.miss,
                }}
              >
                {log.result === 'success' ? 'Success' : 'Missed'}
              </span>
            </div>
            <span className="text-xs" style={{ color: C.muted }}>{fmtTime(log.timestamp)}</span>
          </div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => { setEditingLog(log); setView('edit'); }}
            className="p-2 rounded-lg transition-colors active:bg-blue-50"
            style={{ color: C.muted }}
            aria-label="Edit log entry"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => deleteLog(log.id)}
            className="p-2 rounded-lg transition-colors active:bg-red-50"
            style={{ color: C.muted }}
            aria-label="Delete log entry"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      {log.note && (
        <div className="mt-2 ml-12 text-xs italic rounded-lg px-3 py-2" style={{ color: C.muted, backgroundColor: '#F4F6FB' }}>
          "{log.note}"
        </div>
      )}
    </div>
  );

  // ── VIEW: EDIT ───────────────────────────────────────────────────────────────

  if (view === 'edit' && editingLog) {
    return (
      <div className="min-h-screen font-sans" style={{ backgroundColor: C.bg }}>
        <Toast />
        <Modal />
        <div className="max-w-sm mx-auto">
          <div className="bg-white border-b px-5 py-4 flex items-center gap-4" style={{ borderColor: C.border }}>
            <button onClick={() => setView('history')} className="p-2 rounded-full bg-slate-100 active:bg-slate-200 transition-colors" aria-label="Back to history">
              <ArrowLeft size={20} color={C.primary} />
            </button>
            <h2 className="text-lg font-black" style={{ color: C.primary }}>Edit Log</h2>
          </div>

          <div className="p-5">
            <div className="bg-white rounded-2xl p-5 border space-y-5" style={{ borderColor: C.border }}>
              <div className="flex justify-center">
                <span
                  className="px-3 py-1.5 rounded-full text-xs font-bold border"
                  style={{ borderColor: activeProfile.color, color: activeProfile.color, backgroundColor: alpha(activeProfile.color, 10) }}
                >
                  For: {activeProfile.name}
                </span>
              </div>

              {/* Type */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-3" style={{ color: C.muted }}>Event Type</label>
                <div className="flex gap-3">
                  {[['pee', 'Pee', <Droplets size={20} />, C.pee, C.brand],
                    ['poop', 'Poop', <Cookie size={20} />, C.poop, C.poop]].map(([type, label, icon, accent, txt]) => (
                    <button
                      key={type}
                      onClick={() => setEditingLog({ ...editingLog, type })}
                      className="flex-1 p-4 rounded-xl border-2 flex justify-center items-center gap-2 font-bold transition-all"
                      style={editingLog.type === type
                        ? { borderColor: accent, backgroundColor: alpha(accent, 10), color: txt }
                        : { borderColor: C.border, color: C.muted }}
                    >
                      {icon} {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Result */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-3" style={{ color: C.muted }}>Result</label>
                <div className="flex gap-3">
                  {[['success', 'Success', <Check size={20} />, C.success],
                    ['accident', 'Missed', <AlertTriangle size={20} />, C.miss]].map(([res, label, icon, accent]) => (
                    <button
                      key={res}
                      onClick={() => setEditingLog({ ...editingLog, result: res })}
                      className="flex-1 p-4 rounded-xl border-2 flex justify-center items-center gap-2 font-bold transition-all"
                      style={editingLog.result === res
                        ? { borderColor: accent, backgroundColor: alpha(accent, 10), color: accent }
                        : { borderColor: C.border, color: C.muted }}
                    >
                      {icon} {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: C.muted }}>Time</label>
                <input
                  type="datetime-local"
                  className="w-full p-4 rounded-xl border font-mono text-sm focus:outline-none focus:ring-2"
                  style={{ borderColor: C.border, backgroundColor: C.bg, color: C.primary, '--tw-ring-color': C.brand }}
                  value={editingLog.timestamp.slice(0, 16)}
                  onChange={(e) => setEditingLog({ ...editingLog, timestamp: e.target.value })}
                />
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: C.muted }}>Note</label>
                <input
                  type="text"
                  className="w-full p-4 rounded-xl border text-sm focus:outline-none focus:ring-2"
                  style={{ borderColor: C.border, backgroundColor: C.bg, color: C.primary, '--tw-ring-color': C.brand }}
                  placeholder="Add details (e.g. self-initiated)"
                  value={editingLog.note || ''}
                  onChange={(e) => setEditingLog({ ...editingLog, note: e.target.value })}
                />
              </div>

              <button
                onClick={() => saveEdit(editingLog.id, editingLog.type, editingLog.result, editingLog.timestamp, editingLog.note)}
                className="w-full text-white font-bold text-base py-4 rounded-xl active:scale-95 transition-all"
                style={{ backgroundColor: C.brand }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  // ── VIEW: SETTINGS ───────────────────────────────────────────────────────────

  if (view === 'settings') {
    return (
      <div className="min-h-screen font-sans pb-24" style={{ backgroundColor: C.bg }}>
        <Toast />
        <Modal />
        <ExportSheet />
        <AppHeader />

        <div className="max-w-sm mx-auto p-5 space-y-4">

          {/* Privacy trust signal */}
          <div className="rounded-2xl border p-4 flex items-start gap-3" style={{ backgroundColor: alpha(C.brand, 8), borderColor: alpha(C.brand, 20) }}>
            <Shield size={18} style={{ color: C.brand, marginTop: 2, flexShrink: 0 }} />
            <div>
              <div className="text-sm font-bold" style={{ color: C.primary }}>100% Private</div>
              <p className="text-xs leading-relaxed mt-0.5" style={{ color: C.muted }}>
                Your data never leaves your device. No accounts, no servers, no tracking.
              </p>
            </div>
          </div>

          {/* Data & Privacy section */}
          <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: C.border }}>
            <div className="px-5 py-3 border-b" style={{ borderColor: C.border }}>
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: C.muted }}>Data & Privacy</span>
            </div>
            <div className="divide-y" style={{ borderColor: C.border }}>
              <button
                onClick={() => currentChildLogs.length === 0
                  ? setModalConfig({ type: 'alert', title: 'No Data', message: `No logs to export for ${activeProfile.name}.`, confirmLabel: 'OK', onConfirm: closeModal })
                  : setShowExportModal(true)
                }
                className="w-full flex items-center justify-between px-5 py-4 active:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Share size={17} style={{ color: C.brand }} />
                  <span className="text-sm font-semibold" style={{ color: C.primary }}>Export Log</span>
                </div>
                <ChevronRight size={15} style={{ color: C.muted }} />
              </button>
              <button
                onClick={clearAllHistory}
                className="w-full flex items-center justify-between px-5 py-4 active:bg-red-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Trash2 size={17} style={{ color: C.danger }} />
                  <span className="text-sm font-semibold" style={{ color: C.danger }}>Clear History for {activeProfile.name}</span>
                </div>
                <ChevronRight size={15} style={{ color: C.danger, opacity: 0.4 }} />
              </button>
            </div>
          </div>

          {/* Support section */}
          <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: C.border }}>
            <div className="px-5 py-3 border-b" style={{ borderColor: C.border }}>
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: C.muted }}>Support Development</span>
            </div>
            <div className="p-5">
              <p className="text-sm leading-relaxed mb-4" style={{ color: C.muted }}>
                Hi! I built this app for tired parents just trying to survive. If you find it useful, consider buying me a coffee to help cover costs!
              </p>
              <a
                href="https://ko-fi.com/robogirl96"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 text-white font-bold rounded-xl transition-all active:scale-95 shadow-sm"
                style={{ backgroundColor: '#FF5E5B' }}
              >
                <Heart size={15} fill="white" />
                Buy me a Coffee
                <ExternalLink size={12} style={{ opacity: 0.7 }} />
              </a>
            </div>
          </div>

          {/* About section */}
          <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: C.border }}>
            <div className="px-5 py-3 border-b" style={{ borderColor: C.border }}>
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: C.muted }}>About</span>
            </div>
            <div className="divide-y" style={{ borderColor: C.border }}>
              <div className="flex items-center justify-between px-5 py-4">
                <span className="text-sm font-semibold" style={{ color: C.primary }}>Version</span>
                <span className="text-sm" style={{ color: C.muted }}>v2.0.0</span>
              </div>
              <a
                href="https://thehelpfuldev.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-5 py-4 active:bg-slate-50 transition-colors"
              >
                <span className="text-sm font-semibold" style={{ color: C.primary }}>The Helpful Dev Network</span>
                <ExternalLink size={14} style={{ color: C.muted }} />
              </a>
            </div>
          </div>

        </div>
        <BottomNav />
      </div>
    );
  }

  // ── VIEW: BLOG ──────────────────────────────────────────────────────────────

  if (view === 'blog') {
    // Badge colour per source
    const badgeStyle = (badge) => {
      const map = {
        'AAP':         { bg: '#EBF4FF', color: '#1D6FA4' },
        'Mayo Clinic': { bg: '#F0FDF4', color: '#166534' },
        'WebMD':       { bg: '#FEF3C7', color: '#92400E' },
        'BabyCenter':  { bg: '#FDF2F8', color: '#9D174D' },
        'WTE':         { bg: '#F5F3FF', color: '#5B21B6' },
        'Parents':     { bg: '#FFF1F2', color: '#9F1239' },
        'ZeroToThree': { bg: '#ECFDF5', color: '#065F46' },
      };
      return map[badge] || { bg: alpha(C.brand, 10), color: C.brand };
    };

    return (
      <div className="min-h-screen font-sans pb-24" style={{ backgroundColor: C.bg }}>
        <Toast />
        <AppHeader />

        <div className="max-w-sm mx-auto">
          {/* Hero banner */}
          <div className="px-5 pt-5 pb-4">
            <h1 className="text-xl font-black" style={{ color: C.primary }}>Potty Training Resources</h1>
            <p className="text-sm mt-1 leading-relaxed" style={{ color: C.muted }}>
              Curated articles from pediatricians and parenting experts — everything you need to feel confident.
            </p>
          </div>

          {/* Article categories */}
          <div className="px-5 pb-5 space-y-6">
            {BLOG_ARTICLES.map(({ category, items }) => (
              <div key={category}>
                <h2 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: C.muted }}>
                  {category}
                </h2>
                <div className="space-y-3">
                  {items.map((article) => {
                    const bs = badgeStyle(article.badge);
                    return (
                      <a
                        key={article.url}
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start gap-4 bg-white rounded-2xl border p-4 transition-all active:bg-slate-50 active:scale-[0.99]"
                        style={{ borderColor: C.border }}
                      >
                        {/* Source badge */}
                        <div
                          className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: bs.bg }}
                        >
                          <BookOpen size={18} style={{ color: bs.color }} />
                        </div>

                        {/* Text */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-sm font-bold leading-snug" style={{ color: C.primary }}>
                              {article.title}
                            </span>
                            <ExternalLink size={14} className="flex-shrink-0 mt-0.5" style={{ color: C.muted }} />
                          </div>
                          <span
                            className="inline-block mt-1 mb-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: bs.bg, color: bs.color }}
                          >
                            {article.source}
                          </span>
                          <p className="text-xs leading-relaxed" style={{ color: C.muted }}>
                            {article.description}
                          </p>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Disclaimer */}
            <p className="text-[11px] text-center leading-relaxed px-2" style={{ color: C.muted }}>
              Links open external websites. Potty Panda is not affiliated with any of these sources. Always consult your child's pediatrician for personalised advice.
            </p>
          </div>
        </div>

        <BottomNav />
      </div>
    );
  }

  // ── VIEW: CHILDREN ───────────────────────────────────────────────────────────

  if (view === 'children') {
    return (
      <div className="min-h-screen font-sans pb-24" style={{ backgroundColor: C.bg }}>
        <Toast />
        <Modal />
        <AppHeader />

        <div className="max-w-sm mx-auto p-5 space-y-4">

          {/* Profile list */}
          <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: C.border }}>
            <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: C.border }}>
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: C.muted }}>Profiles</span>
              <span className="text-xs" style={{ color: C.muted }}>{profiles.length} child{profiles.length !== 1 ? 'ren' : ''}</span>
            </div>
            <div className="divide-y" style={{ borderColor: C.border }}>
              {profiles.map(profile => (
                <div
                  key={profile.id}
                  onClick={() => !editingProfileId && setActiveProfileId(profile.id)}
                  className="flex items-center gap-3 px-5 py-4 cursor-pointer transition-colors active:bg-slate-50"
                >
                  {editingProfileId === profile.id ? (
                    <div className="flex flex-1 items-center gap-2" onClick={e => e.stopPropagation()}>
                      <input
                        type="text"
                        value={renameText}
                        onChange={(e) => setRenameText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && saveRename()}
                        className="flex-1 p-2 text-sm rounded-lg border focus:outline-none"
                        style={{ borderColor: C.brand }}
                        autoFocus
                      />
                      <button onClick={saveRename} className="p-2 rounded-lg text-white" style={{ backgroundColor: C.success }} aria-label="Save rename">
                        <Check size={15} />
                      </button>
                      <button onClick={() => setEditingProfileId(null)} className="p-2 rounded-lg bg-slate-200" style={{ color: C.muted }} aria-label="Cancel rename">
                        <X size={15} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-sm flex-shrink-0"
                        style={{ backgroundColor: profile.color }}
                      >
                        {profile.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm" style={{ color: C.primary }}>{profile.name}</div>
                        <div className="text-xs" style={{ color: C.muted }}>
                          {logs.filter(l => (l.childId || 'default') === profile.id && new Date(l.timestamp).toDateString() === new Date().toDateString()).length} logged today
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingProfileId(profile.id); setRenameText(profile.name); }}
                          className="p-2 rounded-full transition-colors active:bg-slate-100"
                          style={{ color: C.muted }}
                          aria-label={`Rename ${profile.name}`}
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteProfile(profile.id, profile.name); }}
                          className="p-2 rounded-full transition-colors active:bg-red-50"
                          style={{ color: C.muted }}
                          aria-label={`Delete ${profile.name}`}
                        >
                          <Trash2 size={15} />
                        </button>
                        {activeProfileId === profile.id && (
                          <div className="w-5 h-5 rounded-full flex items-center justify-center ml-1" style={{ backgroundColor: C.brand }}>
                            <Check size={11} strokeWidth={3} color="#fff" />
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Add child */}
          <div className="bg-white rounded-2xl border p-5" style={{ borderColor: C.border }}>
            <label className="block text-xs font-bold uppercase tracking-wider mb-3" style={{ color: C.muted }}>Add Child</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddProfile()}
                placeholder="Child's name (e.g. Suzie)"
                className="flex-1 p-3 rounded-xl border text-sm focus:outline-none focus:ring-2"
                style={{ borderColor: C.border, backgroundColor: C.bg, color: C.primary, '--tw-ring-color': C.brand }}
              />
              <button
                onClick={handleAddProfile}
                disabled={!newProfileName.trim()}
                className="p-3 rounded-xl text-white transition-all active:scale-95 disabled:opacity-40"
                style={{ backgroundColor: C.brand }}
                aria-label="Add child profile"
              >
                <UserPlus size={20} />
              </button>
            </div>
          </div>

        </div>
        <BottomNav />
      </div>
    );
  }

  // ── VIEW: HISTORY ────────────────────────────────────────────────────────────

  if (view === 'history') {
    const maxBarHeight = Math.max(...weeklyData.map(d => d.total), 1);

    return (
      <div className="min-h-screen font-sans pb-24" style={{ backgroundColor: C.bg }}>
        <Toast />
        <Modal />
        <ExportSheet />
        <AppHeader />

        <div className="max-w-sm mx-auto">

          <div className="px-5 pt-5 pb-3 flex items-center justify-between">
            <h2 className="text-xl font-black" style={{ color: C.primary }}>History</h2>
            <button
              onClick={() => currentChildLogs.length === 0
                ? setModalConfig({ type: 'alert', title: 'No Data', message: `No logs to export for ${activeProfile.name}.`, confirmLabel: 'OK', onConfirm: closeModal })
                : setShowExportModal(true)
              }
              className="flex items-center gap-2 px-3 py-1.5 rounded-full font-bold text-sm transition-colors active:opacity-80"
              style={{ backgroundColor: alpha(C.brand, 12), color: C.brand }}
            >
              <Share size={14} /> Export
            </button>
          </div>

          {/* 7-day trend chart */}
          {currentChildLogs.length > 0 && (
            <div className="mx-5 mb-4 bg-white rounded-2xl border p-4" style={{ borderColor: C.border }}>
              <div className="flex items-center gap-2 mb-3">
                <BarChart2 size={13} style={{ color: C.muted }} />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: C.muted }}>Last 7 Days</span>
              </div>
              <div className="flex items-end gap-1.5" style={{ height: 48 }}>
                {weeklyData.map((day, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex flex-col justify-end" style={{ height: 38 }}>
                      {day.total > 0 ? (
                        <div
                          className="w-full rounded-sm overflow-hidden relative"
                          style={{
                            height: `${(day.total / maxBarHeight) * 100}%`,
                            minHeight: 4,
                            backgroundColor: day.isToday ? alpha(C.brand, 30) : C.border,
                          }}
                        >
                          {day.successes > 0 && (
                            <div
                              className="absolute bottom-0 left-0 right-0 rounded-sm"
                              style={{
                                height: `${(day.successes / day.total) * 100}%`,
                                backgroundColor: day.isToday ? C.success : '#A0BEF8',
                              }}
                            />
                          )}
                        </div>
                      ) : (
                        <div className="w-full h-0.5 rounded-full" style={{ backgroundColor: C.border }} />
                      )}
                    </div>
                    <span className="text-[9px] font-bold" style={{ color: day.isToday ? C.brand : C.muted }}>
                      {day.label}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3 mt-2">
                {[['Success', C.success], ['Prev days', '#A0BEF8']].map(([label, clr]) => (
                  <div key={label} className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: clr }} />
                    <span className="text-[10px]" style={{ color: C.muted }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Log entries grouped by day */}
          <div className="px-5 pb-5">
            {currentChildLogs.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: C.border }}>
                  <History size={28} style={{ color: C.muted }} />
                </div>
                <p className="font-bold mb-1" style={{ color: C.primary }}>No logs yet</p>
                <p className="text-sm" style={{ color: C.muted }}>Start logging on the Home tab!</p>
              </div>
            ) : (
              <div className="space-y-5">
                {groupedHistory.map(({ date, logs: dayLogs }) => {
                  const successes = dayLogs.filter(l => l.result === 'success').length;
                  const missed    = dayLogs.filter(l => l.result !== 'success').length;
                  return (
                    <div key={date.toDateString()}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold" style={{ color: C.primary }}>{fmtDayHeader(date)}</span>
                        <div className="flex items-center gap-2 text-xs" style={{ color: C.muted }}>
                          <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: C.success }} />
                            {successes}
                          </span>
                          {missed > 0 && (
                            <span className="flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: C.miss }} />
                              {missed}
                            </span>
                          )}
                          <span>· {dayLogs.length} total</span>
                        </div>
                      </div>
                      <div className="bg-white rounded-2xl border overflow-hidden divide-y" style={{ borderColor: C.border }}>
                        {dayLogs.map(log => <LogRow key={log.id} log={log} />)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  // ── VIEW: HOME (default) ─────────────────────────────────────────────────────

  return (
    <div className="min-h-screen font-sans pb-24" style={{ backgroundColor: C.bg }}>
      <Toast />
      <Modal />
      <AppHeader />

      <div className="max-w-sm mx-auto p-5 space-y-4">

        {/* Hero "Last Went" card */}
        <div className="bg-white rounded-2xl border p-5 text-center shadow-sm" style={{ borderColor: C.border }}>
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: C.muted }}>Last went</span>
          <div className="text-5xl font-black mt-2 mb-3 leading-none" style={{ color: C.primary }}>
            {lastLog ? timeAgo(lastLog.timestamp) : '—'}
          </div>
          {lastLog ? (
            <>
              <div
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase"
                style={{
                  backgroundColor: lastLog.result === 'success' ? alpha(C.success, 15) : alpha(C.miss, 15),
                  color:           lastLog.result === 'success' ? C.success : C.miss,
                }}
              >
                {lastLog.result === 'success' ? <Check size={12} strokeWidth={3} /> : <AlertTriangle size={12} />}
                {lastLog.type} · {lastLog.result === 'success' ? 'Success' : 'Missed'}
              </div>
              <div className="text-xs mt-2" style={{ color: C.muted }}>
                {new Date(lastLog.timestamp).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {fmtTime(lastLog.timestamp)}
              </div>
            </>
          ) : (
            <p className="text-sm" style={{ color: C.muted }}>No activity logged yet. Start below!</p>
          )}
        </div>

        {/* Logging controls card */}
        <div className="bg-white rounded-2xl border p-5 space-y-5 shadow-sm" style={{ borderColor: C.border }}>

          {/* Event Type */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-3" style={{ color: C.muted }}>What happened?</label>
            <div className="flex gap-3">
              {[['pee', 'Pee', <Droplets size={28} strokeWidth={2.5} />, C.pee, C.brand],
                ['poop', 'Poop', <Cookie size={28} strokeWidth={2.5} />, C.poop, C.poop]].map(([type, label, icon, accent, txt]) => (
                <button
                  key={type}
                  onClick={() => setIncidentType(type)}
                  className="flex-1 py-4 rounded-xl flex flex-col items-center gap-2 font-bold transition-all border-2"
                  style={incidentType === type
                    ? { borderColor: accent, backgroundColor: alpha(accent, 10), color: txt }
                    : { borderColor: C.border, backgroundColor: C.bg, color: C.muted }}
                >
                  {icon}
                  <span className="text-sm">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Result */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-3" style={{ color: C.muted }}>Result</label>
            <div className="flex gap-3">
              {[['success', 'Success', <Check size={20} strokeWidth={2.5} />, C.success],
                ['accident', 'Missed', <AlertTriangle size={20} />, C.miss]].map(([res, label, icon, accent]) => (
                <button
                  key={res}
                  onClick={() => setStatus(res)}
                  className="flex-1 py-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-all border-2"
                  style={status === res
                    ? { borderColor: accent, backgroundColor: alpha(accent, 10), color: accent }
                    : { borderColor: C.border, backgroundColor: C.bg, color: C.muted }}
                >
                  {icon}
                  <span className="text-sm">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Collapsible note */}
          <div>
            {!showNote ? (
              <button
                onClick={() => setShowNote(true)}
                className="flex items-center gap-1.5 text-sm font-semibold transition-opacity active:opacity-70"
                style={{ color: C.brand }}
              >
                <Plus size={14} strokeWidth={2.5} /> Add a note
              </button>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider" style={{ color: C.muted }}>Note</label>
                  <button onClick={() => { setShowNote(false); setNote(''); }} aria-label="Remove note">
                    <X size={14} style={{ color: C.muted }} />
                  </button>
                </div>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2" size={16} style={{ color: C.muted }} />
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Details (e.g. self-initiated, nap time)"
                    className="w-full pl-9 pr-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2"
                    style={{ borderColor: C.border, backgroundColor: C.bg, color: C.primary, '--tw-ring-color': C.brand }}
                    autoFocus
                  />
                </div>
              </div>
            )}
          </div>

          {/* Log button — uses profile accent colour */}
          <button
            onClick={addLog}
            className="w-full text-white text-base font-black py-5 rounded-2xl shadow-sm transition-all active:scale-95 flex items-center justify-center gap-3"
            style={{ backgroundColor: activeProfile.color }}
          >
            <span>Log for {activeProfile.name}</span>
            <ChevronRight size={20} strokeWidth={3} />
          </button>
        </div>

        {/* Today's activity */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: C.muted }}>
              Today · {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
            {todayLogs.length > 0 && (
              <span
                className="px-2 py-0.5 text-[10px] font-bold rounded-full"
                style={{ backgroundColor: alpha(C.brand, 12), color: C.brand }}
              >
                {todayLogs.length} logged
              </span>
            )}
          </div>

          <div className="bg-white rounded-2xl border overflow-hidden shadow-sm" style={{ borderColor: C.border }}>
            {todayLogs.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: C.bg }}>
                  <Calendar size={22} style={{ color: C.muted }} />
                </div>
                <p className="text-sm font-semibold mb-1" style={{ color: C.primary }}>Nothing logged yet today</p>
                <p className="text-xs" style={{ color: C.muted }}>You're ready to start!</p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: C.border }}>
                {todayLogs.map(log => <LogRow key={log.id} log={log} />)}
              </div>
            )}
          </div>
        </div>

      </div>
      <BottomNav />
    </div>
  );
}
