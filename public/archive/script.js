const cursor = document.querySelector('.cursor');
const isTouch = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

if (isTouch && cursor) {
  cursor.style.display = 'none';
  document.body.style.cursor = 'auto';
}

if (!isTouch && cursor) {
  window.addEventListener('mousemove', (event) => {
    cursor.style.left = `${event.clientX}px`;
    cursor.style.top = `${event.clientY}px`;
  });
}

const heroBg = document.querySelector('.hero-bg');
window.addEventListener(
  'scroll',
  () => {
    if (!heroBg) return;
    const y = Math.max(-16, Math.min(16, window.scrollY * 0.04));
    heroBg.style.transform = `translate3d(0, ${y}px, 0)`;
  },
  { passive: true }
);

function applyGlitchText(element) {
  const base = element.textContent;
  const target = element.getAttribute('data-glitch') || base;

  element.addEventListener('mouseenter', () => {
    let frame = 0;
    const id = setInterval(() => {
      frame += 1;
      element.textContent = target
        .split('')
        .map((ch) => (Math.random() > 0.72 ? '■' : ch))
        .join('');

      if (frame > 5) {
        clearInterval(id);
        element.textContent = target;
      }
    }, 45);
  });

  element.addEventListener('mouseleave', () => {
    element.textContent = base;
  });
}

document.querySelectorAll('[data-glitch]').forEach(applyGlitchText);

const revealElements = document.querySelectorAll('.reveal');
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 }
);

revealElements.forEach((element) => observer.observe(element));

const enterBtn = document.querySelector('.cop-btn');
if (enterBtn) {
  enterBtn.addEventListener('click', () => {
    const grid = document.querySelector('#grid');
    if (grid) {
      grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
}
