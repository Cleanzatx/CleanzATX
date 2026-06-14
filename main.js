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
   QUOTE WIZARD — Multi-step form with pricing engine
   ============================================================ */
const qwiz = document.getElementById('quoteWizard');
if (qwiz) {
  const SURCHARGE_CONFIG = {
    homeMaterial: {
      "Limestone":    { services: ["house_wash"], percent: 10, label: "Limestone care surcharge", tooltip: "Limestone is more porous than stucco or vinyl — we use a lower-concentration mix and rinse longer." },
      "Wood Siding":  { services: ["house_wash"], percent: 15, label: "Wood siding surcharge", tooltip: "Wood needs the lowest-pressure setup we have, and extra care to avoid driving water behind the grain." }
    },
    debris: {
      roofWashHeavy:     { services: ["roof_wash"],  triggers: ["Moss & Lichen", "Oxidized paint (house painting prep)", "Post-construction debris"], percent: 15, label: "Heavy debris" },
      houseWashPaintPrep: { services: ["house_wash"], triggers: ["Oxidized paint (house painting prep)", "Post-construction debris"], percent: 20, label: "Paint prep / post-construction surcharge" }
    }
  };

  const state = window.__qwizState = {
    step: 0,
    selectedServices: [],
    address: '', sqft: 0, stories: 0,
    propertyType: 'Residential',
    commercialPropertyType: '', commercialPropertyDesc: '', businessName: '',
    windowCount: 0, screenCount: 0, trackCount: 0,
    screenType: 'normal',
    svcExterior: false, svcInterior: false, svcScreens: false, svcTracks: false,
    interiorType: '', interiorCount: 0,
    pwCustomProperty: '', pwWaterSource: '', pwSurfaces: [], pwSurfaceType: '',
    homeMaterial: '', homeMaterialNotes: '',
    debrisTypes: [],
    hwMaterial: '', hwMaterialDesc: '', hwStructures: [], hwPartialDesc: '', hwStructOtherDesc: '', hwDebris: [],
    roofMaterial: '', roofMaterialDesc: '', roofDebris: [],
    gutterGuards: '', gutterLocations: [],
    solarPanelCount: 0, solarRoofPitch: '',
    customDesignedProperty: '', gutterOtherDesc: '',
    surchargesApplied: [],
    plan: '', autoBilling: false, commercialFrequency: 'weekly',
    firstName: '', lastName: '', phone: '', email: '',
    referral: '', referrer: '', timeline: '', deadlineDate: '',
    promoCode: '', promoDiscount: 0,
    lastCleaned: '',
    customLayout: false, autoSuggestedWindowCount: 0,
    frenchPanes: false, frenchPaneCount: 0,
    _frenchPaneAsked: false,
  };

  const TOTAL_STEPS = 6;
  const stepLabels = {
    0: 'Services',
    1: 'Property Info',
    2: 'Service Selection',
    3: 'Service Plan',
    4: 'Contact Info',
    5: 'Your Quote'
  };

  // Window/screen/track options based on sqft
  function getOptions(sqft) {
    if (sqft <= 1500)      return { windows: [10,15,20,25], screens: [5,10,15,20], tracks: [5,10,15,20] };
    if (sqft <= 2500)      return { windows: [15,20,25,30], screens: [15,20,25,30], tracks: [15,20,25,30] };
    if (sqft <= 3500)      return { windows: [25,30,35,40], screens: [20,25,30,35], tracks: [20,25,30,35] };
    return                        { windows: [35,40,45,50], screens: [25,30,35,40], tracks: [25,30,35,40] };
  }

  // Auto-suggest window count from sqft (confirmed: 3000 sqft = ~30 windows)
  function autoSuggestWindows(sqft) {
    return Math.round(sqft * 0.01);
  }

  // Screen/track chip options based on window count
  // Returns 3 options in steps of 5 up to windowCount + 'Custom'
  function getScreenTrackOptions(windowCount) {
    const wc = Math.max(10, windowCount);
    // Round to nearest 5
    const top = Math.round(wc / 5) * 5;
    const opts = [];
    // Go from top-10 to top in steps of 5 (3 options)
    for (let i = Math.max(5, top - 10); i <= top; i += 5) {
      if (!opts.includes(i)) opts.push(i);
    }
    // Ensure we have at least 3 numeric options
    while (opts.length < 3) {
      const next = opts[opts.length - 1] + 5;
      opts.push(next);
    }
    opts.push('Custom');
    return opts;
  }

  // Build chip selectors
  function buildChips(container, options, stateKey) {
    container.innerHTML = '';
    options.forEach(val => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'qwiz__chip' + (state[stateKey] === val ? ' active' : '');
      chip.textContent = val;
      chip.addEventListener('click', () => {
        state[stateKey] = val;
        container.querySelectorAll('.qwiz__chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
      });
      container.appendChild(chip);
    });
  }

  // Build chips where the last option ('Custom') morphs into an inline number input
  function buildChipsWithCustom(container, options, stateKey) {
    container.innerHTML = '';
    const numerics = options.filter(v => v !== 'Custom');
    const hasCustom = options.includes('Custom');

    function deactivateAll() {
      container.querySelectorAll('.qwiz__chip').forEach(c => c.classList.remove('active'));
    }

    numerics.forEach(val => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'qwiz__chip' + (state[stateKey] === val ? ' active' : '');
      chip.textContent = val;
      chip.addEventListener('click', () => {
        state[stateKey] = val;
        deactivateAll();
        chip.classList.add('active');
        // If there was an active inline input, restore Custom chip
        const existing = container.querySelector('.qwiz__chip--custom-input');
        if (existing) {
          existing.replaceWith(makeCustomChip());
        }
      });
      container.appendChild(chip);
    });

    function makeCustomChip() {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'qwiz__chip qwiz__chip--custom';
      chip.textContent = 'Custom';
      chip.addEventListener('click', () => {
        // Morph chip into inline input
        const input = document.createElement('input');
        input.type = 'number';
        input.min = '1';
        input.placeholder = '#';
        input.className = 'qwiz__chip qwiz__chip--custom-input active';
        input.style.cssText = 'width:72px;text-align:center;-moz-appearance:textfield;';
        deactivateAll();
        chip.replaceWith(input);
        input.focus();
        input.addEventListener('input', () => {
          state[stateKey] = parseInt(input.value) || 0;
        });
        // On blur: if empty restore chip, else keep showing the value
        input.addEventListener('blur', () => {
          if (!input.value || parseInt(input.value) < 1) {
            input.replaceWith(makeCustomChip());
            state[stateKey] = 0;
          }
        });
        input.addEventListener('keydown', e => {
          if (e.key === 'Enter') input.blur();
        });
      });
      return chip;
    }

    if (hasCustom) container.appendChild(makeCustomChip());
  }

  // Navigate steps
  function goToStep(step) {
    state.step = step;
    qwiz.querySelectorAll('.qwiz__panel').forEach(p => p.classList.remove('active'));
    const panel = qwiz.querySelector(`[data-panel="${step}"]`);
    if (panel) panel.classList.add('active');
    // Fire event for plan auto-select
    document.dispatchEvent(new CustomEvent('qwiz:step', { detail: { step } }));

    // Progress bar
    const fill = document.getElementById('qwizBarFill');
    fill.style.width = ((step + 1) / TOTAL_STEPS * 100) + '%';

    // Step indicators
    qwiz.querySelectorAll('.qwiz__step').forEach(s => {
      const n = parseInt(s.dataset.step);
      s.classList.remove('active', 'done');
      if (n === step) s.classList.add('active');
      else if (n < step) s.classList.add('done');
    });

    // Label
    const label = document.getElementById('qwizStepLabel');
    label.textContent = `Step ${step + 1} of ${TOTAL_STEPS}: ${stepLabels[step] || ''}`;

    // Show/hide "last cleaned" field based on whether windows is selected
    if (step === 1) {
      const hasWindows = state.selectedServices.includes('windows');
      const lcField = document.getElementById('q-last-cleaned-field');
      if (lcField) lcField.style.display = hasWindows ? '' : 'none';
    }

    // Pre-populate chips when entering step 2
    if (step === 2) {
      const ss = state.selectedServices;
      const hasWindows = ss.includes('windows');
      const hasPressure = ss.includes('pressure');

      // Show/hide service-specific sections
      const winSec = document.getElementById('q-windows-section');
      const pwSec = document.getElementById('q-pressure-section');
      if (winSec) winSec.style.display = hasWindows ? '' : 'none';
      if (pwSec) pwSec.style.display = hasPressure ? '' : 'none';

      const hasHouseWash = ss.includes('house_wash');
      const hasRoof = ss.includes('roof_wash');
      const hasGutters = ss.includes('gutters');
      const hasSolar = ss.includes('solar_panels');

      // Section titles
      const winTitle = document.getElementById('q-windows-title');
      const pwTitle = document.getElementById('q-pressure-title');
      if (winTitle) winTitle.style.display = hasWindows ? '' : 'none';
      if (pwTitle) pwTitle.style.display = hasPressure ? '' : 'none';

      // New sections
      const hwSec = document.getElementById('q-house-wash-section');
      const rfSec = document.getElementById('q-roof-wash-section');
      const gutSec = document.getElementById('q-gutter-section');
      const solSec = document.getElementById('q-solar-section');
      if (hwSec) hwSec.style.display = hasHouseWash ? '' : 'none';
      if (rfSec) rfSec.style.display = hasRoof ? '' : 'none';
      if (gutSec) gutSec.style.display = hasGutters ? '' : 'none';
      if (solSec) solSec.style.display = hasSolar ? '' : 'none';

      // Build solar chips
      if (hasSolar) {
        buildChips(document.getElementById('q-solar-count-chips'), [5, 10, 15, 20, 25, 30, 'Other'], 'solarPanelCount');
        // Wire "Other" chip for solar count
        var solarChips = document.getElementById('q-solar-count-chips');
        var solarCustomWrap = document.getElementById('q-solar-custom-wrap');
        var solarCustomInput = document.getElementById('q-solar-custom');
        if (solarChips) {
          solarChips.querySelectorAll('.qwiz__chip').forEach(function(chip) {
            chip.addEventListener('click', function() {
              if (chip.textContent === 'Other') {
                if (solarCustomWrap) solarCustomWrap.style.display = '';
                state.solarPanelCount = parseInt(solarCustomInput?.value) || 0;
              } else {
                if (solarCustomWrap) solarCustomWrap.style.display = 'none';
              }
            });
          });
        }
        if (solarCustomInput) {
          solarCustomInput.addEventListener('input', function() { state.solarPanelCount = parseInt(solarCustomInput.value) || 0; });
        }
        buildChips(document.getElementById('q-solar-pitch-chips'), ['Flat', 'Low Slope', 'Moderate', 'Steep', 'Not Sure'], 'solarRoofPitch');
      }

      // Build gutter location chips
      if (hasGutters) {
        buildChips(document.getElementById('q-gutter-location-chips'), ['Full Perimeter', 'Front & Back Only', 'Partial / Other'], 'gutterLocations');
      }

      // Dynamic title
      const titleEl = document.getElementById('q-step2-title');
      if (titleEl) {
        const parts = [];
        if (hasWindows) parts.push('Window');
        if (hasPressure) parts.push('Pressure Washing');
        if (ss.includes('house_wash')) parts.push('House Washing');
        if (ss.includes('roof_wash')) parts.push('Roof Cleaning');
        if (ss.includes('gutters')) parts.push('Gutter');
        if (ss.includes('solar_panels')) parts.push('Solar Panel');
        titleEl.textContent = (parts.length ? parts.join(' & ') : 'Service') + ' Selection';
      }

      const isCommercial = state.propertyType === 'Commercial';
      document.getElementById('q-residential-step2')?.style && (document.getElementById('q-residential-step2').style.display = (isCommercial || !hasWindows) ? 'none' : '');
      var commStep2 = document.getElementById('q-commercial-step2');
      if (commStep2) commStep2.style.display = (isCommercial && hasWindows) ? '' : 'none';

      if (isCommercial) {
        // Commercial: update label with property type
        const propType = state.commercialPropertyType || 'property';
        document.getElementById('q-commercial-window-label').textContent = `How many windows does the ${propType.toLowerCase()} have?`;
        buildChips(document.getElementById('q-commercial-window-chips'), [10, 20, 30, 50, 75, 100, 'Other'], 'windowCount');
        // Wire commercial Other chip
        const cChips = document.getElementById('q-commercial-window-chips');
        const cWrap = document.getElementById('q-commercial-window-custom-wrap');
        const cInput = document.getElementById('q-commercial-window-custom');
        cChips.querySelectorAll('.qwiz__chip').forEach(chip => {
          chip.addEventListener('click', () => {
            if (chip.textContent === 'Other') { cWrap.style.display = ''; state.windowCount = parseInt(cInput.value) || 0; }
            else { cWrap.style.display = 'none'; }
          });
        });
        cInput?.addEventListener('input', () => { state.windowCount = parseInt(cInput.value) || 0; });
      } else {
        // Residential: auto-suggest window count
        const opts = getOptions(state.sqft);
        const suggested = autoSuggestWindows(state.sqft);
        state.autoSuggestedWindowCount = suggested;
        buildChips(document.getElementById('q-window-chips'), [...opts.windows, 'Other'], 'windowCount');

        // Auto-select nearest chip to suggested count
        const chipValues = opts.windows;
        const nearest = chipValues.reduce((prev, curr) =>
          Math.abs(curr - suggested) < Math.abs(prev - suggested) ? curr : prev
        );
        state.windowCount = nearest;
        document.getElementById('q-window-chips').querySelectorAll('.qwiz__chip').forEach(c => {
          c.classList.toggle('active', c.textContent == nearest);
        });

        // Wire "Other" chip to show custom input
        const windowChips = document.getElementById('q-window-chips');
        const customWrap = document.getElementById('q-window-custom-wrap');
        const customInput = document.getElementById('q-window-custom');
        windowChips.querySelectorAll('.qwiz__chip').forEach(chip => {
          chip.addEventListener('click', () => {
            if (chip.textContent === 'Other') {
              customWrap.style.display = '';
              state.windowCount = parseInt(customInput.value) || 0;
            } else {
              customWrap.style.display = 'none';
              // Check if user overrode auto-suggest
              const chosen = parseInt(chip.textContent);
              if (chosen !== state.autoSuggestedWindowCount && !state.customLayout) {
                document.getElementById('q-custom-layout-prompt').style.display = '';
              }
            }
          });
        });
        customInput?.addEventListener('input', () => { state.windowCount = parseInt(customInput.value) || 0; });

        // Build screen/track chips based on window count
        // Custom chip morphs inline into a number input when tapped
        const stOpts = getScreenTrackOptions(state.windowCount || 15);
        buildChipsWithCustom(document.getElementById('q-screen-chips'), stOpts, 'screenCount');
        buildChipsWithCustom(document.getElementById('q-track-chips'), stOpts, 'trackCount');
      }

    }

    // Show/hide residential vs commercial plans on step 3
    if (step === 3) {
      const isCommercial = state.propertyType === 'Commercial';
      document.getElementById('q-residential-plans').style.display = isCommercial ? 'none' : '';
      document.getElementById('q-commercial-plans').style.display = isCommercial ? '' : 'none';
    }

    // Show/hide business name on step 4 for commercial
    if (step === 4) {
      document.getElementById('q-business-name-field').style.display =
        state.propertyType === 'Commercial' ? '' : 'none';
    }
    // Auto-apply promo from localStorage when entering step 4
    if (step === 4) {
      try {
        const stored = localStorage.getItem('cleanzatx_promo');
        if (stored) {
          const promo = JSON.parse(stored);
          if (promo && (promo.code === 'SAVE25' || promo.code === 'CLEAN25') && state.promoDiscount === 0) {
            const promoInput = document.getElementById('q-promo');
            if (promoInput) {
              promoInput.value = promo.code;
              applyPromo(promo.code);
            }
          }
        }
      } catch (e) {}
    }

    // Build price display when entering step 5
    if (step === 5) buildPriceDisplay();

    // GA4 step tracking
    trackStep(step);

    // Scroll to form (skip on initial load)
    if (!qwiz._initialized) {
      qwiz._initialized = true;
    } else {
      const offset = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 72;
      const top = qwiz.closest('.quote-section').getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  }

  // Promo code logic
  function applyPromo(code) {
    const msgEl = document.getElementById('q-promo-msg');
    const applyBtn = document.getElementById('q-promo-apply');
    if (!msgEl) return;
    if (code === 'SAVE25' || code === 'CLEAN25') {
      state.promoCode = code;
      state.promoDiscount = 25;
      msgEl.style.display = '';
      msgEl.style.color = '#22c55e';
      msgEl.textContent = '$25 discount added to your quote successfully.';
      if (applyBtn) {
        applyBtn.style.background = '#22c55e';
        applyBtn.style.borderColor = '#22c55e';
        applyBtn.style.color = '#fff';
        applyBtn.textContent = 'Applied';
      }
      localStorage.removeItem('cleanzatx_promo');
    } else {
      msgEl.style.display = '';
      msgEl.style.color = '#ef4444';
      msgEl.textContent = 'Invalid promo code.';
    }
  }

  // Validation
  function validateStep(step) {
    if (step === 0) {
      if (!state.selectedServices.length) return false;
      return true;
    }
    if (step === 1) {
      const addr = document.getElementById('q-address').value.trim();
      state.address = addr;
      if (!addr) { flashError('q-address'); return false; }

      if (state.propertyType === 'Commercial') {
        // Commercial validation
        const cType = document.getElementById('q-commercial-type').value;
        state.commercialPropertyType = cType;
        state.commercialPropertyDesc = document.getElementById('q-commercial-desc')?.value?.trim() || '';
        if (!cType) { flashError('q-commercial-type'); return false; }
        if (cType === 'Other' && !state.commercialPropertyDesc) { flashError('q-commercial-desc'); return false; }
        if (!state.stories) { flashError('q-commercial-stories-chips'); return false; }
      } else {
        // Residential validation
        const sqft = parseInt(document.getElementById('q-sqft').value);
        const hasWindows = state.selectedServices.includes('windows');
        const lastCleaned = hasWindows ? document.getElementById('q-last-cleaned').value : '';
        state.sqft = sqft || 0;
        state.lastCleaned = lastCleaned;
        if (!sqft || sqft < 100) { flashError('q-sqft'); return false; }
        // 3700+ sqft: warn but allow through — will show custom quote path at Step 5
        if (!state.stories) { flashError('q-stories-chips'); return false; }
        if (hasWindows && !lastCleaned) { flashError('q-last-cleaned'); return false; }
      }
      return true;
    }
    if (step === 2) {
      const ss = state.selectedServices;
      // Window validation (only if windows selected)
      if (ss.includes('windows')) {
        if (!state.windowCount) {
          const chipsId = state.propertyType === 'Commercial' ? 'q-commercial-window-chips' : 'q-window-chips';
          const chips = document.getElementById(chipsId);
          if (chips) {
            chips.style.outline = '2px solid #ef4444';
            chips.style.borderRadius = '8px';
            setTimeout(() => { chips.style.outline = ''; }, 2000);
          }
          return false;
        }
        if (state.svcScreens && !state.screenCount) return false;
        if (state.svcTracks && !state.trackCount) return false;
      }
      // Pressure washing validation (only if pressure selected)
      if (ss.includes('pressure')) {
        if (!state.pwWaterSource) { flashError('q-pressure-section'); return false; }
        if (!state.pwSurfaces.length) { flashError('q-pw-surfaces-wrap'); return false; }
        if (!state.pwSurfaceType) { flashError('q-pw-surface-type'); return false; }
      }
      // Custom designed property (always visible on step 2)
      if (!state.customDesignedProperty) { flashError('q-custom-designed-card'); return false; }
      // House wash validation
      if (ss.includes('house_wash')) {
        if (!state.hwMaterial) { flashError('q-hw-material'); return false; }
        if (state.hwMaterial === 'Mixed' && !state.hwMaterialDesc) { flashError('q-hw-mixed-desc'); return false; }
        if (state.hwMaterial === 'Other' && !state.hwMaterialDesc) { flashError('q-hw-other-desc'); return false; }
        if (!state.hwStructures.length) { flashError('q-hw-structures-wrap'); return false; }
      }
      // Roof validation
      if (ss.includes('roof_wash')) {
        if (!state.roofMaterial) { flashError('q-roof-material'); return false; }
      }
      // Gutter validation
      if (ss.includes('gutters')) {
        if (!state.gutterGuards) { flashError('q-gutter-section'); return false; }
      }
      // Solar validation
      if (ss.includes('solar_panels')) {
        if (!state.solarPanelCount) { flashError('q-solar-count-chips'); return false; }
        if (!state.solarRoofPitch) { flashError('q-solar-pitch-chips'); return false; }
      }
      return true;
    }
    if (step === 4) {
      const fname = document.getElementById('q-fname').value.trim();
      const phone = document.getElementById('q-phone').value.trim();
      const timeline = document.getElementById('q-timeline').value;
      state.firstName = fname;
      state.lastName = document.getElementById('q-lname')?.value.trim() || '';
      state.phone = phone;
      state.email = document.getElementById('q-email').value.trim();
      state.referral = document.getElementById('q-referral').value;
      state.referrer = document.getElementById('q-referrer')?.value?.trim() || '';
      state.timeline = timeline;
      state.deadlineDate = document.getElementById('q-date')?.value || '';
      if (state.propertyType === 'Commercial') {
        state.businessName = document.getElementById('q-business-name')?.value?.trim() || '';
        if (!state.businessName) { flashError('q-business-name'); return false; }
      }
      if (!fname) { flashError('q-fname'); return false; }
      if (!phone || phone.replace(/\D/g,'').length < 10) { flashError('q-phone'); return false; }
      if (!timeline) { flashError('q-timeline'); return false; }
      return true;
    }
    return true;
  }

  function flashError(id) {
    const field = document.getElementById(id)?.closest('.qwiz__field');
    if (!field) return;
    field.classList.add('qwiz__field--error');
    document.getElementById(id).focus();
    setTimeout(() => field.classList.remove('qwiz__field--error'), 2500);
  }

  // Pricing engine (flat price, no range)
  function calcPrice() {
    const wc = Number(state.windowCount) || 0;
    const sqft = Number(state.sqft) || 0;
    const ss = state.selectedServices;

    // Exterior: $10/window (fall back to sqft x $0.10)
    let exterior = state.svcExterior ? (wc > 0 ? wc * 10 : sqft * 0.10) : 0;
    // Interior: $5/window (fall back to sqft x $0.05)
    let interior = state.svcInterior ? (wc > 0 ? wc * 5 : sqft * 0.05) : 0;
    // Screens: $5/screen (normal) or $10/screen (solar)
    const screenPrice = state.screenType === 'solar' ? 10 : 5;
    let screens = state.svcScreens ? (Number(state.screenCount) || 0) * screenPrice : 0;
    // Tracks: $5/track (FREE on quarterly plan)
    let tracks = state.svcTracks ? (Number(state.trackCount) || 0) * 5 : 0;
    const tracksFree = state.plan === 'quarterly';
    if (tracksFree) tracks = 0;
    // French panes: $10/window
    let frenchPanes = state.frenchPanes ? (Number(state.frenchPaneCount) || 0) * 10 : 0;

    const subtotal = exterior + interior + screens + tracks + frenchPanes;

    // Surcharges (applied to subtotal of affected services)
    const surcharges = [];
    state.surchargesApplied = [];
    const mat = state.homeMaterial;
    const matRule = SURCHARGE_CONFIG.homeMaterial[mat];
    if (matRule && matRule.services.some(s => ss.includes(s))) {
      const amt = Math.round(subtotal * matRule.percent / 100);
      surcharges.push({ label: matRule.label, amount: amt, tooltip: matRule.tooltip });
      state.surchargesApplied.push(matRule.label);
    }
    for (const [, rule] of Object.entries(SURCHARGE_CONFIG.debris)) {
      if (rule.services.some(s => ss.includes(s)) && rule.triggers.some(t => state.debrisTypes.includes(t))) {
        const amt = Math.round(subtotal * rule.percent / 100);
        surcharges.push({ label: rule.label, amount: amt });
        state.surchargesApplied.push(rule.label);
      }
    }
    const surchargeTotal = surcharges.reduce((sum, s) => sum + s.amount, 0);

    const subtotalWithSurcharges = subtotal + surchargeTotal;
    const MINIMUM = 150;

    // Discounts only apply when the job meets the minimum on its own
    let discount = 0;
    if (subtotalWithSurcharges >= MINIMUM) {
      if (state.plan === '6month') discount = 50;
      else if (state.plan === 'quarterly') discount = 100;
      else if (state.plan === 'monthly') discount = 150;
    }

    // Promo discount also only applies when subtotal meets minimum
    const promoDiscount = subtotalWithSurcharges >= MINIMUM ? (Number(state.promoDiscount) || 0) : 0;

    const rawTotal = Math.max(0, subtotalWithSurcharges - discount - promoDiscount);
    const total = rawTotal > 0 ? Math.max(MINIMUM, rawTotal) : 0;
    const hitMinimum = subtotalWithSurcharges > 0 && subtotalWithSurcharges < MINIMUM;

    return { exterior, interior, screens, tracks, frenchPanes, surcharges, surchargeTotal, discount, subtotal: subtotalWithSurcharges, total, rawTotal, hitMinimum, tracksFree, planName: state.plan };
  }

  // Job duration estimate
  function getEstimatedDuration() {
    const sqft = state.sqft;
    let extMin = 60;
    if (sqft > 1500) extMin = 120;
    if (sqft > 2500) extMin = 180;
    if (sqft > 3500) extMin = 240;
    let intMin = 0;
    if (state.svcInterior) {
      intMin = 30;
      if (sqft > 1500) intMin = 60;
      if (sqft > 2500) intMin = 90;
      if (sqft > 3500) intMin = 105;
    }
    const screenMin = state.svcScreens ? state.screenCount * 1 : 0;
    const trackMin = state.svcTracks ? state.trackCount * 1 : 0;
    return extMin + intMin + screenMin + trackMin;
  }

  function buildPriceDisplay() {
    const isLarge = state.propertyType === 'Residential' && state.sqft >= 3700;
    const isCustom = state.customLayout;
    const customEl = document.getElementById('q-price-custom');
    document.getElementById('q-price-normal').style.display = (isLarge || isCustom) ? 'none' : 'block';
    document.getElementById('q-price-large').style.display = isLarge ? 'block' : 'none';
    if (customEl) customEl.style.display = isCustom && !isLarge ? 'block' : 'none';
    if (isLarge || isCustom) return;

    const p = calcPrice();
    const lines = document.getElementById('q-price-lines');
    lines.innerHTML = '';
    const addLine = (label, amount, cls) => {
      const div = document.createElement('div');
      div.className = 'qwiz__price-line' + (cls ? ' ' + cls : '');
      const display = typeof amount === 'string' ? amount : '$' + (Number(amount) || 0).toFixed(2);
      div.innerHTML = `<span>${label}</span><span>${display}</span>`;
      lines.appendChild(div);
    };
    const wc = Number(state.windowCount) || 0;
    const sc = Number(state.screenCount) || 0;
    const tc = Number(state.trackCount) || 0;
    const fpc = Number(state.frenchPaneCount) || 0;
    if (state.svcExterior) addLine(`Exterior Windows (${wc} @ $10)`, p.exterior);
    if (state.svcInterior) addLine(`Interior Windows (${wc} @ $5)`, p.interior);
    if (state.frenchPanes && p.frenchPanes > 0) addLine(`French Pane Windows (${fpc} @ $10)`, p.frenchPanes);
    if (state.svcScreens) addLine(`Screen Cleaning (${sc} ${state.screenType === 'solar' ? 'solar' : 'standard'})`, p.screens);
    if (state.svcTracks && p.tracksFree) {
      addLine(`Track Cleaning (${tc}) - FREE w/ Quarterly`, '$0.00', 'qwiz__price-line--discount');
    } else if (state.svcTracks) {
      addLine(`Track Cleaning (${tc})`, p.tracks);
    }
    if (p.surcharges && p.surcharges.length > 0) {
      p.surcharges.forEach(s => {
        const tip = s.tooltip ? ` <span class="qwiz__tooltip" title="${s.tooltip}">ⓘ</span>` : '';
        addLine(`${s.label}${tip}`, s.amount, 'qwiz__price-line--surcharge');
      });
    }
    if (p.discount > 0) {
      const planLabel = state.plan === '6month' ? 'Bi-Annual' : state.plan === 'quarterly' ? 'Quarterly' : state.plan === 'monthly' ? 'Monthly' : 'Plan';
      addLine(`${planLabel} Plan Discount`, '-$' + (Number(p.discount) || 0).toFixed(2), 'qwiz__price-line--discount');
    }
    if (state.promoDiscount > 0) {
      addLine(`$25 Discount (${state.promoCode || 'PROMO'})`, '-$' + (Number(state.promoDiscount) || 0).toFixed(2), 'qwiz__price-line--discount');
    }
    // Flat price — no range
    document.getElementById('q-price-total').textContent = '$' + Math.round(Number(p.total) || 0);

    // Minimum job notice
    const minNotice = document.getElementById('q-minimum-notice');
    if (minNotice) minNotice.style.display = p.hitMinimum ? '' : 'none';
  }

  // Wire up Next/Back buttons
  qwiz.querySelectorAll('.qwiz__next').forEach(btn => {
    btn.addEventListener('click', () => {
      const next = parseInt(btn.dataset.next);
      if (!validateStep(state.step)) return;
      // GA4 events for new steps
      if (typeof gtag !== 'undefined') {
        if (state.step === 0) {
          gtag('event', 'quote_step_services', { selected_services: state.selectedServices });
        }
        if (state.step === 2) {
          gtag('event', 'quote_step_details', {
            home_material: state.homeMaterial,
            debris_types: state.debrisTypes,
            surcharges_applied: state.surchargesApplied
          });
        }
      }
      goToStep(next);
    });
  });
  qwiz.querySelectorAll('.qwiz__back').forEach(btn => {
    btn.addEventListener('click', () => goToStep(parseInt(btn.dataset.back)));
  });

  // Step 0 — service tile checkboxes
  const step0Next = document.getElementById('step0Next');
  document.querySelectorAll('#q-service-tiles input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
      state.selectedServices = [...document.querySelectorAll('#q-service-tiles input:checked')].map(c => c.value);
      step0Next.disabled = state.selectedServices.length === 0;
      // Auto-check window service checkboxes if windows selected
      if (cb.value === 'windows' && cb.checked) {
        const ext = document.getElementById('q-svc-exterior');
        if (ext && !ext.checked) { ext.checked = true; ext.dispatchEvent(new Event('change')); }
      }
    });
  });

  // Step 2 conditional — home material dropdown
  document.getElementById('q-home-material')?.addEventListener('change', e => {
    state.homeMaterial = e.target.value;
    const showNotes = e.target.value === 'Mixed (multiple materials)' || e.target.value === 'Other';
    document.getElementById('q-home-material-notes-field').style.display = showNotes ? '' : 'none';
  });
  document.getElementById('q-home-material-notes')?.addEventListener('input', e => {
    state.homeMaterialNotes = e.target.value.trim();
  });

  // Step 2 conditional — debris checkboxes
  document.querySelectorAll('#q-debris-checks input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
      state.debrisTypes = [...document.querySelectorAll('#q-debris-checks input:checked')].map(c => c.value);
    });
  });

  // Property type bubble selector (Step 1) — show/hide residential vs commercial fields
  document.querySelectorAll('#q-property-type-chips .qwiz__chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#q-property-type-chips .qwiz__chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.propertyType = chip.dataset.value;
      const isCommercial = chip.dataset.value === 'Commercial';
      document.getElementById('q-residential-fields').style.display = isCommercial ? 'none' : '';
      document.getElementById('q-commercial-fields').style.display = isCommercial ? '' : 'none';
    });
  });

  // Stories bubble selectors (residential)
  document.querySelectorAll('#q-stories-chips .qwiz__chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#q-stories-chips .qwiz__chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.stories = parseInt(chip.dataset.value) || 0;
    });
  });

  // Stories bubble selectors (commercial)
  document.querySelectorAll('#q-commercial-stories-chips .qwiz__chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#q-commercial-stories-chips .qwiz__chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.stories = parseInt(chip.dataset.value) || 0;
    });
  });

  // Commercial property type select
  document.getElementById('q-commercial-type')?.addEventListener('change', e => {
    state.commercialPropertyType = e.target.value;
    document.getElementById('q-commercial-desc-field').style.display = e.target.value === 'Other' ? '' : 'none';
  });
  document.getElementById('q-commercial-desc')?.addEventListener('input', e => {
    state.commercialPropertyDesc = e.target.value.trim();
  });

  // Sqft threshold listener
  let sqftWasBlocked = false;
  document.getElementById('q-sqft')?.addEventListener('input', function() {
    const val = parseInt(this.value) || 0;
    const advisory = document.getElementById('q-sqft-advisory');
    const blocked = document.getElementById('q-sqft-blocked');
    const nextBtn = document.getElementById('step1Next');
    if (advisory) advisory.style.display = (val >= 3500 && val < 3700) ? '' : 'none';
    if (blocked) blocked.style.display = (val >= 3700) ? '' : 'none';
    if (nextBtn) nextBtn.disabled = false; // 3700+ sqft users can proceed to get custom quote
    // Auto-open the contact modal the first time sqft crosses 3700
    if (val >= 3700 && !sqftWasBlocked) {
      sqftWasBlocked = true;
      if (window.openPhoneModal) window.openPhoneModal();
    } else if (val < 3700) {
      sqftWasBlocked = false; // reset so it fires again if they re-enter a large number
    }
  });

  // Service card toggle helper — adds/removes .checked class
  function toggleCard(checkbox) {
    const card = checkbox.closest('.qwiz__service-card');
    if (card) card.classList.toggle('checked', checkbox.checked);
  }

  // Service checkboxes (residential)
  document.getElementById('q-svc-exterior')?.addEventListener('change', e => {
    state.svcExterior = e.target.checked;
    toggleCard(e.target);
    const prompt = document.getElementById('q-french-pane-prompt');
    if (prompt) {
      if (e.target.checked) {
        prompt.style.display = '';
      } else {
        prompt.style.display = 'none';
        state.frenchPanes = false;
        state.frenchPaneCount = 0;
        state._frenchPaneAsked = false;
        const countWrap = document.getElementById('q-french-count-wrap');
        if (countWrap) countWrap.style.display = 'none';
        const countInput = document.getElementById('q-french-count');
        if (countInput) countInput.value = '';
      }
    }
  });
  document.getElementById('q-svc-interior')?.addEventListener('change', e => {
    state.svcInterior = e.target.checked;
    toggleCard(e.target);
    const opts = document.getElementById('q-interior-options');
    if (opts) opts.style.display = e.target.checked ? '' : 'none';
    if (!e.target.checked) {
      state.interiorType = '';
      state.interiorCount = 0;
      const wrap = document.getElementById('q-interior-count-wrap');
      if (wrap) wrap.style.display = 'none';
    }
  });
  // Interior full/partial handlers
  document.getElementById('q-interior-full')?.addEventListener('click', () => {
    state.interiorType = 'full';
    state.interiorCount = state.windowCount || 0;
    document.getElementById('q-interior-count-wrap').style.display = 'none';
    document.getElementById('q-interior-full').classList.add('btn--sky');
    document.getElementById('q-interior-full').classList.remove('btn--ghost');
    document.getElementById('q-interior-partial').classList.add('btn--ghost');
    document.getElementById('q-interior-partial').classList.remove('btn--sky');
  });
  document.getElementById('q-interior-partial')?.addEventListener('click', () => {
    state.interiorType = 'partial';
    document.getElementById('q-interior-count-wrap').style.display = '';
    document.getElementById('q-interior-partial').classList.add('btn--sky');
    document.getElementById('q-interior-partial').classList.remove('btn--ghost');
    document.getElementById('q-interior-full').classList.add('btn--ghost');
    document.getElementById('q-interior-full').classList.remove('btn--sky');
  });
  document.getElementById('q-interior-count')?.addEventListener('input', e => {
    state.interiorCount = parseInt(e.target.value) || 0;
  });

  document.getElementById('q-svc-screens')?.addEventListener('change', e => {
    state.svcScreens = e.target.checked;
    toggleCard(e.target);
    const opts = document.getElementById('q-screen-options');
    if (opts) opts.style.display = e.target.checked ? '' : 'none';
  });
  document.getElementById('q-svc-tracks')?.addEventListener('change', e => {
    state.svcTracks = e.target.checked;
    toggleCard(e.target);
    const opts = document.getElementById('q-track-options');
    if (opts) opts.style.display = e.target.checked ? '' : 'none';
  });

  // French pane prompt handlers
  document.getElementById('q-french-yes')?.addEventListener('click', () => {
    state.frenchPanes = true;
    state._frenchPaneAsked = true;
    document.getElementById('q-french-count-wrap').style.display = '';
  });
  document.getElementById('q-french-no')?.addEventListener('click', () => {
    state.frenchPanes = false;
    state._frenchPaneAsked = true;
    document.getElementById('q-french-pane-prompt').style.display = 'none';
  });
  document.getElementById('q-french-count')?.addEventListener('input', e => {
    state.frenchPaneCount = parseInt(e.target.value) || 0;
  });

  // Custom layout prompt handlers
  document.getElementById('q-custom-yes')?.addEventListener('click', () => {
    state.customLayout = true;
    document.getElementById('q-custom-layout-prompt').style.display = 'none';
  });
  document.getElementById('q-custom-no')?.addEventListener('click', () => {
    state.customLayout = false;
    // Revert to auto-suggested count
    state.windowCount = state.autoSuggestedWindowCount;
    document.getElementById('q-window-chips').querySelectorAll('.qwiz__chip').forEach(c => {
      c.classList.toggle('active', parseInt(c.textContent) === state.autoSuggestedWindowCount);
    });
    document.getElementById('q-custom-layout-prompt').style.display = 'none';
  });

  // ─── Pressure Washing handlers ───
  // Yes/No toggle buttons
  document.querySelectorAll('.qwiz__toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const field = btn.dataset.field;
      const value = btn.dataset.value;
      btn.parentElement.querySelectorAll('.qwiz__toggle-btn').forEach(b => {
        b.classList.remove('active', 'btn--sky');
        b.classList.add('btn--ghost');
      });
      btn.classList.add('active', 'btn--sky');
      btn.classList.remove('btn--ghost');
      if (field === 'custom-designed') { state.customDesignedProperty = value; if (value === 'yes') state.requiresCustomQuote = true; }
      if (field === 'gutter-guards') state.gutterGuards = value;
      if (field === 'pw-water') state.pwWaterSource = value;
    });
  });

  // Multi-select dropdown for surfaces
  var pwTrigger = document.getElementById('q-pw-surfaces-trigger');
  var pwDropdown = document.getElementById('q-pw-surfaces-dropdown');
  if (pwTrigger && pwDropdown) {
    pwTrigger.addEventListener('click', function() {
      pwDropdown.style.display = pwDropdown.style.display === 'none' ? '' : 'none';
    });
    document.addEventListener('click', function(e) {
      if (!e.target.closest('#q-pw-surfaces-wrap')) {
        pwDropdown.style.display = 'none';
      }
    });
    pwDropdown.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', function() {
        state.pwSurfaces = [...pwDropdown.querySelectorAll('input:checked')].map(c => c.value);
        if (state.pwSurfaces.length > 0) {
          pwTrigger.textContent = state.pwSurfaces.join(', ');
          pwTrigger.classList.add('has-value');
        } else {
          pwTrigger.textContent = 'Select surface(s)...';
          pwTrigger.classList.remove('has-value');
        }
      });
    });
  }

  document.getElementById('q-pw-surface-type')?.addEventListener('change', function(e) {
    state.pwSurfaceType = e.target.value;
  });

  // ─── House Wash handlers ───
  document.getElementById('q-hw-material')?.addEventListener('change', function(e) {
    state.hwMaterial = e.target.value;
    document.getElementById('q-hw-mixed-desc').style.display = e.target.value === 'Mixed' ? '' : 'none';
    document.getElementById('q-hw-other-desc').style.display = e.target.value === 'Other' ? '' : 'none';
  });
  document.getElementById('q-hw-mixed-input')?.addEventListener('input', e => { state.hwMaterialDesc = e.target.value.trim(); });
  document.getElementById('q-hw-other-input')?.addEventListener('input', e => { state.hwMaterialDesc = e.target.value.trim(); });

  // House wash structures multi-select
  (function() {
    var trigger = document.getElementById('q-hw-structures-trigger');
    var dropdown = document.getElementById('q-hw-structures-dropdown');
    if (!trigger || !dropdown) return;
    trigger.addEventListener('click', function() {
      dropdown.style.display = dropdown.style.display === 'none' ? '' : 'none';
    });
    document.addEventListener('click', function(e) {
      if (!e.target.closest('#q-hw-structures-wrap')) dropdown.style.display = 'none';
    });
    dropdown.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', function() {
        state.hwStructures = [...dropdown.querySelectorAll('input:checked')].map(c => c.value);
        trigger.textContent = state.hwStructures.length ? state.hwStructures.join(', ') : 'Select area(s)...';
        trigger.classList.toggle('has-value', state.hwStructures.length > 0);
        document.getElementById('q-hw-partial-desc').style.display = state.hwStructures.includes('Partial House Wash') ? '' : 'none';
        document.getElementById('q-hw-struct-other-desc').style.display = state.hwStructures.includes('Other Structures') ? '' : 'none';
      });
    });
  })();

  document.getElementById('q-hw-partial-input')?.addEventListener('input', e => { state.hwPartialDesc = e.target.value.trim(); });
  document.getElementById('q-hw-struct-other-input')?.addEventListener('input', e => { state.hwStructOtherDesc = e.target.value.trim(); });

  // House wash debris checkboxes
  document.getElementById('q-hw-debris-checks')?.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', function() {
      state.hwDebris = [...document.getElementById('q-hw-debris-checks').querySelectorAll('input:checked')].map(c => c.value);
    });
  });

  // ─── Roof Wash handlers ───
  document.getElementById('q-roof-material')?.addEventListener('change', function(e) {
    state.roofMaterial = e.target.value;
    document.getElementById('q-roof-mixed-desc').style.display = e.target.value === 'Mixed' ? '' : 'none';
    document.getElementById('q-roof-other-desc').style.display = e.target.value === 'Other' ? '' : 'none';
  });
  document.getElementById('q-roof-mixed-input')?.addEventListener('input', e => { state.roofMaterialDesc = e.target.value.trim(); });
  document.getElementById('q-roof-other-input')?.addEventListener('input', e => { state.roofMaterialDesc = e.target.value.trim(); });

  // Roof debris checkboxes
  document.getElementById('q-roof-debris-checks')?.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', function() {
      state.roofDebris = [...document.getElementById('q-roof-debris-checks').querySelectorAll('input:checked')].map(c => c.value);
    });
  });

  // ─── Gutter handlers ───
  document.getElementById('q-gutter-location-chips')?.addEventListener('click', function(e) {
    var chip = e.target.closest('.qwiz__chip');
    if (!chip) return;
    var otherWrap = document.getElementById('q-gutter-other-desc');
    if (otherWrap) otherWrap.style.display = chip.textContent.includes('Other') && chip.classList.contains('active') ? '' : 'none';
  });
  document.getElementById('q-gutter-other-input')?.addEventListener('input', e => { state.gutterOtherDesc = e.target.value.trim(); });

  // Commercial service checkboxes
  document.getElementById('q-csvc-exterior')?.addEventListener('change', e => { state.svcExterior = e.target.checked; });
  document.getElementById('q-csvc-interior')?.addEventListener('change', e => { state.svcInterior = e.target.checked; });
  document.getElementById('q-csvc-screens-tracks')?.addEventListener('change', e => {
    state.svcScreens = e.target.checked;
    state.svcTracks = e.target.checked;
  });

  // Business name
  document.getElementById('q-business-name')?.addEventListener('input', e => {
    state.businessName = e.target.value.trim();
  });

  // Commercial frequency toggle
  document.querySelectorAll('.qwiz__freq-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.qwiz__plan-freq-toggle').querySelectorAll('.qwiz__freq-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.commercialFrequency = btn.dataset.freq;
    });
  });

  // Screen type radios
  document.querySelectorAll('input[name="screenType"]').forEach(r => {
    r.addEventListener('change', e => { state.screenType = e.target.value; });
  });

  // Plan selection
  qwiz.querySelectorAll('.qwiz__plan').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('.qwiz__toggle') || e.target.closest('.qwiz__auto-bill') || e.target.closest('.qwiz__plan-freq-toggle')) return;
      const wasSelected = card.classList.contains('selected');
      qwiz.querySelectorAll('.qwiz__plan').forEach(c => c.classList.remove('selected'));
      if (!wasSelected) {
        card.classList.add('selected');
        state.plan = card.dataset.plan;
      } else {
        state.plan = '';
      }
      const skipBtn = document.getElementById('skipPlanBtn');
      const selectBtn = document.getElementById('selectPlanBtn');
      const skipLink = document.getElementById('skipPlanLink');
      if (skipBtn) skipBtn.style.display = state.plan ? 'none' : '';
      if (selectBtn) selectBtn.style.display = state.plan ? '' : 'none';
      if (skipLink) skipLink.style.display = state.plan ? '' : 'none';
    });
  });

  // Auto-billing toggles
  qwiz.querySelectorAll('.auto-bill-toggle').forEach(toggle => {
    toggle.addEventListener('change', e => {
      state.autoBilling = e.target.checked;
    });
  });

  // Referral conditional
  document.getElementById('q-referral')?.addEventListener('change', e => {
    const v = e.target.value;
    document.getElementById('q-referrer-field').style.display = v === 'Referral' ? 'block' : 'none';
  });

  // Timeline conditional
  document.getElementById('q-timeline')?.addEventListener('change', e => {
    document.getElementById('q-date-field').style.display = e.target.value === 'specific_date' ? 'block' : 'none';
  });

  // Promo code apply button and Enter key
  document.getElementById('q-promo-apply')?.addEventListener('click', () => {
    const code = document.getElementById('q-promo')?.value.trim().toUpperCase() || '';
    applyPromo(code);
  });
  document.getElementById('q-promo')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const code = e.target.value.trim().toUpperCase();
      applyPromo(code);
    }
  });

  // GA4 — track quote wizard step progression
  function trackStep(step) {
    if (typeof gtag === 'undefined') return;
    gtag('event', 'quote_step', { step_number: step });
    if (step === 0) gtag('event', 'begin_checkout');
  }

  // Submit handlers
  let submitted = false;
  function handleSubmit() {
    if (submitted) return;
    submitted = true;
    const p = calcPrice();
    const isLarge = state.propertyType === 'Residential' && state.sqft >= 3700;
    const planLabel = state.plan === '6month' ? 'Bi-Annual' : state.plan === 'quarterly' ? 'Quarterly' : state.plan === 'monthly' ? 'Monthly' : state.plan === 'weekly' ? (state.commercialFrequency === 'biweekly' ? 'Bi-weekly' : 'Weekly') : state.plan || 'None (One-Time)';
    const screenTypeLabel = state.screenType === 'solar' ? 'Solar Screens' : 'Normal Screens';

    // Silent EmailJS send
    const emailPayload = {
      first_name:       state.firstName,
      last_name:        state.lastName || '',
      phone:            state.phone,
      email:            state.email || '',
      address:          state.address || '',
      property_type:    state.propertyType || 'Residential',
      business_name:    state.businessName || '',
      commercial_property_type: state.commercialPropertyType || '',
      commercial_property_desc: state.commercialPropertyDesc || '',
      sqft:             state.sqft,
      stories:          state.stories,
      last_cleaned:     state.lastCleaned || '',
      exterior_windows: state.svcExterior ? 'Yes' : 'No',
      interior_windows: state.svcInterior ? 'Yes' : 'No',
      screens:          state.svcScreens ? state.screenCount + ' screens (' + (state.screenType === 'solar' ? 'solar' : 'standard') + ')' : 'No',
      tracks:           state.svcTracks ? state.trackCount + ' tracks' : 'No',
      french_panes:     state.frenchPanes ? state.frenchPaneCount + ' French pane windows' : 'No',
      custom_layout:    state.customLayout,
      service_plan:     planLabel,
      auto_billing:     state.autoBilling ? 'Enrolled' : 'Not Enrolled',
      referral_source:  state.referral || '',
      timeline:         ({ asap: 'ASAP', within_1_week: 'Within 1 Week', within_2_weeks: 'Within 2 Weeks', specific_date: 'Specific Date' })[state.timeline] || state.timeline || '',
      promo_code:       state.promoCode || '',
      promo_discount:   state.promoDiscount || 0,
      selected_services: (state.selectedServices || []).join(', '),
      home_material:    state.homeMaterial || '',
      home_material_notes: state.homeMaterialNotes || '',
      debris_types:     (state.debrisTypes || []).join(', '),
    };
    emailjs.send('service_xsex2ss', 'template_536xvvp', emailPayload).catch(() => {});

    // Derive deadline date
    let deadlineDate = state.deadlineDate || '';
    if (!deadlineDate) {
      const d = new Date();
      const days = { asap: 3, within_1_week: 7, within_2_weeks: 14 };
      d.setDate(d.getDate() + (days[state.timeline] || 30));
      deadlineDate = (d.getMonth()+1) + '/' + d.getDate() + '/' + d.getFullYear();
    }

    // Build services list for payloads
    const servicesList = [];
    if (state.svcExterior) servicesList.push('Exterior Windows');
    if (state.svcInterior) servicesList.push('Interior Windows');
    if (state.svcScreens) servicesList.push('Screen Cleaning (' + screenTypeLabel + ')');
    if (state.svcTracks) servicesList.push('Track Cleaning');

    /* ── n8n webhook — DISABLED ──
       The Vercel proxy to the n8n server was removed to stop null SMS
       notifications. Re-enable in vercel.json when the n8n workflow
       has the "Is Real Lead?" gate imported.
    fetch('https://www.cleanzatx.com/n8n/webhook/f1cd6d3b-ddc5-4a08-9894-ff8bcb72659d', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        first_name: state.firstName, last_name: state.lastName || '',
        phone: state.phone, email: state.email || '',
        address: state.address || '', sqft: state.sqft, stories: state.stories,
        last_cleaned: state.lastCleaned || '', property_type: state.propertyType || 'Residential',
        service_plan: planLabel, auto_billing: state.autoBilling ? 'Enrolled' : 'Not Enrolled',
        exterior_price: p.exterior.toFixed(2), interior_price: p.interior.toFixed(2),
        screen_price: p.screens.toFixed(2), track_price: p.tracks.toFixed(2),
        discount: p.discount.toFixed(2), total_price: p.total.toFixed(2),
        services: servicesList.join(', '), selected_services: state.selectedServices || [],
      }),
    }).catch(() => {});
    ── end n8n ── */

    // Send to CleanzATX Tracker — auto-creates client + plan
    fetch((window.CLEANZATX_TRACKER_URL || 'https://cleanzatx-tracker.vercel.app') + '/api/webhooks/quote-form', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        first_name:                 state.firstName,
        last_name:                  state.lastName || '',
        phone:                      state.phone,
        email:                      state.email || '',
        address:                    state.address || '',
        sqft:                       state.sqft,
        stories:                    state.stories,
        last_cleaned:               state.lastCleaned || '',
        property_type:              state.propertyType || 'Residential',
        business_name:              state.businessName || '',
        commercial_property_type:   state.commercialPropertyType || '',
        commercial_property_desc:   state.commercialPropertyDesc || '',
        custom_layout:              state.customLayout,
        french_panes:               state.frenchPanes ? state.frenchPaneCount + ' panes' : 'No',
        service_plan:               planLabel,
        auto_billing:               state.autoBilling ? 'Enrolled' : 'Not Enrolled',
        exterior_price:             p.exterior.toFixed(2),
        interior_price:             p.interior.toFixed(2),
        screen_price:               p.screens.toFixed(2),
        track_price:                p.tracks.toFixed(2),
        french_pane_price:          (p.frenchPanes || 0).toFixed(2),
        discount:                   p.discount.toFixed(2),
        total_price:                p.total.toFixed(2),
        services:                   servicesList.join(', '),
        deadline_date:              deadlineDate,
        estimated_duration_minutes: getEstimatedDuration(),
        referral_source:            state.referral || '',
        timeline:                   ({ asap: 'ASAP', within_1_week: 'Within 1 Week', within_2_weeks: 'Within 2 Weeks', specific_date: 'Specific Date' })[state.timeline] || state.timeline || '',
        large_home:                 isLarge,
        how_found:                  state.referral || '',
        promo_code:                 state.promoCode || '',
        promo_discount:             state.promoDiscount || 0,
        selected_services:          state.selectedServices || [],
        home_material:              state.homeMaterial || '',
        home_material_notes:        state.homeMaterialNotes || '',
        debris_types:               state.debrisTypes || [],
        surcharges_applied:         state.surchargesApplied || [],
      }),
    }).catch(() => {});

    // GA4 — lead conversion event
    if (typeof gtag !== 'undefined') {
      gtag('event', 'generate_lead', {
        value: parseFloat(calcPrice().total.toFixed(2)),
        currency: 'USD',
        lead_source: state.referral || 'unknown',
        selected_services: state.selectedServices,
      });
    }

    // Show confirmation
    qwiz.querySelectorAll('.qwiz__panel').forEach(p => p.classList.remove('active'));
    const confirmPanel = qwiz.querySelector('[data-panel="confirm"]');
    confirmPanel.style.display = '';
    confirmPanel.classList.add('active');

    const confirmTextEl = document.getElementById('q-confirm-text');
    const confirmTextBtn = document.getElementById('q-confirm-text-now');
    if (isLarge) {
      document.getElementById('q-confirm-msg').textContent = `Got it! We'll reach out with your custom quote shortly.`;
      if (confirmTextEl) confirmTextEl.textContent = `Your home is over 3,700 sqft so we'll review the details and contact you with a price as fast as possible. Don't want to wait?`;
      if (confirmTextBtn) confirmTextBtn.style.display = '';
    } else {
      document.getElementById('q-confirm-msg').textContent = `Thanks! We'll be in touch with your quote shortly.`;
      if (confirmTextEl) confirmTextEl.textContent = `Keep an eye on your phone and email. We'll have a formal quote sent over to you within the hour. We look forward to working with you!`;
      if (confirmTextBtn) confirmTextBtn.style.display = 'none';
    }

    // Hide progress
    qwiz.querySelector('.qwiz__progress').style.display = 'none';

    // Scroll so the urgency bar sits flush below the fixed nav — exactly as designed
    requestAnimationFrame(() => {
      const navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 72;
      const wizTop = qwiz.getBoundingClientRect().top + window.scrollY - navH;
      window.scrollTo({ top: wizTop, behavior: 'smooth' });
    });
  }

  document.getElementById('q-submit')?.addEventListener('click', handleSubmit);
  document.getElementById('q-submit-large')?.addEventListener('click', handleSubmit);
  document.getElementById('q-submit-custom')?.addEventListener('click', handleSubmit);

  // Initialize step 0
  goToStep(0);
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

// Hook confetti to form submit
const origSubmitBtn = document.getElementById('q-submit');
if (origSubmitBtn) {
  origSubmitBtn.addEventListener('click', () => setTimeout(launchConfetti, 300));
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

/* ---------- Quarterly plan upsell ---------- */
(function() {
  const upsellBtn = document.getElementById('qwizUpsellYes');
  const upsell = document.getElementById('qwizUpsell');
  const accepted = document.getElementById('qwizUpsellAccepted');
  if (!upsellBtn) return;

  upsellBtn.addEventListener('click', function() {
    upsell.style.display = 'none';
    accepted.style.display = 'flex';
    // Upsell accepted — quiet email notification only (no n8n SMS blast)
    emailjs.send('service_xsex2ss', 'template_536xvvp', {
      first_name: (window.__qwizState || {}).firstName || 'Customer',
      phone: (window.__qwizState || {}).phone || '',
      service_plan: 'UPSELL ACCEPTED — Quarterly Plan',
      timeline: 'Upsell accepted after initial quote submission',
    }).catch(() => {});
    if (typeof gtag !== 'undefined') gtag('event', 'upsell_accepted', { plan: 'quarterly' });
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
