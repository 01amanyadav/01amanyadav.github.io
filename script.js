document.querySelector('#year').textContent = new Date().getFullYear();

// Content stays visible if motion is disabled or enhancement is unavailable.
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
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

  document.querySelectorAll('.section-head, .project, .about, .contact, footer').forEach((element) => revealObserver.observe(element));
}

motionPreference.addEventListener('change', (event) => {
  if (!event.matches) return;
  revealObserver?.disconnect();
  for (const animation of runningAnimations) animation.cancel();
  runningAnimations.clear();
});
