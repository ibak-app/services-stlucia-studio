/* ============================================================
   Saint Lucia Services Directory — app.js
   Vanilla JS, no dependencies, mobile-first.
   ============================================================ */

'use strict';

/* --- Global State ------------------------------------------ */
const APP = {
  services: [],
  categories: [],
  filteredServices: [],
  currentCategory: null,
  currentDistrict: '',
  currentSort: 'az',
  searchQuery: '',
};

const SUPABASE_URL = 'https://edybhgkuttsyoouizwcw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkeWJoZ2t1dHRzeW9vdWl6d2N3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMDI2MTQsImV4cCI6MjA4NjU3ODYxNH0.qaLYTfJQDz8Tp2WBqCLhKKaSs_lBSAvQ3W2h4v2L0xA';

/* --- Data Loading ------------------------------------------ */
async function loadServices() {
  if (APP.services.length > 0) return APP.services;
  try {
    const res = await fetch('/data/services.json');
    if (!res.ok) throw new Error('Failed to load services');
    APP.services = await res.json();
    return APP.services;
  } catch (err) {
    console.error('loadServices error:', err);
    return [];
  }
}

async function loadCategories() {
  if (APP.categories.length > 0) return APP.categories;
  try {
    const res = await fetch('/data/categories.json');
    if (!res.ok) throw new Error('Failed to load categories');
    APP.categories = await res.json();
    return APP.categories;
  } catch (err) {
    console.error('loadCategories error:', err);
    return [];
  }
}

/* --- Persona Data Loading ---------------------------------- */
async function loadPersonas() {
  try {
    var res = await fetch('/data/personas.json');
    if (!res.ok) throw new Error('Failed to load personas');
    return await res.json();
  } catch (err) {
    console.error('loadPersonas error:', err);
    return { personas: [], service_groups: [] };
  }
}

/* --- WhatsApp Link Builder --------------------------------- */
function buildWaLink(svc) {
  var phone = (typeof svc === 'string') ? svc : svc.whatsapp_number || svc.phone || '';
  var clean = phone.replace(/\D/g, '');

  if (typeof svc === 'object' && svc.name) {
    var name = svc.name;
    var cat = (svc.category && svc.category.name) ? svc.category.name.toLowerCase() : 'your services';
    var msg = 'Hi ' + name + '! I found your listing on services.stlucia.studio and I\'m interested in ' + cat + '.';
    if (svc.price_info) {
      msg += ' I saw your pricing (' + svc.price_info.split('.')[0] + '). Could you give me a quote?';
    } else {
      msg += ' Could you let me know your availability and pricing?';
    }
    msg += '\n\n— sent via services.stlucia.studio';
    return 'https://wa.me/' + clean + '?text=' + encodeURIComponent(msg);
  }

  return 'https://wa.me/' + clean + '?text=' + encodeURIComponent("Hi! I found your listing on services.stlucia.studio and I'd like to ask about your services and pricing.\n\n— sent via services.stlucia.studio");
}

/* --- WhatsApp Icon SVG ------------------------------------- */
function waIconSvg() {
  return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zm-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884zm8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" fill="currentColor"/></svg>`;
}

/* --- Render: Category Grid --------------------------------- */
function renderCategoryGrid(categories, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Top-level only (no parent) for the grid
  const topLevel = categories.filter(c => !c.parent);
  // Count services per top-level category (including sub-categories)
  const svcCounts = {};
  APP.services.forEach(s => {
    if (!s.category) return;
    const catSlug = s.category.slug;
    const cat = categories.find(c => c.slug === catSlug);
    if (!cat) return;
    const parentSlug = cat.parent || catSlug;
    svcCounts[parentSlug] = (svcCounts[parentSlug] || 0) + 1;
    if (cat.parent) svcCounts[catSlug] = (svcCounts[catSlug] || 0) + 1;
  });

  container.innerHTML = topLevel.map(cat => {
    const count = svcCounts[cat.slug] || 0;
    return `
      <a href="/browse?category=${cat.slug}"
         class="category-card"
         aria-label="${escapeHtml(cat.name)} — ${count} service${count !== 1 ? 's' : ''}">
        <div class="cat-icon" aria-hidden="true">${cat.icon}</div>
        <div class="cat-name">${escapeHtml(cat.name)}</div>
        ${count > 0 ? `<div class="cat-count">${count} service${count !== 1 ? 's' : ''}</div>` : ''}
      </a>
    `;
  }).join('');
}

