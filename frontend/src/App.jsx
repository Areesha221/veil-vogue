import { Routes, Route, Navigate } from 'react-router-dom';

// Socket Provider (only this one - others are in main.jsx)
import SocketProvider from './context/SocketContext';

// Layouts
import PublicLayout from './components/layout/PublicLayout';
import AdminLayout from './components/layout/AdminLayout';

// Auth Guards
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminRoute from './components/auth/AdminRoute';

// Public Pages
import Home from './pages/Home';
import Shop from './pages/Shop';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Wishlist from './pages/Wishlist';
import OrderSuccess from './pages/OrderSuccess';
import HamperBuilder from './pages/HamperBuilder';
import Search from './pages/Search';
import About from './pages/About';
import Contact from './pages/Contact';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Shipping from './pages/Shipping';
import Returns from './pages/Returns';
import FAQ from './pages/FAQ';
import TrackOrder from './pages/TrackOrder';
import NotFound from './pages/NotFound';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminProducts from './pages/admin/Products';
import AdminOrders from './pages/admin/Orders';
import AdminUsers from './pages/admin/Users';
import AdminReceiptVerification from './pages/admin/ReceiptVerification';
import AdminOrderDetail from './pages/admin/OrderDetail';
import AdminMessages from './pages/admin/Messages';
import AdminReviews from './pages/admin/Reviews';
import AdminAuditLogs from './pages/admin/AuditLogs';

export default function App() {
  return (
    <SocketProvider>
      <Routes>
        {/* Public / Customer Routes */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/shop/:category" element={<Shop />} />
          <Route path="/build-hamper" element={<HamperBuilder />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/wishlist" element={<ProtectedRoute><Wishlist /></ProtectedRoute>} />
          <Route path="/order-success" element={<OrderSuccess />} />
          <Route path="/search" element={<Search />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/shipping" element={<Shipping />} />
          <Route path="/returns" element={<Returns />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/track-order" element={<TrackOrder />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* Admin Routes - admin-only shell, no customer shop chrome */}
        <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
          <Route index element={<AdminDashboard />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="messages" element={<AdminMessages />} />
          <Route path="receipts" element={<AdminReceiptVerification />} />
          <Route path="reviews" element={<AdminReviews />} />
          <Route path="audit-logs" element={<AdminAuditLogs />} />
          <Route path="orders/:id" element={<AdminOrderDetail />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
      </Routes>
    </SocketProvider>
  );
}
