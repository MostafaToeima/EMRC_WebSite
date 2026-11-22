/* Applies the saved theme before the page paints, so there is no light flash in dark mode.
   Loaded synchronously in <head>; everything else lives in emrc-ui.js. */
(function () {
    try {
        var theme = localStorage.getItem('emrc-theme');
        if (theme === 'light' || theme === 'dark') document.documentElement.setAttribute('data-theme', theme);
        localStorage.removeItem('emrc-sidebar'); /* the collapsible sidebar no longer exists */
    } catch (e) { /* storage blocked: follow the system theme */ }
})();
