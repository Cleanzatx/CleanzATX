/* ============================================================
   CleanzATX — main.js
   ============================================================ */

/* ---------- Nav scroll effect ---------- */
const nav = document.getElementById('nav');
const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 20);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* --- Centre scroll arrow against viewport, not hero overflow --- */
(function () {
  const arrow = document.querySelector('.hero__scroll-arrow');
  if (!arrow) return;
  function positionArrow() {
    const vw = document.documentElement.clientWidth;
    const w  = arrow.offsetWidth;
    arrow.style.left = Math.round((vw - w) / 2) + 'px';
    arrow.style.transform = 'none';
  }
  positionArrow();
  window.addEventListener('resize', positionArrow);
})();

/* ---------- Mobile menu ---------- */
const burger = document.getElementById('burger');
const mobileMenu = document.getElementById('mobileMenu');

burger.addEventListener('click', () => {
  const open = mobileMenu.classList.toggle('open');
  burger.classList.toggle('open', open);
  burger.setAttribute('aria-expanded', open);
});

// Close on link click
mobileMenu.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => {
    mobileMenu.classList.remove('open');
    burger.classList.remove('open');
  });
});

/* ---------- Hero entrance animation ---------- */
window.addEventListener('DOMContentLoaded', () => {
  const hero = document.querySelector('.hero__content');
  if (hero) hero.closest('.hero').classList.add('hero-anim');
});

/* ---------- Scroll reveal (AOS-lite) ---------- */
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        // stagger siblings
        const siblings = [...entry.target.parentElement.querySelectorAll('[data-aos]')];
        const idx = siblings.indexOf(entry.target);
        entry.target.style.transitionDelay = `${idx * 80}ms`;
        entry.target.classList.add('aos-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
);

document.querySelectorAll('[data-aos]').forEach(el => revealObserver.observe(el));

/* ---------- Proof bar animation ---------- */
const barObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const fill = entry.target.querySelector('.proof-bar__fill');
        if (fill) fill.style.width = fill.dataset.width || '100%';
        barObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.5 }
);
document.querySelectorAll('.proof-card--main').forEach(el => barObserver.observe(el));

/* ---------- Counter animation ---------- */
function animateCounter(el, target, duration = 1600) {
  let start = 0;
  const step = (timestamp) => {
    if (!start) start = timestamp;
    const progress = Math.min((timestamp - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const suffix = el.dataset.suffix || '';
    el.textContent = Math.floor(eased * target).toLocaleString() + suffix;
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = target.toLocaleString() + suffix;
  };
  requestAnimationFrame(step);
}

const counterObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.dataset.count);
        if (!isNaN(target)) animateCounter(el, target);
        counterObserver.unobserve(el);
      }
    });
  },
  { threshold: 0.5 }
);
document.querySelectorAll('[data-count]').forEach(el => counterObserver.observe(el));

/* ---------- Reviews carousel (swipeable scroll-snap) ---------- */
(function() {
  const track    = document.getElementById('reviewsTrack');
  const prevBtn  = document.getElementById('reviewPrev');
  const nextBtn  = document.getElementById('reviewNext');
  const fill     = document.getElementById('reviewProgressFill');
  const counter  = document.getElementById('reviewCounter');
  if (!track) return;

  const cards = Array.from(track.querySelectorAll('.review-card'));
  const total = cards.length;
  let current = 0;

  function isCarouselActive() { return window.innerWidth < 960; }

  function updateUI(idx) {
    current = Math.max(0, Math.min(idx, total - 1));
    if (counter) counter.textContent = `${current + 1} / ${total}`;
    if (fill)    fill.style.width = `${((current + 1) / total) * 100}%`;
    if (prevBtn) prevBtn.disabled = current === 0;
    if (nextBtn) nextBtn.disabled = current === total - 1;
  }

  function scrollToCard(idx) {
    idx = Math.max(0, Math.min(idx, total - 1));
    const card = cards[idx];
    // Center every card in the track viewport
    const trackCenter = track.offsetWidth / 2;
    const cardCenter  = card.offsetLeft + card.offsetWidth / 2;
    const left = Math.max(0, cardCenter - trackCenter);
    track.scrollTo({ left, behavior: 'smooth' });
    updateUI(idx);
  }

  // Debounced scroll listener: detect which card is centered
  let scrollTimer;
  track.addEventListener('scroll', () => {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      if (!isCarouselActive()) return;
      const mid = track.scrollLeft + track.offsetWidth / 2;
      let closest = 0, minDist = Infinity;
      cards.forEach((c, i) => {
        const dist = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid);
        if (dist < minDist) { minDist = dist; closest = i; }
      });
      updateUI(closest);
    }, 80);
  });

  prevBtn?.addEventListener('click', () => scrollToCard(current - 1));
  nextBtn?.addEventListener('click', () => scrollToCard(current + 1));

  // Directional-lock touch events — horizontal moves carousel, vertical scrolls page
  let rTsX = 0, rTsY = 0, rLastY = 0, rLock = null;
  track.addEventListener('touchstart', e => {
    rTsX = e.touches[0].clientX;
    rTsY = e.touches[0].clientY;
    rLastY = e.touches[0].clientY;
    rLock = null;
  }, { passive: true });
  track.addEventListener('touchmove', e => {
    const t = e.touches[0];
    const dx = Math.abs(t.clientX - rTsX);
    const dy = Math.abs(t.clientY - rTsY);
    if (!rLock && (dx > 8 || dy > 8)) rLock = dx > dy ? 'x' : 'y';
    if (rLock === 'y') {
      // Forward vertical movement to the page
      window.scrollBy(0, rLastY - t.clientY);
    } else {
      e.preventDefault(); // block page scroll while sliding carousel
    }
    rLastY = t.clientY;
  }, { passive: false });
  track.addEventListener('touchend', e => {
    if (rLock !== 'x') return;
    const dx = e.changedTouches[0].clientX - rTsX;
    if (Math.abs(dx) > 45) scrollToCard(dx < 0 ? current + 1 : current - 1);
    else scrollToCard(current);
  });

  // Init
  function init() {
    // Reset any inline display overrides from old paginator
    cards.forEach(c => { c.style.display = ''; });
    if (!isCarouselActive()) return; // desktop: grid, no nav needed
    scrollToCard(0);
  }

  requestAnimationFrame(() => requestAnimationFrame(init));
  window.addEventListener('resize', () => setTimeout(init, 150));
})();

