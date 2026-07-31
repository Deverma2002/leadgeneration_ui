/* ============================================================
   Nexora Studio — frontend logic
   ------------------------------------------------------------
   On submit:
     1) POST backend /api/leads  ->  saves to DB
     2) GET  convert API  (client-side, params read from URL,
        ONLY IF the lead is saved successfully)
   ============================================================ */

/* ── CONFIG — set these to your deployed URLs ──────────────── */
const CONVERT_URL  = 'https://asia-south1-deploying-4c386.cloudfunctions.net/global_api/api/convert';

// Your leads backend. For local testing use localhost; in production
// point this at your deployed function URL.
// const BACKEND_BASE   = 'http://localhost:8080';
const BACKEND_BASE   = 'https://asia-south1-deploying-4c386.cloudfunctions.net/leadgeneration_api';
// https://asia-south1-deploying-4c386.cloudfunctions.net/leadgeneration_api
const DEFAULT_PAYOUT = '0.3';

/* ── HELPERS ───────────────────────────────────────────────── */
const byId = (id) => document.getElementById(id);

function showErr(field, show) {
  const msg   = document.querySelector(`.err[data-err="${field}"]`);
  const input = byId(field);
  if (msg)   msg.classList.toggle('show', show);
  if (input) input.classList.toggle('invalid', show);
}

const validators = {
  name:        (v) => v.trim().length >= 2,
  company:     (v) => v.trim().length >= 2,
  email:       (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()),
  phone:       (v) => /^[6-9]\d{9}$/.test(v.trim()),
  requirement: (v) => v.trim().length >= 3,
};
const FIELDS = ['name', 'email', 'phone', 'company', 'requirement'];

function validateField(field) {
  const el = byId(field);
  if (!el) return true;
  const ok = validators[field] ? validators[field](el.value) : true;
  showErr(field, !ok);
  return ok;
}
function validateAll()      { return FIELDS.map(validateField).every(Boolean); }
function allValidSilent()   { return FIELDS.every((f) => validators[f](byId(f).value)); }
function refreshSubmitState(){ byId('submitBtn').disabled = !allValidSilent(); }

/* ── CONVERSION FIRE (reads PropellerAds params from the URL) ── */
function sendConversion() {
  let url = CONVERT_URL;
  const q = new URLSearchParams(window.location.search);

  const params = [];
  params.push(`goal=${encodeURIComponent('1')}`);
  params.push(`payout=${encodeURIComponent(q.get('payout') || DEFAULT_PAYOUT)}`);

  if (q.get('pid'))        params.push(`pid=${encodeURIComponent(q.get('pid'))}`);
  if (q.get('oid'))        params.push(`oid=${encodeURIComponent(q.get('oid'))}`);
  if (q.get('clid'))       params.push(`clid=${encodeURIComponent(q.get('clid'))}`);
  if (q.get('sub1'))       params.push(`sub1=${encodeURIComponent(q.get('sub1'))}`);
  if (q.get('utm_source')) params.push(`utm_source=${encodeURIComponent(q.get('utm_source'))}`);
  const zone = q.get('zone') || q.get('sub2');
  if (zone)                params.push(`zone=${encodeURIComponent(zone)}`);
  if (q.get('cost'))       params.push(`cost=${encodeURIComponent(q.get('cost'))}`);

  url += '?' + params.join('&');

  console.group('🔔 [Convert API] Firing conversion');
  console.log('Full URL      :', url);
  console.log('Params sent   :', {
    goal:       '1',
    payout:     q.get('payout') || DEFAULT_PAYOUT,
    pid:        q.get('pid')        || '(not in URL)',
    oid:        q.get('oid')        || '(not in URL)',
    clid:       q.get('clid')       || '(not in URL)',
    sub1:       q.get('sub1')       || '(not in URL)',
    utm_source: q.get('utm_source') || '(not in URL)',
    zone:       zone                || '(not in URL)',
    cost:       q.get('cost')       || '(not in URL)',
  });
  console.log('Source URL    :', window.location.href);
  console.groupEnd();

  fetch(url)
    .then((r) => {
      console.group('📥 [Convert API] Response received');
      console.log('HTTP status :', r.status, r.statusText);
      console.log('ok          :', r.ok);
      if (!r.ok) console.warn('⚠️  Convert API returned non-2xx — check your pid/oid/clid params');
      return r.json().catch(() => {
        console.warn('[Convert API] Response was not valid JSON — returning empty object');
        return {};
      });
    })
    .then((d) => {
      console.log('Response body:', d);
      console.groupEnd();
      console.log('✅ [Convert API] Done');
    })
    .catch((e) => {
      console.groupEnd();
      console.error('❌ [Convert API] Network error:', e);
    });
}

