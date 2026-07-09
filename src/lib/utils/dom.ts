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

export function confetti(): void {
  const colors = ['#4fffb0','#ff6b6b','#ffd166','#74b9ff','#a29bfe','#ff9ff3'];
  for (let i = 0; i < 30; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    el.style.left = Math.random() * 100 + 'vw';
    el.style.top = Math.random() * 100 + 'vh';
    el.style.background = colors[Math.floor(Math.random() * colors.length)];
    el.style.animationDelay = Math.random() * 0.3 + 's';
    el.style.width = (3 + Math.random() * 4) + 'px';
    el.style.height = (3 + Math.random() * 4) + 'px';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1200);
  }
}

export function dateStamp(): string {
  const now = new Date();
  return now.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
    now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function streakBar(id: string, streakArr: number[], max = 10): void {
  const bar = document.getElementById(id);
  if (!bar) return;
  let html = '';
  for (let i = 0; i < max; i++) {
    html += `<div class="streak-dot ${i < streakArr.length ? 'lit' : ''}"></div>`;
  }
  if (streakArr.length > 0) html += `<span class="streak-count">${streakArr.length}</span>`;
  bar.innerHTML = html;
}
