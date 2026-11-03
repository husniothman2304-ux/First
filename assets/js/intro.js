// Logo intro: plays once per visit, then "booms" away to reveal the site.
// While it plays, <html> has the class "intro-playing", which pauses the
// home page animations; when it ends, an "introdone" event is fired.
(function () {
  var root = document.documentElement;
  var intro = document.getElementById('intro');
  if (!intro) return;
  if (!root.classList.contains('intro-playing')) { intro.remove(); return; }

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finished = false;

  function finish() {
    if (finished) return;
    finished = true;
    try { sessionStorage.setItem('intro-seen', '1'); } catch (e) { /* ignore */ }
    intro.classList.add('boom');
    setTimeout(function () {
      root.classList.remove('intro-playing');
      document.dispatchEvent(new Event('introdone'));
    }, reduce ? 0 : 260);
    setTimeout(function () { intro.remove(); }, reduce ? 450 : 1100);
  }

  setTimeout(finish, reduce ? 800 : 2400);
  intro.addEventListener('click', finish);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') finish();
  });
})();
