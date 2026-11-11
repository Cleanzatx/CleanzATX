/* ==========================================================================
   CleanzATX — sitewide GA4 click tracking
   Loaded on every public page, right after the gtag snippet.
   Quote-funnel events (quote_step*, begin_checkout, generate_lead,
   upsell_accepted) stay in main.js / the page's own script.
   ========================================================================== */
/* Google Ads conversions. Each label comes from Google Ads > Goals > Conversions >
   the action > "Use Google tag" > event snippet (send_to: 'AW-11122883575/<label>').
   An empty label means that conversion isn't set up yet, so nothing is sent. */
window.CZ_ADS = {
  id: 'AW-11122883575',
  labels: { lead: 'MwkgCKiO_rAdEPf35rcp', call: 'DfCpCK6O_rAdEPf35rcp', screens: 'i9B-CKuO_rAdEPf35rcp' },
};

// Enhanced conversions: the visitor's phone/email (Google hashes it before sending)
// so Ads can match the conversion to the ad click. Kept for the session so a later
// call tap is matched too.
window.czAdsConversion = function (key, user) {
  if (typeof gtag !== 'function') return;
  var ud = null;
  if (user && (user.phone || user.email)) {
    ud = {};
    var digits = String(user.phone || '').replace(/\D/g, '');
    if (digits.length === 10) ud.phone_number = '+1' + digits;
    if (user.email) ud.email = String(user.email).trim().toLowerCase();
    try { sessionStorage.setItem('cz_ud', JSON.stringify(ud)); } catch (e) {}
  } else {
    try { ud = JSON.parse(sessionStorage.getItem('cz_ud') || 'null'); } catch (e) {}
  }
  if (ud) gtag('set', 'user_data', ud);
  var label = window.CZ_ADS.labels[key];
  if (label) gtag('event', 'conversion', { send_to: window.CZ_ADS.id + '/' + label });
};

(function () {
  'use strict';

  // Our own hosts — links to these are internal, not outbound
  const OWN_HOSTS = ['cleanzatx.com', 'www.cleanzatx.com', location.hostname];

  // Quote / booking CTAs (links to the quote section, plus primary buttons)
  const CTA_SELECTOR = 'a[href*="#quote"], a[href*="/pricing"], a[href*="/plans"], a[href*="/gallery"], .btn--primary, .btn--nav, .hero-cta, .rig__cta, .prices__btn, .club__plan, .club__link, .reviews-wall__btn, .ba-wall__btn, .mobile-cta-bar__quote, .site-footer__btn';

  // Which kind of page the click happened on, so reports can split by page
  // (page_location is also attached to every event by GA4 itself)
  const path = location.pathname.replace(/\.html$/, '').replace(/\/+$/, '') || '/';
  const hood = path.match(/^\/window-cleaning-([a-z0-9-]+)/);
  const PAGE_TYPE = path === '/' || path === '/index' ? 'home'
    : hood ? 'neighborhood'
    : /^\/(privacy-policy|terms-of-service)$/.test(path) ? 'legal'
    : path.slice(1);

  function send(name, params) {
    if (typeof gtag !== 'function') return;
    gtag('event', name, Object.assign({
      page_location: location.href,
      page_path: location.pathname,
      page_type: PAGE_TYPE,
      neighborhood: hood ? hood[1] : undefined
    }, params));
  }

  function linkText(el) {
    return (el.textContent || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 100);
  }

  document.addEventListener('click', function (e) {
    if (!e.target.closest) return;

    // Gallery page — photo opened in the lightbox
    const photo = e.target.closest('.gpage-card');
    if (photo) {
      const img = photo.querySelector('img');
      send('gallery_photo_view', {
        photo_name: photo.dataset.title || (img && img.alt) || '',
        photo_alt: img ? img.alt : ''
      });
      return;
    }

    const el = e.target.closest('a, button');
    if (!el) return;

    const href = (el.getAttribute('href') || '').trim();
    const scheme = href.split(':')[0].toLowerCase();

    // Phone / text / email
    if (scheme === 'tel' || scheme === 'sms') {
      // On the home page a tel: link first opens the call/text chooser
      // (main.js prevents the dial) — only count the actual call or text tap.
      if (e.defaultPrevented) return;
      window.czAdsConversion('call');
      send('phone_call_click', {
        method: scheme === 'tel' ? 'call' : 'text',
        link_url: href,
        link_text: linkText(el)
      });
      // text_tap: every sms: link tap, in addition to the phone_call_click above
      if (scheme === 'sms') {
        send('text_tap', {
          link_url: href,
          link_text: linkText(el)
        });
      }
      return;
    }
    if (scheme === 'mailto') {
      send('email_click', { method: 'email', link_url: href, link_text: linkText(el) });
      return;
    }

    // Outbound links (reviews, social, etc.)
    if (el.tagName === 'A' && /^https?:/i.test(el.href) && OWN_HOSTS.indexOf(el.hostname) === -1) {
      send('outbound_click', {
        link_url: el.href,
        link_domain: el.hostname,
        link_text: linkText(el)
      });
      return;
    }

    // Quote / CTA buttons — wizard steps are tracked separately by quote_step
    if (el.matches(CTA_SELECTOR) && !el.closest('.qwiz')) {
      send('cta_click', {
        button_text: linkText(el),
        link_url: href || undefined
      });
    }
  });

  // quote_start — first interaction with a quote form (home wizard or pollen form)
  const QUOTE_FORMS = { quoteWizard: 'home_quote', pollenWizard: 'pollen_quote' };
  let quoteStarted = false;
  function onQuoteInteract(e) {
    if (quoteStarted || !e.target.closest) return;
    const form = e.target.closest('#quoteWizard, #pollenWizard');
    if (!form) return;
    quoteStarted = true;
    send('quote_start', { form_name: QUOTE_FORMS[form.id] });
  }
  ['pointerdown', 'focusin', 'keydown', 'click'].forEach(function (type) {
    document.addEventListener(type, onQuoteInteract, true);
  });

  // section_view — fires once per section the first time half of it is on screen
  if ('IntersectionObserver' in window) {
    const seenSections = new Set();
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        const id = en.target.id;
        if (!en.isIntersecting || seenSections.has(id)) return;
        seenSections.add(id);
        send('section_view', { section_id: id });
        io.unobserve(en.target);
      });
    }, { threshold: 0.5 });
    document.addEventListener('DOMContentLoaded', function () {
      document.querySelectorAll('section[id]').forEach(function (sec) { io.observe(sec); });
    });
  }

  // gtag.js holds events for ~5s and sends the batch early only on pagehide.
  // Phones usually just hide the page (switching to Phone/Messages, locking the
  // screen, swiping away Safari) without a pagehide, so taps made right before
  // that were being lost. Ask gtag to send what it's holding as soon as the
  // page is hidden.
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'hidden' || typeof gtag !== 'function') return;
    try { window.dispatchEvent(new Event('pagehide')); } catch (e) {}
  });
})();