/* ---------- Smooth anchor scrolling with offset ---------- */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const id = a.getAttribute('href').slice(1);
    if (!id) return;
    const target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    const offset = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 72;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  });
});


/* ============================================================
   QUOTE FORM — 2-step quote request
   ============================================================ */
const qwiz = document.getElementById('quoteWizard');
if (qwiz) {

  const propertyTypeSel = document.getElementById('q-property-type');
  const storiesSel = document.getElementById('q-stories');
  const referralSel = document.getElementById('q-referral');
  const referrerField = document.getElementById('q-referrer-field');
  const timelineSel = document.getElementById('q-timeline');
  const dateField = document.getElementById('q-date-field');
  const step1 = document.getElementById('qStep1');
  const step2 = document.getElementById('qStep2');
  const dots = qwiz.querySelectorAll('.qwiz__dot');

  // Category toggles — show/hide sub-service panels
  const catCheckboxes = qwiz.querySelectorAll('#q-service-cats input[type="checkbox"]');
  const windowSubs = document.getElementById('q-window-subs');
  const powerSubs = document.getElementById('q-power-subs');
  catCheckboxes.forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.value === 'window_cleaning') windowSubs.style.display = cb.checked ? '' : 'none';
      if (cb.value === 'power_washing') powerSubs.style.display = cb.checked ? '' : 'none';
    });
  });

  function getSelectedServices() {
    const services = [];
    qwiz.querySelectorAll('.qwiz__sub-services:not([style*="display:none"]):not([style*="display: none"]) input[type="checkbox"]').forEach(cb => {
      if (cb.checked) services.push(cb.value);
    });
    return services;
  }

  function anyCategorySelected() {
    return Array.from(catCheckboxes).some(cb => cb.checked);
  }

  function scrollToForm() {
    const navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 72;
    window.scrollTo({ top: qwiz.getBoundingClientRect().top + window.scrollY - navH - 10, behavior: 'smooth' });
  }

  function showStep(n) {
    step1.style.display = n === 1 ? '' : 'none';
    step1.classList.toggle('active', n === 1);
    step2.style.display = n === 2 ? '' : 'none';
    step2.classList.toggle('active', n === 2);
    dots.forEach((d, i) => d.classList.toggle('active', i === n - 1));
    scrollToForm();
  }

  // Next button — validate step 1
  document.getElementById('q-next')?.addEventListener('click', () => {
    const address = (document.getElementById('q-address')?.value || '').trim();
    const sqft = parseInt(document.getElementById('q-sqft')?.value) || 0;
    const stories = parseInt(storiesSel?.value) || 0;

    const missing = [];
    if (!anyCategorySelected()) missing.push('at least one service');
    if (!address) missing.push('address');
    if (!sqft) missing.push('square footage');
    if (!stories) missing.push('number of stories');
    if (missing.length) { alert('Please fill in: ' + missing.join(', ')); return; }
    showStep(2);
  });

  // Back button
  document.getElementById('q-back')?.addEventListener('click', () => showStep(1));

  // Conditional fields
  if (referralSel && referrerField) {
    referralSel.addEventListener('change', () => {
      referrerField.style.display = referralSel.value === 'Referral' ? '' : 'none';
    });
  }
  if (timelineSel && dateField) {
    timelineSel.addEventListener('change', () => {
      dateField.style.display = timelineSel.value === 'specific_date' ? '' : 'none';
    });
  }

  // Phone auto-format
  const phoneInput = document.getElementById('q-phone');
  if (phoneInput) {
    phoneInput.addEventListener('input', () => {
      let d = phoneInput.value.replace(/\D/g, '').slice(0, 10);
      if (d.length >= 7) d = '(' + d.slice(0,3) + ') ' + d.slice(3,6) + '-' + d.slice(6);
      else if (d.length >= 4) d = '(' + d.slice(0,3) + ') ' + d.slice(3);
      else if (d.length >= 1) d = '(' + d;
      phoneInput.value = d;
    });
  }

  // Submit
  let submitted = false;
  function handleSubmit() {
    if (submitted) return;

    const selectedServices = getSelectedServices();
    const firstName = (document.getElementById('q-fname')?.value || '').trim();
    const lastName  = (document.getElementById('q-lname')?.value || '').trim();
    const phone     = (document.getElementById('q-phone')?.value || '').trim();
    const email     = (document.getElementById('q-email')?.value || '').trim();
    const address   = (document.getElementById('q-address')?.value || '').trim();
    const sqft      = parseInt(document.getElementById('q-sqft')?.value) || 0;
    const propertyType = propertyTypeSel?.value || 'Residential';
    const stories   = parseInt(storiesSel?.value) || 0;
    const referral  = referralSel?.value || '';
    const referrer  = (document.getElementById('q-referrer')?.value || '').trim();
    const timeline  = timelineSel?.value || '';
    const deadlineDate = document.getElementById('q-date')?.value || '';
    const lastCleaned = document.getElementById('q-last-cleaned')?.value || '';
    const frequency = document.getElementById('q-frequency')?.value || '';
    const notes     = (document.getElementById('q-notes')?.value || '').trim();

    const missing = [];
    if (!firstName) missing.push('first name');
    if (!phone || phone.replace(/\D/g, '').length < 10) missing.push('phone number');
    if (!frequency) missing.push('service frequency');
    if (!timeline) missing.push('timeline');
    if (missing.length) { alert('Please fill in: ' + missing.join(', ')); return; }

    submitted = true;
    const btn = document.getElementById('q-submit');
    if (btn) { btn.disabled = true; btn.textContent = 'Sending...'; }

    const serviceLabels = { ext_windows:'Exterior Windows', int_windows:'Interior Windows', screens:'Screen Cleaning', tracks:'Track Cleaning', skylights:'Skylights', post_construction:'Post Construction', hard_water:'Hard Water Removal', house_wash:'House Washing', driveway:'Driveway', front_patio:'Front Patio', back_patio:'Back Patio', roof_wash:'Roof Cleaning', gutters:'Gutter Cleaning', stone_limestone:'Stone / Limestone', deck_fence:'Deck / Fence' };
    const freqLabels = { one_time:'One-Time Clean', bimonthly:'Every 2 Months', quarterly:'Quarterly', '6month':'Every 6 Months' };
    const lastCleanedLabels = { never:'Never / First Time', '1_month':'Within 1 Month', '3_months':'1–3 Months Ago', '6_months':'3–6 Months Ago', '1_year':'6–12 Months Ago', over_1_year:'Over a Year Ago' };
    const frequencyLabel = freqLabels[frequency] || frequency;
    const servicesText = selectedServices.map(s => serviceLabels[s] || s).join(', ');

    let computedDeadline = deadlineDate;
    if (!computedDeadline) {
      const d = new Date();
      d.setDate(d.getDate() + ({ asap:3, within_1_week:7, within_2_weeks:14 }[timeline] || 30));
      computedDeadline = (d.getMonth()+1) + '/' + d.getDate() + '/' + d.getFullYear();
    }

    emailjs.send('service_xsex2ss', 'template_536xvvp', {
      first_name: firstName, last_name: lastName, phone, email, address,
      property_type: propertyType, sqft, stories,
      last_cleaned: lastCleanedLabels[lastCleaned] || lastCleaned || '',
      selected_services: servicesText, service_plan: frequencyLabel,
      referral_source: referral,
      timeline: ({ asap:'ASAP', within_1_week:'Within 1 Week', within_2_weeks:'Within 2 Weeks', flexible:'Flexible', specific_date:'Specific Date' })[timeline] || timeline,
      notes,
    }).catch(() => {});

    fetch((window.CLEANZATX_TRACKER_URL || 'https://cleanzatx-tracker.vercel.app') + '/api/webhooks/quote-form', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        first_name: firstName, last_name: lastName, phone, email, address,
        sqft, stories, property_type: propertyType,
        service_categories: Array.from(catCheckboxes).filter(c => c.checked).map(c => c.value),
        selected_services: selectedServices, service_frequency: frequency,
        last_cleaned: lastCleaned, referral_source: referral, referrer_name: referrer,
        timeline, deadline_date: computedDeadline, notes, source: 'quote_form_v2',
      }),
    }).catch(() => {});

    if (typeof gtag !== 'undefined') {
      gtag('event', 'generate_lead', { currency:'USD', value:0, services:servicesText, frequency:frequencyLabel });
    }

    // Show confirmation
    step2.style.display = 'none';
    step2.classList.remove('active');
    const stepsEl = document.getElementById('q-steps');
    if (stepsEl) stepsEl.style.display = 'none';
    const confirmPanel = qwiz.querySelector('[data-panel="confirm"]');
    if (confirmPanel) { confirmPanel.removeAttribute('style'); confirmPanel.classList.add('active'); }
    scrollToForm();
    if (typeof launchConfetti === 'function') setTimeout(launchConfetti, 300);
  }

  document.getElementById('q-submit')?.addEventListener('click', handleSubmit);
  if (typeof gtag !== 'undefined') gtag('event', 'quote_form_view');
}

