const year = document.querySelector('#year');
if (year) year.textContent = new Date().getFullYear();

const demoTabs = [...document.querySelectorAll('.demo-tab')];
const layerFiles = ['index.html', 'styles.css', 'script.js'];
const layerDescriptions = ['01 / GIVE THE IDEA A STRUCTURE', '02 / ADD A LITTLE PERSONALITY', '03 / MAKE THE DETAILS RESPOND'];
function selectLayer(index) {
  demoTabs.forEach((tab, position) => {
    const selected = position === index;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    document.getElementById(tab.getAttribute('aria-controls')).hidden = !selected;
  });
  document.querySelector('#editor-file').textContent = layerFiles[index];
  document.querySelector('#layer-description').textContent = layerDescriptions[index];
}
demoTabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectLayer(index));
  tab.addEventListener('keydown', (event) => {
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % demoTabs.length;
    else if (event.key === 'ArrowLeft') next = (index + demoTabs.length - 1) % demoTabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = demoTabs.length - 1;
    else return;
    event.preventDefault();
    selectLayer(next);
    demoTabs[next].focus();
  });
});
document.querySelector('#say-hello')?.addEventListener('click', () => {
  document.querySelector('#greeting').textContent = 'Hey there. Nice to meet you! — Aman';
});

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

  document.querySelectorAll('.section-head, .project, .tool-card, .about, .process-grid article, .skill-card, .skills-outro').forEach((element) => revealObserver.observe(element));
}

motionPreference.addEventListener('change', (event) => {
  if (!event.matches) return;
  revealObserver?.disconnect();
  for (const animation of runningAnimations) animation.cancel();
  runningAnimations.clear();
});
