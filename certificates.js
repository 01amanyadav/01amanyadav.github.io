(() => {
  'use strict';
  const grid = document.querySelector('#certificate-grid');
  if (!grid) return;
  const storageKey = 'aman-certificate-order-v1';
  const defaultCards = [...grid.querySelectorAll('.certificate-card')];
  const defaultOrder = defaultCards.map(card => card.dataset.id);
  const cardMap = new Map(defaultCards.map(card => [card.dataset.id, card]));
  const filters = [...document.querySelectorAll('.certificate-filter')];
  const status = document.querySelector('#certificate-status');
  const resultCount = document.querySelector('#certificate-count');
  const certMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const layoutAnimations = new Set();
  let move = null;
  let activeFilter = 'all';
  const order = () => [...grid.children].map(card => card.dataset.id);
  const visibleCards = () => [...grid.children].filter(card => !card.hidden);
  const title = card => card.querySelector('h2').textContent;
  const announce = message => { status.textContent = message; };

  function restoreOrder(ids) {
    const uniqueIds = [...new Set([...ids, ...defaultOrder])];
    uniqueIds.forEach(id => { if (cardMap.has(id)) grid.append(cardMap.get(id)); });
  }
  function saveOrder() {
    try { localStorage.setItem(storageKey, JSON.stringify(order())); return true; }
    catch { return false; }
  }
  function refreshMoveButtons() {
    const visible = visibleCards();
    defaultCards.forEach(card => {
      const index = visible.indexOf(card);
      card.querySelector('[data-direction="-1"]').disabled = index <= 0;
      card.querySelector('[data-direction="1"]').disabled = index < 0 || index === visible.length - 1;
    });
  }
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (Array.isArray(saved) && saved.every(id => typeof id === 'string')) restoreOrder(saved);
  } catch {}
  refreshMoveButtons();

  function animateLayout(before) {
    if (certMotion.matches || !('animate' in Element.prototype)) return;
    for (const card of visibleCards()) {
      const previous = before.get(card);
      if (!previous) continue;
      const current = card.getBoundingClientRect();
      const dx = previous.left - current.left;
      const dy = previous.top - current.top;
      if (!dx && !dy) continue;
      const animation = card.animate([
        { transform: 'translate(' + dx + 'px,' + dy + 'px)' },
        { transform: 'translate(0,0)' }
      ], { duration: 180, easing: 'ease-out' });
      layoutAnimations.add(animation);
      const forget = () => layoutAnimations.delete(animation);
      animation.addEventListener('finish', forget, { once: true });
      animation.addEventListener('cancel', forget, { once: true });
    }
  }
  function positionCard(card, targetIndex, animate = true) {
    const visible = visibleCards();
    const from = visible.indexOf(card);
    const to = Math.max(0, Math.min(visible.length - 1, targetIndex));
    if (from < 0 || from === to) return false;
    const before = animate ? new Map(visible.map(item => [item, item.getBoundingClientRect()])) : null;
    const target = visible[to];
    grid.insertBefore(card, from < to ? target.nextSibling : target);
    refreshMoveButtons();
    if (animate) animateLayout(before);
    return true;
  }
  function announcePosition(card, saved) {
    const visible = visibleCards();
    announce(title(card) + ' is now ' + (visible.indexOf(card) + 1) + ' of ' + visible.length + '. ' +
      (saved ? 'Layout saved on this device.' : 'Layout changed for this visit; browser storage is unavailable.'));
  }
  function finishMove(cancelled = false) {
    if (!move) return;
    const state = move;
    move = null;
    if (state.frame) cancelAnimationFrame(state.frame);
    state.clone?.remove();
    state.card.classList.remove('is-placeholder', 'keyboard-picked');
    state.handle.setAttribute('aria-pressed', 'false');
    if (state.pointerId !== undefined && state.handle.hasPointerCapture?.(state.pointerId)) {
      state.handle.releasePointerCapture(state.pointerId);
    }
    document.body.classList.remove('sorting-certificates');
    if (cancelled) {
      restoreOrder(state.original);
      refreshMoveButtons();
      announce('Move cancelled. Previous order restored.');
    } else if (state.active) {
      announcePosition(state.card, saveOrder());
    }
    state.handle.focus({ preventScroll: true });
  }

  filters.forEach(button => button.addEventListener('click', () => {
    if (move) finishMove(true);
    activeFilter = button.dataset.filter;
    filters.forEach(filter => filter.setAttribute('aria-pressed', String(filter === button)));
    defaultCards.forEach(card => { card.hidden = activeFilter !== 'all' && card.dataset.category !== activeFilter; });
    const count = visibleCards().length;
    resultCount.textContent = activeFilter === 'all' ? 'Showing all ' + count + ' certificates' :
      count + ' certificate' + (count === 1 ? '' : 's') + ' in ' + button.textContent.replace(/\s+\d+\s*$/, '').trim();
    refreshMoveButtons();
    announce(resultCount.textContent);
  }));
  document.querySelector('.reset-layout').addEventListener('click', () => {
    if (move) finishMove(true);
    restoreOrder(defaultOrder);
    try { localStorage.removeItem(storageKey); } catch {}
    refreshMoveButtons();
    announce('Original certificate order restored.');
  });

  grid.addEventListener('click', event => {
    const button = event.target.closest('.move-certificate');
    if (!button || button.disabled) return;
    if (move) finishMove(true);
    const card = button.closest('.certificate-card');
    const index = visibleCards().indexOf(card);
    if (positionCard(card, index + Number(button.dataset.direction))) {
      announcePosition(card, saveOrder());
      if (button.disabled) card.querySelector('.drag-handle').focus({ preventScroll: true });
    }
  });

  function startKeyboardMove(card, handle) {
    move = { kind: 'keyboard', card, handle, original: order(), active: true };
    card.classList.add('keyboard-picked');
    handle.setAttribute('aria-pressed', 'true');
    announce('Picked up ' + title(card) + '. Use arrow keys to move. Enter drops; Escape cancels.');
  }
  grid.addEventListener('keydown', event => {
    const handle = event.target.closest('.drag-handle');
    if (!handle) return;
    const card = handle.closest('.certificate-card');
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      if (move?.kind === 'keyboard') finishMove();
      else if (!move) startKeyboardMove(card, handle);
      return;
    }
    if (move?.kind !== 'keyboard' || move.card !== card) return;
    const visible = visibleCards();
    const top = visible[0].getBoundingClientRect().top;
    const columns = visible.filter(item => Math.abs(item.getBoundingClientRect().top - top) < 8).length || 1;
    const index = visible.indexOf(card);
    let target = index;
    if (event.key === 'ArrowLeft') target--;
    else if (event.key === 'ArrowRight') target++;
    else if (event.key === 'ArrowUp') target -= columns;
    else if (event.key === 'ArrowDown') target += columns;
    else if (event.key === 'Home') target = 0;
    else if (event.key === 'End') target = visible.length - 1;
    else return;
    event.preventDefault();
    if (positionCard(card, target)) {
      handle.focus({ preventScroll: true });
      card.scrollIntoView({ block: 'nearest', behavior: 'auto' });
      announce(title(card) + ': position ' + (visibleCards().indexOf(card) + 1) + ' of ' + visible.length + '. Enter to drop.');
    }
  });

  function activatePointerMove() {
    const state = move;
    state.active = true;
    const rect = state.card.getBoundingClientRect();
    const clone = state.card.cloneNode(true);
    clone.removeAttribute('aria-labelledby');
    clone.removeAttribute('id');
    clone.setAttribute('aria-hidden', 'true');
    clone.inert = true;
    clone.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'));
    clone.classList.add('floating-certificate');
    clone.style.left = rect.left + 'px';
    clone.style.top = rect.top + 'px';
    clone.style.width = rect.width + 'px';
    clone.style.height = rect.height + 'px';
    clone.style.boxSizing = 'border-box';
    document.body.append(clone);
    state.clone = clone;
    state.baseLeft = rect.left;
    state.baseTop = rect.top;
    state.originX = state.x;
    state.originY = state.y;
    state.card.classList.add('is-placeholder');
    state.handle.setAttribute('aria-pressed', 'true');
    document.body.classList.add('sorting-certificates');
    announce('Moving ' + title(state.card) + '. Release to drop; Escape cancels.');
    state.frame = requestAnimationFrame(pointerFrame);
  }
  function pointerFrame() {
    if (!move || move.kind !== 'pointer' || !move.active) return;
    const state = move;
    state.clone.style.transform = 'translate(' + (state.x - state.originX) + 'px,' + (state.y - state.originY) + 'px) rotate(2deg)';
    const edge = 70;
    if (state.y < edge) window.scrollBy({ top: -Math.ceil((edge - state.y) / 5), behavior: 'instant' });
    else if (state.y > window.innerHeight - edge) window.scrollBy({ top: Math.ceil((state.y - (window.innerHeight - edge)) / 5), behavior: 'instant' });
    const bounds = grid.getBoundingClientRect();
    if (state.x >= bounds.left - 15 && state.x <= bounds.right + 15 && state.y >= bounds.top - 15 && state.y <= bounds.bottom + 15) {
      let target = document.elementFromPoint(state.x, state.y)?.closest('.certificate-card');
      if (!target || !grid.contains(target) || target.hidden) {
        const visible = visibleCards();
        target = visible.reduce((closest, candidate) => {
          const rect = candidate.getBoundingClientRect();
          const distance = Math.hypot(state.x - (rect.left + rect.width / 2), state.y - (rect.top + rect.height / 2));
          return !closest || distance < closest.distance ? { card: candidate, distance } : closest;
        }, null)?.card;
      }
      if (target && target !== state.card) positionCard(state.card, visibleCards().indexOf(target), false);
    }
    state.frame = requestAnimationFrame(pointerFrame);
  }
  grid.addEventListener('pointerdown', event => {
    const handle = event.target.closest('.drag-handle');
    if (!handle || event.button !== 0 || event.isPrimary === false) return;
    if (move) finishMove(true);
    event.preventDefault();
    handle.focus({ preventScroll: true });
    move = { kind: 'pointer', card: handle.closest('.certificate-card'), handle, original: order(),
      startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY,
      pointerId: event.pointerId, active: false };
    handle.setPointerCapture?.(event.pointerId);
  });
  document.addEventListener('pointermove', event => {
    if (!move || move.kind !== 'pointer' || event.pointerId !== move.pointerId) return;
    move.x = event.clientX;
    move.y = event.clientY;
    if (!move.active && Math.hypot(move.x - move.startX, move.y - move.startY) >= 6) activatePointerMove();
    if (move.active && event.cancelable) event.preventDefault();
  }, { passive: false });
  document.addEventListener('pointerup', event => {
    if (move?.kind === 'pointer' && event.pointerId === move.pointerId) finishMove();
  });
  document.addEventListener('pointercancel', event => {
    if (move?.kind === 'pointer' && event.pointerId === move.pointerId) finishMove(true);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && move) { event.preventDefault(); finishMove(true); }
  });
  window.addEventListener('blur', () => { if (move?.kind === 'pointer') finishMove(true); });
  window.addEventListener('resize', () => { if (move) finishMove(true); });
  certMotion.addEventListener('change', event => {
    if (event.matches) {
      for (const animation of layoutAnimations) animation.cancel();
      layoutAnimations.clear();
    }
  });

  const dialog = document.querySelector('#certificate-dialog');
  let previewTrigger;
  grid.addEventListener('click', event => {
    const button = event.target.closest('[data-preview]');
    if (!button || move) return;
    const card = cardMap.get(button.dataset.preview);
    const pdf = card.querySelector('.certificate-pdf');
    if (!dialog.showModal) { window.open(pdf.href, '_blank', 'noopener'); return; }
    previewTrigger = button;
    document.querySelector('#preview-title').textContent = title(card);
    const image = document.querySelector('#preview-image');
    image.src = card.querySelector('.certificate-preview img').src;
    image.alt = title(card) + ' certificate for Aman Yadav';
    document.querySelector('#preview-pdf').href = pdf.href;
    const download = document.querySelector('#download-certificate');
    download.href = pdf.href;
    download.download = 'Aman-Yadav-' + card.dataset.id + '.pdf';
    dialog.showModal();
  });
  dialog.querySelector('.close-certificate').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => previewTrigger?.focus({ preventScroll: true }));
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
})();
