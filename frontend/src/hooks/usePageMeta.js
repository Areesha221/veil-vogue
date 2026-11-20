import { useEffect } from 'react';

export default function usePageMeta({ title, description } = {}) {
  useEffect(() => {
    const base = 'Veil & Vogue';
    const fullTitle = title ? `${title} | ${base}` : `${base} | Where Modesty Meets Elegance`;
    if (typeof document !== 'undefined') {
      document.title = fullTitle;
      if (description) {
        let meta = document.querySelector('meta[name="description"]');
        if (!meta) {
          meta = document.createElement('meta');
          meta.setAttribute('name', 'description');
          document.head.appendChild(meta);
        }
        meta.setAttribute('content', description);
      }
    }
  }, [title, description]);
}