/* ── LEAD SUBMIT ───────────────────────────────────────────── */
async function submitLead(e) {
  e.preventDefault();

  console.group('📋 [Lead Submit] Form submitted');
  const valid = validateAll();
  if (!valid) {
    console.warn('[Lead Submit] ❌ Validation failed — form has errors, aborting');
    console.groupEnd();
    return;
  }
  console.log('[Lead Submit] ✅ All fields valid');

  const submitBtn = byId('submitBtn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting…';

  const q = new URLSearchParams(window.location.search);
  const payload = {
    name:        byId('name').value.trim(),
    email:       byId('email').value.trim(),
    phone:       byId('phone').value.trim(),
    company:     byId('company').value.trim(),
    requirement: byId('requirement').value.trim(),
    source:      'Nexora Landing',
    tracking: {
      pid:        q.get('pid')        || null,
      oid:        q.get('oid')        || null,
      clid:       q.get('clid')       || null,
      sub1:       q.get('sub1')       || null,
      sub2:       q.get('sub2')       || null,
      zone:       q.get('zone') || q.get('sub2') || null,
      utm_source: q.get('utm_source') || null,
      cost:       q.get('cost')       || null,
      payout:     q.get('payout')     || DEFAULT_PAYOUT,
      goal:       '1',
      landingUrl: window.location.href,
    },
  };

  console.log('[Lead Submit] Payload to backend:', JSON.stringify(payload, null, 2));
  console.log(`[Lead Submit] 📤 POST ${BACKEND_BASE}/api/leads ...`);

  try {
    const res = await fetch(`${BACKEND_BASE}/api/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    console.log('[Lead Submit] 📥 Backend responded');
    console.log('[Lead Submit] HTTP status :', res.status, res.statusText);
    console.log('[Lead Submit] ok          :', res.ok);

    const data = await res.json().catch(() => {
      console.warn('[Lead Submit] Backend response was not valid JSON');
      return {};
    });

    console.log('[Lead Submit] Response body:', data);

    if (!res.ok) {
      if (res.status === 409) {
        console.warn('[Lead Submit] 🚫 Duplicate phone (409) — showing already-submitted state');
        byId('leadForm').hidden      = true;
        byId('leadDuplicate').hidden = false;
        console.groupEnd();
      } else {
        console.error('[Lead Submit] ❌ Backend returned error:', data.message);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Get my free leads';
        console.groupEnd();
        alert(data.message || 'Something went wrong. Please try again.');
      }
      return; // 🛑 Halts here. Convert API will NOT run.
    }

    console.log('[Lead Submit] ✅ Lead accepted by backend — saved id:', data.id);

    // ✅ Fire the conversion ONLY after the backend confirms the lead is saved
    sendConversion();

    console.log('[Lead Submit] Showing success state');
    console.groupEnd();

    byId('leadForm').hidden    = true;
    byId('leadSuccess').hidden = false;

  } catch (err) {
    console.error('[Lead Submit] ❌ Network error — could not reach backend:', err);
    submitBtn.disabled = false;
    submitBtn.textContent = 'Get my free leads';
    console.groupEnd();
    alert('Network error. Please try again.');
  }
}

/* ── UI: reveal on scroll, stat count-up, topbar shadow ─────── */
function initUx() {
  byId('year').textContent = new Date().getFullYear();

  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) {
        en.target.classList.add('in');
        if (en.target.classList.contains('stat')) countUp(en.target);
        io.unobserve(en.target);
      }
    });
  }, { threshold: 0.18 });
  document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

  const bar = byId('topbar');
  window.addEventListener('scroll', () => {
    bar.classList.toggle('scrolled', window.scrollY > 8);
  }, { passive: true });
}

function countUp(stat) {
  const el = stat.querySelector('[data-count]');
  if (!el) return;
  const target = parseInt(el.dataset.count, 10);
  const suffix = el.dataset.suffix || '';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || target === 0) { el.textContent = target + suffix; return; }
  let cur = 0;
  const step = Math.max(1, Math.round(target / 40));
  const t = setInterval(() => {
    cur += step;
    if (cur >= target) { cur = target; clearInterval(t); }
    el.textContent = cur + suffix;
  }, 22);
}

/* ── WIRE UP ───────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initUx();

  byId('leadForm').addEventListener('submit', submitLead);

  // numeric-only phone, max 10 digits
  byId('phone').addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
    refreshSubmitState();
  });

  // live validation feedback
  FIELDS.forEach((f) => {
    byId(f).addEventListener('blur',  () => validateField(f));
    byId(f).addEventListener('input', refreshSubmitState);
  });
});
