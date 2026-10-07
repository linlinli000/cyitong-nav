/** 首屏 hero：时钟+日期+按时段问候 */
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

function greetingFor(h: number): string {
  if (h >= 5 && h < 11) return '早上好，今天想查什么？';
  if (h >= 11 && h < 14) return '中午好，今天想查什么？';
  if (h >= 14 && h < 18) return '下午好，今天想查什么？';
  if (h >= 18 && h < 23) return '晚上好，今天想查什么？';
  return '夜深了，注意休息';
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** 每秒对时，内容有变化才写 DOM */
function renderHeroClock(): void {
  const clock = document.getElementById('hero-clock');
  if (!clock) return;
  const now = new Date();
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  if (clock.textContent === time) return;
  clock.textContent = time;
  clock.setAttribute(
    'datetime',
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${time}`,
  );
  const date = document.getElementById('hero-date');
  if (date) date.textContent = `${now.getMonth() + 1}月${now.getDate()}日 周${WEEKDAYS[now.getDay()]}`;
  const greet = document.getElementById('hero-greeting');
  if (greet) greet.textContent = greetingFor(now.getHours());
}

let inited = false;

export function initNavHero(): void {
  if (inited) return;
  inited = true;
  renderHeroClock();
  setInterval(renderHeroClock, 1000);
}
