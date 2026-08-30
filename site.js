/* Le comportement propre au site d'une page.

   Cinq responsabilités : tirer le mot d'accueil et le poser aux deux endroits
   qui le portent ; suivre le défilement pour dire la section courante, le
   monde de la page et la part rouge de la loupe ; tenir le déroulant des cinq
   noms ; poser le menu du site dans le tiroir à la place des sections
   d'univers ; conduire le film de l'accueil et sa commande. La langue, la
   quête et les feuilles restent au tronc.

   Exige : un corps portant p-site, un nav .site-noms dont les ancres portent
   data-cible, les sections d'ancrage correspondantes, et une scène d'accueil
   portant le film, son affiche et sa commande. */
(function () {
  'use strict';

  /* Les mots qui parlent francais ou anglais portent leur langue : elle
     s'impose a la ligne de destination pour que les deux lignes parlent
     d'une seule voix. Les mots des langues du pays n'en portent pas — la
     langue de la page decide. */
  var MOTS = [
    { dit: 'Kwabo', poids: 40, langue: '' },
    { dit: 'Woezon', poids: 30, langue: '' },
    { dit: 'E kaabo', poids: 10, langue: '' },
    { dit: 'Bienvenue', poids: 10, langue: 'fr' },
    { dit: 'Welcome', poids: 10, langue: 'en' }
  ];
  function tirer() {
    var total = 0, i;
    for (i = 0; i < MOTS.length; i++) total += MOTS[i].poids;
    var d = Math.random() * total;
    for (i = 0; i < MOTS.length; i++) {
      d -= MOTS[i].poids;
      if (d < 0) return MOTS[i].dit;
    }
    return MOTS[0].dit;
  }

  var DITS = {
    fr: { navConnecter: 'Connecter', navVisiter: 'Visiter', navDecouvrir: 'Découvrir',
          navRevenir: 'Revenir', navAPropos: 'À propos',
          apProjet: 'Le projet', apEquipe: 'L’équipe', apCommunaute: 'La communauté',
          apVision: 'La vision',
          ouBenin: 'au Bénin', ouRoots: 'au Roots' },
    en: { navConnecter: 'Connect', navVisiter: 'Visit', navDecouvrir: 'Discover',
          navRevenir: 'Return', navAPropos: 'About',
          apProjet: 'The project', apEquipe: 'The team', apCommunaute: 'The community',
          apVision: 'The vision',
          ouBenin: 'to Benin', ouRoots: 'to the Roots' }
  };
  function langue() {
    try { return localStorage.getItem('roots.langue') === 'en' ? 'en' : 'fr'; }
    catch (e) { return 'fr'; }
  }
  function poserDits() {
    var d = DITS[langue()];
    Array.prototype.forEach.call(document.querySelectorAll('[data-ts]'), function (el) {
      if (d[el.dataset.ts]) el.textContent = d[el.dataset.ts];
    });
    var h1 = document.getElementById('motAccueil');
    if (h1) accorderOu(h1.textContent);
  }

  /* ---- LA SECTION COURANTE, LE MONDE, LA PART ROUGE DE LA LOUPE. La ligne
     de fin de l'accueil balaie le cercle de la loupe : la part rouge est la
     part du cercle passée au-dessus d'elle — nulle tant que la ligne est sous
     le cercle, pleine dès qu'elle l'a dépassé, et elle se rejoue dans les
     deux sens du défilement. */
  var ANCRES = ['connecter', 'sejourner', 'decouvrir', 'infos'];
  function surveiller() {
    var accueil = document.getElementById('connecter');
    function poserCourante() {
      var ligne = window.innerHeight / 3, courante = ANCRES[0], i, r;
      for (i = 0; i < ANCRES.length; i++) {
        var el = document.getElementById(ANCRES[i]);
        if (!el) continue;
        r = el.getBoundingClientRect();
        if (r.top <= ligne) courante = ANCRES[i];
      }
      document.body.classList.toggle('monde-vert', courante === 'connecter');
      Array.prototype.forEach.call(document.querySelectorAll('[data-cible]'), function (a) {
        var sienne = a.dataset.cible === courante;
        a.classList.toggle('actif', sienne);
        if (sienne) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
      var loupe = document.querySelector('.quete-loupe');
      if (loupe && accueil) {
        var fin = accueil.getBoundingClientRect().bottom;
        var c = loupe.getBoundingClientRect();
        var part = c.height > 0 ? (c.bottom - fin) / c.height : 0;
        part = Math.max(0, Math.min(1, part));
        document.documentElement.style.setProperty('--part-rouge', part.toFixed(3));
      }
    }
    var calme = false;
    window.addEventListener('scroll', function () {
      if (calme) return;
      calme = true;
      requestAnimationFrame(function () { calme = false; poserCourante(); });
    }, { passive: true });
    /* Le premier defilement range les noms de la barre pour de bon : la
       classe se pose une fois et ne se retire pas, remonter ne la leve
       pas — seul le survol ou le clavier redeploie le rang. */
    window.addEventListener('scroll', function ranger() {
      if (window.scrollY > 0) {
        document.body.classList.add('noms-ranges');
        window.removeEventListener('scroll', ranger);
      }
    }, { passive: true });
    window.addEventListener('resize', poserCourante);
    poserCourante();
  }

  /* ---- LE DÉROULANT DES CINQ NOMS. Il s'ouvre au survol comme au clic,
     dit son état, et se referme à l'échappement, au clic dehors et au départ
     du pointeur. */
  function tenirAPropos() {
    var boite = document.querySelector('.site-apropos');
    var btn = document.getElementById('btnAPropos');
    var menu = document.getElementById('menuAPropos');
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
      var titreAp = document.createElement('span');
      titreAp.className = 'site-tiroir-apropos';
      titreAp.dataset.ts = 'navAPropos';
      titreAp.textContent = d.navAPropos;
      rang.appendChild(titreAp);
      var sous = document.createElement('div');
      sous.className = 'site-sous';
      [['apProjet', ' — Roots'], ['apEquipe', ' — Roots Café'],
       ['apCommunaute', ' — NU'], ['apVision', ' — Roots Network']].forEach(function (e) {
        var l = document.createElement('span');
        l.className = 'site-apropos-ligne';
        l.setAttribute('aria-disabled', 'true');
        var q = document.createElement('span');
        q.dataset.ts = e[0];
        q.textContent = d[e[0]];
        var t = document.createElement('span');
        t.className = 'tiret-mot';
        t.textContent = e[1];
        l.appendChild(q); l.appendChild(t);
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

  /* ---- LA BARRE. Trois zones : la marque a gauche — l'ankh et son nom,
     repris au tiroir ou le tronc les verse —, la quete au centre, les noms
     et la pastille a droite. La pastille est la porte vers l'espace
     personnel ; sous le seuil des cinq noms la feuille la retire de la
     barre et la porte du menu la remplace, pour que la barre etroite ne
     dispute l'attention qu'entre la quete et la reservation. La traversée
     animée viendra par-dessus ; le geste, lui, mène déjà. */
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
      titre.textContent = 'Roots';
      new MutationObserver(function () {
        if (titre.textContent !== 'Roots') titre.textContent = 'Roots';
      }).observe(titre, { childList: true, characterData: true, subtree: true });
    }
    /* Deux sieges pour la pastille, jamais les deux : la droite de la barre
       quand les cinq noms y sont, sa place de rangee de radio dans le menu
       sous ce seuil. Le geste de porte voyage avec elle. */
    var seuil = matchMedia('(min-width:1024px)');
    function placerMarque() {
      if (seuil.matches) {
        droite.insertBefore(marque, burger || null);
      } else {
        var centre = document.querySelector('#sections .tiroir-radio .centre');
        if (centre) centre.insertBefore(marque, centre.firstChild);
      }
    }
    placerMarque();
    if (seuil.addEventListener) seuil.addEventListener('change', placerMarque);
    marque.setAttribute('role', 'link');
    marque.setAttribute('tabindex', '0');
    function partir() { window.location.assign('https://mi.roots.bj/onboard.html'); }
    marque.addEventListener('click', function (e) { e.stopPropagation(); partir(); });
    marque.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); partir(); }
    });
  }

  /* ---- LE FILM DE L'ACCUEIL. Il ne part que si le mouvement n'est pas
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
      if (film.paused) { jouer(); if (!horlogeMot) lancerDiaporama(document.getElementById('motAccueil')); }
      else { arreter(); arreterDiaporama(); }
    });
    if (!reduit && !econome) jouer();
  }

  /* ---- LE DIAPORAMA DU MOT. Les cinq termes se succedent dans un ordre
     battu a chaque visite, chacun tenu une duree fixe, l'entree et la sortie
     en fondu sur la courbe du systeme. Sous mouvement reduit rien ne defile :
     le premier mot reste pose. La commande du film arrete aussi le diaporama —
     ce qui demarre seul doit pouvoir s'arreter d'un seul geste. */
  var TENUE_MOT = 4000;
  var horlogeMot = null;
  function battre(liste) {
    var t = liste.slice(), i, j, x;
    for (i = t.length - 1; i > 0; i--) {
      j = Math.floor(Math.random() * (i + 1));
      x = t[i]; t[i] = t[j]; t[j] = x;
    }
    return t;
  }
  function lancerDiaporama(h1) {
    var suite = battre(MOTS.map(function (m) { return m.dit; }));
    var i = 0;
    var ou = document.getElementById('ouAccueil');
    horlogeMot = setInterval(function () {
      h1.classList.add('passe');
      if (ou) ou.classList.add('passe');
      setTimeout(function () {
        i = (i + 1) % suite.length;
        h1.textContent = suite[i];
        accorderOu(suite[i]);
        h1.classList.remove('passe');
        if (ou) ou.classList.remove('passe');
      }, 240);
    }, TENUE_MOT);
    return suite[0];
  }
  function arreterDiaporama() { clearInterval(horlogeMot); horlogeMot = null; }

  /* ---- LA LIGNE DE DESTINATION. Le visiteur qui arrive du dehors est
     accueilli au Benin ; celui qui est deja au pays est accueilli au Roots.
     Le fuseau horaire de l'appareil est le seul indice qu'une page immobile
     detient : il ne quitte pas le navigateur et peut se tromper — un voyageur
     au fuseau d'ailleurs est accueilli comme de l'exterieur. La ligne parle
     la langue de la page : elle porte une cle de dit et suit la bascule. */
  function poserDestination() {
    var ou = document.getElementById('ouAccueil');
    if (!ou) return;
    var dedans = false;
    try { dedans = Intl.DateTimeFormat().resolvedOptions().timeZone === 'Africa/Porto-Novo'; }
    catch (e) { dedans = false; }
    ou.dataset.ts = dedans ? 'ouRoots' : 'ouBenin';
    var h1 = document.getElementById('motAccueil');
    accorderOu(h1 ? h1.textContent : '');
  }

  /* La ligne de destination s'accorde au mot d'accueil pose : s'il porte une
     langue, elle parle la sienne ; sinon celle de la page. */
  function accorderOu(mot) {
    var ou = document.getElementById('ouAccueil');
    if (!ou || !ou.dataset.ts) return;
    var porteuse = '', i;
    for (i = 0; i < MOTS.length; i++) {
      if (MOTS[i].dit === mot && MOTS[i].langue) porteuse = MOTS[i].langue;
    }
    ou.textContent = DITS[porteuse || langue()][ou.dataset.ts];
  }

  function poserAccueil() {
    var h1 = document.getElementById('motAccueil');
    var reduit = matchMedia('(prefers-reduced-motion: reduce)').matches;
    var premier;
    if (h1 && !reduit) premier = lancerDiaporama(h1);
    else premier = battre(MOTS.map(function (m) { return m.dit; }))[0];
    if (h1) h1.textContent = premier;
    document.body.dataset.module = premier;
    poserDestination();
    var titre = document.querySelector('.chrome-titre');
    if (titre) titre.addEventListener('click', function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    poserAccueil();
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