/* --- Render: Service Cards --------------------------------- */
function renderServiceCards(services, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (services.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <h3>No services found</h3>
        <p>Try adjusting your filters or <a href="/search" class="text-teal">search for something specific</a>.</p>
        <a href="/" class="btn-outline">Browse all categories</a>
      </div>`;
    return;
  }

  container.innerHTML = services.map(svc => renderServiceCardHTML(svc)).join('');
}

function renderServiceCardHTML(svc) {
  const waLink = buildWaLink(svc);
  const verifiedBadge = svc.verified
    ? `<span class="badge badge-verified" title="Verified ${svc.verified_date || ''}">
         <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
         Verified
       </span>`
    : '';
  const featuredBadge = svc.featured ? `<span class="badge badge-featured">⭐ Featured</span>` : '';
  const priceInfo = svc.price_info
    ? `<div class="service-price">
         <span aria-hidden="true">💰</span>
         <span>${escapeHtml(svc.price_info)}</span>
       </div>`
    : '';

  return `
    <article class="service-card${svc.featured ? ' featured' : ''}" data-id="${svc.id}" data-category="${svc.category?.slug || ''}" data-district="${escapeHtml(svc.district)}">
      <div class="service-card-header">
        <div class="service-icon" aria-hidden="true">${svc.category?.icon || '🏢'}</div>
        <div class="service-meta">
          <div class="service-name">
            <a href="/listing?slug=${encodeURIComponent(svc.slug)}">${escapeHtml(svc.name)}</a>
          </div>
          <div class="service-badges">
            <span class="badge badge-category">${escapeHtml(svc.category?.name || '')}</span>
            <span class="badge badge-district">📍 ${escapeHtml(svc.district)}</span>
            ${verifiedBadge}
            ${featuredBadge}
          </div>
        </div>
      </div>
      <p class="service-description">${escapeHtml(svc.short_description || svc.description || '')}</p>
      ${priceInfo}
      <div class="service-card-actions">
        <a href="${waLink}" target="_blank" rel="noopener noreferrer"
           class="btn-whatsapp"
           onclick="trackWhatsAppClick('${svc.id}')"
           aria-label="Message ${escapeHtml(svc.name)} on WhatsApp">
          <span class="wa-icon">${waIconSvg()}</span>
          WhatsApp
        </a>
        <a href="tel:${escapeHtml(svc.phone || svc.whatsapp_number)}"
           class="btn-phone"
           aria-label="Call ${escapeHtml(svc.name)}">
          📞
        </a>
      </div>
    </article>`;
}

/* --- Render: Service Detail -------------------------------- */
function renderServiceDetail(svc, containerId) {
  const container = document.getElementById(containerId);
  if (!container || !svc) return;

  const waLink = buildWaLink(svc);
  const verifiedHTML = svc.verified
    ? `<span class="badge badge-verified" style="font-size:0.75rem;padding:4px 10px;">
         <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
         Verified ${svc.verified_date ? `— ${svc.verified_date}` : ''}
       </span>`
    : '';

  const areasServed = Array.isArray(svc.areas_served) ? svc.areas_served : [];
  const areasHTML = areasServed.length
    ? `<div class="listing-section-title">Areas Served</div>
       <div class="listing-areas">
         ${areasServed.map(a => `<span class="area-tag">📍 ${escapeHtml(a)}</span>`).join('')}
       </div>`
    : '';

  const externalLinks = [];
  if (svc.website) externalLinks.push(`<a href="https://${svc.website}" target="_blank" rel="noopener noreferrer" class="social-link">🌐 Website</a>`);
  if (svc.facebook) externalLinks.push(`<a href="https://${svc.facebook}" target="_blank" rel="noopener noreferrer" class="social-link">Facebook</a>`);
  if (svc.instagram) externalLinks.push(`<a href="https://${svc.instagram}" target="_blank" rel="noopener noreferrer" class="social-link">Instagram</a>`);

  container.innerHTML = `
    <div class="listing-detail-grid">
      <div class="listing-main">
        <div class="listing-hero">
          <div class="listing-icon" aria-hidden="true">${svc.category?.icon || '🏢'}</div>
          <div class="listing-title">
            <h1>${escapeHtml(svc.name)}</h1>
            <div class="service-badges" style="flex-wrap:wrap;gap:6px;display:flex;">
              <span class="badge badge-category">${escapeHtml(svc.category?.name || '')}</span>
              ${svc.featured ? '<span class="badge badge-featured">⭐ Featured</span>' : ''}
              ${verifiedHTML}
            </div>
          </div>
        </div>

        <div class="listing-info-grid">
          <div class="listing-info-item">
            <div class="info-label">District</div>
            <div class="info-value">📍 ${escapeHtml(svc.district)}</div>
          </div>
          ${svc.hours ? `<div class="listing-info-item">
            <div class="info-label">Hours</div>
            <div class="info-value">${escapeHtml(svc.hours)}</div>
          </div>` : ''}
          ${svc.price_info ? `<div class="listing-info-item">
            <div class="info-label">Pricing</div>
            <div class="info-value">${escapeHtml(svc.price_info)}</div>
          </div>` : ''}
          ${svc.phone ? `<div class="listing-info-item">
            <div class="info-label">Phone</div>
            <div class="info-value"><a href="tel:${escapeHtml(svc.phone)}">${escapeHtml(svc.phone)}</a></div>
          </div>` : ''}
        </div>

        <p class="listing-description">${escapeHtml(svc.description || '')}</p>

        ${areasHTML}

        <div id="similar-services"></div>
      </div>

      <aside class="listing-sidebar">
        <div class="cta-card">
          <p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:10px;text-align:center;">Connect via WhatsApp</p>
          <a href="${waLink}" target="_blank" rel="noopener noreferrer"
             class="btn-whatsapp"
             onclick="trackWhatsAppClick('${svc.id}')"
             aria-label="Message ${escapeHtml(svc.name)} on WhatsApp">
            <span class="wa-icon">${waIconSvg()}</span>
            Message on WhatsApp
          </a>
          ${svc.phone ? `
          <p class="cta-separator">or</p>
          <a href="tel:${escapeHtml(svc.phone)}" class="cta-phone" aria-label="Call ${escapeHtml(svc.name)}">
            📞 ${escapeHtml(svc.phone)}
          </a>` : ''}
          ${externalLinks.length ? `<div class="social-links">${externalLinks.join('')}</div>` : ''}
          <a class="report-link" href="/report?service=${encodeURIComponent(svc.id)}" aria-label="Report incorrect information">
            Report incorrect info
          </a>
        </div>
      </aside>
    </div>`;
}

/* --- Filter Services --------------------------------------- */
function filterServices(category, district, query, sort) {
  let results = [...APP.services];

  if (category) {
    // Include sub-categories
    const catData = APP.categories.find(c => c.slug === category);
    const isParent = catData && !catData.parent;
    if (isParent) {
      const childSlugs = APP.categories
        .filter(c => c.parent === category)
        .map(c => c.slug);
      childSlugs.push(category);
      results = results.filter(s => childSlugs.includes(s.category?.slug));
    } else {
      results = results.filter(s => s.category?.slug === category);
    }
  }

  if (district && district !== 'all') {
    results = results.filter(s => s.district === district);
  }

  if (query && query.trim().length > 0) {
    const q = query.toLowerCase().trim();
    results = results.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.description || '').toLowerCase().includes(q) ||
      (s.short_description || '').toLowerCase().includes(q) ||
      (s.category?.name || '').toLowerCase().includes(q) ||
      (s.district || '').toLowerCase().includes(q) ||
      (s.areas_served || []).some(a => a.toLowerCase().includes(q))
    );
  }

  // Sort: featured first, then by sort param
  results.sort((a, b) => {
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    if (sort === 'az') return a.name.localeCompare(b.name);
    if (sort === 'za') return b.name.localeCompare(a.name);
    if (sort === 'popular') return (b.view_count || 0) - (a.view_count || 0);
    return 0;
  });

  APP.filteredServices = results;
  return results;
}

/* --- Handle Search ----------------------------------------- */
function handleSearch(query) {
  APP.searchQuery = query;
  const results = filterServices(
    APP.currentCategory,
    APP.currentDistrict,
    query,
    APP.currentSort
  );
  return results;
}

/* --- Analytics: Custom Event Helpers ---------------------- */

/**
 * Fire a custom event to Plausible and GA4.
 * @param {string} eventName  - snake_case event name
 * @param {Object} [props]    - optional key/value props (strings)
 */
function trackEvent(eventName, props) {
  // Plausible
  try {
    if (typeof window.plausible === 'function') {
      window.plausible(eventName, { props: props || {} });
    }
  } catch (_) {}

  // GA4
  try {
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, props || {});
    }
  } catch (_) {}
}

/* --- Analytics: Track WhatsApp Click ---------------------- */
function trackWhatsAppClick(serviceId) {
  // Resolve service metadata for richer event props
  const svc = APP.services.find(s => s.id === serviceId);
  const props = {
    service_id: serviceId,
    service_name: svc ? svc.name : '',
    category: svc && svc.category ? svc.category.slug : '',
    district: svc ? svc.district : '',
  };

  // Plausible + GA4
  trackEvent('service_whatsapp_click', props);

  // Supabase increment (fire-and-forget)
  try {
    fetch(`${SUPABASE_URL}/rest/v1/rpc/increment_service_click`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ p_service_id: serviceId }),
    }).catch(() => {}); // silently fail if function doesn't exist yet
  } catch (_) {}
}

/* --- Utils ------------------------------------------------- */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function getParam(name) {
  return new URLSearchParams(window.location.search).get(name) || '';
}

function showToast(message, type = '') {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = `toast${type ? ' ' + type : ''}`;
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => toast.classList.remove('show'), 3200);
}

function updateResultsCount(count, total) {
  const el = document.getElementById('results-count');
  if (el) el.textContent = `${count} of ${total} services`;
}

function renderSkeletonCards(count, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = Array(count).fill(0).map(() => `
    <div class="skeleton-card">
      <div class="service-card-header" style="gap:12px;display:flex;">
        <div class="skeleton" style="width:48px;height:48px;border-radius:10px;flex-shrink:0;"></div>
        <div style="flex:1;">
          <div class="skeleton" style="height:14px;width:60%;margin-bottom:8px;"></div>
          <div class="skeleton" style="height:10px;width:40%;"></div>
        </div>
      </div>
      <div class="skeleton" style="height:10px;width:100%;margin-top:12px;"></div>
      <div class="skeleton" style="height:10px;width:80%;margin-top:6px;"></div>
      <div class="skeleton" style="height:40px;width:100%;margin-top:14px;border-radius:8px;"></div>
    </div>`).join('');
}

/* --- Mobile Nav Toggle ------------------------------------- */
function initMobileNav() {
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobile-menu');
  if (!hamburger || !mobileMenu) return;

  hamburger.addEventListener('click', () => {
    const isOpen = mobileMenu.classList.contains('open');
    mobileMenu.classList.toggle('open');
    hamburger.setAttribute('aria-expanded', String(!isOpen));
    hamburger.setAttribute('aria-label', isOpen ? 'Open menu' : 'Close menu');
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!hamburger.contains(e.target) && !mobileMenu.contains(e.target)) {
      mobileMenu.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    }
  });
}

/* --- FAQ Accordion ----------------------------------------- */
function initFAQ() {
  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const answer = btn.nextElementSibling;
      const isOpen = answer.classList.contains('open');
      // Close all
      document.querySelectorAll('.faq-answer').forEach(a => a.classList.remove('open'));
      document.querySelectorAll('.faq-question').forEach(b => b.setAttribute('aria-expanded', 'false'));
      // Open this one
      if (!isOpen) {
        answer.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });
}

/* --- Register Service Worker ------------------------------ */
function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
}

/* --- Page Router ------------------------------------------- */
async function initPage() {
  registerSW();
  initMobileNav();

  const path = window.location.pathname.replace(/\/$/, '') || '/';

  if (path === '' || path === '/' || path === '/index') {
    await initPersonaSelector();
  } else if (path.indexOf('/for/') === 0) {
    await initFeedPage();
  } else if (path === '/browse') {
    await initBrowsePage();
  } else if (path === '/listing') {
    await initListingPage();
  } else if (path === '/search') {
    await initSearchPage();
  } else if (path === '/report') {
    initReportPage();
  } else if (path === '/about') {
    initFAQ();
  }
}

/* --- Persona Selector (Index / Homepage) ------------------- */
async function initPersonaSelector() {
  var grid = document.getElementById('persona-grid');
  if (!grid) return;

  var data = await loadPersonas();
  if (!data.personas || !data.personas.length) return;

  var cards = '';
  for (var i = 0; i < data.personas.length; i++) {
    var p = data.personas[i];
    cards += '<a href="/for/' + p.id + '.html" class="persona-card" data-persona="' + p.id + '">';
    cards += '<div class="persona-card-icon">' + p.icon + '</div>';
    cards += '<div class="persona-card-label">' + escapeHtml(p.label) + '</div>';
    cards += '<div class="persona-card-desc">' + escapeHtml(p.short) + '</div>';
    cards += '<div class="persona-card-arrow">Browse \u2192</div>';
    cards += '</a>';
  }
  grid.textContent = '';
  grid.insertAdjacentHTML('beforeend', cards);

  // Update stats
  var services = await loadServices();
  var statsEl = document.getElementById('persona-stats');
  if (statsEl) statsEl.textContent = services.length + ' services across ' + data.personas.length + ' categories';

  // Track persona clicks
  grid.addEventListener('click', function(e) {
    var card = e.target.closest('.persona-card');
    if (card) trackEvent('persona_selected', { persona: card.dataset.persona });
  });
}

/* --- Feed Page (Per-Persona) ------------------------------- */
async function initFeedPage() {
  var personaId = window.PERSONA_ID;
  if (!personaId) return;

  var root = document.getElementById('feed-root');
  if (!root) return;

  root.textContent = '';
  var loadingDiv = document.createElement('div');
  loadingDiv.style.cssText = 'padding:60px 16px;text-align:center;color:var(--text-muted);';
  loadingDiv.textContent = 'Loading services\u2026';
  root.appendChild(loadingDiv);

  var results = await Promise.all([loadPersonas(), loadServices(), loadCategories()]);
  var personaData = results[0];
  var services = results[1];
  var categories = results[2];

  var persona = null;
  for (var i = 0; i < personaData.personas.length; i++) {
    if (personaData.personas[i].id === personaId) { persona = personaData.personas[i]; break; }
  }
  if (!persona) {
    root.textContent = '';
    var errDiv = document.createElement('div');
    errDiv.className = 'container';
    errDiv.style.cssText = 'padding:60px 16px;text-align:center;';
    errDiv.textContent = 'Page not found.';
    var backLink = document.createElement('a');
    backLink.href = '/';
    backLink.className = 'btn-outline';
    backLink.textContent = '\u2190 Back to home';
    backLink.style.marginTop = '16px';
    backLink.style.display = 'inline-block';
    errDiv.appendChild(backLink);
    root.appendChild(errDiv);
    return;
  }

  // Build category lookups
  var parentCats = categories.filter(function(c) { return !c.parent; });
  var childCats = categories.filter(function(c) { return c.parent; });
  var parentBySlug = {};
  parentCats.forEach(function(p) { parentBySlug[p.slug] = p; });
  var childBySlug = {};
  childCats.forEach(function(c) { childBySlug[c.slug] = c; });
  var subcatToParent = {};
  childCats.forEach(function(c) { subcatToParent[c.slug] = c.parent; });

  // Filter services by persona's priority subcats
  var prioritySet = {};
  (persona.priority_subcats || []).forEach(function(s) { prioritySet[s] = true; });
  var allPersonaServices = services.filter(function(s) {
    return s.category && prioritySet[s.category.slug];
  });

  // Unique districts
  var districtMap = {};
  allPersonaServices.forEach(function(s) { if (s.district) districtMap[s.district] = true; });
  var districts = Object.keys(districtMap).sort();

  // Saved district preference
  var savedDistrict = '';
  try { savedDistrict = sessionStorage.getItem('slu_district') || ''; } catch(e) {}

  // Service group icon lookup
  var sgLookup = {};
  (personaData.service_groups || []).forEach(function(sg) { sgLookup[sg.id] = sg; });

  // Render
  renderFeedPage(root, persona, allPersonaServices, parentBySlug, childBySlug, subcatToParent, districts, savedDistrict, sgLookup);

  trackEvent('persona_feed_view', { persona: personaId });
}

function renderFeedPage(root, persona, allServices, parentBySlug, childBySlug, subcatToParent, districts, selectedDistrict, sgLookup) {
  var services = selectedDistrict
    ? allServices.filter(function(s) { return s.district === selectedDistrict; })
    : allServices;

  // Group by parent category
  var groups = {};
  services.forEach(function(s) {
    var subcatSlug = s.category ? s.category.slug : '';
    if (!subcatSlug) return;
    var parentSlug = subcatToParent[subcatSlug] || subcatSlug;
    var parent = parentBySlug[parentSlug];
    var groupName = parent ? parent.name : 'Other';
    if (!groups[groupName]) groups[groupName] = {};
    if (!groups[groupName][subcatSlug]) groups[groupName][subcatSlug] = [];
    groups[groupName][subcatSlug].push(s);
  });

  // Order by persona's priority_groups
  var ordered = [];
  (persona.priority_groups || []).forEach(function(gName) {
    if (groups[gName]) { ordered.push({ name: gName, subcats: groups[gName] }); delete groups[gName]; }
  });
  Object.keys(groups).forEach(function(gName) {
    ordered.push({ name: gName, subcats: groups[gName] });
  });

  // Build DOM using document fragments for safety
  root.textContent = '';
  var frag = document.createDocumentFragment();

  // Hero section
  var heroSec = document.createElement('section');
  heroSec.className = 'feed-hero';
  var heroInner = document.createElement('div');
  heroInner.className = 'feed-hero-inner';

  var heroTop = document.createElement('div');
  heroTop.className = 'feed-hero-top';
  var iconSpan = document.createElement('span');
  iconSpan.className = 'feed-hero-icon';
  iconSpan.textContent = persona.icon;
  var h1 = document.createElement('h1');
  h1.textContent = 'Services for ' + persona.label;
  heroTop.appendChild(iconSpan);
  heroTop.appendChild(h1);
  heroInner.appendChild(heroTop);

  var summaryP = document.createElement('p');
  summaryP.className = 'feed-hero-summary';
  summaryP.textContent = persona.hero_summary;
  heroInner.appendChild(summaryP);

  if (persona.tips && persona.tips.length) {
    var tipsDiv = document.createElement('div');
    tipsDiv.className = 'feed-tips';
    var tipsTitle = document.createElement('div');
    tipsTitle.className = 'feed-tips-title';
    tipsTitle.textContent = 'Tips for you';
    tipsDiv.appendChild(tipsTitle);
    var tipsList = document.createElement('ul');
    persona.tips.forEach(function(t) {
      var li = document.createElement('li');
      li.textContent = t;
      tipsList.appendChild(li);
    });
    tipsDiv.appendChild(tipsList);
    heroInner.appendChild(tipsDiv);
  }
  heroSec.appendChild(heroInner);
  frag.appendChild(heroSec);

  // Location bar
  var locBar = document.createElement('div');
  locBar.className = 'location-bar';
  locBar.id = 'location-bar';

  var locLeft = document.createElement('div');
  locLeft.className = 'location-bar-left';
  var locLabel = document.createElement('span');
  locLabel.className = 'location-bar-label';
  locLabel.textContent = '\ud83d\udccd Filter:';
  var distSelect = document.createElement('select');
  distSelect.id = 'district-select';
  distSelect.setAttribute('aria-label', 'Filter by district');
  var allOpt = document.createElement('option');
  allOpt.value = '';
  allOpt.textContent = 'All Districts';
  distSelect.appendChild(allOpt);
  districts.forEach(function(d) {
    var opt = document.createElement('option');
    opt.value = d;
    opt.textContent = d;
    if (d === selectedDistrict) opt.selected = true;
    distSelect.appendChild(opt);
  });
  locLeft.appendChild(locLabel);
  locLeft.appendChild(distSelect);
  locBar.appendChild(locLeft);

  var locCount = document.createElement('div');
  locCount.className = 'location-bar-count';
  locCount.id = 'feed-count';
  var countStrong = document.createElement('strong');
  countStrong.textContent = services.length;
  locCount.appendChild(document.createTextNode('Showing '));
  locCount.appendChild(countStrong);
  locCount.appendChild(document.createTextNode(' of ' + allServices.length + ' services'));
  locBar.appendChild(locCount);
  frag.appendChild(locBar);

  // Accordion list
  var accList = document.createElement('div');
  accList.className = 'acc-list';

  ordered.forEach(function(group) {
    var sg = sgLookup[group.name] || {};
    var groupIcon = sg.icon || '\ud83d\udcc1';
    var subcatKeys = Object.keys(group.subcats);
    var totalCount = subcatKeys.reduce(function(sum, k) { return sum + group.subcats[k].length; }, 0);
    if (totalCount === 0) return;

    var accGroup = document.createElement('div');
    accGroup.className = 'acc-group';
    accGroup.dataset.group = group.name;

    var trigger = document.createElement('button');
    trigger.className = 'acc-trigger';
    trigger.setAttribute('aria-expanded', 'false');
    trigger.onclick = function() { toggleAccGroup(trigger); };

    var tIcon = document.createElement('span');
    tIcon.className = 'acc-trigger-icon';
    tIcon.textContent = groupIcon;
    var tLabel = document.createElement('span');
    tLabel.className = 'acc-trigger-label';
    tLabel.textContent = group.name;
    var tCount = document.createElement('span');
    tCount.className = 'acc-trigger-count';
    tCount.textContent = '(' + totalCount + ')';
    var tChev = document.createElement('span');
    tChev.className = 'acc-trigger-chevron';
    tChev.textContent = '\u25bc';
    trigger.appendChild(tIcon);
    trigger.appendChild(tLabel);
    trigger.appendChild(tCount);
    trigger.appendChild(tChev);
    accGroup.appendChild(trigger);

    var panel = document.createElement('div');
    panel.className = 'acc-panel';
    var panelInner = document.createElement('div');
    panelInner.className = 'acc-panel-inner';

    subcatKeys.forEach(function(subcatSlug) {
      var svcs = group.subcats[subcatSlug];
      var subcat = childBySlug[subcatSlug];
      var subcatName = subcat ? subcat.name : subcatSlug;
      var subcatIcon = subcat ? (subcat.icon || '') : '';

      svcs.sort(function(a, b) { return a.name.localeCompare(b.name); });

      var subcatDiv = document.createElement('div');
      subcatDiv.className = 'acc-subcat';

      var subcatLabel = document.createElement('div');
      subcatLabel.className = 'acc-subcat-label';
      subcatLabel.textContent = subcatIcon + ' ' + subcatName + ' (' + svcs.length + ')';
      subcatDiv.appendChild(subcatLabel);

      var provList = document.createElement('div');
      provList.className = 'provider-list';
      svcs.forEach(function(svc) {
        var row = document.createElement('div');
        row.className = 'provider-row';

        var info = document.createElement('div');
        info.className = 'provider-info';
        var nameDiv = document.createElement('div');
        nameDiv.className = 'provider-name';
        nameDiv.textContent = svc.name;
        var metaDiv = document.createElement('div');
        metaDiv.className = 'provider-meta';
        var metaText = '\ud83d\udccd ' + (svc.district || '');
        if (svc.short_description) metaText += ' \u00b7 ' + svc.short_description.substring(0, 80);
        metaDiv.textContent = metaText;
        info.appendChild(nameDiv);
        info.appendChild(metaDiv);
        row.appendChild(info);

        if (svc.whatsapp_number || svc.phone) {
          var waBtn = document.createElement('a');
          waBtn.href = buildWaLink(svc);
          waBtn.target = '_blank';
          waBtn.rel = 'noopener noreferrer';
          waBtn.className = 'btn-wa-sm';
          waBtn.setAttribute('aria-label', 'WhatsApp ' + svc.name);
          waBtn.onclick = function() { trackWhatsAppClick(svc.id); };
          var waIcon = document.createElement('span');
          waIcon.className = 'wa-icon';
          waIcon.style.cssText = 'width:14px;height:14px;display:inline-flex;';
          waIcon.insertAdjacentHTML('beforeend', waIconSvg());
          waBtn.appendChild(waIcon);
          waBtn.appendChild(document.createTextNode(' WA'));
          row.appendChild(waBtn);
        }
        provList.appendChild(row);
      });
      subcatDiv.appendChild(provList);
      panelInner.appendChild(subcatDiv);
    });

    panel.appendChild(panelInner);
    accGroup.appendChild(panel);
    accList.appendChild(accGroup);
  });

  frag.appendChild(accList);

  // Back section
  var backSec = document.createElement('div');
  backSec.className = 'back-section';
  var backP = document.createElement('p');
  backP.textContent = 'Not what you\u2019re looking for?';
  var backA = document.createElement('a');
  backA.href = '/';
  backA.textContent = '\u2190 Choose a different role';
  backSec.appendChild(backP);
  backSec.appendChild(backA);
  frag.appendChild(backSec);

  root.appendChild(frag);

  // Wire district filter
  var selectEl = document.getElementById('district-select');
  if (selectEl) {
    selectEl.addEventListener('change', function() {
      var val = selectEl.value;
      try { sessionStorage.setItem('slu_district', val); } catch(e) {}
      trackEvent('district_filtered', { persona: persona.id, district: val || 'all' });
      renderFeedPage(root, persona, allServices, parentBySlug, childBySlug, subcatToParent, districts, val, sgLookup);
    });
  }
}

/* --- Accordion Toggle ------------------------------------- */
function toggleAccGroup(btn) {
  var group = btn.closest('.acc-group');
  var isOpen = group.classList.contains('open');
  group.classList.toggle('open');
  btn.setAttribute('aria-expanded', String(!isOpen));
  if (!isOpen) {
    trackEvent('accordion_expanded', { group: group.dataset.group, persona: window.PERSONA_ID || '' });
  }
}

/* --- Browse Page ------------------------------------------- */
async function initBrowsePage() {
  const categorySlug = getParam('category');
  const districtParam = getParam('district');

  renderSkeletonCards(6, 'service-list');

  const [services, categories] = await Promise.all([loadServices(), loadCategories()]);

  APP.currentCategory = categorySlug || null;
  APP.currentDistrict = districtParam || '';

  // Set page title and header
  if (categorySlug) {
    const cat = categories.find(c => c.slug === categorySlug);
    if (cat) {
      const pageTitle = document.getElementById('page-title');
      const catHeaderIcon = document.getElementById('cat-header-icon');
      const catHeaderName = document.getElementById('cat-header-name');
      const catHeaderDesc = document.getElementById('cat-header-desc');

      if (pageTitle) pageTitle.textContent = `${cat.name} — Saint Lucia Services`;
      if (catHeaderIcon) catHeaderIcon.textContent = cat.icon;
      if (catHeaderName) catHeaderName.textContent = cat.name;
      if (catHeaderDesc) catHeaderDesc.textContent = cat.description || '';

      document.title = `${cat.name} Services in Saint Lucia | SLU Services Directory`;

      // Track category browse
      trackEvent('service_category_browse', {
        category: cat.slug,
        category_name: cat.name,
        district: districtParam || '',
      });
    }
  } else {
    document.title = 'Browse All Services | Saint Lucia Services Directory';
    const catHeaderName = document.getElementById('cat-header-name');
    if (catHeaderName) catHeaderName.textContent = 'All Services';

    // Track all-services browse
    trackEvent('service_category_browse', {
      category: 'all',
      category_name: 'All Services',
      district: districtParam || '',
    });
  }

  // Populate district filter
  const districtSelect = document.getElementById('district-filter');
  const districts = ['Castries', 'Gros Islet', 'Soufriere', 'Vieux Fort', 'Dennery', 'Micoud', 'Laborie', 'Choiseul', 'Canaries', 'Anse la Raye'];
  if (districtSelect) {
    districts.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d;
      opt.textContent = d;
      if (d === districtParam) opt.selected = true;
      districtSelect.appendChild(opt);
    });

    districtSelect.addEventListener('change', () => {
      APP.currentDistrict = districtSelect.value;
      applyBrowseFilters();
    });
  }

  // Sort filter
  const sortSelect = document.getElementById('sort-filter');
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      APP.currentSort = sortSelect.value;
      applyBrowseFilters();
    });
  }

  applyBrowseFilters();

  function applyBrowseFilters() {
    const results = filterServices(APP.currentCategory, APP.currentDistrict, APP.searchQuery, APP.currentSort);
    renderServiceCards(results, 'service-list');
    updateResultsCount(results.length, services.length);
  }
}

/* --- Listing Detail Page ----------------------------------- */
async function initListingPage() {
  const slug = getParam('slug');
  const id = getParam('id');

  const [services, categories] = await Promise.all([loadServices(), loadCategories()]);

  let svc = null;
  if (slug) svc = services.find(s => s.slug === slug);
  if (!svc && id) svc = services.find(s => s.id === id);

  if (!svc) {
    const container = document.getElementById('listing-content');
    if (container) {
      container.innerHTML = `
        <div class="error-page" style="min-height:50vh;">
          <div class="error-page-inner">
            <div class="error-icon">🔍</div>
            <h1>Listing Not Found</h1>
            <p>This service may have been removed or the link may be incorrect.</p>
            <a href="/" class="btn-primary">Browse Services</a>
          </div>
        </div>`;
    }
    return;
  }

  // Update page meta
  document.title = `${svc.name} — ${svc.district}, Saint Lucia | SLU Services`;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.content = svc.short_description || svc.description?.slice(0, 155) || '';

  // Breadcrumb
  const breadcrumb = document.getElementById('breadcrumb');
  if (breadcrumb && svc.category) {
    breadcrumb.innerHTML = `
      <a href="/">Home</a>
      <span class="sep" aria-hidden="true">›</span>
      <a href="/browse?category=${svc.category.slug}">${escapeHtml(svc.category.name)}</a>
      <span class="sep" aria-hidden="true">›</span>
      <span aria-current="page">${escapeHtml(svc.name)}</span>`;
  }

  // JSON-LD Schema
  const schema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": svc.name,
    "description": svc.description || svc.short_description,
    "address": {
      "@type": "PostalAddress",
      "addressLocality": svc.district,
      "addressCountry": "LC"
    },
    "telephone": svc.phone || svc.whatsapp_number,
    "url": `https://services.stlucia.studio/listing?slug=${svc.slug}`
  };
  const schemaEl = document.getElementById('schema-ld');
  if (schemaEl) schemaEl.textContent = JSON.stringify(schema);

  // Track service view
  trackEvent('service_view', {
    service_id: svc.id,
    service_name: svc.name,
    category: svc.category ? svc.category.slug : '',
    district: svc.district || '',
  });

  // Render detail
  renderServiceDetail(svc, 'listing-content');

  // Similar services
  const similarResults = services
    .filter(s => s.category?.slug === svc.category?.slug && s.id !== svc.id)
    .slice(0, 3);

  const similarContainer = document.getElementById('similar-services');
  if (similarContainer && similarResults.length > 0) {
    similarContainer.innerHTML = `
      <div class="similar-section">
        <h2>Similar Services in ${escapeHtml(svc.category?.name || '')}</h2>
        <div class="service-grid" id="similar-grid"></div>
      </div>`;
    renderServiceCards(similarResults, 'similar-grid');
  }
}

