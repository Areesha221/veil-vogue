import { useEffect, useState, useRef } from 'react';
import { motion, useSpring } from 'framer-motion';

export default function CustomCursor() {
  const [isHovering, setIsHovering] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [trail, setTrail] = useState([]);
  const keyCounter = useRef(0);

  const cursorX = useSpring(0, { stiffness: 500, damping: 28, mass: 0.5 });
  const cursorY = useSpring(0, { stiffness: 500, damping: 28, mass: 0.5 });
  const trailX = useSpring(0, { stiffness: 200, damping: 20 });
  const trailY = useSpring(0, { stiffness: 200, damping: 20 });

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);

    if (isMobile) return;

    let lastTrailTime = 0;

    const moveCursor = (e) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);

      setTimeout(() => {
        trailX.set(e.clientX);
        trailY.set(e.clientY);
      }, 50);

      const now = Date.now();
      if (now - lastTrailTime > 30) {
        lastTrailTime = now;
        keyCounter.current += 1;
        setTrail(prev => {
          const newTrail = [...prev, {
            x: e.clientX,
            y: e.clientY,
            id: `${Date.now()}-${Math.random()}`
          }];
          return newTrail.slice(-8);
        });
      }
    };

    const handleHoverStart = () => setIsHovering(true);
    const handleHoverEnd = () => setIsHovering(false);
    const handleMouseDown = () => setIsClicking(true);
    const handleMouseUp = () => setIsClicking(false);

    window.addEventListener('mousemove', moveCursor);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    const interactiveElements = document.querySelectorAll('a, button, input, [data-cursor="hover"]');
    interactiveElements.forEach(el => {
      el.addEventListener('mouseenter', handleHoverStart);
      el.addEventListener('mouseleave', handleHoverEnd);
    });

    const observer = new MutationObserver(() => {
      const newElements = document.querySelectorAll('a, button, input, [data-cursor="hover"]');
      newElements.forEach(el => {
        el.addEventListener('mouseenter', handleHoverStart);
        el.addEventListener('mouseleave', handleHoverEnd);
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener('mousemove', moveCursor);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('resize', checkMobile);
      observer.disconnect();
    };
  }, [isMobile]);

  if (isMobile) return null;

  return (
    <>
      {/* Cursor Trail */}
      {trail.map((point) => (
        <motion.div
          key={point.id}
          initial={{ opacity: 0.6, scale: 1 }}
          animate={{ opacity: 0, scale: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed pointer-events-none z-[99999]"
          style={{
            left: point.x,
            top: point.y,
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: 'rgba(59, 130, 246, 0.6)', // ✅ FIXED
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}

      {/* Main Cursor */}
      <motion.div
        className="fixed pointer-events-none z-[99999] mix-blend-difference"
        style={{
          left: cursorX,
          top: cursorY,
          translateX: '-50%',
          translateY: '-50%',
        }}
      >
        <motion.div
          animate={{
            scale: isHovering ? 2.5 : isClicking ? 0.8 : 1,
            opacity: isHovering ? 0.3 : 0.2,
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="absolute inset-0 rounded-full bg-blue-400 blur-xl"
          style={{ width: 40, height: 40, transform: 'translate(-50%, -50%)' }}
        />

        <motion.div
          animate={{
            scale: isHovering ? 1.5 : isClicking ? 0.7 : 1,
          }}
          transition={{ type: 'spring', stiffness: 500, damping: 28 }}
          className="w-3 h-3 rounded-full bg-blue-400 shadow-lg shadow-blue-400/50"
        />
      </motion.div>

      {/* Cursor Follower */}
      <motion.div
        className="fixed pointer-events-none z-[99998]"
        style={{
          left: trailX,
          top: trailY,
          translateX: '-50%',
          translateY: '-50%',
        }}
      >
        <motion.div
          animate={{
            width: isHovering ? 60 : 32,
            height: isHovering ? 60 : 32,
            borderColor: isHovering ? 'rgba(59, 130, 246, 0.8)' : 'rgba(59, 130, 246, 0.4)',
            backgroundColor: isHovering ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0)', // ✅ FIXED
          }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="rounded-full border-2"
        />
      </motion.div>
    </>
  );
}