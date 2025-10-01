function formatUSD(n){ if(n==null||Number.isNaN(n))return '—'; try{return new Intl.NumberFormat(undefined,{style:'currency',currency:'USD',maximumFractionDigits:6}).format(n);}catch(e){return '$'+Number(n).toFixed(2);} }


// Year
document.getElementById('year').textContent = new Date().getFullYear();

// Mobile menu
const navToggle = document.getElementById('nav-toggle');
const navList = document.getElementById('nav-list');
if (navToggle && navList) {
  navToggle.addEventListener('click', () => {
    const isOpen = navList.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });
}

// Theme toggle
const themeToggle = document.getElementById('themeToggle');
const applyTheme = (mode) => {
  if (mode === 'light') document.documentElement.classList.add('light');
  else document.documentElement.classList.remove('light');
};
applyTheme(localStorage.getItem('theme') || 'dark');
if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const nowLight = !document.documentElement.classList.contains('light');
    applyTheme(nowLight ? 'light' : 'dark');
    localStorage.setItem('theme', nowLight ? 'light' : 'dark');
    themeToggle.setAttribute('aria-pressed', String(nowLight));
  });
}


// Copy CA
const btnCopy = document.getElementById('copyCA');
const caText = "5YesRCpnjAR396xDy1xenHahfogjevCH4c46TH6wPray";
if (btnCopy) {
  btnCopy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(caText);
      btnCopy.textContent = 'Copied ✔';
      setTimeout(()=>btnCopy.textContent='Copy Contract', 1500);
    } catch (e) { alert('Copy failed'); }
  });
}

// Section reveal
try {
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{ if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, {threshold: 0.12});
  document.querySelectorAll('.reveal').forEach(el=> io.observe(el));
} catch(e){}

