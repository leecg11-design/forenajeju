import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  Lock, 
  ChevronRight, 
  AlertCircle,
  Megaphone,
  Calendar,
  CheckCircle2,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Announcement {
  id: number;
  title: string;
  content: string;
  is_popup: number;
  created_at: string;
}

export default function App() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [password, setPassword] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Announcement | null>(null);
  const [formData, setFormData] = useState({ title: '', content: '', is_popup: false });
  const [activePopup, setActivePopup] = useState<Announcement | null>(null);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState<{ show: boolean, id: any, title: string } | null>(null);
  const [alertModal, setAlertModal] = useState<{ show: boolean, message: string, type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchAnnouncements();
    const adminToken = localStorage.getItem('admin-token');
    if (adminToken === 'admin-token-0070') {
      setIsAdmin(true);
    }
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const res = await fetch('/api/announcements');
      if (!res.ok) throw new Error('API not available');
      const data = await res.json();
      setAnnouncements(data);
      saveToLocal(data);
      handlePopups(data);
    } catch (err) {
      console.warn('API fetch failed, falling back to localStorage', err);
      const localData = getFromLocal();
      setAnnouncements(localData);
      handlePopups(localData);
    } finally {
      setLoading(false);
    }
  };

  const handlePopups = (data: Announcement[]) => {
    const popups = data.filter((a: Announcement) => a.is_popup === 1);
    if (popups.length > 0) {
      const dismissed = sessionStorage.getItem('dismissed-popups');
      const dismissedIds = dismissed ? JSON.parse(dismissed) : [];
      const nextPopup = popups.find((p: Announcement) => !dismissedIds.includes(p.id));
      if (nextPopup) setActivePopup(nextPopup);
    }
  };

  const saveToLocal = (data: Announcement[]) => {
    localStorage.setItem('announcements-backup', JSON.stringify(data));
  };

  const getFromLocal = (): Announcement[] => {
    const saved = localStorage.getItem('announcements-backup');
    return saved ? JSON.parse(saved) : [];
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setIsAdmin(true);
          setShowLogin(false);
          localStorage.setItem('admin-token', data.token);
          setPassword('');
          return;
        } else {
          alert(data.message);
          return;
        }
      }
      throw new Error('API Login failed');
    } catch (err) {
      console.warn('API login failed, checking locally (Netlify fallback)', err);
      // Netlify/Static fallback: Hardcoded password check for demo
      if (password === "0070") {
        setIsAdmin(true);
        setShowLogin(false);
        localStorage.setItem('admin-token', 'admin-token-0070');
        setPassword('');
      } else {
        alert('비밀번호가 틀렸습니다.');
      }
    }
  };

  const handleLogout = () => {
    setIsAdmin(false);
    localStorage.removeItem('admin-token');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingItem ? `/api/announcements/${editingItem.id}` : '/api/announcements';
    const method = editingItem ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setShowForm(false);
        setEditingItem(null);
        setFormData({ title: '', content: '', is_popup: false });
        fetchAnnouncements();
        return;
      }
      throw new Error('API save failed');
    } catch (err) {
      console.warn('API save failed, saving to localStorage (Netlify fallback)', err);
      // Local fallback
      const current = getFromLocal();
      let updated;
      if (editingItem) {
        updated = current.map(a => a.id === editingItem.id ? { ...a, ...formData } : a);
      } else {
        const newItem = {
          id: Date.now(),
          ...formData,
          is_popup: formData.is_popup ? 1 : 0,
          created_at: new Date().toISOString()
        };
        updated = [newItem, ...current];
      }
      saveToLocal(updated);
      setAnnouncements(updated);
      setShowForm(false);
      setEditingItem(null);
      setFormData({ title: '', content: '', is_popup: false });
    }
  };

  const handleDelete = async (id: any) => {
    if (!id) return;
    
    setConfirmModal({
      show: true,
      id,
      title: "정말 이 공지사항을 삭제하시겠습니까?"
    });
  };

  const executeDelete = async () => {
    if (!confirmModal) return;
    const id = confirmModal.id;
    setConfirmModal(null);

    try {
      const res = await fetch(`/api/announcements/${id}`, { 
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setAlertModal({ show: true, message: "성공적으로 삭제되었습니다.", type: 'success' });
          await fetchAnnouncements();
          setSelectedAnnouncement(null);
          return;
        }
      }
      throw new Error('API delete failed');
    } catch (err: any) {
      console.warn('API delete failed, deleting from localStorage (Netlify fallback)', err);
      const current = getFromLocal();
      const updated = current.filter(a => a.id !== id);
      saveToLocal(updated);
      setAnnouncements(updated);
      setSelectedAnnouncement(null);
      setAlertModal({ show: true, message: "성공적으로 삭제되었습니다. (로컬)", type: 'success' });
    }
  };

  const closePopup = () => {
    if (activePopup) {
      const dismissed = sessionStorage.getItem('dismissed-popups');
      const dismissedIds = dismissed ? JSON.parse(dismissed) : [];
      sessionStorage.setItem('dismissed-popups', JSON.stringify([...dismissedIds, activePopup.id]));
    }
    setActivePopup(null);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-forena-gold/20">
        <div className="max-w-4xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-xl font-serif font-bold tracking-wider text-forena-navy">포레나 <span className="text-forena-gold">제주중문</span></h1>
              <p className="text-[8px] uppercase tracking-[0.3em] text-slate-400 font-bold ml-0.5">Premium Residence</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {isAdmin ? (
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    setEditingItem(null);
                    setFormData({ title: '', content: '', is_popup: false });
                    setShowForm(true);
                  }}
                  className="flex items-center gap-2 bg-forena-navy text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-slate-800 transition-colors shadow-md"
                >
                  <Plus size={16} />
                  <span>새 공지</span>
                </button>
                <button 
                  onClick={handleLogout}
                  className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                  title="로그아웃"
                >
                  <Lock size={18} />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setShowLogin(true)}
                className="p-2 text-slate-400 hover:text-forena-navy transition-colors"
                title="관리자 로그인"
              >
                <Settings size={20} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-12">
        <div className="mb-12">
          <h2 className="text-3xl font-serif italic text-forena-navy mb-2">입주민 소식</h2>
          <p className="text-slate-500">포레나 제주중문의 새로운 소식을 확인하세요.</p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-8 h-8 border-4 border-forena-gold border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-slate-400 font-medium">소식을 불러오는 중...</p>
          </div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
            <p className="text-slate-400">등록된 공지사항이 없습니다.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {announcements.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setSelectedAnnouncement(item)}
                className="group relative bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-forena-gold/30 transition-all duration-300 cursor-pointer"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    {item.is_popup === 1 && (
                      <span className="px-2 py-0.5 bg-red-50 text-red-500 text-[10px] font-bold rounded uppercase tracking-wider">
                        Important
                      </span>
                    )}
                    <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
                      <Calendar size={14} />
                      {new Date(item.created_at).toLocaleDateString('ko-KR')}
                    </div>
                  </div>
                  
                  {isAdmin && (
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingItem(item);
                          setFormData({ title: item.title, content: item.content, is_popup: item.is_popup === 1 });
                          setShowForm(true);
                        }}
                        className="p-2 text-slate-400 hover:text-forena-navy hover:bg-slate-50 rounded-full transition-all"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(item.id);
                        }}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>

                <h3 className="text-xl font-bold text-forena-navy mb-4 group-hover:text-forena-gold transition-colors">
                  {item.title}
                </h3>
                <div className="text-slate-600 leading-relaxed whitespace-pre-wrap line-clamp-3">
                  {item.content}
                </div>
                
                <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-end">
                  <div className="text-forena-gold opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 flex items-center gap-1 text-sm font-bold">
                    상세보기 <ChevronRight size={16} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-forena-navy text-white/40 py-12 px-6">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <h4 className="text-white font-bold mb-1">포레나 제주중문</h4>
            <p className="text-xs">제주특별자치도 서귀포시 중문동</p>
          </div>
          <div className="text-xs text-center md:text-right">
            <p>© 2024 Forena Jeju Jungmun. All rights reserved.</p>
            <p className="mt-1">관리사무소: 064-900-0690</p>
          </div>
        </div>
      </footer>

      {/* Custom Confirmation Modal */}
      <AnimatePresence>
        {confirmModal?.show && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmModal(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-white p-8 rounded-[2rem] shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <AlertCircle size={32} />
              </div>
              <h2 className="text-xl font-bold text-forena-navy mb-2">{confirmModal.title}</h2>
              <p className="text-slate-500 text-sm mb-8">삭제된 데이터는 복구할 수 없습니다.</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setConfirmModal(null)}
                  className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                >
                  취소
                </button>
                <button 
                  onClick={executeDelete}
                  className="flex-1 bg-red-500 text-white py-4 rounded-2xl font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                >
                  삭제
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Alert Modal */}
      <AnimatePresence>
        {alertModal?.show && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAlertModal(null)}
              className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-white p-8 rounded-[2rem] shadow-2xl text-center"
            >
              <div className={`w-16 h-16 ${alertModal.type === 'success' ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'} rounded-2xl flex items-center justify-center mx-auto mb-6`}>
                {alertModal.type === 'success' ? <CheckCircle2 size={32} /> : <AlertCircle size={32} />}
              </div>
              <h2 className="text-xl font-bold text-forena-navy mb-6">{alertModal.message}</h2>
              <button 
                onClick={() => setAlertModal(null)}
                className="w-full bg-forena-navy text-white py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all"
              >
                확인
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Detail View Modal */}
      <AnimatePresence>
        {selectedAnnouncement && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedAnnouncement(null)}
              className="absolute inset-0 bg-forena-navy/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
              <div className="p-10">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                    {selectedAnnouncement.is_popup === 1 && (
                      <span className="px-2 py-0.5 bg-red-50 text-red-500 text-[10px] font-bold rounded uppercase tracking-wider">
                        Important
                      </span>
                    )}
                    <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
                      <Calendar size={14} />
                      {new Date(selectedAnnouncement.created_at).toLocaleDateString('ko-KR')}
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedAnnouncement(null)}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-all"
                  >
                    <X size={24} />
                  </button>
                </div>

                <h2 className="text-3xl font-bold text-forena-navy mb-8 leading-tight">
                  {selectedAnnouncement.title}
                </h2>
                
                <div className="text-slate-600 text-lg leading-relaxed whitespace-pre-wrap max-h-[50vh] overflow-y-auto pr-4 custom-scrollbar">
                  {selectedAnnouncement.content}
                </div>

                <div className="mt-10 pt-8 border-t border-slate-100 flex justify-center gap-4">
                  {isAdmin && (
                    <button 
                      onClick={() => handleDelete(selectedAnnouncement.id)}
                      className="px-8 py-4 bg-red-50 text-red-500 rounded-2xl font-bold hover:bg-red-100 transition-all flex items-center gap-2"
                    >
                      <Trash2 size={18} />
                      삭제하기
                    </button>
                  )}
                  <button 
                    onClick={() => setSelectedAnnouncement(null)}
                    className="flex-1 px-10 py-4 bg-forena-navy text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-forena-navy/20"
                  >
                    닫기
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Popup Modal */}
      <AnimatePresence>
        {activePopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closePopup}
              className="absolute inset-0 bg-forena-navy/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2rem] overflow-hidden shadow-2xl"
            >
              <div className="bg-forena-gold p-8 text-white relative overflow-hidden">
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold uppercase tracking-widest">Urgent Notice</span>
                  </div>
                  <h2 className="text-2xl font-bold leading-tight">{activePopup.title}</h2>
                </div>
              </div>
              <div className="p-8">
                <div className="text-slate-600 leading-relaxed mb-8 whitespace-pre-wrap max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                  {activePopup.content}
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={closePopup}
                    className="flex-1 bg-forena-navy text-white py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-forena-navy/20"
                  >
                    확인했습니다
                  </button>
                </div>
                <button 
                  onClick={closePopup}
                  className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Login Modal */}
      <AnimatePresence>
        {showLogin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLogin(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="relative w-full max-w-sm bg-white p-10 rounded-[2.5rem] shadow-2xl"
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-forena-navy">관리자 인증</h2>
                <p className="text-slate-400 text-sm mt-1">비밀번호를 입력해주세요.</p>
              </div>
              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="비밀번호"
                    autoFocus
                    className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-forena-gold transition-all text-center text-lg tracking-widest"
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full bg-forena-navy text-white py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-forena-navy/20"
                >
                  로그인
                </button>
                <button 
                  type="button"
                  onClick={() => setShowLogin(false)}
                  className="w-full text-slate-400 text-sm font-medium hover:text-slate-600 transition-colors"
                >
                  취소
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add/Edit Form Modal */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowForm(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-white p-10 rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-forena-navy">
                  {editingItem ? '공지사항 수정' : '새 공지사항 작성'}
                </h2>
                <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={24} />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">제목</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="공지사항 제목을 입력하세요"
                    className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-forena-gold transition-all"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">내용</label>
                  <textarea
                    required
                    rows={8}
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="공지사항 내용을 입력하세요"
                    className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-forena-gold transition-all resize-none"
                  />
                </div>
                
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl">
                  <input
                    type="checkbox"
                    id="is_popup"
                    checked={formData.is_popup}
                    onChange={(e) => setFormData({ ...formData, is_popup: e.target.checked })}
                    className="w-5 h-5 rounded border-slate-300 text-forena-gold focus:ring-forena-gold"
                  />
                  <label htmlFor="is_popup" className="text-sm font-medium text-slate-700 cursor-pointer select-none">
                    팝업 공지로 설정 (접속 시 자동으로 나타납니다)
                  </label>
                </div>
                
                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                  >
                    취소
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 bg-forena-navy text-white py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-forena-navy/20 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={18} />
                    {editingItem ? '수정 완료' : '공지 등록'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  );
}
