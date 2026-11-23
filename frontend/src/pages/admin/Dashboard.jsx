import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Package, Users, DollarSign, TrendingUp, ShoppingCart, Upload, Star, ShieldCheck, MessageSquare, BarChart3 } from 'lucide-react';

export default function AdminDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user || user.role !== 'admin') {
            navigate('/');
            return;
        }
        fetchStats();
    }, [user]);

    const fetchStats = async () => {
        try {
            const token = (localStorage.getItem('veil-vogue-token') || sessionStorage.getItem('veil-vogue-token'));
            const { data } = await axios.get('/api/admin/dashboard-stats', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStats(data);
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-ivory dark:bg-zinc-950">
                <div className="text-2xl font-serif dark:text-ivory">Loading...</div>
            </div>
        );
    }

    const s = stats || {};
    const statCards = [
        { title: 'Total Orders', value: s.totalOrders || 0, icon: ShoppingCart, color: 'bg-blue-500', link: '/admin/orders' },
        { title: 'Total Revenue', value: `PKR ${Number(s.totalRevenue || 0).toLocaleString()}`, icon: DollarSign, color: 'bg-green-500', link: '/admin/orders' },
        { title: 'Avg Order Value', value: `PKR ${Number(s.averageOrderValue || 0).toLocaleString()}`, icon: BarChart3, color: 'bg-emerald-500', link: '/admin/orders' },
        { title: 'Total Products', value: s.totalProducts || 0, icon: Package, color: 'bg-purple-500', link: '/admin/products' },
        { title: 'Customers', value: s.totalCustomers || 0, icon: Users, color: 'bg-orange-500', link: '/admin/users' },
        { title: 'Pending Orders', value: s.pendingOrders || 0, icon: TrendingUp, color: 'bg-yellow-500', link: '/admin/orders' },
        { title: 'Pending Receipts', value: s.pendingReceipts || 0, icon: Upload, color: 'bg-rose-500', link: '/admin/receipts' },
        { title: 'Unread Messages', value: s.unreadMessages || 0, icon: MessageSquare, color: 'bg-cyan-600', link: '/admin/messages' },
        { title: 'Total Reviews', value: s.totalReviews || 0, icon: Star, color: 'bg-amber-500', link: '/admin/reviews' },
        { title: 'Low / Out of Stock', value: `${s.lowStockProducts || 0} / ${s.outOfStockProducts || 0}`, icon: Package, color: 'bg-red-500', link: '/admin/products' }
    ];

    const maxDailyRevenue = Math.max(1, ...(s.last7Days || []).map((d) => Number(d.revenue || 0)));

    return (
        <div className="pb-6">
            <div className="max-w-7xl mx-auto px-4">
                <div className="mb-8">
                    <h1 className="font-serif text-4xl font-bold text-gray-900 dark:text-ivory mb-2">
                        Admin Dashboard
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Welcome back, {user?.name}! Analytics, operations, and moderation overview.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6 mb-8">
                    {statCards.map((stat, idx) => {
                        const Icon = stat.icon;
                        return (
                            <button
                                key={idx}
                                onClick={() => navigate(stat.link)}
                                className="bg-white dark:bg-zinc-900 rounded-2xl p-5 sm:p-6 shadow-lg hover:shadow-2xl transition-all hover:scale-[1.02] text-left"
                            >
                                <div className={`${stat.color} w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center mb-4`}>
                                    <Icon size={22} className="text-white" />
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{stat.title}</p>
                                <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-ivory">{stat.value}</p>
                            </button>
                        );
                    })}
                </div>

                <div className="grid lg:grid-cols-3 gap-6 mb-8">
                    <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-serif text-2xl font-bold text-gray-900 dark:text-ivory">Last 7 Days Revenue</h2>
                            <span className="text-sm text-gray-500 dark:text-gray-400">Orders: {Number(s.ordersLast30Days || 0)} in last 30 days</span>
                        </div>
                        <div className="space-y-3">
                            {(s.last7Days || []).length === 0 ? (
                                <p className="text-gray-500 dark:text-gray-400">No recent analytics data.</p>
                            ) : (s.last7Days || []).map((day) => (
                                <div key={day.date} className="grid grid-cols-[90px_1fr_auto] items-center gap-3">
                                    <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{day.date.slice(5)}</span>
                                    <div className="h-3 rounded-full bg-gray-100 dark:bg-zinc-800 overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-gold"
                                            style={{ width: `${Math.max(4, (Number(day.revenue || 0) / maxDailyRevenue) * 100)}%` }}
                                        />
                                    </div>
                                    <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 whitespace-nowrap">
                                        PKR {Number(day.revenue || 0).toLocaleString()} ({day.orders})
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-zinc-800 grid sm:grid-cols-3 gap-3 text-sm">
                            <div className="bg-ivory dark:bg-zinc-800 rounded-xl p-3">
                                <p className="text-gray-500 dark:text-gray-400">30d Revenue</p>
                                <p className="font-bold text-gray-900 dark:text-ivory">PKR {Number(s.revenueLast30Days || 0).toLocaleString()}</p>
                            </div>
                            <div className="bg-ivory dark:bg-zinc-800 rounded-xl p-3">
                                <p className="text-gray-500 dark:text-gray-400">Total Discounts</p>
                                <p className="font-bold text-green-700 dark:text-green-400">PKR {Number(s.totalDiscount || 0).toLocaleString()}</p>
                            </div>
                            <div className="bg-ivory dark:bg-zinc-800 rounded-xl p-3">
                                <p className="text-gray-500 dark:text-gray-400">Admin Accounts</p>
                                <p className="font-bold text-gray-900 dark:text-ivory">{Number(s.totalAdmins || 0)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-lg">
                        <h2 className="font-serif text-2xl font-bold mb-4 text-gray-900 dark:text-ivory">Top Products</h2>
                        <div className="space-y-3">
                            {(s.topProducts || []).length === 0 ? (
                                <p className="text-gray-500 dark:text-gray-400">No sales data yet.</p>
                            ) : (s.topProducts || []).map((p, idx) => (
                                <div key={`${p.productId || p.name}-${idx}`} className="border border-gray-100 dark:border-zinc-800 rounded-xl p-3">
                                    <p className="font-semibold text-sm text-gray-900 dark:text-ivory line-clamp-1">{p.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        Sold: {Number(p.quantity || 0)} â€¢ Revenue: PKR {Number(p.revenue || 0).toLocaleString()}
                                    </p>
                                </div>
                            ))}
                        </div>
                        <div className="mt-5 pt-4 border-t border-gray-100 dark:border-zinc-800">
                            <h3 className="font-semibold text-gray-900 dark:text-ivory mb-2">Orders by Status</h3>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                {Object.entries(s.ordersByStatus || {}).map(([k, v]) => (
                                    <div key={k} className="bg-ivory dark:bg-zinc-800 rounded-lg px-3 py-2 flex items-center justify-between">
                                        <span className="text-gray-600 dark:text-gray-300">{k}</span>
                                        <span className="font-semibold text-gray-900 dark:text-ivory">{v}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 shadow-lg">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="font-serif text-2xl font-bold text-gray-900 dark:text-ivory">
                            Quick Actions
                        </h2>
                        <div className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                            <ShieldCheck size={16} className="text-gold" />
                            Admin tools & moderation
                        </div>
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <button onClick={() => navigate('/admin/products')} className="bg-deep-black dark:bg-gold text-ivory dark:text-white py-4 rounded-xl font-semibold hover:scale-105 transition-transform">Manage Products</button>
                        <button onClick={() => navigate('/admin/orders')} className="bg-deep-black dark:bg-gold text-ivory dark:text-white py-4 rounded-xl font-semibold hover:scale-105 transition-transform">View Orders</button>
                        <button onClick={() => navigate('/admin/users')} className="bg-deep-black dark:bg-gold text-ivory dark:text-white py-4 rounded-xl font-semibold hover:scale-105 transition-transform">Manage Users</button>
                        <button onClick={() => navigate('/admin/receipts')} className="bg-deep-black dark:bg-gold text-ivory dark:text-white py-4 rounded-xl font-semibold hover:scale-105 transition-transform">Verify Receipts</button>
                        <button onClick={() => navigate('/admin/messages')} className="bg-deep-black dark:bg-gold text-ivory dark:text-white py-4 rounded-xl font-semibold hover:scale-105 transition-transform">Messages</button>
                        <button onClick={() => navigate('/admin/reviews')} className="bg-deep-black dark:bg-gold text-ivory dark:text-white py-4 rounded-xl font-semibold hover:scale-105 transition-transform">Review Moderation</button>
                        <button onClick={() => navigate('/admin/audit-logs')} className="bg-deep-black dark:bg-gold text-ivory dark:text-white py-4 rounded-xl font-semibold hover:scale-105 transition-transform">Audit Logs</button>
                        <button onClick={() => navigate('/')} className="bg-gray-700 dark:bg-zinc-700 text-white py-4 rounded-xl font-semibold hover:scale-105 transition-transform">View Website</button>
                    </div>
                </div>
            </div>
        </div>
    );
}