/* --- Search Page ------------------------------------------- */
async function initSearchPage() {
  const queryParam = getParam('q');

  const [services, categories] = await Promise.all([loadServices(), loadCategories()]);

  const searchInput = document.getElementById('search-input');
  if (searchInput && queryParam) {
    searchInput.value = queryParam;
  }

  // Debounce helper for search tracking (avoid firing on every keystroke)
  let _searchTrackTimer = null;

  function doSearch(q) {
    const results = handleSearch(q);
    renderServiceCards(results, 'search-results');

    const header = document.getElementById('search-results-header');
    if (header) {
      if (q.trim()) {
        header.innerHTML = `Found <strong>${results.length}</strong> result${results.length !== 1 ? 's' : ''} for "<strong>${escapeHtml(q)}</strong>"`;
      } else {
        header.innerHTML = `Showing all <strong>${results.length}</strong> services`;
      }
    }

    document.title = q
      ? `"${q}" — Saint Lucia Services Search`
      : 'Search Services — Saint Lucia Directory';

    // Track search events, debounced to 600ms to avoid per-keystroke noise
    if (q.trim()) {
      clearTimeout(_searchTrackTimer);
      _searchTrackTimer = setTimeout(() => {
        trackEvent('service_search', {
          query: q.trim(),
          result_count: String(results.length),
        });
      }, 600);
    }
  }

  if (queryParam) {
    doSearch(queryParam);
  } else {
    doSearch('');
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      doSearch(searchInput.value);
      // Update URL param without reload
      const url = new URL(window.location.href);
      if (searchInput.value.trim()) {
        url.searchParams.set('q', searchInput.value.trim());
      } else {
        url.searchParams.delete('q');
      }
      window.history.replaceState({}, '', url.toString());
    });

    searchInput.focus();
  }
}

