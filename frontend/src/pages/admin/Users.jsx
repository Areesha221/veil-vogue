import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { User, Trash2, Edit, Search, ArrowLeft, Download, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const getToken = () => localStorage.getItem('veil-vogue-token') || sessionStorage.getItem('veil-vogue-token') || '';

export default function AdminUsers() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, limit: 20 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [sort, setSort] = useState('-createdAt');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, roleFilter, sort, page]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (!user || user.role !== 'admin') return;
      setPage(1);
      fetchUsers(1);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const fetchUsers = async (targetPage = page) => {
    try {
      if (!refreshing) setLoading(true);
      const token = getToken();
      const params = { page: targetPage, limit: 20, sort };
      if (search.trim()) params.search = search.trim();
      if (roleFilter !== 'all') params.role = roleFilter;
      const { data } = await axios.get('/api/admin/users', {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
      const rows = Array.isArray(data) ? data : (data?.items || []);
      setUsers(rows);
      setPagination(data?.pagination || { page: targetPage, totalPages: 1, total: rows.length, limit: 20 });
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error(error?.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDeleteUser = async (targetUser) => {
    if (!targetUser?._id) return;
    if (String(targetUser._id) === String(user?._id)) {
      toast.error('You cannot delete your own admin account');
      return;
    }
    if (!window.confirm(`Delete user "${targetUser.name}" (${targetUser.email})? This cannot be undone.`)) return;
    try {
      const token = getToken();
      await axios.delete(`/api/admin/users/${targetUser._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('User deleted successfully');
      fetchUsers();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleEditUser = async (targetUser) => {
    if (!targetUser?._id) return;
    const newRole = window.prompt(`Change role for ${targetUser.name} (current: ${targetUser.role}). Enter "admin" or "user":`, targetUser.role);
    if (newRole == null) return;
    const normalized = String(newRole).trim().toLowerCase();
    if (!['admin', 'user'].includes(normalized)) {
      toast.error('Role must be "admin" or "user"');
      return;
    }
    if (normalized === targetUser.role) return;
    try {
      const token = getToken();
      await axios.put(`/api/admin/users/${targetUser._id}/role`, { role: normalized }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('User role updated');
      fetchUsers();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update role');
    }
  };

  const handleExport = async () => {
    try {
      const token = getToken();
      const params = new URLSearchParams({ export: 'csv', sort });
      if (search.trim()) params.set('search', search.trim());
      if (roleFilter !== 'all') params.set('role', roleFilter);
      const res = await axios.get(`/api/admin/users?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Users exported');
    } catch (error) {
      console.error('Export users error:', error);
      toast.error(error?.response?.data?.message || 'Failed to export users');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ivory dark:bg-zinc-950">
        <div className="text-2xl font-serif dark:text-ivory">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ivory dark:bg-zinc-950 pt-28 md:pt-32 pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-gray-900 dark:text-ivory">Manage Users</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Total: {pagination.total || 0} users</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={handleExport} className="px-4 py-2 rounded-lg bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-ivory hover:bg-gray-50 dark:hover:bg-zinc-700 flex items-center gap-2"><Download size={16} /> Export CSV</button>
            <button onClick={() => { setRefreshing(true); fetchUsers(); }} className="px-4 py-2 rounded-lg bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-ivory hover:bg-gray-50 dark:hover:bg-zinc-700 flex items-center gap-2"><RefreshCw size={16} /> Refresh</button>
            <button onClick={() => navigate('/admin')} className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-zinc-800 text-gray-900 dark:text-ivory hover:bg-gray-300 dark:hover:bg-zinc-700 flex items-center gap-2"><ArrowLeft size={16} /> Dashboard</button>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 shadow-lg mb-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, phone..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-gray-900 dark:text-ivory focus:outline-none focus:ring-2 focus:ring-gold"
            />
          </div>
          <select value={roleFilter} onChange={(e) => { setPage(1); setRoleFilter(e.target.value); }} className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-gray-900 dark:text-ivory">
            <option value="all">All roles</option>
            <option value="user">Users</option>
            <option value="admin">Admins</option>
          </select>
          <select value={sort} onChange={(e) => { setPage(1); setSort(e.target.value); }} className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-gray-900 dark:text-ivory">
            <option value="-createdAt">Newest</option>
            <option value="createdAt">Oldest</option>
            <option value="name">Name A-Z</option>
            <option value="-name">Name Z-A</option>
            <option value="email">Email A-Z</option>
          </select>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-zinc-800">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">User</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Contact</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Role</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Joined</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
                {users.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-600 dark:text-gray-400">No users found.</td></tr>
                ) : users.map((u) => (
                  <tr key={u._id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gold/20 rounded-full flex items-center justify-center">
                          <User size={20} className="text-gold" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-ivory">{u.name}</p>
                          {String(u._id) === String(user?._id) && <p className="text-xs text-gold">You</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-700 dark:text-ivory break-all">{u.email}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{u.phone || '—'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${u.role === 'admin' ? 'bg-gold text-white' : 'bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-ivory'}`}>{u.role}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button onClick={() => handleEditUser(u)} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="Change role"><Edit size={18} /></button>
                        <button onClick={() => handleDeleteUser(u)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Delete user"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">Page {pagination.page || 1} of {pagination.totalPages || 1} • Total {pagination.total || 0}</p>
          <div className="flex items-center gap-2">
            <button disabled={(pagination.page || 1) <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-4 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-ivory disabled:opacity-50">Previous</button>
            <button disabled={(pagination.page || 1) >= (pagination.totalPages || 1)} onClick={() => setPage((p) => p + 1)} className="px-4 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-ivory disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
