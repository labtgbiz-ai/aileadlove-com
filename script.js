// ===== SCROLL REVEAL =====
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      revealObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.08 });

// ===== ACTIVE IFRAME TRACKING =====
// Tracks all currently active (playing) iframes so we can pause them
const activeIframes = new Set();

// Pause a VK iframe by reloading it without autoplay
function pauseIframe(iframe) {
  if (!iframe) return;
  const src = iframe.src || '';
  if (!src || src === 'about:blank') return;
  // Remove autoplay param to pause
  const newSrc = src.replace(/[&?]autoplay=1/, '');
  if (newSrc !== src) {
    iframe.src = newSrc;
  } else {
    // Force reload without autoplay to stop playback
    iframe.src = newSrc.includes('?') ? newSrc + '&autoplay=0' : newSrc + '?autoplay=0';
  }
}

function pauseAllActive() {
  activeIframes.forEach(iframe => pauseIframe(iframe));
  activeIframes.clear();
}

// IntersectionObserver to auto-pause iframes when they leave the viewport
// Works on both desktop and mobile
const autoPauseObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (!e.isIntersecting) {
      const iframe = e.target;
      if (activeIframes.has(iframe)) {
        pauseIframe(iframe);
        activeIframes.delete(iframe);
      }
    }
  });
}, { threshold: 0.1 });

// ===== LAZY IFRAME LOADING (reels section) =====
const iframeObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      const iframe = e.target;
      const dataSrc = iframe.getAttribute('data-src');
      if (dataSrc && iframe.src !== dataSrc) {
        iframe.src = dataSrc;
        iframe.removeAttribute('data-src');
        // Track for auto-pause
        activeIframes.add(iframe);
        autoPauseObserver.observe(iframe);
      }
      iframeObserver.unobserve(iframe);
    }
  });
}, { rootMargin: '50px 0px' });

// ===== SINGLE-CLICK VIDEO PLAY =====
// Replaces poster image with iframe on click, pauses all other active iframes
function playVideo(posterEl) {
  const src = posterEl.getAttribute('data-src');
  if (!src) return;

  // Pause all currently active iframes
  pauseAllActive();

  const iframe = document.createElement('iframe');
  iframe.src = src.includes('autoplay') ? src : src + (src.includes('?') ? '&' : '?') + 'autoplay=1';
  iframe.frameBorder = '0';
  iframe.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture';
  iframe.allowFullscreen = true;
  iframe.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;border:none;';

  // Hide poster content
  posterEl.style.cursor = 'default';
  posterEl.onclick = null;

  // Clear poster and insert iframe
  while (posterEl.firstChild) posterEl.removeChild(posterEl.firstChild);
  posterEl.appendChild(iframe);

  // Track and observe this iframe for auto-pause
  activeIframes.add(iframe);
  autoPauseObserver.observe(iframe);
}

// ===== REELS NAVIGATION (desktop: scroll 3 items at a time) =====
function scrollReels(dir) {
  const track = document.getElementById('reelsTrack');
  if (!track) return;
  const items = track.querySelectorAll('.reel-item');
  if (!items.length) return;
  const itemW = items[0].offsetWidth + 12; // width + gap
  // Pause all active iframes when navigating
  pauseAllActive();
  // Scroll 3 items at a time
  track.scrollBy({ left: dir * itemW * 3, behavior: 'smooth' });
}

// ===== MOBILE MENU =====
function toggleMenu() {
  const menu = document.getElementById('mobile-menu');
  const btn = document.querySelector('.hamburger');
  if (!menu) return;
  const open = menu.classList.toggle('open');
  if (btn) btn.setAttribute('aria-expanded', open);
  document.body.style.overflow = open ? 'hidden' : '';
}
document.addEventListener('click', (e) => {
  const link = e.target.closest('.mobile-menu a');
  if (link) {
    const menu = document.getElementById('mobile-menu');
    if (menu) { menu.classList.remove('open'); document.body.style.overflow = ''; }
  }
});

