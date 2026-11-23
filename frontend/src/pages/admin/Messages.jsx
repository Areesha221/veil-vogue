import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { MessageCircle, Send, ArrowLeft, User, Search, Download, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const getToken = () => localStorage.getItem('veil-vogue-token') || sessionStorage.getItem('veil-vogue-token') || '';

export default function AdminMessages() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('-createdAt');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, limit: 20 });

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }
    fetchMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, page, sort, status]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (!user || user.role !== 'admin') return;
      setPage(1);
      fetchMessages(1);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    if (!socket) return;
    socket.emit('join_admin');
    const onNew = (message) => {
      // If on first page and default filters, prepend for quick visibility; otherwise refresh
      setMessages((prev) => {
        if (page === 1 && status === 'all' && !search.trim() && sort === '-createdAt') {
          return [message, ...prev].slice(0, pagination.limit || 20);
        }
        return prev;
      });
      if (!(page === 1 && status === 'all' && !search.trim() && sort === '-createdAt')) {
        fetchMessages(1);
      }
      toast.success(`New message from ${message?.name || 'customer'}`);
    };
    socket.on('new_message', onNew);
    return () => socket.off('new_message', onNew);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, page, status, search, sort, pagination.limit]);

  const fetchMessages = async (targetPage = page) => {
    try {
      if (!refreshing) setLoading(true);
      const token = getToken();
      const params = { page: targetPage, limit: 20, sort };
      if (search.trim()) params.search = search.trim();
      if (status !== 'all') params.status = status;
      const { data } = await axios.get('/api/messages', {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
      const rows = Array.isArray(data) ? data : (data?.items || []);
      setMessages(rows);
      setPagination(data?.pagination || { page: targetPage, totalPages: 1, total: rows.length, limit: 20 });
      if (selectedMessage) {
        const updated = rows.find((m) => m._id === selectedMessage._id);
        if (updated) setSelectedMessage(updated);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error(error?.response?.data?.message || 'Failed to load messages');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleReply = async (messageId) => {
    if (!reply.trim()) {
      toast.error('Please enter a reply');
      return;
    }
    try {
      const token = getToken();
      const { data } = await axios.post(`/api/messages/${messageId}/reply`, { reply }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages((prev) => prev.map((m) => (m._id === messageId ? data : m)));
      setSelectedMessage(data);
      setReply('');
      toast.success('Reply sent successfully!');
    } catch (error) {
      console.error('Reply error:', error);
      toast.error(error?.response?.data?.message || 'Failed to send reply');
    }
  };

  const markRead = async (msg) => {
    if (!msg?._id || msg.status !== 'unread') return;
    try {
      const token = getToken();
      const { data } = await axios.put(`/api/messages/${msg._id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages((prev) => prev.map((m) => (m._id === msg._id ? data : m)));
      setSelectedMessage((prev) => (prev?._id === msg._id ? data : prev));
    } catch (error) {
      // non-fatal
      console.error('Mark read error:', error);
    }
  };

  const handleSelect = async (msg) => {
    setSelectedMessage(msg);
    await markRead(msg);
  };

  const handleExport = async () => {
    try {
      const token = getToken();
      const params = new URLSearchParams({ export: 'csv', sort });
      if (search.trim()) params.set('search', search.trim());
      if (status !== 'all') params.set('status', status);
      const res = await axios.get(`/api/messages?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `messages-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Messages exported');
    } catch (error) {
      console.error('Export messages error:', error);
      toast.error(error?.response?.data?.message || 'Failed to export messages');
    }
  };

  const unreadCountOnPage = useMemo(() => messages.filter((m) => m.status === 'unread').length, [messages]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ivory dark:bg-zinc-950">
        <div className="text-2xl font-serif dark:text-ivory">Loading...</div>
      </div>
    );
  }

  return (
    <div className="pb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-gray-900 dark:text-ivory mb-2">Customer Messages</h1>
            <p className="text-gray-600 dark:text-gray-400">Total: {pagination.total || 0} â€¢ Unread on page: {unreadCountOnPage}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={handleExport} className="px-4 py-2 rounded-lg bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-ivory hover:bg-gray-50 dark:hover:bg-zinc-700 flex items-center gap-2"><Download size={16} /> Export CSV</button>
            <button onClick={() => { setRefreshing(true); fetchMessages(); }} className="px-4 py-2 rounded-lg bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-ivory hover:bg-gray-50 dark:hover:bg-zinc-700 flex items-center gap-2"><RefreshCw size={16} /> Refresh</button>
            <button onClick={() => navigate('/admin')} className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-zinc-800 text-gray-900 dark:text-ivory hover:bg-gray-300 dark:hover:bg-zinc-700 flex items-center gap-2"><ArrowLeft size={16} /> Dashboard</button>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 shadow-lg mb-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, subject, message..." className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-gray-900 dark:text-ivory focus:outline-none focus:ring-2 focus:ring-gold" />
          </div>
          <select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }} className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-gray-900 dark:text-ivory">
            <option value="all">All statuses</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
            <option value="replied">Replied</option>
          </select>
          <select value={sort} onChange={(e) => { setPage(1); setSort(e.target.value); }} className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-gray-900 dark:text-ivory">
            <option value="-createdAt">Newest</option>
            <option value="createdAt">Oldest</option>
            <option value="status">Status A-Z</option>
            <option value="name">Name A-Z</option>
          </select>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white dark:bg-zinc-900 rounded-2xl shadow-lg overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 dark:text-ivory">Messages</h2>
              <span className="text-xs text-gray-500 dark:text-gray-400">Page {pagination.page || 1}/{pagination.totalPages || 1}</span>
            </div>
            <div className="max-h-[650px] overflow-y-auto">
              {messages.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  <MessageCircle size={40} className="mx-auto mb-2" />
                  <p>No messages found</p>
                </div>
              ) : messages.map((msg) => (
                <button
                  key={msg._id}
                  onClick={() => handleSelect(msg)}
                  className={`w-full text-left p-4 border-b border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors ${selectedMessage?._id === msg._id ? 'bg-gold/10' : ''}`}
                >
                  <div className="flex items-start justify-between mb-2 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 bg-gold/20 rounded-full flex items-center justify-center flex-shrink-0"><User size={16} className="text-gold" /></div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-gray-900 dark:text-ivory truncate">{msg.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{msg.email}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs flex-shrink-0 ${msg.status === 'replied' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : msg.status === 'read' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>{msg.status}</span>
                  </div>
                  <p className="font-medium text-sm text-gray-900 dark:text-ivory mb-1 line-clamp-1">{msg.subject}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{msg.message}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">{new Date(msg.createdAt).toLocaleString()}</p>
                </button>
              ))}
            </div>
            <div className="p-3 border-t border-gray-200 dark:border-zinc-800 flex items-center justify-between gap-2">
              <button disabled={(pagination.page || 1) <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-zinc-700 text-sm disabled:opacity-50">Prev</button>
              <span className="text-xs text-gray-500 dark:text-gray-400">{pagination.total || 0} total</span>
              <button disabled={(pagination.page || 1) >= (pagination.totalPages || 1)} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-zinc-700 text-sm disabled:opacity-50">Next</button>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-2xl shadow-lg overflow-hidden min-h-[500px]">
            {selectedMessage ? (
              <div className="flex flex-col h-full min-h-[500px]">
                <div className="p-4 border-b border-gray-200 dark:border-zinc-800">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-semibold text-lg text-gray-900 dark:text-ivory break-words">{selectedMessage.subject}</h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400 break-all">From: {selectedMessage.name} ({selectedMessage.email})</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${selectedMessage.status === 'replied' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : selectedMessage.status === 'read' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>{selectedMessage.status}</span>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  <div className="bg-gray-50 dark:bg-zinc-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <User size={16} className="text-gold" />
                      <span className="font-semibold text-sm text-gray-900 dark:text-ivory">{selectedMessage.name}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(selectedMessage.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">{selectedMessage.message}</p>
                  </div>
                  {selectedMessage.adminReply?.message && (
                    <div className="bg-gold/10 border-l-4 border-gold rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <MessageCircle size={16} className="text-gold" />
                        <span className="font-semibold text-sm text-gold">Admin Reply</span>
                        {selectedMessage.adminReply.repliedAt && <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(selectedMessage.adminReply.repliedAt).toLocaleString()}</span>}
                      </div>
                      <p className="text-gray-900 dark:text-ivory whitespace-pre-wrap break-words">{selectedMessage.adminReply.message}</p>
                    </div>
                  )}
                </div>
                <div className="p-4 border-t border-gray-200 dark:border-zinc-800">
                  <div className="flex gap-2">
                    <textarea
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      placeholder={selectedMessage.status === 'replied' ? 'Send another reply...' : 'Type your reply...'}
                      rows={2}
                      className="flex-1 px-4 py-2 rounded-lg bg-ivory dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 focus:border-gold focus:outline-none text-gray-900 dark:text-ivory resize-y"
                    />
                    <button onClick={() => handleReply(selectedMessage._id)} className="bg-gold text-white px-5 py-2 rounded-lg hover:bg-yellow-600 transition-colors flex items-center gap-2 self-end">
                      <Send size={18} /> Send
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full min-h-[500px]">
                <div className="text-center">
                  <MessageCircle size={60} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">Select a message to view and reply</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