/* ---------- Phone action modal ---------- */
(function () {
  const overlay = document.getElementById('phoneModal');
  if (!overlay) return;

  function openModal(e) {
    if (e && e.preventDefault) e.preventDefault();
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  // Expose globally so other code (e.g. sqft threshold) can trigger it
  window.openPhoneModal = openModal;

  function closeModal() {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  // Intercept all tel: links
  document.querySelectorAll('a[href^="tel:"]').forEach(link => {
    link.addEventListener('click', openModal);
  });

  // Track phone call & text clicks
  overlay.querySelector('.phone-modal__btn--call')?.addEventListener('click', () => {
    if (typeof gtag !== 'undefined') gtag('event', 'phone_call_click', { method: 'call' });
  });
  overlay.querySelector('.phone-modal__btn--text')?.addEventListener('click', () => {
    if (typeof gtag !== 'undefined') gtag('event', 'phone_call_click', { method: 'text' });
  });

  // Close on cancel button or overlay backdrop click
  document.getElementById('phoneModalCancel').addEventListener('click', closeModal);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });

  // Close on Escape
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
})();

/* ---------- GA4 — CTA button click tracking ---------- */
document.querySelectorAll('a[href="#quote"], .btn--primary, .btn--nav').forEach(btn => {
  btn.addEventListener('click', () => {
    if (typeof gtag !== 'undefined') {
      gtag('event', 'cta_click', { button_text: btn.textContent.trim() });
    }
  });
});

