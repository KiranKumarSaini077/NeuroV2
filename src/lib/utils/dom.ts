export function flash(emoji: string): void {
  const el = document.createElement('div');
  el.className = 'flash-overlay show';
  el.innerHTML = `<div class="flash-emoji">${emoji}</div>`;
  document.body.appendChild(el);
  setTimeout(() => { el.remove(); }, 600);
}

export function flashCard(el: HTMLElement): void {
  el.classList.remove('flash-correct');
  void el.offsetWidth;
  el.classList.add('flash-correct');
  setTimeout(() => el.classList.remove('flash-correct'), 400);
}

export function flashCardWrong(el: HTMLElement): void {
  el.classList.remove('flash-wrong');
  void el.offsetWidth;
  el.classList.add('flash-wrong');
  setTimeout(() => el.classList.remove('flash-wrong'), 400);
}
