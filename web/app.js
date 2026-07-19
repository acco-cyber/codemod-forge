/* ═══════════════════════════════════════════════════════════
   CodeMod Forge — Shared Application Logic
   Navigation, demo flow, animations, page transitions
   ═══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ─── Constants ─── */
  var GITHUB_URL = 'https://github.com/acco-cyber/codemod-forge';
  var PAGES = [
    { id: 'home',          file: 'index.html',         label: 'Home' },
    { id: 'import',        file: 'import.html',        label: 'Import' },
    { id: 'intelligence',  file: 'intelligence.html',  label: 'Intelligence' },
    { id: 'opportunities', file: 'opportunities.html', label: 'Opportunities' },
    { id: 'plan',          file: 'plan.html',          label: 'Plan' },
    { id: 'risk',          file: 'risk.html',          label: 'Risk Analysis' },
    { id: 'preview',       file: 'preview.html',       label: 'Preview' },
    { id: 'execute',       file: 'execute.html',       label: 'Execute' },
    { id: 'verify',        file: 'verify.html',        label: 'Verification' },
    { id: 'report',        file: 'report.html',        label: 'Report' },
    { id: 'download',      file: 'download.html',      label: 'Download' },
    { id: 'docs',          file: 'docs.html',          label: 'Docs' },
  ];

  /* ─── SVG Icons ─── */
  var ICONS = {
    github: '<svg viewBox="0 0 16 16"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>',
    menu: '<svg viewBox="0 0 24 24"><path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>',
    sun: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    moon: '<svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    check: '&#10003;',
    arrow: '&#8594;',
  };

  /* ─── Theme Management ─── */
  function getTheme() {
    return localStorage.getItem('cf-theme') || 'dark';
  }
  function setTheme(theme) {
    localStorage.setItem('cf-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    // Update toggle icon
    var btn = document.getElementById('theme-btn');
    if (btn) btn.innerHTML = theme === 'dark' ? ICONS.sun : ICONS.moon;
  }
  // Apply saved theme immediately
  setTheme(getTheme());

  /* ─── Detect current page from URL ─── */
  function getCurrentFile() {
    var pathname = window.location.pathname;
    var parts = pathname.split('/');
    var lastPart = parts[parts.length - 1] || '';
    if (!lastPart || lastPart === '' || lastPart === '/' ) return 'index.html';
    if (lastPart.indexOf('.') === -1) return lastPart + '.html';
    return lastPart;
  }

  var currentFile = getCurrentFile();

  /* ─── Inject Navigation ─── */
  function buildNav() {
    var nav = document.getElementById('main-nav');
    if (!nav) return;

    var workflowPages = PAGES.slice(1, 10);
    var isWorkflowPage = workflowPages.some(function (p) {
      return currentFile === p.file;
    });

    var linksHTML = '';
    if (isWorkflowPage) {
      workflowPages.forEach(function (p) {
        var active = currentFile === p.file ? ' active' : '';
        linksHTML += '<a class="nav-link' + active + '" href="' + p.file + '">' + p.label + '</a>';
      });
    } else {
      linksHTML += '<a class="nav-link' + (currentFile === 'index.html' ? ' active' : '') + '" href="index.html">Home</a>';
      linksHTML += '<a class="nav-link' + (currentFile === 'download.html' ? ' active' : '') + '" href="download.html">Download</a>';
      linksHTML += '<a class="nav-link' + (currentFile === 'docs.html' ? ' active' : '') + '" href="docs.html">Docs</a>';
    }

    var themeIcon = getTheme() === 'dark' ? ICONS.sun : ICONS.moon;

    nav.innerHTML =
      '<div class="container">' +
        '<a class="brand" href="index.html">' +
          '<img class="brand-logo" src="assets/logo.png" alt="CodeMod Forge" /> CodeMod Forge' +
        '</a>' +
        '<div class="nav-links" id="nav-links">' + linksHTML + '</div>' +
        '<div class="nav-actions">' +
          '<button class="theme-toggle" id="theme-btn" title="Toggle theme">' + themeIcon + '</button>' +
          '<a class="nav-gh" href="' + GITHUB_URL + '" target="_blank" rel="noopener">' +
            ICONS.github + ' GitHub' +
          '</a>' +
          '<a class="nav-cta" href="download.html">Download CLI</a>' +
        '</div>' +
        '<button class="nav-toggle" id="nav-toggle">' + ICONS.menu + '</button>' +
      '</div>';

    // Theme toggle
    document.getElementById('theme-btn').addEventListener('click', function () {
      setTheme(getTheme() === 'dark' ? 'light' : 'dark');
    });

    // Mobile toggle
    var toggle = document.getElementById('nav-toggle');
    var links = document.getElementById('nav-links');
    if (toggle && links) {
      toggle.addEventListener('click', function () {
        links.classList.toggle('open');
      });
    }
  }

  /* ─── Inject Footer ─── */
  function buildFooter() {
    var footer = document.getElementById('main-footer');
    if (!footer) return;

    footer.innerHTML =
      '<div class="container">' +
        '<div class="footer-inner">' +
          '<span><img class="brand-logo" src="assets/logo.png" alt="" style="width:20px;height:20px;display:inline-block;vertical-align:middle;margin-right:6px" />CodeMod Forge &middot; The Software Migration Engineer &middot; OpenAI Build Week 2026</span>' +
          '<div class="footer-links">' +
            '<a href="' + GITHUB_URL + '" target="_blank" rel="noopener">GitHub</a>' +
            '<a href="docs.html">Docs</a>' +
            '<a href="download.html">Download</a>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  /* ─── Inject Step Indicator ─── */
  function buildStepIndicator() {
    var el = document.getElementById('step-indicator');
    if (!el) return;

    var workflowPages = PAGES.slice(1, 10);
    var currentIndex = -1;
    workflowPages.forEach(function (p, i) {
      if (currentFile === p.file) currentIndex = i;
    });

    if (currentIndex === -1) return;

    var html = '';
    workflowPages.forEach(function (p, i) {
      if (i > 0) html += '<span class="sep">/</span>';
      if (i === currentIndex) {
        html += '<span class="current">' + p.label + '</span>';
      } else if (i < currentIndex) {
        html += '<a href="' + p.file + '" style="color:var(--green)">' + p.label + '</a>';
      } else {
        html += '<span>' + p.label + '</span>';
      }
    });

    el.innerHTML = html;
  }

  /* ─── Animated Counter ─── */
  window.animateCounter = function (el, start, end, duration, suffix) {
    if (!el) return;
    suffix = suffix || '';
    var startTime = performance.now();
    function tick(now) {
      var p = Math.min((now - startTime) / duration, 1);
      var ease = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(start + (end - start) * ease) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  };

  /* ─── Animate Progress Bar ─── */
  window.animateBar = function (el, target, delay) {
    if (!el) return;
    setTimeout(function () {
      el.style.width = target + '%';
    }, delay || 0);
  };

  /* ─── Stagger Animate Elements ─── */
  window.staggerAnimate = function (selector, baseDelay) {
    var els = document.querySelectorAll(selector);
    els.forEach(function (el, i) {
      el.style.animationDelay = (baseDelay + i * 0.08) + 's';
      el.classList.add('anim');
    });
  };

  /* ─── Typing Effect ─── */
  window.typeText = function (el, text, speed, callback) {
    if (!el) return;
    var i = 0;
    el.textContent = '';
    function type() {
      if (i < text.length) {
        el.textContent += text.charAt(i);
        i++;
        setTimeout(type, speed);
      } else if (callback) {
        callback();
      }
    }
    type();
  };

  /* ─── Sequential Reveal ─── */
  window.sequentialReveal = function (items, interval) {
    items.forEach(function (el, i) {
      setTimeout(function () {
        el.classList.add('show');
      }, i * interval);
    });
  };

  /* ─── Demo Flow Redirect ─── */
  window.startDemoFlow = function () {
    window.location.href = 'import.html?demo=1';
  };

  /* ─── Check Demo Mode ─── */
  window.isDemoMode = function () {
    return new URLSearchParams(window.location.search).get('demo') === '1';
  };

  /* ─── Navigate to next workflow page ─── */
  window.nextPage = function (pagePath) {
    var demo = window.isDemoMode() ? '?demo=1' : '';
    // Strip leading slash if present
    var clean = pagePath.replace(/^\//, '');
    window.location.href = clean + demo;
  };

  /* ─── Previous page ─── */
  window.prevPage = function (pagePath) {
    var demo = window.isDemoMode() ? '?demo=1' : '';
    var clean = pagePath.replace(/^\//, '');
    window.location.href = clean + demo;
  };

  /* ─── Copy to clipboard ─── */
  window.copyToClipboard = function (text, btn) {
    navigator.clipboard.writeText(text).then(function () {
      if (btn) {
        var orig = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(function () { btn.textContent = orig; }, 1500);
      }
    });
  };

  /* ─── Init ─── */
  document.addEventListener('DOMContentLoaded', function () {
    buildNav();
    buildFooter();
    buildStepIndicator();
  });

})();
