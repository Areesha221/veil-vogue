import { Link } from 'react-router-dom';
import { Instagram, Facebook, MessageCircle, Mail, Phone, MapPin } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-deep-black text-ivory pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Brand Section */}
          <div>
            <h3 className="font-serif text-3xl font-bold text-gold mb-4">Veil & Vogue</h3>
            <p className="text-ivory/70 mb-6 leading-relaxed">
              Where Modesty Meets Elegance. Premium modest fashion for the modern woman.
            </p>
            {/* Clickable Social Icons */}
            <div className="flex gap-4">
              <a
                href="https://www.instagram.com/_veilandvogue?lqvp=MWdhYmFuYWRoZnZuMw%3D%3D&utm_source=qr"
                target="_blank"
                rel="noopener noreferrer"
                className="text-ivory/70 hover:text-gold transition-colors transform hover:scale-110"
                aria-label="Instagram"
              >
                <Instagram size={24} />
              </a>
              <a
                href="https://www.facebook.com/people/Veil-Vogue/61572573308087/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-ivory/70 hover:text-gold transition-colors transform hover:scale-110"
                aria-label="Facebook"
              >
                <Facebook size={24} />
              </a>
              <a
                href="https://wa.me/923144129295"
                target="_blank"
                rel="noopener noreferrer"
                className="text-ivory/70 hover:text-green-500 transition-colors transform hover:scale-110"
                aria-label="WhatsApp"
              >
                <MessageCircle size={24} />
              </a>
            </div>
          </div>

          {/* Shop Section */}
          <div>
            <h4 className="font-serif text-xl font-bold text-gold mb-4">Shop</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/shop/hijabs" className="text-ivory/70 hover:text-gold transition-colors">
                  Hijabs
                </Link>
              </li>
              <li>
                <Link to="/shop/abayas" className="text-ivory/70 hover:text-gold transition-colors">
                  Abayas
                </Link>
              </li>
              <li>
                <Link to="/shop/hijab-pins" className="text-ivory/70 hover:text-gold transition-colors">
                  Hijab Pins
                </Link>
              </li>
              <li>
                <Link to="/shop/scrunchies" className="text-ivory/70 hover:text-gold transition-colors">
                  Scrunchies
                </Link>
              </li>
              <li>
                <Link to="/shop/hijab-caps" className="text-ivory/70 hover:text-gold transition-colors">
                  Hijab Caps
                </Link>
              </li>
            </ul>
          </div>

          {/* Support Section */}
          <div>
            <h4 className="font-serif text-xl font-bold text-gold mb-4">Support</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/contact" className="text-ivory/70 hover:text-gold transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link to="/shipping" className="text-ivory/70 hover:text-gold transition-colors">
                  Shipping
                </Link>
              </li>
              <li>
                <Link to="/returns" className="text-ivory/70 hover:text-gold transition-colors">
                  Returns
                </Link>
              </li>
              <li>
                <Link to="/faq" className="text-ivory/70 hover:text-gold transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <Link to="/track-order" className="text-ivory/70 hover:text-gold transition-colors">
                  Track Order
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Section */}
          <div>
            <h4 className="font-serif text-xl font-bold text-gold mb-4">Contact</h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="mailto:veilandvogue5320@gmail.com"
                  className="text-ivory/70 hover:text-gold transition-colors flex items-center gap-2"
                >
                  <Mail size={18} />
                  veilandvogue5320@gmail.com
                </a>
              </li>
              <li>
                <a
                  href="tel:+923144129295"
                  className="text-ivory/70 hover:text-gold transition-colors flex items-center gap-2"
                >
                  <Phone size={18} />
                  +92 314 4129295
                </a>
              </li>
              <li>
                <div className="text-ivory/70 flex items-center gap-2">
                  <MapPin size={18} />
                  Faisalabad, Pakistan
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-ivory/10 pt-8 text-center">
          <p className="text-ivory/50 text-sm">
            © {currentYear} Veil & Vogue. All rights reserved. Crafted with elegance.
          </p>
        </div>
      </div>
    </footer>
  );
}