/* EMRC UI behaviour for the design system (css/emrc-ds.css): menu drawer, theme,
   dropdowns, site search, table filters, tabs and toasts. Breadcrumbs, the active menu item
   and the "See also" panel are rendered on the server (templates/SiteSidebar.ascx). Plain JS, no dependencies.
   Every <button> in the shell is type="button", so nothing here triggers a WebForms postback. */
(function () {
    'use strict';

    var doc = document;
    var root = doc.documentElement;
    var rtl = root.getAttribute('dir') === 'rtl';

    function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
    function $$(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }
    function store(key, value) {
        try {
            if (value === undefined) return localStorage.getItem(key);
            if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value);
        } catch (e) { return null; }
    }
    function normPath(p) { return decodeURIComponent(p || '').toLowerCase().replace(/\/default\.aspx$/, '/'); }
    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

    /* Theme ------------------------------------------------------------------ */
    function currentTheme() {
        var t = root.getAttribute('data-theme');
        if (t) return t;
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    function initTheme() {
        if (!root.getAttribute('data-theme')) root.setAttribute('data-theme', currentTheme());
        $$('[data-action="toggle-theme"]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var next = currentTheme() === 'dark' ? 'light' : 'dark';
                root.setAttribute('data-theme', next);
                store('emrc-theme', next);
            });
        });
    }

    /* Menu drawer (GAFI style): the hamburger opens #site-menu at every width ---- */
    function initMenu() {
        var menu = $('#site-menu');
        var openBtn = $('[data-action="open-nav"]');
        if (!menu || !openBtn) return;
        var body = doc.body;
        var lastFocus = null;

        function focusables() {
            return $$('a[href], button:not([disabled])', menu).filter(function (el) { return el.offsetParent !== null; });
        }
        function setOpen(open) {
            body.classList.toggle('is-menu-open', open);
            openBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
            if (open) {
                menu.removeAttribute('inert');
                lastFocus = doc.activeElement;
                var current = $('a[aria-current="page"]', menu) || focusables()[0];
                if (current) setTimeout(function () { current.focus(); }, 30);
            } else {
                menu.setAttribute('inert', '');
                if (lastFocus && lastFocus.focus) lastFocus.focus(); else openBtn.focus();
            }
        }
        menu.setAttribute('inert', '');
        openBtn.addEventListener('click', function () { setOpen(!body.classList.contains('is-menu-open')); });
        $$('[data-action="close-nav"]').forEach(function (el) { el.addEventListener('click', function () { setOpen(false); }); });
        doc.addEventListener('keydown', function (e) {
            if (!body.classList.contains('is-menu-open')) return;
            if (e.key === 'Escape') { e.preventDefault(); setOpen(false); return; }
            if (e.key === 'Tab') {
                /* keep focus inside the open menu */
                var f = focusables();
                if (!f.length) return;
                var first = f[0], last = f[f.length - 1];
                if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
                else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
            }
        });

        /* Collapsible groups (About, News, Guidelines). The server opens the current page's group. */
        $$('.menu-group', menu).forEach(function (group) {
            var btn = $('.menu-toggle', group);
            btn.addEventListener('click', function () {
                var open = group.getAttribute('data-open') !== 'true';
                group.setAttribute('data-open', open ? 'true' : 'false');
                btn.setAttribute('aria-expanded', open ? 'true' : 'false');
            });
        });
    }

    /* Dropdown menus ---------------------------------------------------------- */
    function initDropdowns() {
        $$('[data-dropdown]').forEach(function (dd) {
            var btn = $('button', dd);
            var items = $$('[role="menuitem"]', dd);
            function set(open) {
                dd.classList.toggle('is-open', open);
                btn.setAttribute('aria-expanded', open ? 'true' : 'false');
                if (open && items[0]) items[0].focus();
            }
            btn.addEventListener('click', function (e) { e.stopPropagation(); set(!dd.classList.contains('is-open')); });
            dd.addEventListener('keydown', function (e) {
                var i = items.indexOf(doc.activeElement);
                if (e.key === 'Escape') { set(false); btn.focus(); }
                else if (e.key === 'ArrowDown') { e.preventDefault(); (items[i + 1] || items[0]).focus(); }
                else if (e.key === 'ArrowUp') { e.preventDefault(); (items[i - 1] || items[items.length - 1]).focus(); }
            });
            doc.addEventListener('click', function (e) { if (!dd.contains(e.target)) set(false); });
        });
    }

    /* Site search (command palette) ------------------------------------------- */
    function initSearch() {
        var dialog = $('#search-dialog');
        if (!dialog || typeof dialog.showModal !== 'function') {
            $$('[data-action="open-search"]').forEach(function (b) { b.hidden = true; });
            return;
        }
        var input = $('.palette-input', dialog);
        var list = $('#search-results');
        var index = [];
        var seen = {};
        /* Index = every link in the menu (templates/SiteSidebar.ascx), labelled with its group */
        $$('#site-menu a.menu-link').forEach(function (a) {
            var href = a.getAttribute('href');
            if (seen[href]) return;
            seen[href] = true;
            var group = a.closest('.menu-group');
            index.push({
                title: a.textContent.trim(),
                group: group ? $('.menu-toggle', group).textContent.trim() : '',
                href: href
            });
        });
        var results = [];
        var selected = 0;

        function render() {
            var q = input.value.trim().toLowerCase();
            results = index.filter(function (it) {
                return !q || (it.title + ' ' + it.group).toLowerCase().indexOf(q) !== -1;
            });
            if (!results.length) {
                list.innerHTML = '<li class="empty-state"><span class="icon-tile"><svg class="icon icon-lg" aria-hidden="true"><use href="#i-search"></use></svg></span>' +
                    '<span>' + esc(list.getAttribute('data-empty')) + '</span></li>';
                input.removeAttribute('aria-activedescendant');
                return;
            }
            selected = Math.min(selected, results.length - 1);
            list.innerHTML = results.map(function (it, i) {
                return '<li class="palette-item" role="option" id="sr-' + i + '" data-index="' + i + '" aria-selected="' + (i === selected) + '">' +
                    '<svg class="icon icon-sm" aria-hidden="true"><use href="#i-file"></use></svg>' +
                    '<span>' + esc(it.title) + '</span>' +
                    (it.group ? '<span class="palette-item-hint">' + esc(it.group) + '</span>' : '') + '</li>';
            }).join('');
            input.setAttribute('aria-activedescendant', 'sr-' + selected);
        }
        function move(d) {
            if (!results.length) return;
            selected = (selected + d + results.length) % results.length;
            render();
            var el = $('#sr-' + selected);
            if (el) el.scrollIntoView({ block: 'nearest' });
        }
        function go(i) { if (results[i]) location.href = results[i].href; }
        function open() {
            if (doc.body.classList.contains('is-menu-open')) { var c = $('.drawer-close'); if (c) c.click(); }
            input.value = ''; selected = 0; render(); dialog.showModal(); input.focus();
        }

        $$('[data-action="open-search"]').forEach(function (b) { b.addEventListener('click', open); });
        input.addEventListener('input', function () { selected = 0; render(); });
        input.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
            else if (e.key === 'Enter') { e.preventDefault(); go(selected); }
            else if (e.key === 'Escape') { e.preventDefault(); dialog.close(); }
        });
        list.addEventListener('click', function (e) {
            var item = e.target.closest('.palette-item');
            if (item) go(+item.getAttribute('data-index'));
        });
        dialog.addEventListener('click', function (e) { if (e.target === dialog) dialog.close(); });
        doc.addEventListener('keydown', function (e) {
            var typing = /input|textarea|select/i.test((e.target.tagName || '')) || e.target.isContentEditable;
            if ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey)) { e.preventDefault(); dialog.open ? dialog.close() : open(); }
            else if (e.key === '/' && !typing && !dialog.open) { e.preventDefault(); open(); }
        });
    }

    /* Filterable tables and lists: <input data-filter="#target"> ------------- */
    function initFilters() {
        $$('[data-filter]').forEach(function (input) {
            var target = $(input.getAttribute('data-filter'));
            if (!target) return;
            var rows = $$('[data-filter-item], tbody tr', target);
            var count = $('[data-filter-count="' + input.getAttribute('data-filter') + '"]');
            var empty = $('[data-filter-empty="' + input.getAttribute('data-filter') + '"]');
            function apply() {
                var q = input.value.trim().toLowerCase();
                var shown = 0;
                rows.forEach(function (r) {
                    var hit = !q || r.textContent.toLowerCase().indexOf(q) !== -1;
                    r.hidden = !hit;
                    if (hit) shown++;
                });
                if (count) count.textContent = shown;
                if (empty) empty.hidden = shown !== 0;
                target.hidden = shown === 0 && !!empty;
            }
            input.addEventListener('input', apply);
            input.addEventListener('keydown', function (e) { if (e.key === 'Enter') e.preventDefault(); });
            apply();
        });
    }

    /* Tabs: [role=tablist] with [role=tab][aria-controls] --------------------- */
    function initTabs() {
        $$('[role="tablist"]').forEach(function (list) {
            var tabs = $$('[role="tab"]', list);
            function select(tab) {
                tabs.forEach(function (t) {
                    var on = t === tab;
                    t.setAttribute('aria-selected', on ? 'true' : 'false');
                    t.tabIndex = on ? 0 : -1;
                    var panel = doc.getElementById(t.getAttribute('aria-controls'));
                    if (panel) panel.hidden = !on;
                });
            }
            tabs.forEach(function (t, i) {
                t.addEventListener('click', function () { select(t); });
                t.addEventListener('keydown', function (e) {
                    var next = { ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1 }[e.key];
                    if (next) { e.preventDefault(); var n = tabs[(i + next + tabs.length) % tabs.length]; n.focus(); select(n); }
                });
            });
        });
    }

    /* Toasts: EMRC.toast('Saved', 'success') ---------------------------------- */
    var toastIcons = { success: 'i-check-circle', danger: 'i-alert', info: 'i-info' };
    function toast(message, type) {
        var region = $('.toast-region');
        if (!region) return;
        type = type || 'info';
        var el = doc.createElement('div');
        el.className = 'toast toast-' + type;
        el.setAttribute('role', type === 'danger' ? 'alert' : 'status');
        el.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#' + (toastIcons[type] || 'i-info') + '"></use></svg>' +
            '<div class="toast-text">' + esc(message) + '</div>';
        region.appendChild(el);
        setTimeout(function () {
            el.classList.add('is-leaving');
            setTimeout(function () { el.remove(); }, 220);
        }, 3200);
    }

    /* Copy to clipboard: <button data-copy="text" data-copied="Copied"> ------ */
    function initCopy() {
        $$('[data-copy]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var text = btn.getAttribute('data-copy');
                var done = function () { toast(btn.getAttribute('data-copied') || 'Copied', 'success'); };
                if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () { toast(text, 'info'); });
                else toast(text, 'info');
            });
        });
    }

    function init() {
        initTheme();
        initMenu();
        initDropdowns();
        initSearch();
        initFilters();
        initTabs();
        initCopy();
    }

    window.EMRC = { toast: toast };
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
    else init();
})();