/* --- Report Page ------------------------------------------- */
function initReportPage() {
  const serviceId = getParam('service');
  const form = document.getElementById('report-form');
  if (!form) return;

  if (serviceId) {
    const hiddenInput = document.getElementById('report-service-id');
    if (hiddenInput) hiddenInput.value = serviceId;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('.form-submit');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Sending...';
    }

    const reportType = document.getElementById('report-type')?.value || '';
    const reportDesc = document.getElementById('report-description')?.value || '';
    const reportEmail = document.getElementById('report-email')?.value || '';

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/services_reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          service_id: serviceId || null,
          report_type: reportType,
          description: reportDesc,
          reporter_email: reportEmail || null,
          created_at: new Date().toISOString(),
        }),
      });

      // Track report submission
      trackEvent('service_report', {
        service_id: serviceId || '',
        report_type: reportType,
      });

      // Show success regardless (RLS may restrict, treat all as success for UX)
      form.style.display = 'none';
      const successMsg = document.getElementById('report-success');
      if (successMsg) successMsg.style.display = 'block';
    } catch (err) {
      // Track even on network error (form was submitted)
      trackEvent('service_report', {
        service_id: serviceId || '',
        report_type: reportType,
      });

      // Still show success to user
      form.style.display = 'none';
      const successMsg = document.getElementById('report-success');
      if (successMsg) successMsg.style.display = 'block';
    }
  });
}

/* --- Boot -------------------------------------------------- */
document.addEventListener('DOMContentLoaded', initPage);