/* ---------- Contact form (removed — replaced by quote wizard) ---------- */

/* ---------- Active nav link on scroll ---------- */
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav__links a[href^="#"]');

const sectionObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(link => {
          link.classList.toggle(
            'active',
            link.getAttribute('href') === `#${entry.target.id}`
          );
        });
      }
    });
  },
  { rootMargin: '-40% 0px -55% 0px' }
);
sections.forEach(s => sectionObserver.observe(s));

/* ============================================================
   FEATURE ADDITIONS — Phase 2 Build
   ============================================================ */

/* ---------- #9 Quote form localStorage save/restore ---------- */
(function() {
  const STORAGE_KEY = 'cleanzatx_quote_draft';
  const fields = ['q-address', 'q-sqft', 'q-fname', 'q-lname', 'q-phone', 'q-email'];
  
  // Restore on load
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  fields.forEach(id => {
    const el = document.getElementById(id);
    if (el && saved[id]) el.value = saved[id];
  });
  
  // Save on input
  fields.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', () => {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      data[id] = el.value;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    });
  });
  
  // Clear on submit
  document.getElementById('q-submit')?.addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY);
  });
})();


/* ---------- #30 Confetti on quote submission ---------- */
function launchConfetti() {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  
  const pieces = Array.from({length: 120}, () => ({
    x: Math.random() * canvas.width,
    y: -20,
    w: 8 + Math.random() * 8,
    h: 4 + Math.random() * 4,
    color: ['#0ea5e9','#34d399','#f59e0b','#ec4899','#8b5cf6','#fff'][Math.floor(Math.random()*6)],
    vx: (Math.random()-0.5)*3,
    vy: 2 + Math.random()*3,
    rot: Math.random()*360,
    rotV: (Math.random()-0.5)*6
  }));
  
  let frame;
  function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    pieces.forEach(p => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot * Math.PI/180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
      ctx.restore();
      p.x += p.vx; p.y += p.vy; p.rot += p.rotV;
    });
    if (pieces.some(p => p.y < canvas.height + 20)) {
      frame = requestAnimationFrame(draw);
    } else {
      canvas.remove();
    }
  }
  draw();
  setTimeout(() => { cancelAnimationFrame(frame); canvas.remove(); }, 4000);
}


/* ---------- #6 Exit-intent popup ---------- */
(function() {
  const popup = document.getElementById('exitPopup');
  if (!popup) return;
  let shown = false;

  function showPopup() {
    if (shown || sessionStorage.getItem('exitShown')) return;
    popup.classList.add('active');
    shown = true;
    sessionStorage.setItem('exitShown', '1');
  }

  // Show after 2 minutes on all devices
  setTimeout(showPopup, 120000);

  // Desktop fallback: also show on exit intent (mouse leaves top of viewport)
  document.addEventListener('mouseleave', (e) => {
    if (e.clientY < 10) showPopup();
  });

  document.getElementById('exitPopupSkip')?.addEventListener('click', () => popup.classList.remove('active'));

  document.getElementById('exitPopupCTA')?.addEventListener('click', () => {
    localStorage.setItem('cleanzatx_promo', JSON.stringify({ code: 'CLEAN25', discount: 25, source: 'exit_popup' }));
    popup.classList.remove('active');
    // Scroll so the urgency bar sits flush below the nav — same position as post-submit
    const qwiz = document.getElementById('quoteWizard');
    if (qwiz) {
      const navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 72;
      window.scrollTo({ top: qwiz.getBoundingClientRect().top + window.scrollY - navH, behavior: 'smooth' });
    }
  });
})();

