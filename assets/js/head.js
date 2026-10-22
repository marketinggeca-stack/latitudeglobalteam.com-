/* Latitude: marca el documento antes del primer pintado para preparar las animaciones.
   Si el motor de animación no arranca en 4 s, se muestran todos los contenidos. */
(function () {
  var d = document.documentElement;
  d.classList.add('js');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;
  d.classList.add('motion');
  setTimeout(function () {
    if (!d.classList.contains('motion-ready')) d.classList.remove('motion');
  }, 4000);
})();
