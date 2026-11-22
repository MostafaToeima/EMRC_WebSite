/* EMRC motion layer (2026-11-11, GAFI-style redesign).
   Only CountUp is scripted: numbers marked data-motion="count-up" count from 0 to their written
   value when they first scroll into view. Hover and menu transitions are plain CSS (css/emrc-ds.css).
   No libraries. With prefers-reduced-motion, or without IntersectionObserver, the numbers simply
   stay as the server wrote them, so nothing is ever hidden or wrong when this file fails. */
(function () {
    'use strict';

    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion || !('IntersectionObserver' in window) || !window.requestAnimationFrame) return;

    function easeOutQuad(t) { return t * (2 - t); }

    function countUp(el) {
        var original = el.textContent;
        var target = parseFloat(original.replace(/,/g, ''));
        if (isNaN(target) || target <= 0) return;
        var useSeparator = original.indexOf(',') !== -1;
        var duration = 1600;
        function format(n) {
            var s = String(Math.round(n));
            return useSeparator ? s.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : s;
        }
        /* keep the final width so the line never jumps while counting */
        el.style.display = 'inline-block';
        el.style.minWidth = el.offsetWidth + 'px';
        el.classList.add('emrc-count');

        var observer = new IntersectionObserver(function (entries) {
            if (!entries[0].isIntersecting) return;
            observer.disconnect();
            var start = null;
            function step(now) {
                if (start === null) start = now;
                var t = Math.min((now - start) / duration, 1);
                el.textContent = t < 1 ? format(target * easeOutQuad(t)) : original;
                if (t < 1) window.requestAnimationFrame(step);
            }
            el.textContent = format(0);
            window.requestAnimationFrame(step);
        }, { rootMargin: '0px 0px -10% 0px' });
        observer.observe(el);
    }

    function init() {
        Array.prototype.forEach.call(document.querySelectorAll('[data-motion~="count-up"]'), countUp);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