/* ---------- #12 Booking notifications ---------- */
(function() {
  const notif = document.getElementById('bookingNotif');
  if (!notif) return;

  const bookings = [
    // ── existing ──
    { name: 'Sarah K.',        msg: 'from Lakeway just booked a quarterly plan' },
    { name: 'Mike D.',         msg: 'from Bee Cave just requested a quote' },
    { name: 'Jennifer R.',     msg: 'from Rough Hollow just booked exterior cleaning' },
    { name: 'Tom & Linda B.',  msg: 'from Spillman Ranch joined the quarterly plan' },
    { name: 'Amanda P.',       msg: 'from Lakeway renewed her quarterly plan' },
    { name: 'Chris M.',        msg: 'from Serene Hills just booked same-week service' },
    { name: 'Rachel W.',       msg: 'from Four Points requested a quote' },
    { name: 'David L.',        msg: 'from Falconhead booked exterior + screens' },
    // ── 30 new ──
    { name: 'Maria T.',        msg: 'from Rough Hollow just booked exterior cleaning' },
    { name: 'James R.',        msg: 'from Serene Hills joined the bi-annual plan' },
    { name: 'Lauren H.',       msg: 'from Lake Travis booked full interior + exterior' },
    { name: 'Kevin B.',        msg: 'from Westlake Hills just requested a quote' },
    { name: 'Stephanie N.',    msg: 'from Hudson Bend booked same-week service' },
    { name: 'Brian & Carol T.',msg: 'from Steiner Ranch signed up for monthly plan' },
    { name: 'Megan F.',        msg: 'from The Hills just booked screen cleaning' },
    { name: 'Patrick O.',      msg: 'from Barton Creek booked exterior + tracks' },
    { name: 'Nicole S.',       msg: 'from Lakeway joined the quarterly plan' },
    { name: 'Greg A.',         msg: 'from Bee Cave just booked a same-week clean' },
    { name: 'Tiffany C.',      msg: 'from Flintrock Falls renewed her monthly plan' },
    { name: 'Derek M.',        msg: 'from Lake Pointe booked exterior cleaning' },
    { name: 'Ashley V.',       msg: 'from Rough Hollow just requested a quote' },
    { name: 'Mark & Susan E.', msg: 'from Spillman Ranch booked full-home clean' },
    { name: 'Courtney J.',     msg: 'from Serene Hills just booked interior windows' },
    { name: 'Tyler H.',        msg: 'from Lakeway booked exterior + screens + tracks' },
    { name: 'Melissa G.',      msg: 'from Falconhead joined the bi-annual plan' },
    { name: 'Brandon K.',      msg: 'from Four Points just requested a quote' },
    { name: 'Heather L.',      msg: 'from Bee Cave booked same-week exterior clean' },
    { name: 'Josh & Amy R.',   msg: 'from Hudson Bend signed up for quarterly plan' },
    { name: 'Danielle B.',     msg: 'from Steiner Ranch booked window cleaning' },
    { name: 'Eric P.',         msg: 'from Westlake Hills just requested a quote' },
    { name: 'Kristen N.',      msg: 'from Lakeway renewed her bi-annual plan' },
    { name: 'Ryan C.',         msg: 'from Lake Travis booked exterior + screens' },
    { name: 'Lisa M.',         msg: 'from Barton Creek just booked a quarterly plan' },
    { name: 'Scott & Dana W.', msg: 'from The Hills signed up for monthly plan' },
    { name: 'Amber F.',        msg: 'from Rough Hollow just requested a quote' },
    { name: 'Nathan O.',       msg: 'from Falconhead booked full interior + exterior' },
  ];

  // Fisher-Yates shuffle — produces a random order with no repeats
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Shuffle once per session; walk through the deck — never repeat
  let deck = shuffle(bookings);
  let pos = 0;
  let dismissTimer = null;

  function dismiss() {
    clearTimeout(dismissTimer);
    notif.classList.remove('show');
  }

  function showNotif() {
    if (pos >= deck.length) return;
    notif.classList.remove('show');
    void notif.offsetWidth; // force reflow so slide-in replays
    const b = deck[pos++];
    document.getElementById('bookingNotifName').textContent = b.name;
    document.getElementById('bookingNotifMsg').textContent = b.msg;
    notif.classList.add('show');
    clearTimeout(dismissTimer);
    dismissTimer = setTimeout(dismiss, 5000);
  }

  // Close button
  document.getElementById('bookingNotifClose')?.addEventListener('click', (e) => {
    e.stopPropagation();
    dismiss();
  });

  // Tap or swipe left to dismiss early
  notif.addEventListener('click', dismiss);
  let nTsX = 0;
  notif.addEventListener('touchstart', e => { nTsX = e.touches[0].clientX; }, { passive: true });
  notif.addEventListener('touchend', e => {
    if (e.changedTouches[0].clientX - nTsX < -40) dismiss();
  });

  // First show after 2 min, then every 2 min
  setTimeout(() => {
    showNotif();
    setInterval(showNotif, 120000);
  }, 120000);
})();

/* ---------- #7 Urgency widget rotation ---------- */
(function() {
  const el = document.getElementById('urgencyText');
  if (!el) return;
  const monthName = new Date().toLocaleString('en-US', { month: 'long' });
  const spotsLeft = Math.floor(Math.random() * 3) + 3; // 3-5 spots
  const msgs = [
    'Only <strong>' + spotsLeft + ' spots</strong> left in ' + monthName,
    '<strong>3 homeowners</strong> got quotes in the last hour',
    monthName + ' is filling up — <strong>spots are limited</strong>',
    'Book today, get cleaned <strong>this month</strong>',
  ];
  let i = 0;
  setInterval(() => {
    i = (i + 1) % msgs.length;
    el.style.opacity = '0';
    setTimeout(() => { el.innerHTML = msgs[i]; el.style.opacity = '1'; }, 300);
  }, 5000);
})();

/* ---------- #31 FAQ accordion ---------- */
document.querySelectorAll('.faq-acc-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.parentElement;
    const isOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item-acc').forEach(i => i.classList.remove('open'));
    if (!isOpen) item.classList.add('open');
  });
});

/* ---------- Simple Request removed ---------- */

/* ---------- #49 Quote abandonment email — DISABLED ---------- */
/* Removed: was firing emails on page unload using localStorage-restored
   fields, causing false notifications. Emails now only send on actual
   quote submission via handleSubmit(). */


