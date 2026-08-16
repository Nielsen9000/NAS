/* =============================================================
   Shared mobile navigation.

   Builds the hamburger button and the full-screen menu from the
   <nav class="nav"> that is already in every page's header, so the link
   list, its order and its active state have exactly ONE source per page.
   Previously only the home page had a mobile menu — the other nine pages
   hid .nav at 900px with nothing to replace it, leaving a phone visitor
   with no navigation at all.

   Reading the existing nav rather than duplicating markup means adding or
   renaming a link is still a one-line edit in that page's header.

   Paired with /assets/mobile-nav.css. Load both with `defer`.
   ============================================================= */
(function () {
  'use strict';

  var header = document.querySelector('.site-header');
  var nav = header && header.querySelector('nav.nav');
  var inner = header && header.querySelector('.header-inner');
  if (!header || !nav || !inner) return;
  if (document.getElementById('mobile-menu')) return;   // already built

  var here = location.pathname.replace(/\/+$/, '') || '/';

  function isCurrent(href) {
    if (!href) return false;
    var path;
    try { path = new URL(href, location.origin).pathname.replace(/\/+$/, '') || '/'; }
    catch (e) { return false; }
    return path === here;
  }

  // ---- build the link list from the desktop nav ----------------------
  var menuNav = document.createElement('nav');
  menuNav.className = 'mobile-nav';
  menuNav.setAttribute('aria-label', 'Mobile navigation');

  function makeLink(href, text, cls) {
    var a = document.createElement('a');
    a.href = href;
    a.textContent = text;
    if (cls) a.className = cls;
    if (isCurrent(href)) {
      a.classList.add('is-current');
      a.setAttribute('aria-current', 'page');
    }
    return a;
  }

  Array.prototype.forEach.call(nav.children, function (node) {
    // a plain top-level link
    if (node.tagName === 'A') {
      menuNav.appendChild(makeLink(node.getAttribute('href'), node.textContent.trim()));
      return;
    }
    // a dropdown becomes a labelled group
    var trigger = node.querySelector('.nav-dd-trigger');
    var items = node.querySelectorAll('.nav-dd-menu a');
    if (!trigger || !items.length) return;

    var group = document.createElement('div');
    group.className = 'mobile-nav-group';
    var label = document.createElement('span');
    label.className = 'mobile-nav-label';
    // the trigger holds a caret <span> too — take only its text nodes
    label.textContent = Array.prototype.filter
      .call(trigger.childNodes, function (n) { return n.nodeType === 3; })
      .map(function (n) { return n.textContent; })
      .join('').trim();
    group.appendChild(label);

    Array.prototype.forEach.call(items, function (item) {
      var name = item.querySelector('.nav-dd-label');
      group.appendChild(makeLink(item.getAttribute('href'),
        (name ? name.textContent : item.textContent).trim()));
    });
    menuNav.appendChild(group);
  });

  // ---- the header CTA, repeated at the foot of the menu ---------------
  var cta = header.querySelector('.header-cta a');
  if (cta) {
    var c = makeLink(cta.getAttribute('href'), cta.textContent.trim(), 'mobile-cta');
    c.classList.remove('is-current');       // it is a button here, not a nav item
    c.removeAttribute('aria-current');
    menuNav.appendChild(c);
  }

  // ---- overlay + toggle ----------------------------------------------
  var menu = document.createElement('div');
  menu.className = 'mobile-menu';
  menu.id = 'mobile-menu';
  menu.setAttribute('aria-hidden', 'true');
  menu.appendChild(menuNav);
  document.body.appendChild(menu);

  var toggle = document.createElement('button');
  toggle.className = 'nav-toggle';
  toggle.id = 'nav-toggle';
  toggle.type = 'button';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', 'mobile-menu');
  toggle.setAttribute('aria-label', 'Open menu');
  toggle.innerHTML = '<span class="nav-toggle-line"></span>' +
                     '<span class="nav-toggle-line"></span>' +
                     '<span class="nav-toggle-line"></span>';
  inner.appendChild(toggle);

  // ---- behaviour ------------------------------------------------------
  var isOpen = false;
  var scrollY = 0;

  function setOpen(open) {
    if (open === isOpen) return;
    isOpen = open;
    toggle.classList.toggle('is-open', open);
    menu.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.setAttribute('aria-hidden', open ? 'false' : 'true');
    document.body.classList.toggle('has-menu-open', open);

    // Lock the page behind the overlay. position:fixed rather than
    // overflow:hidden — iOS Safari ignores overflow:hidden on body and
    // scrolls the page under the menu anyway.
    if (open) {
      scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = -scrollY + 'px';
      document.body.style.width = '100%';
    } else {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, scrollY);
    }
  }

  toggle.addEventListener('click', function () { setOpen(!isOpen); });

  // any link closes it (same-page anchors would otherwise leave it up)
  menu.addEventListener('click', function (e) {
    if (e.target.closest('a')) setOpen(false);
    else if (e.target === menu) setOpen(false);   // tap the backdrop
  });

  document.addEventListener('keydown', function (e) {
    if (!isOpen) return;
    if (e.key === 'Escape') { setOpen(false); toggle.focus(); return; }
    if (e.key !== 'Tab') return;
    // keep focus inside the overlay while it is up
    var focusable = [toggle].concat(Array.prototype.slice.call(menu.querySelectorAll('a')));
    var i = focusable.indexOf(document.activeElement);
    if (e.shiftKey && i <= 0) { e.preventDefault(); focusable[focusable.length - 1].focus(); }
    else if (!e.shiftKey && i === focusable.length - 1) { e.preventDefault(); focusable[0].focus(); }
  });

  // Rotating to landscape can cross the 900px breakpoint and hide the
  // toggle while the menu is still up — that would strand the page in its
  // scroll-locked state with no way to close.
  window.addEventListener('resize', function () {
    if (isOpen && window.innerWidth > 900) setOpen(false);
  });
})();
