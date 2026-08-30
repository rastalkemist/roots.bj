/* Le comportement propre au site d'une page.

   Quatre responsabilités : suivre le défilement pour dire la section courante
   et la part rouge du nav ; tenir le déroulant des cinq noms ; poser le menu
   du site dans le tiroir à la place des sections d'univers ; répartir les
   pièces du tronc entre la barre et le menu selon la largeur, et conduire le
   film de la scène. La langue, la quête, la radio et les feuilles restent au
   tronc : le site les déplace, il ne les refait pas.

   Exige : un corps portant p-site, un nav .site-noms dont les ancres portent
   data-cible, les sections d'ancrage correspondantes, et une scène d'accueil
   portant le film, son affiche et sa commande. */
(function () {
  'use strict';

  /* Le nom porte a cote de l'ankh est celui de la maison, pas d'un univers,
     et il ne se traduit pas. */
  var MAISON = 'Roots Inc';

  var DITS = {
    fr: { navConnecter: 'Connecter', navVisiter: 'Visiter', navDecouvrir: 'Découvrir',
          navRevenir: 'Revenir', navAPropos: 'À propos',
          apProjet: 'Le projet', apEquipe: 'L’équipe', apCommunaute: 'La communauté',
          apVision: 'La vision',
          titrePage: 'Roots Benin - Retour à la terre-mère' },
    en: { navConnecter: 'Connect', navVisiter: 'Visit', navDecouvrir: 'Discover',
          navRevenir: 'Return', navAPropos: 'About',
          apProjet: 'The project', apEquipe: 'The team', apCommunaute: 'The community',
          apVision: 'The vision',
          titrePage: 'Roots Benin - Connect to the motherland' }
  };
  /* La langue se lit comme le tronc la lit : la clé si elle existe, sinon la
     langue du navigateur. Sans ce repli, la barre parlerait français pendant
     que le reste de la page parle anglais. */
  function langue() {
    var pose = null;
    try { pose = localStorage.getItem('roots.langue'); } catch (e) { pose = null; }
    if (pose === 'en' || pose === 'fr') return pose;
    return (navigator.language || 'fr').toLowerCase().indexOf('en') === 0 ? 'en' : 'fr';
  }
  function poserDits() {
    var d = DITS[langue()];
    if (d.titrePage) document.title = d.titrePage;
    Array.prototype.forEach.call(document.querySelectorAll('[data-ts]'), function (el) {
      if (d[el.dataset.ts]) el.textContent = d[el.dataset.ts];
    });
  }

  /* ---- LA SECTION COURANTE ET LA PART ROUGE. La ligne de fin de la scène
     balaie le cercle de la loupe : la part rouge est la part du cercle passée
     au-dessus d'elle — nulle tant que la ligne est sous le cercle, pleine dès
     qu'elle l'a dépassé, et elle se rejoue dans les deux sens du défilement.
     Elle seule mène la couleur de la barre ; le corps de la page appartient
     au monde rouge du bout à l'autre, sans état ni bascule. */
  var ANCRES = ['connecter', 'sejourner', 'decouvrir', 'infos'];
  function surveiller() {
    var scene = document.getElementById('connecter');
    function poserCourante() {
      var ligne = window.innerHeight / 3, courante = ANCRES[0], i, r;
      for (i = 0; i < ANCRES.length; i++) {
        var el = document.getElementById(ANCRES[i]);
        if (!el) continue;
        r = el.getBoundingClientRect();
        if (r.top <= ligne) courante = ANCRES[i];
      }
      Array.prototype.forEach.call(document.querySelectorAll('[data-cible]'), function (a) {
        var sienne = a.dataset.cible === courante;
        a.classList.toggle('actif', sienne);
        if (sienne) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
      var loupe = document.querySelector('.quete-loupe');
      if (loupe && scene) {
        var fin = scene.getBoundingClientRect().bottom;
        var c = loupe.getBoundingClientRect();
        var part = c.height > 0 ? (c.bottom - fin) / c.height : 0;
        part = Math.max(0, Math.min(1, part));
        document.documentElement.style.setProperty('--part-rouge', part.toFixed(3));
        /* La barre quitte la buee et reprend son fond des que la scene a
           passe le cercle de la quete : un seul seuil, la meme grandeur. */
        document.body.classList.toggle('sur-fond', part >= 1);
      }
    }
    var calme = false;
    window.addEventListener('scroll', function () {
      if (calme) return;
      calme = true;
      requestAnimationFrame(function () { calme = false; poserCourante(); });
    }, { passive: true });
    window.addEventListener('resize', poserCourante);
    poserCourante();
  }

  /* ---- LE DÉROULANT DU NAV. Il s'ouvre au survol comme au clic, dit son
     état, et se referme à l'échappement, au clic dehors et au départ du
     pointeur. Les sections de la page ne se rangent pas derrière un
     déroulant : leurs ancres vivent dans le tiroir. */
  function tenirAPropos() {
    tenirDeroulant('btnAPropos', 'menuAPropos');
  }

  function tenirDeroulant(nomBouton, nomMenu) {
    var btn = document.getElementById(nomBouton);
    var menu = document.getElementById(nomMenu);
    var boite = btn ? btn.closest('.site-apropos') : null;
    if (!boite || !btn || !menu) return;
    var repli = null;
    function ouvrir(v) {
      clearTimeout(repli);
      menu.hidden = !v;
      btn.setAttribute('aria-expanded', v ? 'true' : 'false');
      if (v) boite.setAttribute('data-ouvert', '');
      else boite.removeAttribute('data-ouvert');
    }
    btn.addEventListener('click', function () { ouvrir(menu.hidden); });
    boite.addEventListener('pointerenter', function () { ouvrir(true); });
    boite.addEventListener('pointerleave', function () {
      repli = setTimeout(function () { ouvrir(false); }, 300);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') ouvrir(false);
    });
    document.addEventListener('click', function (e) {
      if (!boite.contains(e.target)) ouvrir(false);
    });
  }

  /* ---- LE MENU DU SITE. Le tiroir porte les cinq noms et le déroulant à la
     place des sections d'univers que le tronc y verse — et il les repose si
     le tronc redessine son bac. */
  function poserMenu() {
    var bac = document.getElementById('sections');
    if (!bac) return;
    /* Le tronc verse ses sections d'app dans le bac, au chargement comme a
       ses redessins : tout ce qui n'est ni la rangee ancree, ni le pied, ni
       le menu du site se retire, a chaque versement. */
    function balayer() {
      Array.prototype.forEach.call(bac.querySelectorAll('a[href$=".html"], .tiroir-section, .lien-section'), function (v) {
        if (!v.closest('.tiroir-radio') && !v.closest('.pied-politique') && !v.closest('.site-tiroir')) v.parentNode.removeChild(v);
      });
      /* Les pages de l'app ne vivent pas sous ce domaine : le lien legal du
         pied part en absolu vers la maison de l'app. */
      Array.prototype.forEach.call(bac.querySelectorAll('.pied-politique a[href^="confidentialite"]'), function (a) {
        a.setAttribute('href', 'https://mi.roots.bj/' + a.getAttribute('href'));
      });
    }
    function remplir() {
      var d = DITS[langue()];
      var rang = document.createElement('nav');
      rang.className = 'site-tiroir';
      [['#connecter', 'navConnecter', 'connecter'],
       ['#sejourner', 'navVisiter', 'sejourner'],
       ['#decouvrir', 'navDecouvrir', 'decouvrir'],
       ['#infos', 'navRevenir', 'infos']].forEach(function (e) {
        var a = document.createElement('a');
        a.href = e[0];
        a.dataset.ts = e[1];
        a.dataset.cible = e[2];
        a.textContent = d[e[1]];
        rang.appendChild(a);
      });
      var titreAp = document.createElement('button');
      titreAp.type = 'button';
      titreAp.className = 'site-tiroir-apropos';
      titreAp.setAttribute('aria-expanded', 'false');
      var motAp = document.createElement('span');
      motAp.dataset.ts = 'navAPropos';
      motAp.textContent = d.navAPropos;
      titreAp.appendChild(motAp);
      titreAp.insertAdjacentHTML('beforeend',
        '<svg class="i site-chevron" aria-hidden="true"><use href="#i-chevron"/></svg>');
      titreAp.addEventListener('click', function () {
        var ouvert = rang.hasAttribute('data-ouvert');
        if (ouvert) rang.removeAttribute('data-ouvert');
        else rang.setAttribute('data-ouvert', '');
        titreAp.setAttribute('aria-expanded', ouvert ? 'false' : 'true');
      });
      rang.appendChild(titreAp);
      var sous = document.createElement('div');
      sous.className = 'site-sous';
      [['apProjet', 'Roots — ', 'roots'], ['apEquipe', 'Roots Café — ', 'cafe'],
       ['apCommunaute', 'NU — ', 'nu'], ['apVision', 'Roots Network — ', 'reseau']].forEach(function (e) {
        var l = document.createElement('span');
        l.className = 'site-apropos-ligne';
        l.dataset.maison = e[2];
        l.setAttribute('aria-disabled', 'true');
        var maison = document.createElement('span');
        maison.className = 'tiret-mot';
        maison.textContent = e[1];
        var q = document.createElement('span');
        q.dataset.ts = e[0];
        q.textContent = d[e[0]];
        l.appendChild(maison); l.appendChild(q);
        sous.appendChild(l);
      });
      rang.appendChild(sous);
      /* Le bac porte aussi la rangee que le tronc y ancre — la marque et le
         lecteur — et elle ne se detruit jamais : seuls les liens de sections
         d'univers cedent la place au menu du site. */
      var ancien = bac.querySelector('.site-tiroir');
      if (ancien) ancien.parentNode.removeChild(ancien);
      balayer();
      bac.insertBefore(rang, bac.firstChild);
    }
    remplir();
    /* Le tronc redessine le bac au changement de langue et aux reposes du
       nav : la garde evite que la repose du menu se redeclenche elle-meme. */
    var occupe = false;
    new MutationObserver(function () {
      if (occupe) return;
      occupe = true;
      if (bac.querySelector('.site-tiroir')) balayer();
      else remplir();
      occupe = false;
    }).observe(bac, { childList: true });
  }

  /* ---- LA RÉPARTITION DES PIÈCES DU TRONC. Trois zones dans la barre : la
     marque à gauche — l'ankh et son nom —, la quête au centre, les noms et la
     pastille à droite. Au-dessus du seuil des cinq noms la pastille siège dans
     la barre ; sous ce seuil elle retrouve sa rangée d'origine dans le menu.
     Les pièces voyagent entières : le site les déplace, il ne les refait pas. */
  function poserBarre() {
    var marque = document.getElementById('marque');
    var droite = document.querySelector('.chrome-droite');
    var burger = document.getElementById('btnBurger');
    var inner = document.querySelector('.chrome-inner');
    var ankh = document.querySelector('.ankh-home');
    var titre = document.querySelector('.chrome-titre');
    if (!marque || !droite) return;
    if (inner && ankh && titre) {
      titre.setAttribute('href', '#haut');
      inner.insertBefore(titre, ankh.nextSibling);
      /* Le nom a cote de l'ankh est celui de la maison, pas celui d'un
         univers ; le tronc le reecrit a ses redessins, la garde le repose. */
      titre.textContent = MAISON;
      new MutationObserver(function () {
        if (titre.textContent !== 'Roots') titre.textContent = MAISON;
      }).observe(titre, { childList: true, characterData: true, subtree: true });
      titre.addEventListener('click', function (e) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      });
    }
    var seuil = matchMedia('(min-width:1024px)');
    /* Une piece ne se deplace que si elle n'est pas deja chez son hote : sans
       cette garde, l'observateur qui surveille le bac se reveillerait sur son
       propre deplacement et la repose se rappellerait sans fin. */
    function loger(piece, hote, avant) {
      if (!piece || !hote || piece.parentNode === hote) return;
      hote.insertBefore(piece, avant || null);
    }
    function placer() {
      var rangee = document.querySelector('#sections .tiroir-radio');
      var centre = rangee ? rangee.querySelector('.centre') : null;
      if (!centre) return;
      if (seuil.matches) {
        loger(marque, droite, burger);
      } else {
        loger(marque, centre, centre ? centre.firstChild : null);
      }
    }
    placer();
    if (seuil.addEventListener) seuil.addEventListener('change', placer);
    /* Le tronc repose sa rangee au fil de ses redessins : la replacer alors,
       sans quoi le lecteur redescendrait dans le menu sur grand ecran. */
    var bac = document.getElementById('sections');
    if (bac) new MutationObserver(placer).observe(bac, { childList: true });
    marque.setAttribute('role', 'link');
    marque.setAttribute('tabindex', '0');
    function partir() { window.location.assign('https://mi.roots.bj/onboard.html'); }
    marque.addEventListener('click', function (e) { e.stopPropagation(); partir(); });
    marque.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); partir(); }
    });
  }

  /* ---- LE FILM DE LA SCÈNE. Il ne part que si le mouvement n'est pas
     réduit et que la connexion n'est pas déclarée économe ; la commande
     l'arrête et le relance, et elle est le seul chemin quand il ne part pas
     seul. */
  function poserFilm() {
    var film = document.getElementById('filmAccueil');
    var cmd = document.getElementById('cmdFilm');
    if (!film || !cmd) return;
    var reduit = matchMedia('(prefers-reduced-motion: reduce)').matches;
    var econome = navigator.connection && navigator.connection.saveData;
    function jouer() {
      if (!film.src) film.src = 'media/hero.mp4';
      film.play().then(function () { film.classList.add('joue'); })['catch'](function () {});
    }
    function arreter() { film.pause(); film.classList.remove('joue'); }
    cmd.classList.remove('cache');
    cmd.addEventListener('click', function () {
      if (film.paused) jouer();
      else arreter();
    });
    if (!reduit && !econome) jouer();
  }

  document.addEventListener('DOMContentLoaded', function () {
    poserDits();
    surveiller();
    tenirAPropos();
    poserMenu();
    poserBarre();
    poserFilm();
    document.addEventListener('click', function (e) {
      if (e.target.closest('.lien-langue, .lang-btn')) setTimeout(poserDits, 50);
    });
  });
})();
