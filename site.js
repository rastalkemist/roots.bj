/* Le comportement propre au site d'une page.

   Quatre responsabilités : suivre le défilement pour dire la section courante
   et la part rouge du nav ; tenir le déroulant des cinq noms ; poser le menu
   du site dans le tiroir à la place des sections d'univers ; répartir les
   pièces du tronc entre la barre et le menu selon la largeur, et conduire le
   film de la scène. La langue, la quête, la radio et les feuilles restent au
   tronc : le site les déplace, il ne les refait pas.

   Exige : un corps portant p-site, un nav .site-noms, la scène d'accueil
   portant le film, son affiche et sa commande, et le bac du tiroir que le
   tronc ancre. */
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
          hautDePage: 'Haut de page',
          titrePage: 'Roots Benin - Retour à la terre-mère' },
    en: { navConnecter: 'Connect', navVisiter: 'Visit', navDecouvrir: 'Discover',
          navRevenir: 'Return', navAPropos: 'About',
          apProjet: 'The project', apEquipe: 'The team', apCommunaute: 'The community',
          apVision: 'The vision',
          hautDePage: 'Back to top',
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
    /* Un libelle qui ne se lit qu'a l'oreille se traduit comme les autres. */
    Array.prototype.forEach.call(document.querySelectorAll('[data-als]'), function (el) {
      var m = d[el.getAttribute('data-als')];
      if (typeof m === 'string') el.setAttribute('aria-label', m);
    });
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
  function surveiller() {
    var scene = document.getElementById('connecter');
    function poserCourante() {
      /* Le seuil se lit sur le disque de la quete : la part de son cercle que
         la ligne de fin de scene a depassee. Quand la quete est retiree, ce
         disque n'a plus de boite — l'ankh prend le relais : meme cercle, meme
         rangee, toujours present. Sans repere, la mesure resterait a zero et
         la barre ne reprendrait jamais son fond. */
      var loupe = document.querySelector('.quete-loupe');
      if (loupe && !loupe.getClientRects().length) loupe = null;
      if (!loupe) loupe = document.querySelector('.chrome-inner .ankh-home');
      if (loupe && scene) {
        var fin = scene.getBoundingClientRect().bottom;
        var c = loupe.getBoundingClientRect();
        var part = c.height > 0 ? (c.bottom - fin) / c.height : 0;
        part = Math.max(0, Math.min(1, part));
        document.documentElement.style.setProperty('--part-rouge', part.toFixed(3));
        /* La barre quitte la buee et reprend son fond des que la scene a
           passe le cercle de la quete : un seul seuil, la meme grandeur. */
        /* La quete appartient au monde du voyage : elle n'ouvre qu'une fois
           la scene passee. Sa retenue est portee par la feuille, sur cette
           meme classe — des la premiere image, sans course avec le tronc. */
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

  /* ---- LE RETOUR AU HAUT DE PAGE. Il ne s'offre qu'a qui remonte : descendre
     ne demande rien, revenir en arriere si — c'est le seul moment ou le haut
     de page est ce qu'on cherche. Deux conditions, et les deux tiennent :
     avoir passe le seuil, et remonter. Une fois pose il ne bouge plus ; le
     defilement qu'il declenche est demande, jamais impose, et il respecte le
     mouvement reduit. */
  var SEUIL_HAUT = 2;               /* en hauteurs d'ecran */
  function tenirRetourHaut() {
    var bouton = document.getElementById('btnHaut');
    if (!bouton) return;
    var dernier = window.scrollY, pose = false;
    function juger() {
      var y = window.scrollY;
      var remonte = y < dernier - 2;
      var descend = y > dernier + 2;
      dernier = y;
      if (!pose && remonte && y > window.innerHeight * SEUIL_HAUT) {
        bouton.hidden = false;
        requestAnimationFrame(function () { bouton.classList.add('vu'); });
        pose = true;
      } else if (pose && (descend || y <= window.innerHeight * SEUIL_HAUT)) {
        bouton.classList.remove('vu');
        pose = false;
      }
    }
    var calme = false;
    window.addEventListener('scroll', function () {
      if (calme) return;
      calme = true;
      requestAnimationFrame(function () { calme = false; juger(); });
    }, { passive: true });
    /* La sortie porte son mouvement : la piece quitte le flux une fois le
       fondu termine, jamais avant. */
    bouton.addEventListener('transitionend', function (e) {
      if (e.propertyName === 'opacity' && !bouton.classList.contains('vu')) bouton.hidden = true;
    });
    bouton.addEventListener('click', function () {
      var brusque = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: brusque ? 'auto' : 'smooth' });
      var ancre = document.querySelector('.chrome-inner .ankh-home');
      if (ancre) ancre.focus({ preventScroll: true });
    });
  }

  /* ---- L'ADRESSE RESTE PROPRE. Le retour au haut de page se fait par une
     ancre, qui laisse son suffixe dans la barre d'adresse une fois le geste
     consomme. Le suffixe est retire aussitot : il ne designe plus rien a
     rejoindre, et le defilement a deja eu lieu. */
  function nettoyerAdresse() {
    function retirer() {
      if (!location.hash) return;
      history.replaceState(null, '', location.pathname + location.search);
    }
    retirer();
    window.addEventListener('hashchange', function () { setTimeout(retirer, 0); });
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (a) setTimeout(retirer, 0);
    });
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
      btn.setAttribute('aria-expanded', v ? 'true' : 'false');
      if (v) boite.setAttribute('data-ouvert', '');
      else boite.removeAttribute('data-ouvert');
    }
    btn.addEventListener('click', function () { ouvrir(!boite.hasAttribute('data-ouvert')); });
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

  /* ---- LA BASCULE DE LANGUE SUIT LA LARGEUR. Elle vit dans le chrome OU
     dans le pied du tiroir, jamais aux deux : sous le seuil du rang, le chrome
     n'a plus de place pour elle et le pied la loge, comme sur les ecrans de
     l'application. C'est LE MEME bouton qui voyage — ses ecouteurs et son
     etat avec lui — et le point qui le separe du lien legal ne parait que
     lorsqu'il est la. */
  /* Le bouton se tient une fois pour toutes : le tronc reconstruit le pied a
     chaque redessin, et un element detache ne se retrouve plus par le
     document — la reference, elle, survit et se repose. */
  var boutonLangue = null;
  function logerLangue() {
    if (!boutonLangue) boutonLangue = document.getElementById('btnLangue');
    var btn = boutonLangue;
    if (!btn) return;
    var etroit = window.matchMedia('(max-width: 1023.98px)').matches;
    var pied = document.querySelector('#sections .pied-politique');
    var chrome = document.querySelector('.chrome-droite');
    var point = document.getElementById('pointLangue');
    /* Un redessin du bac peut avoir pose une seconde bascule dans le pied,
       le bouton du chrome etant alors hors du document. Une seule commande de
       langue vit sur l'ecran : la posee cede la place, son point avec elle. */
    if (pied) {
      Array.prototype.forEach.call(pied.querySelectorAll('.lien-langue'), function (v) { v.parentNode.removeChild(v); });
      Array.prototype.forEach.call(pied.querySelectorAll('.point-pied:not(#pointLangue)'), function (v) { v.parentNode.removeChild(v); });
    }
    if (etroit && pied) {
      if (btn.parentNode !== pied) pied.insertBefore(btn, pied.firstChild);
      if (!point) {
        point = document.createElement('span');
        point.id = 'pointLangue';
        point.className = 'point-pied';
        point.setAttribute('aria-hidden', 'true');
        point.textContent = '\u00b7';
      }
      if (point.parentNode !== pied) pied.insertBefore(point, btn.nextSibling);
    } else if (!etroit && chrome) {
      if (point && point.parentNode) point.parentNode.removeChild(point);
      if (btn.parentNode !== chrome) chrome.insertBefore(btn, chrome.firstChild);
    }
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
      /* Le feuillet ne porte qu'un bloc : son titre le nomme et ne se touche
         pas. Un repli n'aurait rien a cacher. */
      var titreAp = document.createElement('p');
      titreAp.className = 'site-tiroir-apropos';
      var motAp = document.createElement('span');
      motAp.dataset.ts = 'navAPropos';
      motAp.textContent = d.navAPropos;
      titreAp.appendChild(motAp);
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
    logerLangue();
    window.addEventListener('resize', logerLangue);
    /* Le tronc redessine le bac au changement de langue et aux reposes du
       nav : la garde evite que la repose du menu se redeclenche elle-meme. */
    var occupe = false;
    new MutationObserver(function () {
      if (occupe) return;
      occupe = true;
      if (bac.querySelector('.site-tiroir')) balayer();
      else remplir();
      logerLangue();
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
    tenirRetourHaut();
  nettoyerAdresse();
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