// Active menu highlight (hybrid: IO + scroll fallback)
try {
  const sectionIds = ['hero','howto','charts','tokenomics','team','roadmap'];
  const links = new Map();
  sectionIds.forEach(id=>{
    const link = document.querySelector(`.menu__list a[href="#${id}"]`);
    if (link) links.set(id, link);
  });
  const setActive = (id)=>{
    links.forEach(l=>l.classList.remove('active'));
    const t = links.get(id);
    if (t) t.classList.add('active');
  };
  function getHeaderOffset(){
    const h = document.querySelector('header');
    if (!h) return 76;
    const styles = getComputedStyle(h);
    const mb = parseFloat(styles.marginBottom || 0);
    return Math.ceil(h.getBoundingClientRect().height + mb);
  }
  let lastActive = null;
  try {
    const io = new IntersectionObserver((entries)=>{
      entries.forEach(e=>{
        if (e.isIntersecting){ lastActive = e.target.id; setActive(lastActive); }
      });
    }, { threshold: 0.25, rootMargin: "-18% 0px -60% 0px" });
    sectionIds.forEach(id=>{ const el = document.getElementById(id); if (el) io.observe(el); });
  } catch(e){}
  let ticking = false;
  function onScrollCheck(){
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(()=>{
      const off = getHeaderOffset();
      let bestId = null;
      let bestDist = Infinity;
      sectionIds.forEach(id=>{
        const el = document.getElementById(id);
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const dist = Math.abs(rect.top - off);
        if (rect.bottom > off + 40 && rect.top < window.innerHeight - 80){
          if (dist < bestDist){ bestDist = dist; bestId = id; }
        }
      });
      if (bestId && bestId !== lastActive){ lastActive = bestId; setActive(bestId); }
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScrollCheck, { passive:true });
  window.addEventListener('resize', onScrollCheck);
  document.addEventListener('DOMContentLoaded', onScrollCheck);
  onScrollCheck();
} catch(e){}
// Chart loader hide

try {
  const wrap = document.querySelector('.chart-embed');
  const loader = wrap?.querySelector('.chart-loader');
  const iframe = wrap?.querySelector('iframe');
  if (iframe && loader) {
    const hideLoader = ()=>{ loader.style.display = 'none'; };
    iframe.addEventListener('load', hideLoader, { once: true });
    setTimeout(hideLoader, 15000);
  }
} catch(e){}


//
// Minutely holders refresh
async function refreshHoldersOnly(){
  const holders = await fetchHoldersFromSolscanRobust();
  const statHolders = document.getElementById('statHolders');
  if (statHolders) statHolders.textContent = holders != null ? formatNum(holders) : "—";
  if (statHolders) statHolders.setAttribute('data-updated', new Date().toISOString());
}
setInterval(refreshHoldersOnly, 60 * 1000);

// Phantom add token (placeholder)
const addBtn = document.getElementById('addToWallet');
if (addBtn){
  addBtn.addEventListener('click', (e)=>{
    e.preventDefault();
    alert('Adding to Phantom depends on your dApp/aggregator. Paste CA manually: ' + "5YesRCpnjAR396xDy1xenHahfogjevCH4c46TH6wPray");
  });
}


// ---- 5-minute refresh for price & market cap ----
async function refreshPriceMcap(){
  const price = await fetchPriceFromDexscreener();
  const mcap = price != null ? price * (TOTAL_SUPPLY / (10 ** DECIMALS)) : null;
  const statPrice = document.getElementById('statPrice');
  const statMcap = document.getElementById('statMcap');
  if (statPrice) statPrice.textContent = price != null ? formatUSD(price) : "—";
  if (statMcap) statMcap.textContent = mcap != null ? formatUSD(mcap) : "—";
}
if (!window.__jfreePriceAutoRefresh){
  window.__jfreePriceAutoRefresh = true;
  setInterval(refreshPriceMcap, 5 * 60 * 1000);
}




// ---- SOL Price Monitoring (robust multi-source) ----
async function fetchWithTimeout(resource, options = {}){
  const { timeout = 8000 } = options;
  const controller = (typeof AbortController !== 'undefined') ? new AbortController() : { abort: ()=>{} };
  const id = setTimeout(() => controller.abort(), timeout);
  try{
    const response = await fetch(resource, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  }catch(e){
    clearTimeout(id);
    throw e;
  }
}
async function fetchSolFromCoinGecko(){
  const res = await fetchWithTimeout("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true");
  const data = await res.json();
  const price = Number(data?.solana?.usd);
  const change = Number(data?.solana?.usd_24h_change);
  if (!Number.isFinite(price)) throw new Error("CG price missing");
  return { price, change };
}
async function fetchSolFromCoinbase(){
  const res = await fetchWithTimeout("https://api.coinbase.com/v2/prices/SOL-USD/spot");
  const data = await res.json();
  const price = Number(data?.data?.amount);
  if (!Number.isFinite(price)) throw new Error("CB price missing");
  return { price, change: null };
}
async function fetchSolFromBinance(){
  const res = await fetchWithTimeout("https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT");
  const data = await res.json();
  const price = Number(data?.price);
  if (!Number.isFinite(price)) throw new Error("Binance price missing");
  return { price, change: null };
}
async function fetchSolPriceRobust(){
  const fns = [fetchSolFromCoinGecko, fetchSolFromCoinbase, fetchSolFromBinance];
  for (const fn of fns){ try{ const out = await fn(); if (out && Number.isFinite(out.price)) return out; }catch(e){} }
  return { price: null, change: null };
}
function formatChange(pct){ if(pct==null||Number.isNaN(pct)) return ""; const sign = pct>=0?"+":""; return ` (${sign}${pct.toFixed(2)}%)`; }
async function updateSolPrice(){
  const out = document.getElementById('solTicker'); if (!out) return;
  const { price, change } = await fetchSolPriceRobust();
  out.textContent = price ? `${formatUSD(price)}${formatChange(change)}` : "—";
  if (price && change !== null){ out.style.color = change >= 0 ? "#16a34a" : "#ef4444"; } else { out.style.color = ""; }
}
(async ()=>{ await updateSolPrice(); setTimeout(updateSolPrice, 6000); })();
setInterval(updateSolPrice, 60 * 1000);
// --- Improved holders fetch with fallbacks (Solscan) ---
async function fetchHoldersFromSolscanRobust(){
  // Try meta endpoint first
  try{
    const res = await fetch(`https://public-api.solscan.io/token/meta?tokenAddress=${TOKEN_MINT}`);
    const data = await res.json();
    const val = data?.holder ?? data?.holders ?? data?.data?.holder ?? data?.data?.holders;
    if (val && Number(val)) return Number(val);
  }catch(e){ /* fall through */ }
  // Fallback: use holders listing to read "total"
  try{
    const res = await fetch(`https://public-api.solscan.io/token/holders?tokenAddress=${TOKEN_MINT}&limit=1`);
    const data = await res.json();
    const total = data?.total ?? data?.count;
    if (total && Number(total)) return Number(total);
  }catch(e){ /* ignore */ }
  return null;
}






// --- Smoother scrolling with easing ---
(function(){
  const easeInOutCubic = t => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3)/2;
  function animatedScrollTo(targetY, duration=800){
    const startY = window.scrollY || document.documentElement.scrollTop;
    const delta = targetY - startY;
    let start;
    function step(ts){
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = easeInOutCubic(p);
      window.scrollTo(0, startY + delta * eased);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  document.querySelectorAll('a[href^="#"]').forEach(a=>{
    a.addEventListener('click', (e)=>{
      const id = a.getAttribute('href');
      if (id && id.length > 1){
        const el = document.querySelector(id);
        if (el){
          e.preventDefault();
          const rect = el.getBoundingClientRect();
          const headerOffset = getHeaderOffset(); // sticky header height compensation
          const y = rect.top + window.scrollY - headerOffset;
          animatedScrollTo(y, 850);
          // keep hash in URL for back/forward behavior
          try{ history.pushState(null, "", id); }catch(e){}
        }
      }
    });
  });
})();



// Disable default click for placeholder team links (until real profiles are added)
document.addEventListener('click', function(e){
  const a = e.target.closest && e.target.closest('.team-link');
  if (a && a.getAttribute('href') === '#'){
    e.preventDefault();
  }
});


// --- Dynamic header offset helper ---
function getHeaderOffset(){
  const h = document.querySelector('header');
  if (!h) return 76;
  const styles = getComputedStyle(h);
  const marginBottom = parseFloat(styles.marginBottom || 0);
  return Math.ceil(h.getBoundingClientRect().height + marginBottom);
}
function syncHeaderOffsetVar(){
  const off = getHeaderOffset();
  document.documentElement.style.setProperty('--header-offset', off + 'px');
}
window.addEventListener('resize', syncHeaderOffsetVar);
document.addEventListener('DOMContentLoaded', syncHeaderOffsetVar);
syncHeaderOffsetVar();

// --- Force active link on click & close mobile menu ---
try {
  const navListEl = document.getElementById('nav-list');
  document.querySelectorAll('.menu__list a[href^="#"]').forEach(link => {
    link.addEventListener('click', () => {
      document.querySelectorAll('.menu__list a').forEach(a => a.classList.remove('active'));
      link.classList.add('active');
      // Close mobile menu if open
      if (navListEl && navListEl.classList.contains('open')) {
        navListEl.classList.remove('open');
        const toggleBtn = document.getElementById('nav-toggle');
        if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'false');
      }
    });
  });
} catch(e){}


// Roadmap progress persistence
(function(){
  try{
    const cards = document.querySelectorAll('#roadmap .cards.roadmap .card');
    cards.forEach((card, i)=>{
      const idx = i+1;
      const cb = card.querySelector('input[type="checkbox"][data-phase]');
      if (!cb) return;
      const key = `roadmap_phase_${idx}`;
      // restore
      const saved = localStorage.getItem(key);
      if (saved === '1'){ cb.checked = true; card.classList.add('done'); }
      // toggle
      cb.addEventListener('change', ()=>{
        if (cb.checked){ localStorage.setItem(key, '1'); card.classList.add('done'); }
        else { localStorage.removeItem(key); card.classList.remove('done'); }
      });
    });
  }catch(e){}
})();
