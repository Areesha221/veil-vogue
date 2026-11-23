import { Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './Navbar';
import Footer from './Footer';
import CustomCursor from './CustomCursor';
import ScrollToTop from './ScrollToTop';
import BackToTop from '../ui/BackToTop';
import AIAssistant from '../AIAssistant';

export default function PublicLayout() {
  return (
    <div className="min-h-screen">
      <CustomCursor />
      <ScrollToTop />
      <div className="min-h-screen bg-ivory dark:bg-zinc-950 text-gray-900 dark:text-ivory transition-colors">
        <Navbar />
        <main>
          <Outlet />
        </main>
        <Footer />
        <Toaster position="bottom-right" />
      </div>
      <BackToTop />
      <AIAssistant />
    </div>
  );
}
