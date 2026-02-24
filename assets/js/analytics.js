// services.stlucia.studio — Consent-gated analytics
// GA4 + FB Pixel loaded only after user accepts cookies
// Plausible runs separately (cookieless, GDPR-compliant)

(function() {
  'use strict';

  var CONSENT_KEY = 'stlucia_consent';
  var GA4_ID = 'G-0GXK2QMVPZ';
  var FB_PIXEL_ID = '1403025764621663';

  // --- Cookie Consent Banner ---
  function showBanner() {
    var consent = localStorage.getItem(CONSENT_KEY);
    if (consent) return; // already decided

    var bar = document.createElement('div');
    bar.id = 'consent-bar';
    bar.setAttribute('role', 'dialog');
    bar.setAttribute('aria-label', 'Cookie consent');
    bar.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:99999;background:#1a202c;color:#fff;padding:14px 20px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,system-ui,sans-serif;font-size:13px;line-height:1.5;display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:12px;box-shadow:0 -2px 12px rgba(0,0,0,0.3);';

    var text = document.createElement('span');
    text.style.cssText = 'flex:1;min-width:200px;max-width:560px;';

    var textNode = document.createTextNode('We use cookies for analytics to improve your experience. ');
    var privacyLink = document.createElement('a');
    privacyLink.href = '/privacy';
    privacyLink.textContent = 'Privacy Policy';
    privacyLink.style.cssText = 'color:#FFD166;text-decoration:underline;';
    text.appendChild(textNode);
    text.appendChild(privacyLink);

    var btnWrap = document.createElement('span');
    btnWrap.style.cssText = 'display:flex;gap:8px;flex-shrink:0;';

    var acceptBtn = document.createElement('button');
    acceptBtn.textContent = 'Accept';
    acceptBtn.style.cssText = 'background:#0D7377;color:#fff;border:none;padding:9px 22px;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;';

    var declineBtn = document.createElement('button');
    declineBtn.textContent = 'Decline';
    declineBtn.style.cssText = 'background:transparent;color:#fff;border:1.5px solid rgba(255,255,255,0.4);padding:9px 22px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;';

    btnWrap.appendChild(acceptBtn);
    btnWrap.appendChild(declineBtn);
    bar.appendChild(text);
    bar.appendChild(btnWrap);

    function hide() {
      bar.style.transition = 'transform 0.3s ease';
      bar.style.transform = 'translateY(100%)';
      setTimeout(function() { bar.remove(); }, 400);
    }

    acceptBtn.addEventListener('click', function() {
      localStorage.setItem(CONSENT_KEY, 'accepted');
      localStorage.setItem('stlucia_consent_ts', new Date().toISOString());
      window.dispatchEvent(new CustomEvent('stlucia:consent:accept'));
      hide();
    });

    declineBtn.addEventListener('click', function() {
      localStorage.setItem(CONSENT_KEY, 'declined');
      localStorage.setItem('stlucia_consent_ts', new Date().toISOString());
      hide();
    });

    document.body.appendChild(bar);
  }

  // --- GA4 Dynamic Injection ---
  function injectGA4() {
    if (window._ga4_loaded) return;
    window._ga4_loaded = true;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA4_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', GA4_ID);
  }

  // --- FB Pixel Dynamic Injection ---
  function injectFBPixel() {
    if (window._fb_loaded) return;
    window._fb_loaded = true;
    var n = window.fbq = function() {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!window._fbq) window._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = '2.0';
    n.queue = [];
    var t = document.createElement('script');
    t.async = true;
    t.src = 'https://connect.facebook.net/en_US/fbevents.js';
    var s = document.getElementsByTagName('script')[0];
    s.parentNode.insertBefore(t, s);
    window.fbq('init', FB_PIXEL_ID);
    window.fbq('track', 'PageView');
  }

  // --- Init Based on Consent State ---
  function loadTrackers() {
    injectGA4();
    injectFBPixel();
  }

  var consent = localStorage.getItem(CONSENT_KEY);
  if (consent === 'accepted') {
    loadTrackers();
  } else if (consent !== 'declined') {
    window.addEventListener('stlucia:consent:accept', loadTrackers);
  }
  // If declined: do nothing — Plausible still runs (it's cookieless)

  // Show banner if no decision yet
  if (document.body) {
    showBanner();
  } else {
    document.addEventListener('DOMContentLoaded', showBanner);
  }
})();
