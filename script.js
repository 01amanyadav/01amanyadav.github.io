const year = document.querySelector('#year');
if (year) year.textContent = new Date().getFullYear();

const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');

// Remember the visitor's reading preference without requiring storage access.
const readingToggle = document.querySelector('.reading-toggle');
let largerText = false;
try { largerText = localStorage.getItem('aman-larger-text') === 'true'; } catch {}
function applyReadingPreference() {
  document.documentElement.classList.toggle('larger-text', largerText);
  if (!readingToggle) return;
  readingToggle.setAttribute('aria-pressed', String(largerText));
  const label = largerText ? 'Use standard text size' : 'Use larger text';
  readingToggle.setAttribute('aria-label', label);
  readingToggle.title = label;
}
applyReadingPreference();
readingToggle?.addEventListener('click', () => {
  largerText = !largerText;
  applyReadingPreference();
  try { localStorage.setItem('aman-larger-text', String(largerText)); } catch {}
});

const email = '08amanyadav@gmail.com';
const emailLink = document.querySelector('#contact-email');
const copyStatus = document.querySelector('#copy-status');
document.querySelectorAll('.topic-button').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.topic-button').forEach((topic) => {
      topic.setAttribute('aria-pressed', String(topic === button));
    });
    emailLink.href = 'mailto:' + email + '?subject=' + encodeURIComponent(button.dataset.subject);
    copyStatus.textContent = 'Topic: ' + button.textContent + '. Open your email app when you’re ready.';
  });
});

function celebrate(button) {
  if (motionPreference.matches || !('animate' in Element.prototype)) return;
  const colors = ['var(--pink)', 'var(--lime)', 'var(--cyan)', 'var(--ink)'];
  for (let i = 0; i < 12; i++) {
    const piece = document.createElement('i');
    piece.className = 'confetti';
    piece.setAttribute('aria-hidden', 'true');
    piece.style.background = colors[i % colors.length];
    button.append(piece);
    const x = (Math.random() - 0.5) * 220;
    const y = -35 - Math.random() * 80;
    const animation = piece.animate([
      { transform: 'translate(0,0) rotate(0)', opacity: 1 },
      { transform: 'translate(' + x + 'px,' + y + 'px) rotate(180deg)', opacity: 1, offset: 0.65 },
      { transform: 'translate(' + (x * 1.15) + 'px,20px) rotate(300deg)', opacity: 0 }
    ], { duration: 700, easing: 'ease-out' });
    animation.addEventListener('finish', () => piece.remove(), { once: true });
    animation.addEventListener('cancel', () => piece.remove(), { once: true });
    runningAnimations.add(animation);
    animation.addEventListener('finish', () => runningAnimations.delete(animation), { once: true });
    animation.addEventListener('cancel', () => runningAnimations.delete(animation), { once: true });
  }
}

let copyReset;
document.querySelectorAll('[data-copy-email]').forEach((button) => {
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(email);
      button.firstChild.textContent = 'Copied! ';
      copyStatus.textContent = 'Email copied: ' + email;
      clearTimeout(copyReset);
      copyReset = setTimeout(() => { button.firstChild.textContent = 'Copy email '; }, 2200);
      celebrate(button);
    } catch {
      copyStatus.textContent = 'Please select the email address above to copy it, or open your email app.';
    }
  });
});

const progress = document.querySelector('.scroll-progress');
let scrollScheduled = false;
function updateProgress() {
  const scrollRange = document.documentElement.scrollHeight - window.innerHeight;
  const ratio = scrollRange > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollRange)) : 0;
  progress?.style.setProperty('--progress', String(ratio));
  scrollScheduled = false;
}
function scheduleProgress() {
  if (scrollScheduled) return;
  scrollScheduled = true;
  requestAnimationFrame(updateProgress);
}
window.addEventListener('scroll', scheduleProgress, { passive: true });
window.addEventListener('resize', scheduleProgress);
window.addEventListener('load', scheduleProgress);
updateProgress();

if ('IntersectionObserver' in window) {
  const sectionLinks = [...document.querySelectorAll('nav a[href^="#"], .skill-jumps a[href^="#"]')];
  const sectionObserver = new IntersectionObserver((entries) => {
    const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
    if (!visible.length) return;
    const currentId = visible[0].target.id;
    sectionLinks.forEach((link) => {
      if (link.getAttribute('href') === '#' + currentId) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }, { rootMargin: '-10% 0px -45% 0px', threshold: [0, 0.1, 0.3] });
  sectionLinks.forEach((link) => {
    const section = document.querySelector(link.getAttribute('href'));
    if (section) sectionObserver.observe(section);
  });
}

// Content stays visible if motion is disabled or enhancement is unavailable.
const runningAnimations = new Set();
let revealObserver;
if (!motionPreference.matches && 'IntersectionObserver' in window && 'animate' in Element.prototype) {
  revealObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      revealObserver.unobserve(entry.target);
      if (motionPreference.matches) continue;
      const animation = entry.target.animate(
        [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'translateY(0)' }],
        { duration: 620, easing: 'cubic-bezier(.2,.65,.3,1)' }
      );
      runningAnimations.add(animation);
      const forget = () => runningAnimations.delete(animation);
      animation.addEventListener('finish', forget, { once: true });
      animation.addEventListener('cancel', forget, { once: true });
    }
  }, { threshold: 0.08 });
  document.querySelectorAll('.section-head, .live-project, .tool-card, .about, .process-grid article, .skill-card, .skills-outro').forEach((element) => revealObserver.observe(element));
}

motionPreference.addEventListener('change', (event) => {
  if (!event.matches) return;
  revealObserver?.disconnect();
  for (const animation of runningAnimations) animation.cancel();
  runningAnimations.clear();
});
