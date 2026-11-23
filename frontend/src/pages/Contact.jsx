import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Mail, Phone, MapPin, Send, MessageCircle } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import usePageMeta from '../hooks/usePageMeta';

export default function Contact() {
  usePageMeta({
    title: 'Contact',
    description: 'Contact Veil & Vogue for support, orders, product inquiries, and delivery questions. Email, WhatsApp, and contact form available.'
  });
  const { user } = useAuth();
  const { socket } = useSocket();
  const location = useLocation();
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showMessages, setShowMessages] = useState(false);

  useEffect(() => {
    // Check if coming from notification click
    if (location.state?.showMessages) {
      setShowMessages(true);
      // Scroll to messages section after a short delay
      setTimeout(() => {
        const messagesSection = document.getElementById('your-messages');
        if (messagesSection) {
          messagesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 300);
      // Clear the state
      window.history.replaceState({}, document.title);
    }

    if (user) {
      fetchMessages();
      
      // Listen for admin replies
      if (socket) {
        socket.on('message_reply', (message) => {
          setMessages(prev => prev.map(m => 
            m._id === message._id ? message : m
          ));
          toast.success('Admin replied to your message!');
        });
      }
    }

    return () => {
      if (socket) {
        socket.off('message_reply');
      }
    };
  }, [user, socket, location.state]);

  const fetchMessages = async () => {
    try {
      const token = (localStorage.getItem('veil-vogue-token') || sessionStorage.getItem('veil-vogue-token'));
      const { data } = await axios.get('/api/messages/my-messages', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Please login to send message');
      return;
    }

    setLoading(true);
    try {
      const token = (localStorage.getItem('veil-vogue-token') || sessionStorage.getItem('veil-vogue-token'));
      const { data } = await axios.post(
        '/api/messages',
        {
          name: user.name,
          email: user.email,
          subject: form.subject,
          message: form.message
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setMessages(prev => [data, ...prev]);
      toast.success('Message sent successfully! Admin will reply soon.');
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-28 md:pt-32 pb-20 min-h-screen bg-ivory dark:bg-zinc-950">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="font-serif text-5xl font-bold mb-4 text-gray-900 dark:text-ivory">
            Get In Touch
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            We'd love to hear from you. Reach out to us anytime!
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 shadow-lg">
            <h2 className="font-serif text-3xl font-bold mb-6 text-gray-900 dark:text-ivory">
              Send us a Message
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-ivory">Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({...form, name: e.target.value})}
                  className="w-full px-4 py-3 rounded-lg bg-ivory dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 focus:border-gold focus:outline-none text-gray-900 dark:text-ivory"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-ivory">Email</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({...form, email: e.target.value})}
                  className="w-full px-4 py-3 rounded-lg bg-ivory dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 focus:border-gold focus:outline-none text-gray-900 dark:text-ivory"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-ivory">Subject</label>
                <input
                  type="text"
                  required
                  value={form.subject}
                  onChange={(e) => setForm({...form, subject: e.target.value})}
                  className="w-full px-4 py-3 rounded-lg bg-ivory dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 focus:border-gold focus:outline-none text-gray-900 dark:text-ivory"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-ivory">Message</label>
                <textarea
                  required
                  rows="5"
                  value={form.message}
                  onChange={(e) => setForm({...form, message: e.target.value})}
                  className="w-full px-4 py-3 rounded-lg bg-ivory dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 focus:border-gold focus:outline-none text-gray-900 dark:text-ivory"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-deep-black dark:bg-gold text-ivory dark:text-white py-3 rounded-full font-semibold hover:scale-105 transition-transform flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Send size={18} />
                {loading ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </div>

          {/* Contact Info & Messages */}
          <div className="space-y-6">
            {/* Contact Info Cards */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-lg">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gold/20 rounded-full flex items-center justify-center shrink-0">
                  <Phone size={24} className="text-gold" />
                </div>
                <div>
                  <h3 className="font-serif text-xl font-bold mb-2 text-gray-900 dark:text-ivory">Phone</h3>
                  <p className="text-gray-600 dark:text-gray-400">+92 314 4129295</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-lg">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gold/20 rounded-full flex items-center justify-center shrink-0">
                  <Mail size={24} className="text-gold" />
                </div>
                <div>
                  <h3 className="font-serif text-xl font-bold mb-2 text-gray-900 dark:text-ivory">Email</h3>
                  <p className="text-gray-600 dark:text-gray-400">veilandvogue5320@gmail.com</p>
                </div>
              </div>
            </div>

            {/* Previous Messages - Show if user is logged in or coming from notification */}
            {user && (
              <div id="your-messages" className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-serif text-2xl font-bold text-gray-900 dark:text-ivory flex items-center gap-2">
                    <MessageCircle size={24} />
                    Your Messages
                  </h3>
                  <button
                    onClick={() => setShowMessages(!showMessages)}
                    className="text-sm text-gold hover:text-yellow-600 font-medium"
                  >
                    {showMessages ? 'Hide' : 'Show'}
                  </button>
                </div>
                
                {showMessages && (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {messages.length === 0 ? (
                      <div className="text-center py-8">
                        <MessageCircle size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                        <p className="text-gray-500 dark:text-gray-400">No messages yet</p>
                        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Send us a message using the form</p>
                      </div>
                    ) : (
                      messages.map((msg) => (
                        <div key={msg._id} className="border border-gray-200 dark:border-zinc-800 rounded-xl p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-ivory">{msg.subject}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {new Date(msg.createdAt).toLocaleString()}
                              </p>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              msg.status === 'replied' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                              msg.status === 'read' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                              'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                            }`}>
                              {msg.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">{msg.message}</p>
                          
                          {msg.adminReply && (
                            <div className="bg-gold/10 border-l-4 border-gold p-3 rounded">
                              <p className="text-xs font-semibold text-gold mb-1">Admin Reply:</p>
                              <p className="text-sm text-gray-900 dark:text-ivory">{msg.adminReply.message}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {new Date(msg.adminReply.repliedAt).toLocaleString()}
                              </p>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}