/* ---------- Mobile CTA bar — REMOVED ---------- */
/* Sticky mobile CTA bar removed per Tyler's request. */

/* ---------- Address Autofill (Nominatim) ---------- */
(function() {
  function initAddressAutofill(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;

    // Create dropdown — use position:fixed so it escapes any overflow:hidden ancestors
    const wrap = input.parentElement;
    const dropdown = document.createElement('ul');
    dropdown.className = 'addr-dropdown';
    dropdown.style.cssText = 'display:none;position:fixed;z-index:9999;list-style:none;margin:0;padding:4px 0;background:#0f2440;border:1px solid rgba(14,165,233,.3);border-radius:10px;box-shadow:0 8px 32px rgba(0,0,0,.4);max-height:220px;overflow-y:auto;';
    document.body.appendChild(dropdown);

    // Position the dropdown below the input
    function positionDropdown() {
      const rect = input.getBoundingClientRect();
      dropdown.style.top  = (rect.bottom + 4) + 'px';
      dropdown.style.left = rect.left + 'px';
      dropdown.style.width = rect.width + 'px';
    }

    let debounceTimer;
    let currentResults = [];

    function closeDropdown() {
      dropdown.style.display = 'none';
      dropdown.innerHTML = '';
    }

    function renderResults(results) {
      dropdown.innerHTML = '';
      if (!results.length) { closeDropdown(); return; }
      results.forEach(r => {
        const li = document.createElement('li');
        li.textContent = r.display_name;
        li.style.cssText = 'padding:10px 14px;cursor:pointer;font-size:.9rem;color:rgba(255,255,255,.85);border-bottom:1px solid rgba(255,255,255,.06);line-height:1.4;';
        li.addEventListener('mouseenter', () => li.style.background = 'rgba(14,165,233,.15)');
        li.addEventListener('mouseleave', () => li.style.background = '');
        li.addEventListener('mousedown', (e) => {
          e.preventDefault();
          input.value = r.display_name;
          closeDropdown();
          input.dispatchEvent(new Event('change'));
        });
        dropdown.appendChild(li);
      });
      positionDropdown();
      dropdown.style.display = 'block';
    }

    input.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      const q = input.value.trim();
      if (q.length < 5) { closeDropdown(); return; }
      debounceTimer = setTimeout(async () => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&countrycodes=us&q=${encodeURIComponent(q + ' Texas')}`);
          const data = await res.json();
          currentResults = data;
          renderResults(data);
        } catch(e) { closeDropdown(); }
      }, 600);
    });

    input.addEventListener('keydown', e => {
      const items = dropdown.querySelectorAll('li');
      const active = dropdown.querySelector('li.active');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = active ? active.nextElementSibling : items[0];
        if (active) active.classList.remove('active');
        if (next) { next.classList.add('active'); next.style.background = 'rgba(14,165,233,.2)'; }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = active ? active.previousElementSibling : items[items.length - 1];
        if (active) { active.classList.remove('active'); active.style.background = ''; }
        if (prev) { prev.classList.add('active'); prev.style.background = 'rgba(14,165,233,.2)'; }
      } else if (e.key === 'Enter' && active) {
        e.preventDefault();
        input.value = active.textContent;
        closeDropdown();
      } else if (e.key === 'Escape') {
        closeDropdown();
      }
    });

    document.addEventListener('click', e => {
      if (!wrap.contains(e.target) && !dropdown.contains(e.target)) closeDropdown();
    });

    // Reposition on scroll/resize
    window.addEventListener('scroll', positionDropdown, { passive: true });
    window.addEventListener('resize', positionDropdown, { passive: true });
  }

  initAddressAutofill('q-address');
  // sq-address removed (Simple Request deleted)
})();

/* ---------- Plans carousel (infinite loop, no scrollIntoView) ---------- */
(function() {
  const carousel = document.getElementById('plansCarousel');
  const dotsWrap = document.getElementById('plansDots');
  const prevBtn  = document.getElementById('plansPrev');
  const nextBtn  = document.getElementById('plansNext');
  if (!carousel) return;

  function isCarouselActive() {
    return window.innerWidth < 960;
  }

  // Original cards (Quarterly=0, Bi-Annual=1, Monthly=2)
  const origCards = Array.from(carousel.querySelectorAll('.plan-card'));
  const dots = dotsWrap ? Array.from(dotsWrap.querySelectorAll('.plans-dot')) : [];
  const N = origCards.length; // 3

  let cloned = false;
  let currentIdx = 0; // real card index (0-based among origCards)
  let jumping = false; // prevent recursive scroll handling
  let touching = false; // true while finger is on screen — defer jumpToReal

  // Build clone-based infinite loop:
  // DOM order: [clone-of-last][orig0][orig1][orig2][clone-of-first]
  // Real cards live at positions 1..N inside the carousel
  function buildClones() {
    if (cloned) return;
    cloned = true;
    const first = origCards[0].cloneNode(true);
    const last  = origCards[N - 1].cloneNode(true);
    first.setAttribute('aria-hidden', 'true');
    last.setAttribute('aria-hidden', 'true');
    carousel.appendChild(first);
    carousel.insertBefore(last, origCards[0]);
  }

  function cardWidth() {
    // Width of one card + gap (gap is 16px from CSS)
    const card = carousel.querySelectorAll('.plan-card')[1]; // first real card
    if (!card) return 0;
    return card.offsetWidth + 16;
  }

  // Scroll to a real card index (0-based) instantly (no animation)
  function jumpToReal(idx) {
    jumping = true;
    // real cards are at slot idx+1 (because clone-of-last is slot 0)
    const cw = cardWidth();
    // Center the card: offset from carousel left padding
    // The carousel has padding-left of ~40px already baked into scrollLeft calc
    carousel.scrollLeft = (idx + 1) * cw;
    currentIdx = idx;
    setTimeout(() => { jumping = false; }, 50);
  }

  // Smooth scroll to a real card index
  function slideTo(idx) {
    const cw = cardWidth();
    const target = (idx + 1) * cw;
    carousel.scrollTo({ left: target, behavior: 'smooth' });
    currentIdx = idx;
    updateDots();
  }

  function updateDots() {
    dots.forEach((d, i) => d.classList.toggle('active', i === currentIdx));
  }

  // Always show arrows on mobile (infinite loop — no hard stops)
  function updateArrows() {
    prevBtn?.classList.remove('hidden');
    nextBtn?.classList.remove('hidden');
  }

  // Debounced scroll listener: detect landing on a clone and silently jump
  let scrollTimer;
  carousel.addEventListener('scroll', () => {
    if (jumping) return;
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      if (touching) return; // wait until finger lifts
      if (!isCarouselActive() || !cloned) return;
      const cw = cardWidth();
      const sl = carousel.scrollLeft;
      const totalW = (N + 2) * cw; // N real cards + 2 clones

      // Landed on clone-of-last (slot 0) → jump to real last card (slot N)
      if (sl < cw * 0.5) {
        jumpToReal(N - 1);
        updateDots();
        return;
      }
      // Landed on clone-of-first (slot N+1) → jump to real first card (slot 1)
      if (sl > (N + 0.5) * cw) {
        jumpToReal(0);
        updateDots();
        return;
      }

      // Figure out which real card is centered
      const realSlot = Math.round(sl / cw); // 1..N
      currentIdx = Math.min(Math.max(realSlot - 1, 0), N - 1);
      updateDots();
    }, 80);
  });

  // Directional-lock touch events — horizontal moves carousel, vertical scrolls page
  let pTsX = 0, pTsY = 0, pLastY = 0, pLock = null;
  carousel.addEventListener('touchstart', e => {
    pTsX = e.touches[0].clientX;
    pTsY = e.touches[0].clientY;
    pLastY = e.touches[0].clientY;
    pLock = null;
    touching = true;
  }, { passive: true });
  carousel.addEventListener('touchmove', e => {
    const t = e.touches[0];
    const dx = Math.abs(t.clientX - pTsX);
    const dy = Math.abs(t.clientY - pTsY);
    if (!pLock && (dx > 8 || dy > 8)) pLock = dx > dy ? 'x' : 'y';
    if (pLock === 'y') {
      window.scrollBy(0, pLastY - t.clientY);
    } else {
      e.preventDefault();
    }
    pLastY = t.clientY;
  }, { passive: false });
  carousel.addEventListener('touchend', e => {
    touching = false;
    if (pLock !== 'x') return;
    const swipeDx = e.changedTouches[0].clientX - pTsX;
    if (Math.abs(swipeDx) < 45) { slideTo(currentIdx); return; }
    const cw = cardWidth();
    if (swipeDx < 0) {
      // Swipe left → next; if at last card, animate through clone-of-first then jump
      if (currentIdx === N - 1) {
        jumping = true;
        carousel.scrollTo({ left: (N + 1) * cw, behavior: 'smooth' });
        currentIdx = 0; updateDots();
        setTimeout(() => { jumpToReal(0); jumping = false; }, 420);
      } else { slideTo(currentIdx + 1); }
    } else {
      // Swipe right → prev; if at first card, animate through clone-of-last then jump
      if (currentIdx === 0) {
        jumping = true;
        carousel.scrollTo({ left: 0, behavior: 'smooth' });
        currentIdx = N - 1; updateDots();
        setTimeout(() => { jumpToReal(N - 1); jumping = false; }, 420);
      } else { slideTo(currentIdx - 1); }
    }
  });

  // Arrow buttons — animate through clone on wrap for seamless infinite loop
  prevBtn?.addEventListener('click', () => {
    if (currentIdx === 0) {
      // Animate backward through clone-of-last, then jump to real last
      jumping = true;
      carousel.scrollTo({ left: 0, behavior: 'smooth' });
      currentIdx = N - 1; updateDots();
      setTimeout(() => { jumpToReal(N - 1); jumping = false; }, 420);
    } else {
      slideTo(currentIdx - 1);
    }
  });
  nextBtn?.addEventListener('click', () => {
    if (currentIdx === N - 1) {
      // Animate forward through clone-of-first, then jump to real first
      jumping = true;
      carousel.scrollTo({ left: (N + 1) * cardWidth(), behavior: 'smooth' });
      currentIdx = 0; updateDots();
      setTimeout(() => { jumpToReal(0); jumping = false; }, 420);
    } else {
      slideTo(currentIdx + 1);
    }
  });

  // Dot clicks
  dots.forEach((dot, i) => dot.addEventListener('click', () => slideTo(i)));

  // Init: build clones, jump to card 0 WITHOUT touching page scroll
  function initCarousel() {
    if (!isCarouselActive()) {
      // Desktop: remove clones if previously added, reset scroll
      updateDots();
      updateArrows();
      return;
    }
    buildClones();
    jumpToReal(0);
    updateDots();
    updateArrows();
  }

  // Use requestAnimationFrame to wait for layout, then init — avoids page jump
  requestAnimationFrame(() => requestAnimationFrame(initCarousel));
  window.addEventListener('resize', () => setTimeout(initCarousel, 150));
})();

/* ---------- Gallery carousel (directional-lock touch) ---------- */
(function() {
  const carousel = document.querySelector('.gallery__carousel');
  if (!carousel) return;

  function isCarouselActive() { return window.innerWidth <= 768; }

  const items = Array.from(carousel.querySelectorAll('.gallery__item'));
  let current = 0;

  function itemWidth() {
    const item = items[0];
    if (!item) return 0;
    const gap = 14; // matches CSS gap
    return item.offsetWidth + gap;
  }

  function scrollToItem(idx) {
    idx = Math.max(0, Math.min(idx, items.length - 1));
    current = idx;
    carousel.scrollTo({ left: idx * itemWidth(), behavior: 'smooth' });
  }

  // Directional-lock touch events — horizontal moves carousel, vertical scrolls page
  let gTsX = 0, gTsY = 0, gLastY = 0, gLock = null;
  carousel.addEventListener('touchstart', e => {
    gTsX = e.touches[0].clientX;
    gTsY = e.touches[0].clientY;
    gLastY = e.touches[0].clientY;
    gLock = null;
  }, { passive: true });
  carousel.addEventListener('touchmove', e => {
    const t = e.touches[0];
    const dx = Math.abs(t.clientX - gTsX);
    const dy = Math.abs(t.clientY - gTsY);
    if (!gLock && (dx > 8 || dy > 8)) gLock = dx > dy ? 'x' : 'y';
    if (gLock === 'y') {
      window.scrollBy(0, gLastY - t.clientY);
    } else {
      e.preventDefault();
    }
    gLastY = t.clientY;
  }, { passive: false });
  carousel.addEventListener('touchend', e => {
    if (gLock !== 'x') return;
    const dx = e.changedTouches[0].clientX - gTsX;
    if (Math.abs(dx) > 45) scrollToItem(dx < 0 ? current + 1 : current - 1);
    else scrollToItem(current);
  });
})();

/* ---------- Plan card → auto-select in quote wizard ---------- */
(function() {
  // Marketing plan card "Get Started" buttons store the chosen plan
  document.querySelectorAll('.plan-card__cta[data-plan]').forEach(btn => {
    btn.addEventListener('click', function() {
      const plan = this.getAttribute('data-plan');
      if (plan) sessionStorage.setItem('cleanzatx_chosen_plan', plan);
    });
  });

  // Apply a pre-chosen plan whenever step 3 is rendered
  document.addEventListener('qwiz:step', function(e) {
    if (e.detail && e.detail.step === 3) applyPreChosenPlan();
  });

  function applyPreChosenPlan() {
    const plan = sessionStorage.getItem('cleanzatx_chosen_plan');
    if (!plan) return;
    // Try the residential plan list first, then commercial
    const planEl = document.querySelector(`.qwiz__plan[data-plan="${plan}"]`);
    if (planEl) {
      document.querySelectorAll('.qwiz__plan').forEach(p => p.classList.remove('selected'));
      planEl.classList.add('selected');
      if (window.__qwizState) window.__qwizState.plan = plan;
      sessionStorage.removeItem('cleanzatx_chosen_plan');
    }
  }
})();

/* ---------- Gallery load more (desktop) ---------- */
(function() {
  const btn = document.getElementById('galleryLoadBtn');
  const wrap = document.getElementById('galleryLoadWrap');
  if (!btn) return;

  btn.addEventListener('click', function() {
    const items = document.querySelectorAll('.gallery__stack .gallery__item');
    items.forEach(item => {
      item.classList.add('gallery--revealed');
      item.style.display = '';
    });
    if (wrap) wrap.style.display = 'none';
  });
})();



/* ---------- Abandoned form recovery — DISABLED ---------- */
/* Removed: was firing emails on tab switch / page hide using
   localStorage-restored fields. Emails now only send on actual
   quote submission via handleSubmit(). */

/* ---------- Trust marquee — JS requestAnimationFrame loop ---------- */
(function () {
  var set1 = document.getElementById('marquee-set1');
  var scroll = document.querySelector('.trust-marquee__scroll');
  if (!set1 || !scroll) return;

  // Clone set1 into set2 for seamless loop
  var set2 = set1.cloneNode(true);
  set2.removeAttribute('id');
  set2.setAttribute('aria-hidden', 'true');
  scroll.appendChild(set2);

  var speed = 0.6; // pixels per frame (~36px/sec at 60fps
  var pos = 0;
  var setWidth = 0;

  function measure() {
    setWidth = set1.offsetWidth;
  }

  function tick() {
    pos -= speed;
    // When we've scrolled past one full set, jump back seamlessly
    if (setWidth > 0 && pos <= -setWidth) {
      pos += setWidth;
    }
    scroll.style.transform = 'translateX(' + pos + 'px)';
    requestAnimationFrame(tick);
  }

  // Wait for all images to load before measuring
  window.addEventListener('load', function () {
    measure();
    requestAnimationFrame(tick);
  });
  window.addEventListener('resize', measure);

  // Start immediately with an estimate, re-measure on load
  measure();
  if (setWidth > 0) requestAnimationFrame(tick);
})();