// ===== SMOOTH SCROLL =====
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const id = a.getAttribute('href').slice(1);
    const el = document.getElementById(id);
    if (el) {
      e.preventDefault();
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// ===== NAVBAR SCROLL EFFECT =====
const navbar = document.querySelector('.navbar');
let lastScroll = 0;
window.addEventListener('scroll', () => {
  const y = window.scrollY;
  if (navbar) {
    navbar.classList.toggle('scrolled', y > 50);
    if (y > lastScroll + 10 && y > 200) {
      navbar.classList.add('hidden');
    } else if (y < lastScroll) {
      navbar.classList.remove('hidden');
    }
  }
  lastScroll = y;
}, { passive: true });

// ===== INIT ON DOM READY =====
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.reveal, .fade-in-up').forEach(el => revealObserver.observe(el));
  document.querySelectorAll('iframe[data-src]').forEach(el => iframeObserver.observe(el));

  // ===== REELS DOTS + TOUCH SWIPE =====
  document.querySelectorAll('.reels-section').forEach(section => {
    const track = section.querySelector('.reels-track');
    const dots = section.querySelectorAll('.reel-dot');
    if (!track) return;

    // Update active dot on scroll
    if (dots.length) {
      track.addEventListener('scroll', () => {
        const items = track.querySelectorAll('.reel-item');
        if (!items.length) return;
        const itemW = items[0].offsetWidth + 12;
        const idx = Math.round(track.scrollLeft / itemW);
        dots.forEach((d, i) => d.classList.toggle('active', i === idx));
      }, { passive: true });
    }

    // Pause active iframes when track is scrolled (mobile scroll)
    let scrollPauseTimer = null;
    track.addEventListener('scroll', () => {
      if (scrollPauseTimer) clearTimeout(scrollPauseTimer);
      scrollPauseTimer = setTimeout(() => {
        // After scroll settles, pause any iframes not visible in track
        const trackRect = track.getBoundingClientRect();
        activeIframes.forEach(iframe => {
          const iframeRect = iframe.getBoundingClientRect();
          // Check if iframe is outside the track's visible area
          const isVisible = (
            iframeRect.left < trackRect.right &&
            iframeRect.right > trackRect.left &&
            iframeRect.top < trackRect.bottom &&
            iframeRect.bottom > trackRect.top
          );
          if (!isVisible) {
            pauseIframe(iframe);
            activeIframes.delete(iframe);
          }
        });
      }, 300);
    }, { passive: true });

    // Touch swipe: snap to next/prev group of items on swipe
    let touchStartX = 0;
    let touchStartScrollLeft = 0;
    let isDragging = false;

    track.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartScrollLeft = track.scrollLeft;
      isDragging = false;
    }, { passive: true });

    track.addEventListener('touchmove', (e) => {
      const dx = touchStartX - e.touches[0].clientX;
      if (Math.abs(dx) > 5) isDragging = true;
    }, { passive: true });

    track.addEventListener('touchend', (e) => {
      if (!isDragging) return;
      const dx = touchStartX - e.changedTouches[0].clientX;
      const item = track.querySelector('.reel-item');
      const itemW = item ? item.offsetWidth + 12 : 220;
      const currentIdx = Math.round(touchStartScrollLeft / itemW);
      const targetIdx = dx > 30 ? currentIdx + 1 : dx < -30 ? currentIdx - 1 : currentIdx;
      const items = track.querySelectorAll('.reel-item');
      const clampedIdx = Math.max(0, Math.min(targetIdx, items.length - 1));
      // Pause all active iframes before switching reel
      pauseAllActive();
      track.scrollTo({ left: clampedIdx * itemW, behavior: 'smooth' });
    }, { passive: true });
  });

  // ===== PAGE-LEVEL SCROLL: pause reels iframes when section scrolls out of view =====
  // This handles the case when user scrolls away from the reels section entirely
  const reelsSection = document.querySelector('.reels-section');
  if (reelsSection) {
    const reelsSectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) {
          // User scrolled away from reels section — pause all active iframes
          pauseAllActive();
        }
      });
    }, { threshold: 0 });
    reelsSectionObserver.observe(reelsSection);
  }
});
