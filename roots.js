/* ==========================================================================
   ROOTS — socle de chrome partagé.
   Source unique du chrome de tous les écrans : planche de symboles, champ
   téléphone international, pastille Mi/NU, super-nav, menu déroulant, toast.
   Aucun écran ne redéfinit ce qui vit ici.
   ========================================================================== */
/* ==========================================================================
   Socle de chrome partagé : champ téléphone international et navigation
   (pastille Mi/NU, super-nav, menu déroulant, toast).
   ========================================================================== */
(function (global) {
  'use strict';

  /* Le document sait des le chargement qu'un script gouverne le chrome : la
     feuille de style peut retenir un element que la promotion deplacera, au
     lieu de le peindre a une place puis a l'autre. Sans script, la classe
     manque et rien n'est retenu. */
  if (global.document && document.documentElement) {
    document.documentElement.classList.add('js');
  }

  /* LE MODE CLAVIER. `html.au-clavier` marque que le foyer a ete deplace par
     une TOUCHE. `:focus-visible` ne suffit pas a ce marquage : il correspond
     aussi au CLIC sur un champ de texte.

     Arme : les touches qui deplacent le foyer, elles seules.
     Desarme : tout geste de pointage, doigt compris.
     Exige : la feuille de style ne peint le foyer que sous cette classe.
     Casse si retire : le foyer ne se peint plus nulle part. Casse si la classe
     est posee autrement : le foyer se peint au clic et au doigt. */
  (function () {
    if (!global.document || !document.documentElement) { return; }
    var DEPLACENT = {
      Tab: 1, ArrowUp: 1, ArrowDown: 1, ArrowLeft: 1, ArrowRight: 1,
      Home: 1, End: 1, PageUp: 1, PageDown: 1
    };
    var racine = document.documentElement;
    global.addEventListener('keydown', function (e) {
      if (DEPLACENT[e.key]) { racine.classList.add('au-clavier'); }
    }, true);
    function desarmer() { racine.classList.remove('au-clavier'); }
    global.addEventListener('pointerdown', desarmer, true);
    global.addEventListener('mousedown', desarmer, true);
    global.addEventListener('touchstart', desarmer, true);
  }());

  var PAYS_EPINGLES = ['bj', 'ng', 'tg', 'gh', 'ci', 'ne', 'bf', 'sn', 'fr', 'be', 'us', 'ca', 'gb', 'de'];
  var PREFIXE_BJ = '01';

  function chiffresDe(v) { return (v || '').replace(/\D/g, ''); }

  function paysDe(iti) {
    return (iti && typeof iti.getSelectedCountryData === 'function') ? iti.getSelectedCountryData() : null;
  }

  function surBenin(iti) {
    var p = paysDe(iti);
    return !!(p && p.iso2 === 'bj');
  }

  /* Le numéro béninois commence toujours par 01 : le champ le porte d'avance.
     Le préfixe absorbe la saisie de qui le retape, résiste à un retour arrière
     isolé, et revient de lui-même après un effacement complet. */
  function prefixeBenin(input, iti) {
    var attendUn = false;

    function poser() {
      input.value = PREFIXE_BJ + ' ';
      try { input.setSelectionRange(input.value.length, input.value.length); } catch (e) {}
    }

    input.addEventListener('beforeinput', function (e) {
      if (!surBenin(iti) || e.inputType !== 'insertText') { attendUn = false; return; }
      var enFin = input.selectionStart === input.selectionEnd && input.selectionStart === input.value.length;
      if (e.data === '0' && enFin && chiffresDe(input.value).length <= 2) { e.preventDefault(); attendUn = true; return; }
      if (e.data === '1' && attendUn) { e.preventDefault(); attendUn = false; return; }
      attendUn = false;
    });

    input.addEventListener('keydown', function (e) {
      if (!surBenin(iti)) return;
      if (e.key !== 'Backspace' && e.key !== 'Delete') return;
      var debut = input.selectionStart || 0, fin = input.selectionEnd || 0;
      /* Champ entièrement sélectionné : l'effacement est voulu, le préfixe repartira seul. */
      if (debut === 0 && fin === input.value.length && fin > 0) return;
      var avant = chiffresDe(input.value.slice(0, debut)).length;
      if (debut === fin ? (e.key === 'Backspace' ? avant <= 2 : avant < 2) : avant < 2) e.preventDefault();
    });

    input.addEventListener('input', function () {
      if (!surBenin(iti)) return;
      var n = chiffresDe(input.value);
      if (!n) { poser(); return; }
      /* Préfixe redonné par un collage : on n'en garde qu'un. */
      if (n.indexOf(PREFIXE_BJ + PREFIXE_BJ) === 0 && typeof iti.setNumber === 'function') {
        var p = paysDe(iti);
        iti.setNumber('+' + ((p && p.dialCode) || '229') + n.slice(PREFIXE_BJ.length));
      }
    });

    input.addEventListener('blur', function () { attendUn = false; });

    /* Le format dépend du pays : on repart d'un champ vide au changement. */
    input.addEventListener('countrychange', function () {
      attendUn = false;
      input.value = '';
      if (surBenin(iti)) poser();
    });

    if (!input.value.trim() && surBenin(iti)) poser();
  }

  /* Champ téléphone : pays par défaut bj, indicatif séparé, groupes formés à la
     frappe, liste rattachée au <body> pour ne pas être rognée par les conteneurs
     qui défilent, utilitaires de formatage chargés depuis vendor/. */
  function initTelRoots(input) {
    if (!input) return null;
    if (!global.intlTelInput) { input.placeholder = '01 XX XX XX XX'; return null; }
    var iti = global.intlTelInput(input, {
      initialCountry: 'bj',
      separateDialCode: true,
      countrySearch: false,
      formatAsYouType: true,
      dropdownParent: document.body,
      countryOrder: PAYS_EPINGLES,
      customPlaceholder: function (exemple, pays) { return (pays && pays.iso2 === 'bj') ? '01 XX XX XX XX' : exemple; },
      loadUtils: function () { return import('./vendor/utils.js'); }
    });
    prefixeBenin(input, iti);
    reconnaitreInternational(input, iti);
    return iti;
  }

  /* Un numero COMPLET — indicatif compris — arrive par la suggestion du
     clavier, un collage ou une frappe. Avec l'indicatif affiche a part, le
     laisser tel quel double l'indicatif a l'ecran. Des qu'une valeur commence
     par « + » ou « 00 », le composant la relit en entier : il pose le pays et
     ne garde dans le champ que la part nationale. Le garde-fou evite la
     boucle : la relecture declenche elle-meme une saisie. */
  function reconnaitreInternational(input, iti) {
    if (!iti || typeof iti.setNumber !== 'function') return;
    var enCours = false;
    input.addEventListener('input', function () {
      if (enCours) return;
      var v = input.value.trim();
      if (!/^(\+|00)/.test(v)) return;
      var complet = v.replace(/^00/, '+');
      if (!/^\+\d{6,}/.test(complet.replace(/[\s.-]/g, ''))) return;
      enCours = true;
      try { iti.setNumber(complet.replace(/[\s.-]/g, '')); } catch (e) {}
      enCours = false;
    });
  }

  /* La liste des pays s'ouvre PAR-DESSUS ce qui l'a appelee et HORS de son
     conteneur : elle est rattachee au corps du document. Elle doit donc se
     fermer avant la couche qui la porte — sinon celle-ci se referme et laisse
     la liste seule a l'ecran, posee sur ce qui apparait derriere.
     L'etat et la fermeture passent par la surface publique du composant :
     l'ouverture est portee par `aria-expanded`, et un second appui sur le meme
     bouton referme. Rend true si une liste etait ouverte. */
  function fermerListePays() {
    var b = document.querySelector('.iti__selected-country[aria-expanded="true"]');
    if (!b) return false;
    b.click();
    return true;
  }

  /* La liste des pays recoit SA PROPRE entree d'historique, poussee au moment
     ou le geste l'ouvre : le premier retour la referme, le suivant s'adresse a
     la couche d'en dessous. Pousser l'entree ailleurs qu'au geste ne tient
     pas — un navigateur mobile ecarte du bouton retour toute entree posee sans
     geste de l'utilisateur.
     Quand la liste se ferme par un choix ou un appui, son entree se consomme
     par un retour programme, que le gestionnaire d'historique doit ignorer :
     c'est le sens des deux drapeaux. */
  var couchePays = { poussee: false, popAttendu: false, parHistorique: false };

  document.addEventListener('open:countrydropdown', function () {
    couchePays.poussee = false;
    try {
      history.pushState({ rootsCouche: 'pays' }, '');
      couchePays.poussee = true;
    } catch (e) {}
  }, true);

  document.addEventListener('close:countrydropdown', function () {
    if (!couchePays.poussee) return;
    couchePays.poussee = false;
    if (couchePays.parHistorique) { couchePays.parHistorique = false; return; }
    couchePays.popAttendu = true;
    try { history.back(); } catch (e) { couchePays.popAttendu = false; }
  }, true);

  /* Enregistre AVANT tout gestionnaire d'ecran : les ecrans lisent
     `popConsommeParCouche` pour savoir si ce retour etait celui de la liste. */
  window.addEventListener('popstate', function () {
    if (couchePays.popAttendu) { couchePays.popAttendu = false; couchePays.consomme = true; return; }
    if (couchePays.poussee) {
      couchePays.parHistorique = true;
      couchePays.poussee = false;
      fermerListePays();
      couchePays.consomme = true;
      return;
    }
    couchePays.consomme = false;
  });

  function popConsommeParCouche() {
    var c = !!couchePays.consomme;
    couchePays.consomme = false;
    return c;
  }

  /* ------------------------------------------------------------------
     LE NAV SE MESURE LUI-MEME.

     Aucun seuil en pixels : une rupture chiffree ment des que le contenu
     change — un mot d'univers plus long, une autre langue, un etat de radio
     plus bavard. Le nav demande donc au navigateur la place qui reste, et
     promeut en deux paliers, dans cet ordre :

       palier 1 — le super-nav monte dans la barre, A GAUCHE, aux cotes du
                  logo, s'il y tient avec l'ecart minimal de part et d'autre ;
                  la radio et le menu restent a droite ;
       palier 2 — l'ilot de radio se deplie a demeure s'il tient ENCORE apres,
                  avec le meme ecart ; l'antenne descend alors dedans et la
                  commande de lecture s'efface, puisqu'un seul bouton suffit.

     LA HAUTEUR NE COMMANDE PLUS LA PROMOTION, seulement la TYPOGRAPHIE : un
     ecran large et court garde la taille du telephone, mais promeut comme les
     autres si la place y est. Ce qui ne peut pas monter se range aux coins
     bas, dans la gouttiere du site.

     Deux valeurs declarees : l'ecart minimal du super-nav, et le souffle
     qui met en valeur le groupe de marque de part et d'autre. Tout le reste
     est mesure.
     ------------------------------------------------------------------ */
  var ECART_NAV = 24;
  var SOUFFLE_MARQUE = 40;

  /* LA HAUTEUR RENDUE DE LA BARRE, PUBLIEE A LA FEUILLE DE STYLE.
     Ce qui doit s'arreter sous la barre — une feuille qui monte du bas, un
     tiroir qui descend — ne peut pas se caler sur une hauteur ECRITE : la barre
     grandit avec ce qu'elle porte, et une valeur declaree derive du rendu sans
     que rien ne le signale.
     Elle se publie a CHAQUE passage, quel que soit le sort des promotions : un
     ecran ou rien ne monte a une barre lui aussi, et ce qui se cale dessous en
     depend autant. La rangee du lecteur n'entre pas dans le compte — elle vit
     SOUS la barre. */
  function publierHauteur(barre, haut) {
    var creux = parseFloat(getComputedStyle(haut).paddingTop) || 0;
    document.body.style.setProperty('--entete-h-rendue',
      Math.ceil(barre.getBoundingClientRect().height + creux * 2) + 'px');
  }

  function ajusterNav(radio) {
    var barre = document.querySelector('.chrome-inner');
    var droite = document.querySelector('.chrome-droite');
    var haut = document.querySelector('.chrome-haut');
    var superNav = document.getElementById('superNav');
    if (!barre || !droite || !haut) return;
    promouvoirNav(radio, barre, droite, haut, superNav);
    publierHauteur(barre, haut);
    /* La barre annonce qu'elle est posee : un ecran qui compose autour d'une
       piece promue — l'habiller, la completer — se cale sur cette annonce,
       jamais sur une observation du document. */
    document.dispatchEvent(new Event('chrome:barre'));
    /* L'habillage d'une piece par l'ecran (a l'annonce ci-dessus) peut
       changer la hauteur rendue : elle se re-publie apres lui. */
    publierHauteur(barre, haut);
  }

  function promouvoirNav(radio, barre, droite, haut, superNav) {

    var rangee = haut.querySelector('.radio-rangee');
    var ilot = document.getElementById('languetteRadio');
    var antenne = document.getElementById('btnRadio');
    var lecture = document.getElementById('btnRadioLecture');
    var corps = document.body;

    /* On repart toujours de la disposition de base : mesurer une promotion
       depuis un etat deja promu rend la mesure fausse au tour suivant. */
    var logo = barre.querySelector('.ankh-home');
    var gauche = barre.querySelector('.chrome-gauche');

    corps.classList.remove('nav-haut', 'nav-ilot-ancre');
    if (superNav && superNav.parentNode !== haut.parentNode) {
      haut.parentNode.insertBefore(superNav, haut.nextSibling);
    }
    if (gauche && logo) {
      barre.insertBefore(logo, gauche);
      /* Le logotype sort du groupe AVANT que le groupe ne soit retire : un
         conteneur detruit emporte ses enfants avec lui. */
      var centreG = gauche.querySelector('.centre');
      if (centreG) barre.insertBefore(centreG, gauche);
      gauche.parentNode.removeChild(gauche); gauche = null;
    }
    if (ilot) { ilot.style.maxWidth = ''; ilot.classList.remove('replie'); }
    if (ilot && rangee && ilot.parentNode !== rangee) rangee.appendChild(ilot);
    if (antenne && antenne.parentNode !== droite) droite.insertBefore(antenne, droite.firstChild);
    if (lecture && ilot && lecture.parentNode !== ilot) ilot.appendChild(lecture);
    /* La quete se defait avant de se refaire : le geste focal retourne a sa
       place dans la page, devant son voile, et la feuille reprend le bas. */
    var fabQ = document.querySelector('.fab[aria-controls]');
    var feuilleQ = fabQ ? document.getElementById(fabQ.getAttribute('aria-controls')) : null;
    var voileQ = feuilleQ && feuilleQ.previousElementSibling
      && feuilleQ.previousElementSibling.classList.contains('voile')
      ? feuilleQ.previousElementSibling : null;
    corps.classList.remove('nav-quete');
    /* Une pilule fabriquee par la barre n'a pas d'adresse dans la page : elle
       se retire, et se refabrique si la promotion la redemande. */
    var fabFabrique = document.querySelector('.fab[data-fabrique]');
    if (fabFabrique && fabFabrique.parentNode) fabFabrique.parentNode.removeChild(fabFabrique);
    if (fabQ) {
      fabQ.classList.remove('quete');
      if (voileQ && fabQ.nextElementSibling !== voileQ) voileQ.parentNode.insertBefore(fabQ, voileQ);
      if (feuilleQ) feuilleQ.removeAttribute('data-pose');
      if (voileQ) voileQ.removeAttribute('data-pose');
    }
    var centreQ = document.querySelector('.centre');
    if (centreQ && centreQ.parentNode !== barre) barre.insertBefore(centreQ, droite);
    var rangOrphelin = document.querySelector('.tiroir-radio');
    if (rangOrphelin && !rangOrphelin.children.length) rangOrphelin.parentNode.removeChild(rangOrphelin);


    /* L'ECRAN DE SEJOUR PORTE SA QUETE DANS LA BARRE, A TOUTE TAILLE. La
       pilule prend le centre ; le groupe Mi + verbe passe a droite, devant le
       menu ; l'ilot de la radio descend au bas du tiroir, l'antenne en bout
       de rangee. Le geste focal ne vit plus jamais au bas de ces ecrans. Le
       bouton reste LE MEME element : ses ecouteurs voyagent avec lui. Un
       ecran de l'univers sans geste de quete propre recoit une pilule qui
       MENE a la quete : un lien vers l'ecran qui la porte, ouverte a
       l'arrivee, au libelle de la langue declaree du document. */
    if (corps.classList.contains('p-roam')) {
      corps.classList.add('nav-quete');
      if (!fabQ) {
        fabQ = document.createElement('a');
        fabQ.className = 'fab';
        fabQ.setAttribute('data-fabrique', '');
        fabQ.setAttribute('href', 'roam.html#quete');
        fabQ.textContent = ((document.documentElement.lang || 'fr').slice(0, 2) === 'en')
          ? 'Discover Benin' : 'Je découvre le Bénin';
      }
      fabQ.classList.add('quete');
      barre.insertBefore(fabQ, droite);
      if (feuilleQ) feuilleQ.setAttribute('data-pose', 'barre');
      if (voileQ) voileQ.setAttribute('data-pose', 'barre');
      /* La marque Mi | NU et le lecteur tiennent la meme rangee COLLANTE au
         bas du tiroir — la marque a gauche, le lecteur a droite, l'antenne
         DANS le lecteur a la place du bouton de lecture. */
      var bacSections = document.getElementById('sections');
      if (bacSections) {
        var rangTiroir = bacSections.querySelector('.tiroir-radio');
        if (!rangTiroir) {
          rangTiroir = document.createElement('div');
          rangTiroir.className = 'tiroir-radio';
        }
        bacSections.insertBefore(rangTiroir, bacSections.querySelector('.pied-politique'));
        var marqueQ = document.querySelector('.centre');
        if (marqueQ) rangTiroir.appendChild(marqueQ);
        if (ilot) {
          rangTiroir.appendChild(ilot);
          ilot.classList.remove('cache');
          if (antenne) ilot.appendChild(antenne);
        }
      }
    }

    /* La barre est une grille dont deux colonnes s'etirent : la largeur RENDUE
       de ses enfants remplit toujours le contenant, et ne dit donc rien de la
       place libre. C'est la largeur NATURELLE de chaque contenu qu'il faut
       sommer. */
    function librePresDe() {
      var pris = 0;
      Array.prototype.forEach.call(barre.children, function (el) {
        /* La pilule de quete CEDE : sa colonne se comprime jusqu'a son
           plancher — c'est donc son plancher qui se compte, jamais sa largeur
           naturelle, qui interdirait une promotion que l'ecran porte. */
        if (el.classList.contains('quete-groupe') || el.classList.contains('fab')) {
          var garde = el.style.width;
          el.style.width = 'min-content';
          pris += el.getBoundingClientRect().width;
          el.style.width = garde;
          return;
        }
        pris += el.scrollWidth;
      });
      return barre.getBoundingClientRect().width - pris;
    }

    /* Palier 1. La barre montee ne montre du super-nav que les icones et la
       legende du verbe courant : c'est CETTE forme qui se mesure — la forme
       du bas, legendes depliees, dirait une largeur qui n'existera pas. Le
       souffle exige de part et d'autre depend de ce que le centre met en
       valeur : la quete se contente de l'ecart minimal, le groupe de marque
       demande le sien. */
    if (!superNav) { if (radio) radio.rendre(); return; }
    var largeurNav = 0;
    Array.prototype.forEach.call(superNav.querySelectorAll('.verbe'), function (v) {
      var ic = v.querySelector('.ico-rond');
      largeurNav += ic ? ic.offsetWidth : v.offsetWidth;
      if (v.classList.contains('actif')) {
        var lg = v.querySelector('.verbe-dit');
        if (lg) largeurNav += lg.scrollWidth;
      }
    });
    var souffle = corps.classList.contains('nav-quete') ? ECART_NAV : SOUFFLE_MARQUE;
    if (librePresDe() < largeurNav + souffle * 2) { if (radio) radio.rendre(); return; }
    corps.classList.add('nav-haut');
    /* Le logo et les verbes forment un groupe : sans lui, la barre passerait a
       quatre colonnes et le logotype central cesserait d'etre central. */
    gauche = document.createElement('div');
    gauche.className = 'chrome-gauche';
    barre.insertBefore(gauche, barre.firstChild);
    gauche.appendChild(logo);
    gauche.appendChild(superNav);

    /* L'ecran de sejour au chrome monte : la pilule de quete prend la droite
       devant le hamburger, a la place de la radio, dont l'ilot entier descend
       au bas du tiroir du menu, l'antenne en bout de rangee. Le logotype
       garde le centre. Le bouton de quete reste LE MEME element : ses
       ecouteurs, son etat et son nom voyagent avec lui — un second bouton
       divergerait. La feuille s'ancre a la barre. PARTOUT AILLEURS, la radio
       garde la barre : sa rangee, son ancrage et son geste long sont ceux
       d'origine. */

    /* Palier 2 — sans objet sur une barre a quete : l'ilot vit au tiroir. */
    if (ilot && !corps.classList.contains('nav-quete')) {
      /* Deplie dans sa rangee, l'ilot s'etire sur toute la largeur : sa boite
         ne dit rien de ce qu'il lui faut. On lit donc sa largeur de contenu,
         le temps d'une mesure.

         DEUX largeurs se mesurent, pas une. La premiere est celle du texte
         entier. La seconde est le PLANCHER : le meme ilot dont l'etat est
         reduit a ses points de suspension — la forme la plus etroite ou il
         reste lui-meme, puisqu'il garde son nom, sa commande, et le signe
         qu'un etat est la mais coupe. Ce plancher n'est pas un nombre choisi,
         c'est une mesure.
         L'ancrage se decide sur le PLANCHER. L'ilot prend ensuite toute la
         place que sa borne lui laisse, jusqu'a sa largeur entiere, et son
         etat se coupe entre les deux. Decider sur la largeur entiere le
         privait d'ancrage partout ou il aurait tenu coupe — un ecran couche,
         par exemple. */
      var etaitCache = ilot.classList.contains('cache');
      ilot.classList.remove('cache');
      var gardeMax = ilot.style.maxWidth; ilot.style.maxWidth = 'none';
      ilot.style.width = 'max-content';
      var largeurIlot = ilot.scrollWidth;
      var etat = ilot.querySelector('.lecteur-etat');
      var plancher = largeurIlot;
      if (etat) {
        var dit = etat.textContent;
        etat.textContent = '\u2026';
        plancher = ilot.scrollWidth;
        etat.textContent = dit;
      }
      ilot.style.maxWidth = gardeMax; ilot.style.width = '';
      if (etaitCache) ilot.classList.add('cache');
      /* Le voisin de l'ilot ancre est le groupe de marque : c'est donc le
         souffle de la marque qui borne l'entree, pas l'ecart minimal. */
      if (librePresDe() >= plancher + SOUFFLE_MARQUE) {
        corps.classList.add('nav-ilot-ancre');
        droite.insertBefore(ilot, droite.firstChild);
        ilot.classList.remove('cache');
        /* La commande est toujours a droite : ancree, l'antenne prend sa place,
           donc sa place — la derniere. */
        if (antenne) ilot.appendChild(antenne);

        /* Ancre, l'ilot grandit vers la gauche, vers le logotype. Il ne doit
           jamais l'atteindre : il s'arrete un ecart avant, et son etat se
           coupe alors aux points de suspension. Sans cette borne, un etat
           bavard ou une langue plus longue le pousserait sous le logotype.
           La borne se lit apres l'ancrage : deplie dans sa rangee, l'ilot n'a
           ni la place ni le voisin qu'il a une fois ancre. */
        var centre = barre.querySelector('.centre');
        if (centre) {
          var libre = ilot.getBoundingClientRect().right
            - (centre.getBoundingClientRect().right + SOUFFLE_MARQUE);
          ilot.style.maxWidth = Math.max(0, Math.round(libre)) + 'px';
        }
      }
    }

    if (radio) radio.rendre();
  }

  /* ------------------------------------------------------------------
     ROOTS RADIO. Deux choix, un geste chacun : l'appui bref allume ou eteint
     l'antenne, l'appui long ouvre ou referme le lecteur. Seul un nouvel appui
     long replie le lecteur, et il reste deplie d'un ecran a l'autre : son etat
     est retenu par le navigateur, comme la langue.

     L'appui long n'appartient qu'au pointeur. La fleche bas, sur le bouton au
     foyer, ouvre le meme lecteur, et l'echappement le referme : retirer ces
     deux touches laisserait le lecteur inatteignable au clavier.

     L'adresse du flux est declaree ici. Vide, les commandes ne pilotent que
     l'etat affiche ; renseignee, elle doit aussi figurer dans le media-src de
     la politique de chaque page qui pose la radio.
     ------------------------------------------------------------------ */
  var FLUX_RADIO = '';
  var APPUI_LONG = 500;
  var CLE_RADIO = 'roots.radio';
  var CLE_ANTENNE = 'roots.radio.antenne';

  /* ANCRE, LE DEPART EST LE DEPLIE : la place est la, l'ilot la prend. Ce n'est
     donc pas la meme lecture de la memoire que sur un petit ecran, ou le depart
     est le replie faute de place. Une seule memoire, deux rendus : elle ne dit
     « range-toi » que si on le lui a demande. */
  function lecteurRange() {
    try { return localStorage.getItem(CLE_RADIO) === 'ferme'; } catch (e) { return false; }
  }

  function lecteurRetenu() {
    try { return localStorage.getItem(CLE_RADIO) === 'ouvert'; } catch (e) { return false; }
  }
  function retenirLecteur(ouvert) {
    try { localStorage.setItem(CLE_RADIO, ouvert ? 'ouvert' : 'ferme'); } catch (e) {}
  }
  /* L'antenne se retient comme le lecteur : passer d'un univers a l'autre est
     une navigation, pas une extinction. */
  function antenneRetenue() {
    try { return localStorage.getItem(CLE_ANTENNE) === 'ouverte'; } catch (e) { return false; }
  }
  function retenirAntenne(ouverte) {
    try { localStorage.setItem(CLE_ANTENNE, ouverte ? 'ouverte' : 'fermee'); } catch (e) {}
  }

  function poserRadio(getLangue) {
    var droite = document.querySelector('.chrome-droite');
    if (!droite || document.getElementById('btnRadio')) return null;

    var haut = droite.closest('.chrome-haut');
    if (!haut) return null;

    var bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'radio-pastille';
    bouton.id = 'btnRadio';
    bouton.setAttribute('aria-pressed', 'false');
    bouton.setAttribute('aria-expanded', 'false');
    bouton.setAttribute('aria-controls', 'languetteRadio');
    bouton.setAttribute('data-al-chrome', 'radio');
    bouton.innerHTML = '<svg class="i" aria-hidden="true"><use href="#i-radio"/></svg>';
    droite.insertBefore(bouton, droite.firstChild);

    /* Le lecteur est une rangee du chrome, pas un ilot pose dessus : la barre
       grandit quand il s'ouvre. Sa rangee reprend la boite de `.chrome-inner`,
       et l'ilot s'arrete a droite sur le bord de l'antenne — la largeur du
       hamburger et son ecart sont donc retires a droite. */
    var rangee = document.createElement('div');
    rangee.className = 'radio-rangee';
    rangee.innerHTML =
      '<div class="languette-radio cache" id="languetteRadio" role="group" aria-label="Roots Radio">' +
      '<span class="lecteur-texte"><b class="lecteur-titre">Roots Radio</b>' +
      '<span class="point-pied" aria-hidden="true">\u00b7</span>' +
      '<small class="lecteur-etat"></small></span>' +
      '<button type="button" class="lecteur-btn" id="btnRadioLecture" data-al-chrome="radioLire">' +
      '<svg class="i" aria-hidden="true"><use href="#i-play"/></svg></button></div>';
    haut.appendChild(rangee);

    var pastille = bouton;
    var languette = rangee.querySelector('#languetteRadio');
    var lecture = rangee.querySelector('#btnRadioLecture');
    var etat = rangee.querySelector('.lecteur-etat');
    var son = null, minuteur = null, longFait = false;

    function alAntenne() { return pastille.getAttribute('aria-pressed') === 'true'; }

    function direAntenne() {
      var table = LIBELLES[getLangue()] || LIBELLES.fr;
      var ouverte = alAntenne();
      pastille.classList.toggle('antenne', ouverte);
      /* L'ilot prend l'encre de l'antenne : l'etat se lit alors dans la
         couleur du panneau, pas seulement dans le pictogramme. */
      languette.classList.toggle('antenne', ouverte);
      pastille.setAttribute('aria-label', table.radio);
      lecture.querySelector('use').setAttribute('href', ouverte ? '#i-pause' : '#i-play');
      lecture.setAttribute('data-al-chrome', ouverte ? 'radioArret' : 'radioLire');
      lecture.setAttribute('aria-label', ouverte ? table.radioArret : table.radioLire);
      etat.textContent = ouverte ? table.radioAntenne : table.radioEteinte;
    }

    function basculerAntenne(depuisPastille) {
      var ouvrir = !alAntenne();
      if (FLUX_RADIO) {
        if (!son) { son = new Audio(FLUX_RADIO); son.preload = 'none'; }
        if (ouvrir) { var r = son.play(); if (r && r['catch']) r['catch'](function () {}); }
        else { son.pause(); }
      }
      pastille.setAttribute('aria-pressed', ouvrir ? 'true' : 'false');
      retenirAntenne(ouvrir);
      direAntenne();
      if (!depuisPastille) return;
      if (ouvrir) revelerUnInstant();
      else if (passager) replierPassager();
    }

    /* COMBIEN DE TEMPS LE LECTEUR SE MONTRE APRES UN APPUI BREF QUI ALLUME.
       Le mouvement d'entree et de sortie vient de l'echelle du systeme :
       l'apparition d'un bandeau y vaut 240 ms. Le TEMPS DE POSE, lui, n'est
       pas une duree de mouvement et l'echelle n'en porte pas ; il est repris
       du delai court des messages passagers d'Android — 2 000 ms, la valeur
       du cadre, non un chiffre choisi.
       Il tient sous les cinq secondes du seuil de mise en pause, et rien
       n'est dit par cette seule apparition : l'etat vit en permanence sur la
       pastille, qui le porte en couleur et en intitule. Le foyer pose dans le
       lecteur suspend le repli : personne ne se fait retirer ce qu'il lit. */
    var POSE_LECTEUR = 2000;
    var MVT_LECTEUR = 240;
    var repli = null;
    var pose, passager;

    function ancre() { return document.body.classList.contains('nav-ilot-ancre'); }

    function montrerLecteur(ouvrir, retenir) {
      clearTimeout(repli);
      /* Un geste qui DECIDE clot l'episode passager : ce qui suit ne se
         replie plus tout seul. */
      if (retenir !== false) { passager = false; clearTimeout(pose); }
      if (ouvrir) {
        languette.classList.add('parait');
        languette.classList.remove('cache');
        /* Une boite qui vient de quitter `display:none` ne transite pas : il
           lui faut un rendu a l'etat de depart avant qu'on l'en sorte. */
        languette.getBoundingClientRect();
        languette.classList.remove('parait');
      } else if (!languette.classList.contains('cache')) {
        languette.classList.add('parait');
        repli = setTimeout(function () { languette.classList.add('cache'); }, MVT_LECTEUR);
      }
      pastille.setAttribute('aria-expanded', ouvrir ? 'true' : 'false');
      if (retenir !== false) retenirLecteur(ouvrir);
    }

    /* Allumer d'un appui bref montre ce qui vient d'etre allume, puis rend
       l'ecran. Ce passage n'ECRIT PAS le choix : seul l'appui long decide que
       le lecteur reste.
       `passager` dit que le lecteur n'est la QUE le temps de cette pose. Il
       est la seule chose qui autorise un repli automatique : un lecteur
       ouvert par appui long, ou ancre dans la barre faute de place ailleurs,
       n'est jamais passager et ne se replie donc jamais seul. */
    pose = null;
    passager = false;

    function armerPose() {
      clearTimeout(pose);
      pose = setTimeout(function () { if (passager) replierPassager(); }, POSE_LECTEUR);
    }

    function replierPassager() {
      clearTimeout(pose);
      passager = false;
      if (ancre()) languette.classList.add('replie');
      else montrerLecteur(false, false);
    }

    /* Range, il se deploie le temps de la pose puis se range de nouveau ;
       replie, il se montre puis se replie. Deux rendus, un seul passage — et
       rien a faire quand il est deja sous les yeux. */
    function revelerUnInstant() {
      if (ancre()) {
        if (!languette.classList.contains('replie')) return;
        passager = true;
        languette.classList.remove('replie');
        armerPose();
        return;
      }
      if (lecteurRetenu()) return;
      passager = true;
      montrerLecteur(true, false);
      armerPose();
    }

    /* Toucher le lecteur passager REPART la pose au lieu de l'annuler : on ne
       retire pas ce qui est en train d'etre lu ou presse, et on ne le laisse
       pas non plus s'installer. Seul l'appui long l'installe. */
    ['click', 'focusin'].forEach(function (nom) {
      languette.addEventListener(nom, function () { if (passager) armerPose(); });
    });

    pastille.addEventListener('pointerdown', function () {
      longFait = false;
      clearTimeout(minuteur);
      minuteur = setTimeout(function () {
        longFait = true;
        clearTimeout(pose);
        /* Ancre, le geste long RANGE au lieu d'effacer : la memoire est la
           meme, seul son rendu change d'un ecran a l'autre. */
        if (ancre()) {
          passager = false;
          clearTimeout(pose);
          var range = !languette.classList.contains('replie');
          languette.classList.toggle('replie', range);
          retenirLecteur(!range);
          pastille.setAttribute('aria-expanded', range ? 'false' : 'true');
          return;
        }
        montrerLecteur(languette.classList.contains('cache'));
      }, APPUI_LONG);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (nom) {
      pastille.addEventListener(nom, function () { clearTimeout(minuteur); });
    });
    /* Un appui maintenu ouvre le menu du systeme sur mobile : il avalerait le
       geste long. */
    pastille.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    pastille.addEventListener('click', function () {
      if (longFait) { longFait = false; return; }
      basculerAntenne(true);
    });
    pastille.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowDown') return;
      e.preventDefault();
      clearTimeout(pose);
      montrerLecteur(true);
      lecture.focus();
    });
    lecture.addEventListener('click', function () { basculerAntenne(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' || languette.classList.contains('cache')) return;
      clearTimeout(pose);
      montrerLecteur(false);
      pastille.focus();
    });

    montrerLecteur(lecteurRetenu(), false);
    pastille.setAttribute('aria-pressed', antenneRetenue() ? 'true' : 'false');
    direAntenne();
    return { dire: direAntenne, montrer: montrerLecteur, rendre: function () {
      /* Ancre, l'ilot ne se replie plus : sa memoire ne gouverne que le petit
         ecran. */
      passager = false;
      clearTimeout(pose);
      if (ancre()) {
        var range = lecteurRange();
        languette.classList.toggle('replie', range);
        montrerLecteur(true, false);
        pastille.setAttribute('aria-expanded', range ? 'false' : 'true');
      } else {
        languette.classList.remove('replie');
        montrerLecteur(lecteurRetenu(), false);
      }
      direAntenne();
    } };
  }

  /* Navigation partagée. opts :
       getLangue   : () => 'fr' | 'en'
       getSections : (langue) => [ {ico,t,s,href}, ... ]
       toastNu     : (langue) => texte
       toastVerbe  : (langue, libelle) => texte
       verbes      : { plan:'Plan', roots:'Roots', roam:'Roam' }
       onVerbe     : (verbe, bouton) => true si la page a géré le verbe
       onLangue    : () => bascule la langue de la page
     Retourne { toast, dessinerSections, fermerMenu }. */
  var POLITIQUE = { fr: 'Politique de confidentialité', en: 'Privacy policy' };

  /* ------------------------------------------------------------------
     LA NAVIGATION, DECLAREE UNE SEULE FOIS.
     Elle vivait auparavant en quatre copies, une par ecran, a l'interieur
     de leurs scripts respectifs — et deux ecrans (paiement, facture)
     portaient le conteneur du tiroir sans aucune liste, donc un tiroir
     vide. Ajouter un ecran se fait desormais ICI, et nulle part ailleurs.

     LA LISTE NE CHANGE PAS D'UN ECRAN A L'AUTRE. Une navigation repetee
     doit apparaitre dans le meme ordre sur chaque page — WCAG 3.2.3,
     niveau AA. L'entree de la page courante n'est donc pas retiree : elle
     est MARQUEE, par aria-current et par une classe. Retirer l'entree
     ferait changer la forme du menu d'un ecran a l'autre, ce qui desoriente
     et prive le lecteur d'ecran de sa position.
     ------------------------------------------------------------------ */
  /* Le tiroir ne liste que les ecrans de l'univers courant : changer
     d'univers passe par le super-nav, jamais par le tiroir. */
  /* Le tiroir parle la langue de son univers : un menu ne renvoie jamais vers
     les pages d'un autre monde. Une entree sans adresse est un titre pose en
     attendant sa destination — elle se rend eteinte, sans promesse de geste. */
  var NAV = {
    fr: [
      { ico: 'i-carte',      t: 'La carte',           s: 'Toute la carte, en détail', href: 'carte.html' },
      { ico: 'i-calendrier', t: 'Réserver un espace', s: 'Le jardin, le bureau',      href: 'index.html?ouvrir=reserver' },
      { ico: 'i-ticket',     t: 'Retrouver ma résa',  s: 'Réservation ou commande, avec ton code', href: 'retrouver.html' }
    ],
    en: [
      { ico: 'i-carte',      t: 'Menu',         s: 'The full menu, in detail',   href: 'carte.html' },
      { ico: 'i-calendrier', t: 'Book a space', s: 'The garden, the office',     href: 'index.html?ouvrir=reserver' },
      { ico: 'i-ticket',     t: 'Find a booking', s: 'A booking or an order, with your code', href: 'retrouver.html' }
    ]
  };
  var NAV_ROAM = {
    fr: [
      { ico: 'i-sac',    t: 'Séjourner',       s: 'Les lieux et les Roots Roamer', href: '#sejourner' },
      { ico: 'i-ticket', t: 'Découvrir',       s: 'Sorties, pépites et événements', href: '#decouvrir' },
      { ico: 'i-carte',  t: 'Infos pratiques', s: 'Numéros utiles et repères',      href: '#infos' }
    ],
    en: [
      { ico: 'i-sac',    t: 'Stay',           s: 'The places and the Roots Roamers', href: '#sejourner' },
      { ico: 'i-ticket', t: 'Discover',       s: 'Outings, gems and events',         href: '#decouvrir' },
      { ico: 'i-carte',  t: 'Practical info', s: 'Useful numbers and landmarks',     href: '#infos' }
    ]
  };
  var NAV_SPACE = {
    fr: [
      { ico: 'i-plan',       t: 'Dashboard', s: '' },
      { ico: 'i-calendrier', t: 'Sprints',   s: '' },
      { ico: 'i-table',      t: 'Projets',   s: '' },
      { ico: 'i-check',      t: 'Missions',  s: '' },
      { ico: 'i-ticket',     t: 'Finances',  s: '' }
    ],
    en: [
      { ico: 'i-plan',       t: 'Dashboard', s: '' },
      { ico: 'i-calendrier', t: 'Sprints',   s: '' },
      { ico: 'i-table',      t: 'Projects',  s: '' },
      { ico: 'i-check',      t: 'Missions',  s: '' },
      { ico: 'i-ticket',     t: 'Finances',  s: '' }
    ]
  };

  /* ------------------------------------------------------------------
     LES LIBELLES DU CHROME QUE SEUL UN LECTEUR D'ECRAN ENTEND.
     Un `aria-label` est un texte lu par un utilisateur, au meme titre
     qu'un libelle visible : il suit donc la langue de l'ecran. Ecrit en
     dur dans le balisage, il reste dans une langue quoi que fasse le
     bouton de langue, et toute la barre s'annonce alors dans l'autre.
     Un element se declare par `data-al-chrome` et son libelle vit ICI,
     une seule fois pour les six ecrans.

     `data-al` appartient aux ecrans et pointe leur propre table : les
     deux attributs ne se croisent pas.

     NE PORTENT PAS DE LIBELLE : Plan, Roots, Roam et Roots Radio, qui
     sont des noms propres et ne se traduisent dans aucune langue.
     ------------------------------------------------------------------ */
  var LIBELLES = {
    fr: {
      accueil: 'Accueil', menu: 'Menu', fermer: 'Fermer', langue: 'Langue',
      radio: 'Roots Radio — allumer ou éteindre, appui long pour le lecteur',
      radioLire: 'Allumer la radio', radioArret: 'Éteindre la radio',
      radioAntenne: 'À l’antenne', radioEteinte: 'Hors antenne',
      mode: 'Basculer Mi / NU', moins: 'Moins', plus: 'Plus',
      feuille: 'Réserver ou commander', commande: 'Ma commande',
      taille: 'Taille du texte',
      tailleMoins: 'Réduire la taille du texte',
      taillePlus: 'Augmenter la taille du texte'
    },
    en: {
      accueil: 'Home', menu: 'Menu', fermer: 'Close', langue: 'Language',
      radio: 'Roots Radio — switch on or off, press and hold for the player',
      radioLire: 'Switch the radio on', radioArret: 'Switch the radio off',
      radioAntenne: 'On air', radioEteinte: 'Off air',
      mode: 'Switch between Mi and NU', moins: 'Fewer people', plus: 'More people',
      feuille: 'Book or order', commande: 'Your order',
      taille: 'Text size',
      tailleMoins: 'Decrease text size',
      taillePlus: 'Increase text size'
    }
  };

  function poserLibelles(langue) {
    var table = LIBELLES[langue] || LIBELLES.fr;
    Array.prototype.forEach.call(
      document.querySelectorAll('[data-al-chrome]'), function (el) {
        var v = table[el.getAttribute('data-al-chrome')];
        if (typeof v === 'string') el.setAttribute('aria-label', v);
      });
  }

  function ici() { return location.pathname.split('/').pop() || 'index.html'; }

  function nav(langue) {
    var page = ici();
    var table = NAV;
    if (/(?:^|\s)p-roam(?:\s|$)/.test(document.body.className)) table = NAV_ROAM;
    else if (/(?:^|\s)p-space(?:\s|$)/.test(document.body.className)) table = NAV_SPACE;
    return (table[langue] || table.fr).map(function (e) {
      var copie = { ico: e.ico, t: e.t, s: e.s, href: e.href };
      /* Un lien vers soi AVEC parametre est une action et non une navigation :
         « Reserver un espace » ouvre la feuille depuis l'accueil, il ne s'y
         marque donc pas comme page courante. */
      copie.courant = !!e.href && e.href.indexOf('?') === -1 && e.href === page;
      return copie;
    });
  }

  function initChrome(opts) {
    opts = opts || {};
    var getLangue = opts.getLangue || function () { return 'fr'; };
    var getSections = opts.getSections || function () { return []; };
    var toastNu = opts.toastNu || function () { return ''; };
    var toastVerbe = opts.toastVerbe || function (l, v) { return v; };
    var verbes = opts.verbes || { space: 'Space', roots: 'Roots', roam: 'Roam' };
    var onVerbe = opts.onVerbe || null;

    var toastTimer = null;
    var toastArme = false;
    var TOAST_TENUE = 2600;
    function toast(msg) {
      var el = document.getElementById('toast');
      if (!el) return;
      /* Une annonce sans texte n'est pas une annonce : elle rend une pastille
         vide, que le lecteur voit apparaitre sans rien pouvoir en lire. Un
         ecran qui n'a pas fourni sa phrase ne dit rien du tout. */
      msg = (msg == null) ? '' : String(msg).trim();
      if (!msg) return;
      el.textContent = msg;
      el.classList.add('visible');
      /* Le decompte se suspend tant que le pointeur tient l'annonce et repart
         ENTIER au depart : ce qu'on est en train de lire ne se retire pas sous
         les yeux. Le pointeur seul — l'annonce ne prend pas le foyer et
         n'entre pas dans le parcours au clavier ; sur une surface sans survol
         la feuille ne lui rend pas le pointeur, et le decompte court.
         Les ecouteurs se posent une fois : l'element est unique et permanent,
         en reposer a chaque annonce en empilerait autant que d'annonces. */
      if (!toastArme) {
        toastArme = true;
        el.addEventListener('pointerenter', function () { clearTimeout(toastTimer); });
        el.addEventListener('pointerleave', function () { armerToast(el); });
      }
      armerToast(el);
    }

    function armerToast(el) {
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { el.classList.remove('visible'); }, TOAST_TENUE);
    }

    /* Pastille Mi/NU : elle s'étire à l'ouverture et, quand elle VIT DANS LA
       BARRE, la barre passe en « deploie », ce qui efface le reste du chrome
       le temps du choix ; à la fermeture, le reste ne revient qu'une fois la
       pastille repliée. Déplacée hors de la barre — au tiroir —, elle ne
       parle plus qu'à sa propre rangée : son porteur se relit à CHAQUE geste,
       jamais retenu d'un état ancien. */
    var marque = document.getElementById('marque');
    if (marque) {
      var sw = document.getElementById('switchMode');
      var nu = marque.querySelector('.nu');
      var repli = null;
      var calme = window.matchMedia
        && matchMedia('(prefers-reduced-motion: reduce)').matches;
      var ouvrir = function (v) {
        marque.classList.toggle('ouvert', v);
        var inner = marque.closest('.chrome-inner');
        if (!inner) return;
        clearTimeout(repli);
        if (v || calme) {
          inner.classList.toggle('deploie', v);
          return;
        }
        repli = setTimeout(function () {
          if (!marque.classList.contains('ouvert')) inner.classList.remove('deploie');
        }, 380);
      };
      marque.addEventListener('transitionend', function (e) {
        if (e.propertyName !== 'max-width') return;
        clearTimeout(repli);
        var inner = marque.closest('.chrome-inner');
        if (inner && !marque.classList.contains('ouvert')) inner.classList.remove('deploie');
      });
      marque.addEventListener('click', function (e) {
        e.stopPropagation();
        var surSwitch = sw && sw.contains(e.target);
        var surCible = nu && nu.contains(e.target);
        if (surSwitch || surCible) { toast(toastNu(getLangue())); return; }
        ouvrir(!marque.classList.contains('ouvert'));
      });
      document.addEventListener('click', function (e) { if (!marque.contains(e.target)) ouvrir(false); });
    }

    var superNav = document.getElementById('superNav');
    /* Chaque verbe porte sa legende : sous l'icone quand la barre tient le
       bas, a droite quand elle est montee. Le nom du bouton devient son texte
       visible — une etiquette cachee qui dirait autre chose ferait diverger
       ce qu'on lit de ce qu'on entend. La legende suit la langue. */
    var LEGENDES = {
      space: { fr: 'Organiser', en: 'Plan' },
      roots: { fr: 'Connecter', en: 'Connect' },
      roam:  { fr: 'Voyager',   en: 'Discover' }
    };
    function poserLegendes() {
      if (!superNav) return;
      Array.prototype.forEach.call(superNav.querySelectorAll('.verbe'), function (b) {
        var l = LEGENDES[b.dataset.verbe];
        if (!l) return;
        var dit = b.querySelector('.verbe-dit');
        if (!dit) {
          dit = document.createElement('span');
          dit.className = 'verbe-dit';
          b.appendChild(dit);
          b.removeAttribute('aria-label');
        }
        dit.textContent = l[getLangue()] || l.fr;
      });
    }
    poserLegendes();
    /* Un univers qui a son ecran est une destination, pas une promesse. Un
       bouton marque dormant reste une annonce : c'est le balisage de la page,
       et lui seul, qui decide si la destination existe pour elle. */
    var DESTINATION = { roots: 'index.html', roam: 'roam.html', space: 'space.html' };
    /* Le verbe Organiser a DEUX ecrans, et l'arbitrage se rend ICI, une
       fois : l'outil pour qui porte une session, la couverture pour qui n'en
       porte pas. Chaque appel relit l'etat au moment du geste — un etat lu
       une fois au chargement mentirait des la premiere connexion — et tous
       les porteurs du verbe en heritent sans en savoir un mot. */
    function destinationDe(v) {
      if (v === 'space'
          && !(global.Roots.db && global.Roots.db.estConnecte && global.Roots.db.estConnecte())) {
        return 'onboard.html';
      }
      return DESTINATION[v];
    }
    /* L'univers d'un ecran est celui de sa classe de corps — une page
       satellite peut le recevoir a l'ouverture. Le chrome suit cette classe,
       et elle seule : le verbe de l'univers porte l'etat actif, le logotype
       central dit le meme univers et mene a son ecran. L'etat de page courante
       ne se pose pas ici : il appartient au balisage de l'ecran qui EST la
       destination ; il se retire seulement d'un verbe d'un AUTRE univers,
       sans quoi ce verbe remonterait la page au lieu d'y mener. */
    function poserUnivers() {
      var u = (document.body.className.match(/\bp-(roam|space)\b/) || [null, 'roots'])[1];
      var titre = document.querySelector('.chrome-titre');
      if (titre && DESTINATION[u]) {
        /* Un ecran qui EST un module de son univers nomme ce module sur le
           corps ; le nom de surface le porte alors, et le lien continue de
           mener a l'ecran d'accueil de l'univers. Sans cette lecture, tout
           ecran voulant son propre nom devrait le reecrire APRES le chrome —
           et le perdrait a chaque repose du nav. */
        titre.textContent = document.body.dataset.module || verbes[u];
        titre.setAttribute('href', destinationDe(u));
      }
      if (superNav) Array.prototype.forEach.call(superNav.querySelectorAll('.verbe'), function (b) {
        var sien = b.dataset.verbe === u;
        b.classList.toggle('actif', sien);
        if (!sien) b.removeAttribute('aria-current');
      });
    }
    poserUnivers();
    if (superNav) superNav.addEventListener('click', function (e) {
      var b = e.target.closest('.verbe'); if (!b) return;
      var v = b.dataset.verbe;
      if (onVerbe && onVerbe(v, b)) return;

      /* Le verbe mene a son ecran, sauf quand on y est deja — le bouton porte
         alors aria-current et remonte la page. */
      if (DESTINATION[v] && b.getAttribute('aria-disabled') !== 'true') {
        if (b.getAttribute('aria-current') === 'true') { global.scrollTo({ top: 0, behavior: 'smooth' }); return; }
        global.location.assign(destinationDe(v));
        return;
      }
      toast(toastVerbe(getLangue(), verbes[v]));
    });

    var voile = document.getElementById('voileMenu');
    var drawer = document.getElementById('drawer');
    var burger = document.getElementById('btnBurger');
    var menu = drawer ? modale(drawer, {
      cle: 'menu',
      montrer: function () {
        drawer.classList.add('visible');
        if (voile) voile.classList.add('visible');
      },
      cacher: function () {
        drawer.classList.remove('visible');
        if (voile) voile.classList.remove('visible');
      }
    }) : null;
    function fermerMenu() { if (menu) menu.fermer(); }
    if (burger && menu) burger.addEventListener('click', function () { menu.ouvrir(); });
    var btnFermer = document.getElementById('fermerMenu');
    if (btnFermer) btnFermer.addEventListener('click', fermerMenu);
    if (voile) voile.addEventListener('click', fermerMenu);

    var radio = opts.radio ? poserRadio(getLangue) : null;

    var minuteurNav = null;
    function replacerNav() {
      clearTimeout(minuteurNav);
      minuteurNav = setTimeout(function () {
        /* Le clavier qui se leve EST un redimensionnement : rearbitrer la
           barre pendant qu'on ecrit dedans defait et refait le champ, le
           foyer tombe et le clavier se referme aussitot. Tant que le foyer
           vit dans la barre, l'arbitrage attend ; il repart au
           redimensionnement suivant, que la fermeture du clavier declenche. */
        var foyer = document.activeElement;
        if (foyer && (foyer.tagName === 'INPUT' || foyer.tagName === 'TEXTAREA')
            && foyer.closest('.chrome-inner')) return;
        ajusterNav(radio);
      }, 120);
    }
    window.addEventListener('resize', replacerNav);
    window.addEventListener('orientationchange', replacerNav);
    ajusterNav(radio);
    /* La barre ne se montre qu'ARBITREE SUR LES BONNES FONTES : mesuree sur
       les fontes de substitution, la promotion se refuse a tort — le nav
       parait au bas puis saute en haut, et la traversee d'univers fond vers
       un chrome faux. Fontes deja la (navigation chaude) : le rideau se leve
       dans le meme tour. Sinon : a leur arrivee, borne court — un rideau qui
       attend le reseau retiendrait la page entiere. */
    function leverLeRideau() {
      if (document.body.classList.contains('nav-pret')) return;
      ajusterNav(radio);
      document.body.classList.add('nav-pret');
    }
    if (document.fonts && document.fonts.status !== 'loaded') {
      document.fonts.ready.then(leverLeRideau);
      setTimeout(leverLeRideau, 600);
    } else {
      document.body.classList.add('nav-pret');
    }

    function dessinerSections() {
      /* Les libelles du chrome suivent la meme bascule que la liste : chaque
         ecran rappelle deja cette fonction au changement de langue. */
      poserLibelles(getLangue());
      poserLegendes();
      if (radio) radio.dire();
      ajusterNav(radio);
      var cont = document.getElementById('sections');
      if (!cont) return;
      var liste = getSections(getLangue()) || [];
      /* Ce que la barre a pose dans le tiroir se retire avant que la liste ne
         se redessine, et se repose avant le pied — un element detruit perd ses
         ecouteurs, un element deplace les garde. La rangee du bas voyage
         ENTIERE : la vider de ses occupants les detacherait du document. */
      var rangRadio = cont.querySelector('.tiroir-radio');
      if (rangRadio) rangRadio.parentNode.removeChild(rangRadio);
      var ilotRadio = document.getElementById('languetteRadio');
      if (ilotRadio && !ilotRadio.closest('.menu-pop')) ilotRadio = null;
      cont.innerHTML = '';
      liste.forEach(function (s) {
        var a = document.createElement(s.href ? 'a' : 'span');
        a.className = 'lien-section' + (s.href ? '' : ' dormant');
        if (s.href) a.href = s.href;
        /* Une entree du tiroir ne porte que son titre : la description
           redirait ce que la section dit elle-meme en arrivant. */
        a.innerHTML = '<span class="ico"><svg class="i"><use href="#' + s.ico + '"/></svg></span>' +
          '<span class="txt"><span class="t"></span></span>' +
          (s.href ? '<svg class="i fleche"><use href="#i-chevron"/></svg>' : '');
        a.querySelector('.t').textContent = s.t;
        if (s.courant) { a.classList.add('courant'); a.setAttribute('aria-current', 'page'); }
        /* Une ancre reste sur la page : le tiroir se referme, puis le geste
           va lui-meme a sa section. Laisser l'ancre naviguer d'elle-meme la
           met en course avec le retour que la fermeture du tiroir consomme —
           quand ce retour gagne, la page ne bouge pas. */
        if (s.href && s.href.charAt(0) === '#') a.addEventListener('click', function (e) {
          e.preventDefault();
          var but = document.getElementById(s.href.slice(1));
          /* Le retour d'historique de la fermeture RESTAURE le defilement de
             l'entree precedente : aller au but avant qu'il n'aboutisse serait
             aussitot defait. On y va donc apres lui — et a defaut d'entree a
             consommer, apres une courte pose. */
          var fait = false;
          var aller = function () {
            if (fait || !but) return;
            fait = true;
            but.scrollIntoView({ block: 'start' });
          };
          window.addEventListener('popstate', function une() {
            window.removeEventListener('popstate', une);
            setTimeout(aller, 0);
          });
          setTimeout(aller, 250);
          fermerMenu();
        });
        cont.appendChild(a);
      });
      if (rangRadio) cont.appendChild(rangRadio);
      else if (ilotRadio) cont.appendChild(ilotRadio);
      /* La politique ferme le menu, en second niveau : une ligne soulignee,
         pas une entree de navigation. Son etiquette reprend mot pour mot celle
         que les notices de consentement emploient pour la designer ; s'en
         ecarter casse le renvoi que la notice vient de faire. */
      var pied = document.createElement('div');
      pied.className = 'pied-politique';
      /* La bascule de langue vit dans le chrome OU dans ce pied, jamais aux
         deux : un ecran qui porte encore le bouton de chrome n'en recoit pas
         de second ici. Le libelle nomme la langue vers laquelle on bascule,
         comme le bouton de chrome. */
      if (!document.querySelector('.lang-btn') && typeof opts.onLangue === 'function') {
        var bl = document.createElement('button');
        bl.type = 'button';
        bl.className = 'lien-langue';
        /* Deux lettres, et l'attribut de langue avec : une synthese vocale qui
           lit « EN » a la francaise ne dit rien. Le nom accessible porte le
           mot entier, que les lettres seules ne donnent pas. */
        bl.textContent = getLangue() === 'fr' ? 'EN' : 'FR';
        bl.setAttribute('lang', getLangue() === 'fr' ? 'en' : 'fr');
        bl.setAttribute('aria-label', LIBELLES[getLangue()].langue || 'Langue');
        bl.addEventListener('click', function () { opts.onLangue(); });
        pied.appendChild(bl);
        var point = document.createElement('span');
        point.className = 'point-pied';
        point.setAttribute('aria-hidden', 'true');
        point.textContent = '\u00b7';
        pied.appendChild(point);
      }
      var lien = document.createElement('a');
      lien.href = adresseConfidentialite();
      lien.textContent = POLITIQUE[getLangue()] || POLITIQUE.fr;
      if (ici() === 'confidentialite.html') {
        lien.classList.add('courant');
        lien.setAttribute('aria-current', 'page');
      }
      pied.appendChild(lien);
      cont.appendChild(pied);
    }

    /* La politique s'ouvre dans l'univers d'ou l'on vient : l'adresse porte le
       monde, et la page le lit. Le tronc adresse aussi les liens ecrits dans
       les pages — aucun ecran n'a a le savoir. */
    function adresseConfidentialite() {
      var m = document.body.className.match(/(?:^|\s)p-(roam|space)(?:\s|$)/);
      return 'confidentialite.html' + (m ? '?monde=' + m[1] : '');
    }
    Array.prototype.forEach.call(
      document.querySelectorAll('a[href="confidentialite.html"]'),
      function (a) { a.setAttribute('href', adresseConfidentialite()); });
    dessinerSections();

    return { toast: toast, dessinerSections: dessinerSections, fermerMenu: fermerMenu };
  }


  /* ------------------------------------------------------------------------
     Un panneau qui se declare modal doit l'etre. Trois choses, qu'aucun ecran
     ne refait dans son coin :
       — le focus n'en sort pas tant qu'il est ouvert ;
       — la touche d'echappement le referme ;
       — le geste « retour » du telephone le referme au lieu de quitter la page.
     Le troisieme point est le plus important : sur telephone, « retour » est un
     geste systeme. Sans entree d'historique, il emporte la saisie et sort du
     site.
     ------------------------------------------------------------------------ */

  var FOCUSABLES = 'a[href],button:not([disabled]),input:not([disabled]),' +
    'select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

  function visibles(hote) {
    return Array.prototype.filter.call(hote.querySelectorAll(FOCUSABLES), function (e) {
      return e.offsetParent !== null || e === document.activeElement;
    });
  }


  /* ------------------------------------------------------------------
     LE DEPLIANT DE FACTURATION — « facturer a une entreprise ».

     CE QU'IL FAIT. Il recueille le nom, l'identifiant fiscal et l'adresse a qui
     la facture doit etre adressee, quand ce n'est pas le payeur. Sans lui, la
     piece porte le nom et l'adresse que le prestataire d'encaissement rend.

     LE MOMENT EST CONTRAINT. La porte refuse des qu'une piece de vente existe,
     et le scellement suit le paiement d'une seconde. Il n'existe donc qu'une
     fenetre : apres l'ouverture de la vente, AVANT le guichet du prestataire.
     Ce bloc se pose sur un ecran de confirmation, jamais sur un ecran de remise.

     CE QU'IL REFUSE AVANT D'APPELER. La porte refuse deja ces quatre cas, mais
     un refus de base remonte au visiteur en langue de machine : nom vide,
     identifiant hors bornes ou non numerique, adresse portant un signe de
     masquage, adresse de forme invalide.

     CE QU'IL NE VERIFIE PAS, ET QU'IL DIT. La validite d'un identifiant fiscal
     ne se verifie pas ici — aucun registre n'est consultable depuis un
     navigateur. La plateforme fiscale, elle, refuse une piece dont
     l'identifiant lui est inconnu, et plus rien n'est modifiable ensuite.

     REPLIE PAR DEFAUT, et le bouton porte `aria-expanded`. La forme suit le
     pattern « disclosure » : un bouton, un etat, un contenu ; Entree et Espace
     basculent parce que c'est un bouton et rien d'autre.
     ------------------------------------------------------------------ */
  var MOTS_FACTURATION = {
    fr: {
      ouvrir: 'Facturer à une entreprise',
      nom: 'Nom ou raison sociale',
      ifu: 'Identifiant fiscal (IFU)',
      courriel: 'Courriel de facturation',
      manqueNom: 'Indiquez le nom ou la raison sociale.',
      manqueIfu: 'Indiquez l’identifiant fiscal (IFU).',
      manqueAdresse: 'Indiquez le courriel de facturation.',
      ifuFaux: 'L’identifiant fiscal porte treize chiffres.',
      adresseFausse: 'Vérifiez cette adresse électronique.'
    },
    en: {
      ouvrir: 'Bill this to a company',
      nom: 'Name or company name',
      ifu: 'Tax ID (IFU)',
      courriel: 'Billing email',
      manqueNom: 'Enter the name or company name.',
      manqueIfu: 'Enter the tax ID (IFU).',
      manqueAdresse: 'Enter the billing email.',
      ifuFaux: 'A tax ID is thirteen digits.',
      adresseFausse: 'Check this email address.'
    }
  };

  /* Meme grammaire d'adresse que la base, et memes signes de masquage : un
     ecran qui accepterait ce que la porte refuse promettrait pour rien. */
  var ADRESSE_LISIBLE = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i;
  var MASQUE_FACTURATION = /[•·…*]/;
  var IFU_ATTENDU = 13;

  function blocFacturation(opts) {
    var hote = opts.hote;
    if (!hote) return null;
    var langue = function () { return (opts.getLangue && opts.getLangue()) || 'fr'; };
    var mots = function () { return MOTS_FACTURATION[langue()] || MOTS_FACTURATION.fr; };
    var suffixe = opts.suffixe || '';
    var ouvert = false;

    function el(balise, classe, texte) {
      var e = document.createElement(balise);
      if (classe) e.className = classe;
      if (texte) e.textContent = texte;
      return e;
    }

    function champ(id, avecAide) {
      var enveloppe = el('div', 'champ');
      var etiquette = document.createElement('label');
      etiquette.setAttribute('for', id);
      enveloppe.appendChild(etiquette);
      var saisie = document.createElement('input');
      saisie.id = id;
      enveloppe.appendChild(saisie);
      var aide = null;
      if (avecAide) {
        aide = el('span', 'aide-champ');
        aide.id = id + '-aide';
        saisie.setAttribute('aria-describedby', aide.id);
        enveloppe.appendChild(aide);
      }
      return { enveloppe: enveloppe, etiquette: etiquette, saisie: saisie, aide: aide };
    }

    var bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'depliant-bouton';
    bouton.id = 'depliantFacturation' + suffixe;
    bouton.setAttribute('aria-expanded', 'false');

    var corps = el('div', 'depliant-corps');
    corps.id = 'corpsFacturation' + suffixe;
    corps.hidden = true;
    bouton.setAttribute('aria-controls', corps.id);

    var cNom = champ('factNom' + suffixe, false);
    var cIfu = champ('factIfu' + suffixe, false);
    var cCourriel = champ('factCourriel' + suffixe, false);

    /* Le jeton d'autocompletion nomme la nature du champ pour l'assistance et
       pour le navigateur. `organization` et `email` existent ; l'identifiant
       fiscal n'a aucun jeton, et l'inventer serait pire que l'omettre. */
    cNom.saisie.setAttribute('autocomplete', 'organization');
    cIfu.saisie.setAttribute('inputmode', 'numeric');
    cIfu.saisie.setAttribute('autocomplete', 'off');
    cIfu.saisie.setAttribute('maxlength', String(IFU_ATTENDU));
    cCourriel.saisie.setAttribute('type', 'email');
    cCourriel.saisie.setAttribute('autocomplete', 'email');

    var erreur = el('p', 'erreur');
    erreur.id = 'erreurFacturation' + suffixe;
    erreur.setAttribute('role', 'alert');
    erreur.setAttribute('aria-live', 'polite');
    erreur.classList.add('cache');

    corps.appendChild(cNom.enveloppe);
    corps.appendChild(cIfu.enveloppe);
    corps.appendChild(cCourriel.enveloppe);
    corps.appendChild(erreur);

    var enveloppe = el('div', 'depliant');
    enveloppe.appendChild(bouton);
    enveloppe.appendChild(corps);
    hote.appendChild(enveloppe);

    function dessiner() {
      var m = mots();
      bouton.textContent = m.ouvrir;
      cNom.etiquette.textContent = m.nom;
      cIfu.etiquette.textContent = m.ifu;
      cCourriel.etiquette.textContent = m.courriel;
    }

    /* LE FOCUS NE BOUGE PAS A L'OUVERTURE. Le contenu paraît juste sous le
       bouton et devient le point de tabulation suivant ; le deplacer ferait
       perdre le bouton a qui vient de l'actionner, et la barre d'espace — qui
       doit basculer — irait alors dans un champ de saisie. */
    function basculer() {
      ouvert = !ouvert;
      bouton.setAttribute('aria-expanded', ouvert ? 'true' : 'false');
      corps.hidden = !ouvert;
    }
    bouton.addEventListener('click', basculer);

    function montrerErreur(texte, ou) {
      erreur.textContent = texte;
      erreur.classList.remove('cache');
      if (ou) ou.focus();
    }

    /* Rend `vide` quand il n'y a rien a poser — trois champs vides : un
       depliant ouvert mais vide n'est pas une saisie —, `refus` quand la
       saisie est incomplete ou illisible, et l'objet a transmettre sinon.
       Des qu'un champ est rempli, LES TROIS SONT REQUIS : une facture
       d'entreprise se compose entiere ou pas du tout. */
    function lire() {
      erreur.classList.add('cache');
      var m = mots();
      var nom = cNom.saisie.value.trim();
      var ifu = cIfu.saisie.value.trim();
      var courriel = cCourriel.saisie.value.trim();
      if (!nom && !ifu && !courriel) return { vide: true };
      if (!nom) { montrerErreur(m.manqueNom, cNom.saisie); return { refus: true }; }
      if (!ifu) { montrerErreur(m.manqueIfu, cIfu.saisie); return { refus: true }; }
      if (!new RegExp('^[0-9]{' + IFU_ATTENDU + '}$').test(ifu)) {
        montrerErreur(m.ifuFaux, cIfu.saisie); return { refus: true };
      }
      if (!courriel) { montrerErreur(m.manqueAdresse, cCourriel.saisie); return { refus: true }; }
      if (MASQUE_FACTURATION.test(courriel) || !ADRESSE_LISIBLE.test(courriel)) {
        montrerErreur(m.adresseFausse, cCourriel.saisie); return { refus: true };
      }
      return { nom: nom, ifu: ifu, courriel: courriel };
    }

    /* Pose l'identite sur la vente, ou ne fait rien. Rend une promesse qui vaut
       true quand l'ecran peut continuer vers le paiement.
       La cible porte sa PREUVE, et la porte se choisit par elle : le jeton de
       session pour la commande qui vient d'etre passee — { par:'jeton', id,
       jeton } — ou le couple code + numero — { par:'code', code, tel } pour une
       commande, { par:'reservation', type:'espace'|'logement', code, tel } pour
       une reservation. Chaque porte demande la meme preuve que le bouton
       « Payer » pose a cote d'elle, et rien de plus. */
    function poser(cible) {
      var v = lire();
      if (v.refus) return Promise.resolve(false);
      if (v.vide || !cible) return Promise.resolve(true);
      var champs = { nom: v.nom, ifu: v.ifu, courriel: v.courriel };
      var appel;
      if (cible.par === 'jeton') {
        appel = Roots.db.poserFacturationCommande(
          Object.assign({ id: cible.id, jeton: cible.jeton }, champs));
      } else if (cible.par === 'reservation') {
        appel = Roots.db.poserFacturationReservation(
          Object.assign({ type: cible.type, code: cible.code, tel: cible.tel }, champs));
      } else if (cible.par === 'code') {
        appel = Roots.db.poserFacturationCommandeParCode(
          Object.assign({ code: cible.code, tel: cible.tel }, champs));
      } else {
        return Promise.resolve(true);
      }
      return Promise.resolve(appel).then(function () { return true; }, function (e) {
        montrerErreur(Roots.db.traduire(e && e.brut ? e.brut : (e && e.message), langue()), cNom.saisie);
        return false;
      });
    }

    /* IL NE PARAIT QUE LA OU UN GESTE LE POSE. Sur une vente reglee au
       comptoir, aucun bouton de cet ecran n'appelle la porte : offrir la saisie
       serait recueillir trois champs que rien n'emporte. L'ecran qui sait s'il
       a un geste le dit ici. */
    function montrer(oui) {
      enveloppe.hidden = !oui;
      if (!oui && ouvert) basculer();
    }

    dessiner();
    return { dessiner: dessiner, poser: poser, montrer: montrer,
             element: enveloppe, estOuvert: function () { return ouvert; } };
  }

  /* LE RETOUR, CLAVIER LEVE, NE FERME QUE LE CLAVIER. Quand la saisie a le
     foyer et que la fenetre visible est rognee — le clavier virtuel occupe le
     bas —, un retour qui demonterait la couche jetterait ce qui est tape.
     On rend donc le foyer, on repose l'entree d'historique consommee, et la
     couche ne bouge pas ; le retour suivant suit la logique des couches.
     Sur un ecran sans clavier virtuel, la fenetre n'est pas rognee et ce
     garde-fou ne prend jamais la main. */
  function retourAuClavier() {
    var e = document.activeElement;
    if (!e || (e.tagName !== 'INPUT' && e.tagName !== 'TEXTAREA')) return false;
    var vv = window.visualViewport;
    if (!vv || vv.height >= window.innerHeight - 80) return false;
    e.blur();
    try { history.pushState(history.state, ''); } catch (er) {}
    return true;
  }

  /* UNE MODALE FIGE LA PAGE SOUS ELLE. Sans verrou, un geste pose sur le
     voile ou sur une marge fait defiler le document sous la feuille : la
     scene derriere bouge, la feuille non — deux mondes glissent l'un sur
     l'autre. Le verrou se compte : deux couches ouvertes ne se rendent la
     page qu'une fois toutes deux fermees. La compensation de gouttiere
     retient la largeur que la barre de defilement occupait : sans elle, la
     page saute d'un cran a chaque ouverture sur les ecrans a barre. */
  var verrousDePage = 0;
  function figerLaPage() {
    verrousDePage++;
    if (verrousDePage > 1) return;
    var gouttiere = window.innerWidth - document.documentElement.clientWidth;
    if (gouttiere > 0) document.body.style.paddingRight = gouttiere + 'px';
    document.body.classList.add('page-figee');
  }
  function rendreLaPage() {
    verrousDePage = Math.max(0, verrousDePage - 1);
    if (verrousDePage) return;
    document.body.style.paddingRight = '';
    document.body.classList.remove('page-figee');
  }

  function modale(hote, opts) {
    opts = opts || {};
    var cle = opts.cle || (hote.id || 'modale');
    var ouverte = false, precedent = null, pousse = false;

    function premier() {
      var l = visibles(hote);
      if (l.length) l[0].focus();
      else { hote.setAttribute('tabindex', '-1'); hote.focus(); }
    }

    function ouvrir() {
      if (ouverte) return;
      ouverte = true;
      precedent = document.activeElement;
      figerLaPage();
      if (opts.montrer) opts.montrer();
      /* pushState echoue sur un fichier ouvert depuis le disque : on degrade
         sans bruit, le reste du comportement tient. */
      pousse = false;
      try { history.pushState({ rootsModale: cle }, ''); pousse = true; } catch (e) {}
      premier();
    }

    function fermer(parHistorique) {
      if (!ouverte) return;
      ouverte = false;
      rendreLaPage();
      if (opts.cacher) opts.cacher();
      if (pousse && !parHistorique) { try { history.back(); } catch (e) {} }
      pousse = false;
      if (precedent && precedent.focus) { try { precedent.focus(); } catch (e) {} }
    }

    /* UNE COUCHE OUVERTE PAR-DESSUS SE FERME AVANT LA MODALE. La liste des
       pays porte sa propre entree d'historique : le retour qui la ferme est
       consomme par elle, et la modale n'a qu'a l'ignorer — c'est ce que dit
       `popConsommeParCouche`. L'echappement ferme la liste par son canal
       propre, qui range aussi son entree d'historique. */
    document.addEventListener('keydown', function (e) {
      if (!ouverte) return;
      if (e.key === 'Escape') { e.preventDefault(); if (!fermerListePays()) fermer(); return; }
      if (e.key !== 'Tab') return;
      var l = visibles(hote);
      if (!l.length) return;
      var premierEl = l[0], dernier = l[l.length - 1];
      if (!hote.contains(document.activeElement)) { e.preventDefault(); premierEl.focus(); return; }
      if (e.shiftKey && document.activeElement === premierEl) { e.preventDefault(); dernier.focus(); }
      else if (!e.shiftKey && document.activeElement === dernier) { e.preventDefault(); premierEl.focus(); }
    }, true);

    window.addEventListener('popstate', function () {
      if (!ouverte) return;
      if (popConsommeParCouche()) return;
      if (retourAuClavier()) return;
      fermer(true);
    });

    return { ouvrir: ouvrir, fermer: fermer, estOuverte: function () { return ouverte; } };
  }

  /* ------------------------------------------------------------------------
     La langue est un choix, pas une detection : une fois exprime, il suit
     l'utilisateur d'un ecran a l'autre. Sans cela, un visiteur francophone
     dont le telephone est en anglais rebascule sur chaque page.
     ------------------------------------------------------------------------ */

  var CLE_LANGUE = 'roots.langue';

  function langueRetenue(defaut) {
    try {
      var l = localStorage.getItem(CLE_LANGUE);
      if (l === 'fr' || l === 'en') return l;
    } catch (e) {}
    return defaut;
  }

  function retenirLangue(l) {
    try { localStorage.setItem(CLE_LANGUE, l); } catch (e) {}
  }

  function langueParDefaut() {
    return (navigator.language || 'fr').toLowerCase().indexOf('en') === 0 ? 'en' : 'fr';
  }

  /* Apres un envoi refuse, le focus va au premier champ en cause : le message
     dit quoi faire, encore faut-il etre a l'endroit ou le faire. */
  function focusPremierFautif(ids) {
    for (var i = 0; i < ids.length; i++) {
      var e = document.getElementById(ids[i]);
      if (!e) continue;
      var v = (e.value || '').trim();
      if (!v) { e.focus(); return e; }
    }
    var p = document.getElementById(ids[0]);
    if (p) p.focus();
    return p;
  }

  global.Roots = global.Roots || {};
  /* ------------------------------------------------------------------------
     Garde des ecritures ouvertes au public. Aucun effort n'est demande au
     visiteur, et aucun captcha visuel n'est employe : il exclut une partie du
     public.
     Le champ ajoute ici reste hors du clavier, hors des technologies
     d'assistance et hors de la vue, sans quitter le flux du document.
     Le delai minimal s'applique a toute soumission.
     ------------------------------------------------------------------------ */

  var DELAI_MINIMAL = 2500;

  function garde(hote, nom) {
    var champ = document.createElement('input');
    champ.type = 'text';
    champ.name = nom || 'complement';
    champ.tabIndex = -1;
    champ.autocomplete = 'off';
    champ.setAttribute('aria-hidden', 'true');
    champ.className = 'hors-champ';
    hote.appendChild(champ);
    var pose = Date.now();
    return {
      pris: function () { return !!champ.value; },
      patienter: function () {
        var reste = DELAI_MINIMAL - (Date.now() - pose);
        if (reste <= 0) return Promise.resolve();
        return new Promise(function (r) { setTimeout(r, reste); });
      }
    };
  }

  /* ------------------------------------------------------------------
     LA HAUTEUR REELLE DU BANDEAU, PUBLIEE.
     Elle depend du contenu de l'en-tete et non de l'echelle : elle ne peut
     donc pas vivre dans les jetons. Une regle qui veut coller un element
     sous le bandeau lit --chrome-haut-h ; sans elle, l'element passe
     DERRIERE le bandeau, qui est collant et d'un rang superieur.
     ------------------------------------------------------------------ */
  /* La barre BASSE publie sa hauteur rendue, comme la haute. Ce qui se cale
     au-dessus d'elle en depend, et cette hauteur n'est pas ecrivable : elle
     varie avec le retrait du systeme et avec la forme que prend la barre.
     Elle vaut zero quand la barre monte dans l'en-tete. */
  function publierHauteurBasse() {
    var b = document.querySelector('.chrome-bas');
    if (!b) return;
    function poser() {
      var monte = document.body.classList.contains('nav-haut');
      document.documentElement.style.setProperty('--chrome-bas-h',
        (monte ? 0 : Math.ceil(b.getBoundingClientRect().height)) + 'px');
    }
    poser();
    if (window.ResizeObserver) new ResizeObserver(poser).observe(b);
    window.addEventListener('resize', poser);
    if (window.MutationObserver) {
      new MutationObserver(poser).observe(document.body,
        { attributes: true, attributeFilter: ['class'] });
    }
  }

  function publierHauteurChrome() {
    var h = document.querySelector('.chrome-haut');
    if (!h) return;
    function poser() {
      document.documentElement.style.setProperty(
        '--chrome-haut-h', Math.round(h.getBoundingClientRect().height) + 'px');
    }
    poser();
    if (window.ResizeObserver) new ResizeObserver(poser).observe(h);
    else window.addEventListener('resize', poser);
  }

  /* ------------------------------------------------------------------
     LA FEUILLE DU BAS SE FERME EN LA TIRANT.
     Le geste ne demarre QUE si la feuille est deja en haut de son propre
     defilement : sinon il se battrait avec le defilement du contenu, et
     c'est le defilement qui doit gagner. Il ne demarre pas depuis un champ
     ni depuis une commande.
     Au-dela du seuil, la fermeture n'est pas reecrite ici : on declenche le
     bouton de fermeture existant, qui porte deja tout ce qu'elle doit
     faire. Deux chemins de fermeture seraient deux verites.
     Qui a demande moins de mouvement ne recoit pas d'animation de retour.
     ------------------------------------------------------------------ */
  var SEUIL_FERMETURE = 110;

  function feuilleGlissante() {
    var f = document.querySelector('.feuille-bas');
    if (!f) return;
    var fermer = f.querySelector('.fermer');
    if (!fermer) return;
    var y0 = null, dy = 0, cible = null, transition = f.style.transition;
    var doux = !window.matchMedia || !matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* La feuille porte des zones qui defilent pour leur propre compte (la
       liste du menu, la feuille elle-meme). Tant que l'une d'elles, sur le
       chemin du doigt, n'est pas a son bord haut, le geste lui appartient :
       tirer vers le bas doit la faire remonter, jamais fermer la feuille. */
    function defileEncore(depart) {
      for (var n = depart; n; n = n.parentElement) {
        if (n.scrollTop > 0) return true;
        if (n === f) break;
      }
      return false;
    }

    function debut(e) {
      var c = e.target;
      if (c && c.closest && c.closest('input, textarea, select, button, a')) return;
      if (c && defileEncore(c)) return;
      if (f.scrollTop > 0) return;
      cible = c;
      y0 = e.touches ? e.touches[0].clientY : e.clientY;
      dy = 0;
      f.style.transition = 'none';
    }
    function bouge(e) {
      if (y0 === null) return;
      if (cible && defileEncore(cible)) {
        y0 = null;
        f.style.transition = doux ? transition : 'none';
        f.style.transform = '';
        return;
      }
      var y = e.touches ? e.touches[0].clientY : e.clientY;
      dy = Math.max(0, y - y0);
      if (dy > 4 && e.cancelable) e.preventDefault();
      f.style.transform = 'translate(-50%, ' + dy + 'px)';
    }
    function fin() {
      if (y0 === null) return;
      var franchi = dy > SEUIL_FERMETURE;
      y0 = null;
      f.style.transition = doux ? transition : 'none';
      f.style.transform = '';
      if (franchi) fermer.click();
    }

    /* La prise ne se limite pas a la poignee : elle couvre TOUTE la feuille,
       parce qu'une prise cantonnee au bord haut oblige a remonter le pouce et
       casse l'usage a une main. Ce qui protege le geste n'est pas la zone mais
       les deux gardes de `debut` — feuille en haut de son defilement, et
       depart hors d'une commande ou d'un champ. */
    f.addEventListener('touchstart', debut, { passive: true });
    f.addEventListener('mousedown', debut);
    f.addEventListener('touchmove', bouge, { passive: false });
    f.addEventListener('touchend', fin);
    f.addEventListener('touchcancel', fin);
    window.addEventListener('mousemove', bouge);
    window.addEventListener('mouseup', fin);
  }

  /* Les deux gestes du code s'accrochent d'eux-memes a tout element portant
     data-code-copier ou data-code-cartel. L'ecran n'a donc qu'a poser le
     balisage : aucun script d'ecran a modifier, aucun condensat a recalculer.
     La source du code est l'element designe par data-code-source. */
  function accrocherGestesDuCode() {
    function lire(b) {
      var src = document.getElementById(b.getAttribute('data-code-source'));
      return src ? (src.textContent || '').trim() : '';
    }
    /* Le retour visuel remplace le contenu — texte ou icone — puis le
       restitue tel quel : le meme mecanisme sert les deux formes du bouton. */
    function dire(b, mot) {
      if (b.dataset.ditEnCours) return;
      b.dataset.ditEnCours = '1';
      var enfants = Array.prototype.slice.call(b.childNodes);
      b.textContent = mot;
      setTimeout(function () {
        b.textContent = '';
        enfants.forEach(function (n) { b.appendChild(n); });
        delete b.dataset.ditEnCours;
      }, 1800);
    }
    Array.prototype.forEach.call(document.querySelectorAll('[data-code-copier]'), function (b) {
      b.addEventListener('click', function () {
        var code = lire(b);
        if (!code) return;
        copier(code, function (ok) { dire(b, ok ? b.getAttribute('data-fait') || 'Copié' : '…'); });
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-code-cartel]'), function (b) {
      b.addEventListener('click', function () {
        var code = lire(b);
        if (!code) return;
        var lignes = (b.getAttribute('data-lignes') || '').split('|').filter(Boolean);
        cartel({ code: code, titre: b.getAttribute('data-titre') || 'Roots',
                 lignes: lignes, nomFichier: 'roots-' + code });
      });
    });
  }

  window.addEventListener('load', function () {
    publierHauteurChrome();
  publierHauteurBasse();
    feuilleGlissante();
    accrocherGestesDuCode();
  });

  /* ------------------------------------------------------------------
     LE CODE : LE COPIER, ET L'EMPORTER EN IMAGE.
     Le client perd son code parce qu'il ne lui est donne qu'aux moments ou
     il pense a autre chose. Deux gestes, et deux seulement.

     LE CARTEL NE PORTE QUE LE CODE ET SON CONTEXTE. Jamais le numero de
     telephone, jamais le montant. Le code seul n'ouvre rien — c'est le
     couple code + numero qui ouvre une vente. Un cartel portant les deux
     transformerait une image partagee par megarde en cle complete.
     ------------------------------------------------------------------ */
  function copier(texte, surFait) {
    function fini(ok) { if (surFait) surFait(ok); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texte).then(function () { fini(true); },
                                               function () { fini(false); });
      return;
    }
    /* Repli pour les navigateurs sans presse-papiers : une zone hors ecran,
       selectionnee puis copiee. Elle est retiree dans tous les cas. */
    var z = document.createElement('textarea');
    z.value = texte;
    z.setAttribute('readonly', '');
    z.style.cssText = 'position:fixed;top:-1000px;opacity:0';
    document.body.appendChild(z);
    z.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(z);
    fini(ok);
  }

  var CARTEL = { l: 640, h: 400 };

  /* opts : { code, titre, lignes: [..], nomFichier }
     Le dessin se fait dans le navigateur : rien ne part, rien n'est demande
     a un serveur. Les couleurs se lisent sur les jetons servis, pour qu'une
     correction de palette suive sans retoucher ce code. */
  function cartel(opts, surFait) {
    var jeton = function (n, repli) {
      var v = getComputedStyle(document.documentElement).getPropertyValue(n);
      return (v && v.trim()) || repli;
    };
    var c = document.createElement('canvas');
    var e = Math.min(3, window.devicePixelRatio || 1);
    c.width = CARTEL.l * e; c.height = CARTEL.h * e;
    var x = c.getContext('2d');
    if (!x) { if (surFait) surFait(false); return; }
    x.scale(e, e);

    x.fillStyle = jeton('--blanc-casse', '#FDFBF6');
    x.fillRect(0, 0, CARTEL.l, CARTEL.h);
    x.fillStyle = jeton('--roots-vert', '#005B22');
    x.fillRect(0, 0, CARTEL.l, 10);

    x.textAlign = 'center';
    x.fillStyle = jeton('--encre-discrete', '#635E53');
    x.font = '600 20px system-ui, sans-serif';
    x.fillText((opts.titre || 'Roots').toUpperCase(), CARTEL.l / 2, 74);

    x.fillStyle = jeton('--encre', '#0C321A');
    x.font = '700 84px ui-monospace, Menlo, Consolas, monospace';
    x.fillText(String(opts.code || ''), CARTEL.l / 2, 186);

    x.font = '400 22px system-ui, sans-serif';
    (opts.lignes || []).slice(0, 3).forEach(function (l, i) {
      x.fillText(String(l), CARTEL.l / 2, 240 + i * 34);
    });

    x.fillStyle = jeton('--encre-discrete', '#635E53');
    x.font = '400 18px system-ui, sans-serif';
    x.fillText('mi.roots.bj', CARTEL.l / 2, CARTEL.h - 30);

    try {
      var a = document.createElement('a');
      a.href = c.toDataURL('image/png');
      a.download = (opts.nomFichier || 'code-roots') + '.png';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      if (surFait) surFait(true);
    } catch (err) { if (surFait) surFait(false); }
  }

  global.Roots.garde = garde;
  global.Roots.initTelRoots = initTelRoots;
  global.Roots.fermerListePays = fermerListePays;
  global.Roots.initChrome = initChrome;
  global.Roots.nav = nav;
  global.Roots.poserLibelles = poserLibelles;
  global.Roots.copier = copier;
  global.Roots.cartel = cartel;
  /* La hauteur rendue de la barre, re-publiable par l'ecran : habiller une
     piece de la barre hors du cycle d'arbitrage change ce que la feuille de
     style doit lire. */
  global.Roots.mesurerChrome = function () {
    var barre = document.querySelector('.chrome-inner');
    var haut = document.querySelector('.chrome-haut');
    if (barre && haut) publierHauteur(barre, haut);
  };
  global.Roots.modale = modale;
  global.Roots.retourAuClavier = retourAuClavier;
  /* Le verrou de page s'exporte pour les feuilles qu'un ecran ouvre par son
     propre appareil : meme verrou, meme compte, jamais un second mecanisme. */
  global.Roots.figerLaPage = figerLaPage;
  global.Roots.rendreLaPage = rendreLaPage;
  global.Roots.blocFacturation = blocFacturation;
  global.Roots.langueRetenue = langueRetenue;
  global.Roots.retenirLangue = retenirLangue;
  global.Roots.langueParDefaut = langueParDefaut;
  global.Roots.focusPremierFautif = focusPremierFautif;
})(window);

(function (global) {
  'use strict';

  /* La planche de symboles est posée en tête du corps de page, avant que le
     premier <use> soit analysé : les icônes ne clignotent pas au chargement. */
  var PLANCHE = [
    '<symbol id="i-ankh" viewBox="0 0 110 111">',
    '<path fill-rule="nonzero" fill="rgb(10.196078%, 10.196078%, 10.196078%)" d="M 55.144531 3.101562 C 83.609375 3.101562 106.679688 26.175781 106.679688 54.636719 C 106.679688 83.101562 83.609375 106.171875 55.144531 106.171875 C 26.683594 106.171875 3.609375 83.101562 3.609375 54.636719 C 3.609375 26.175781 26.683594 3.101562 55.144531 3.101562 "/>',
    '<path fill-rule="nonzero" fill="rgb(100%, 69.019608%, 0%)" d="M 47.660156 45.566406 L 12.074219 42.925781 C 14.8125 33.019531 20.882812 24.355469 29.257812 18.398438 C 30.832031 21.53125 32.574219 24.574219 34.480469 27.515625 Z M 47.660156 45.566406 "/>',
    '<path fill-rule="nonzero" fill="rgb(0%, 35.686275%, 13.333333%)" d="M 10.546875 57.304688 L 50.652344 54.070312 L 49.699219 99.140625 C 28.414062 96.554688 11.738281 78.992188 10.546875 57.304688 "/>',
    '<path fill-rule="nonzero" fill="rgb(89.019608%, 10.588235%, 13.72549%)" d="M 67.039062 25.71875 C 65.503906 27.898438 57.183594 38.679688 54.992188 38.496094 C 47.457031 32.53125 40.75 23.539062 36.359375 14.269531 C 48.25 8.769531 61.953125 8.753906 73.855469 14.226562 C 71.894531 18.230469 69.613281 22.078125 67.039062 25.71875 "/>',
    '<path fill-rule="nonzero" fill="rgb(100%, 69.019608%, 0%)" d="M 62.132812 45.5625 C 68.492188 37.964844 75.789062 28.535156 80.960938 18.355469 C 89.371094 24.316406 95.464844 32.996094 98.207031 42.933594 Z M 62.132812 45.5625 "/>',
    '<path fill-rule="nonzero" fill="rgb(0%, 35.686275%, 13.333333%)" d="M 99.742188 57.304688 C 98.554688 78.992188 81.878906 96.550781 60.59375 99.140625 L 59.640625 54.070312 Z M 99.742188 57.304688 "/>',
    '  </symbol>',
    /* Variante d'encre unique du meme symbole : les memes contours, sans le
       disque de fond, servis en couleur courante. Elle existe A COTE de
       l'original et ne le remplace pas — le symbole polychrome reste le seul
       a employer quand le fond le porte. Celle-ci sert la ou une seule encre
       est disponible : aplat, univers autre, impression. */
    '<symbol id="i-ankh-mono" viewBox="0 0 110 111">',
    '<path fill-rule="nonzero" fill="currentColor" d="M 47.660156 45.566406 L 12.074219 42.925781 C 14.8125 33.019531 20.882812 24.355469 29.257812 18.398438 C 30.832031 21.53125 32.574219 24.574219 34.480469 27.515625 Z M 47.660156 45.566406 "/>',
    '<path fill-rule="nonzero" fill="currentColor" d="M 10.546875 57.304688 L 50.652344 54.070312 L 49.699219 99.140625 C 28.414062 96.554688 11.738281 78.992188 10.546875 57.304688 "/>',
    '<path fill-rule="nonzero" fill="currentColor" d="M 67.039062 25.71875 C 65.503906 27.898438 57.183594 38.679688 54.992188 38.496094 C 47.457031 32.53125 40.75 23.539062 36.359375 14.269531 C 48.25 8.769531 61.953125 8.753906 73.855469 14.226562 C 71.894531 18.230469 69.613281 22.078125 67.039062 25.71875 "/>',
    '<path fill-rule="nonzero" fill="currentColor" d="M 62.132812 45.5625 C 68.492188 37.964844 75.789062 28.535156 80.960938 18.355469 C 89.371094 24.316406 95.464844 32.996094 98.207031 42.933594 Z M 62.132812 45.5625 "/>',
    '<path fill-rule="nonzero" fill="currentColor" d="M 99.742188 57.304688 C 98.554688 78.992188 81.878906 96.550781 60.59375 99.140625 L 59.640625 54.070312 Z M 99.742188 57.304688 "/>',
    '  </symbol>',
    '<symbol id="i-esp-coworking" viewBox="21.27 7.75 179.31 178.87"><path fill="rgb(10.196078%,10.196078%,10.196078%)" d="M 31.738281 41.210938 C 38.699219 52.425781 45.9375 63.476562 53.015625 74.621094 C 55.007812 77.734375 57.722656 80.527344 60.972656 77.746094 C 62.40625 76.523438 62.316406 71.777344 61.164062 69.570312 C 55.644531 58.988281 49.71875 48.597656 43.523438 38.394531 C 41.214844 34.921875 38.402344 31.8125 35.179688 29.167969 C 34.113281 28.222656 31.609375 28.351562 30.007812 28.820312 C 29.074219 29.097656 28.617188 31.015625 27.910156 32.261719 C 29.222656 35.53125 30.078125 38.632812 31.699219 41.25 Z M 193.601562 149.601562 C 193.9375 148.386719 191.757812 145.464844 190.128906 144.839844 C 175.332031 139.101562 160.464844 133.53125 145.4375 128.421875 C 143.230469 127.664062 138.617188 128.777344 137.691406 130.410156 C 135.40625 134.546875 138.957031 136.734375 142.527344 138.097656 C 153.464844 142.261719 164.402344 146.4375 175.339844 150.484375 C 179.4375 152.007812 183.664062 153.191406 189.085938 154.921875 C 190.585938 153.269531 192.960938 151.6875 193.558594 149.601562 Z M 122.847656 82.339844 C 130.117188 72.625 137.316406 62.839844 144.316406 52.933594 C 146.566406 49.914062 148.324219 46.558594 149.527344 42.988281 C 150.171875 40.882812 148.890625 38.1875 148.460938 35.761719 C 146.554688 36.4375 143.886719 36.546875 142.855469 37.898438 C 133.902344 49.671875 125.152344 61.644531 116.492188 73.699219 C 115.058594 75.6875 113.65625 78.191406 113.507812 80.527344 C 113.410156 82.578125 115.140625 84.714844 116.492188 87.859375 C 119.484375 85.261719 121.503906 84.070312 122.847656 82.339844 M 100.691406 14.660156 C 99.308594 14.390625 96.246094 16.875 95.808594 18.636719 C 91.898438 34.210938 88.339844 49.871094 84.871094 65.542969 C 83.875 69.878906 83.957031 74.621094 89.414062 75.597656 C 95.28125 76.640625 95.949219 71.378906 96.753906 67.402344 C 98.324219 59.617188 99.476562 51.761719 100.730469 43.925781 C 101.984375 36.089844 103.277344 28.234375 104.828125 18.6875 C 103.953125 17.710938 102.558594 15.015625 100.710938 14.660156 Z M 143.835938 105.082031 C 152.070312 102.714844 160.367188 100.496094 168.46875 97.742188 C 175.164062 95.449219 181.71875 92.757812 188.089844 89.679688 C 189.480469 89 189.78125 86.058594 190.585938 84.160156 C 188.867188 83.484375 186.945312 81.921875 185.445312 82.25 C 170.160156 85.652344 154.9375 89.300781 139.703125 93.050781 C 137.433594 93.503906 135.335938 94.574219 133.636719 96.140625 C 132.003906 97.882812 130.117188 100.863281 130.652344 102.683594 C 131.1875 104.503906 134.433594 105.667969 136.003906 106.761719 C 139.382812 106.054688 141.660156 105.707031 143.859375 105.082031 Z M 105.84375 133.203125 C 106.15625 119.558594 95.351562 108.246094 81.707031 107.929688 C 81.621094 107.929688 81.535156 107.925781 81.449219 107.925781 C 66.953125 107.304688 54.695312 118.550781 54.078125 133.050781 C 54.0625 133.359375 54.054688 133.667969 54.054688 133.980469 C 54.21875 147.640625 65.25 158.671875 78.914062 158.839844 C 94.375 158.839844 105.742188 147.988281 105.863281 133.222656 Z M 128.8125 130.886719 C 128.554688 157.964844 106.539062 179.980469 79.925781 179.78125 C 52.082031 179.582031 30.117188 157.964844 30.335938 131.054688 C 30.554688 104.148438 53.585938 81.960938 80.941406 82.179688 C 107.339844 82.136719 128.777344 103.503906 128.820312 129.902344 C 128.820312 130.230469 128.820312 130.558594 128.8125 130.886719 "/></symbol>',
    '<symbol id="i-esp-partage" viewBox="12.87 -3.23 107.61 122.26"><path fill="rgb(10.196078%,10.196078%,10.196078%)" d="M 100.917969 36.683594 C 100.660156 28.882812 95.359375 24.0625 89.917969 24.25 C 85.601562 24.402344 82.261719 29.25 82.550781 34.890625 C 82.769531 39.050781 89.550781 44.78125 93.851562 43.203125 C 97.078125 41.972656 99.378906 38.183594 100.917969 36.683594 M 75.71875 62.050781 C 74.25 52.621094 71.859375 49.652344 65.28125 49.691406 C 60.089844 49.691406 57.28125 53.691406 57.398438 60.882812 C 57.5 66.882812 61.871094 70.582031 69.398438 69.320312 C 71.828125 68.972656 73.628906 64.59375 75.71875 62.050781 Z M 52.121094 25.792969 C 52.269531 19.351562 48.121094 14.691406 42.019531 14.492188 C 36.898438 14.320312 32.109375 19.632812 32.019531 25.550781 C 31.960938 30.410156 37.929688 35.300781 44.121094 35.472656 C 49.511719 35.621094 52 32.632812 52.121094 25.792969 M 102.621094 89.792969 C 102.511719 83.921875 97 76.851562 92.621094 76.933594 C 87.148438 77.03125 82.621094 83.390625 82.980469 90.550781 C 83.191406 94.972656 88.308594 98.953125 93.871094 98.992188 C 99.429688 99.03125 102.730469 95.472656 102.621094 89.792969 M 54.53125 84.84375 L 53.441406 84.0625 C 53.375 82.804688 53.234375 81.550781 53.019531 80.3125 C 51.738281 74.570312 46.882812 70.324219 41.019531 69.820312 C 35.859375 69.453125 31.859375 71.203125 30.019531 76.28125 C 27.71875 82.550781 31.199219 86.691406 35.648438 90.332031 C 36.542969 91.226562 37.617188 91.925781 38.800781 92.382812 C 41.800781 93.152344 45.800781 95.042969 47.800781 93.84375 C 50.789062 92.03125 52.359375 87.972656 54.53125 84.84375 M 86.941406 54.132812 C 86.558594 58.070312 86.191406 62.011719 85.761719 66.511719 C 87.167969 66.390625 88.511719 66.300781 89.851562 66.160156 C 101.417969 64.972656 110.261719 71.851562 113.339844 84.441406 C 115.949219 95.070312 110.25 106.710938 100.601562 110.441406 C 90.210938 114.5 74.808594 105.792969 71.199219 93.621094 C 70.199219 90.222656 69.871094 86.621094 69.121094 82.472656 L 65.039062 82 C 63.539062 87.402344 62.871094 92.542969 60.738281 97 C 56.199219 106.5 45.539062 109.820312 36 105.390625 C 23.78125 99.710938 17.398438 88.5 18.78125 75.132812 C 19.78125 65.683594 28.28125 58.53125 38.210938 58.890625 C 40.28125 58.972656 42.351562 59.222656 44.667969 59.421875 L 48.179688 46.621094 C 36.878906 47.621094 27.898438 43.671875 22.101562 33.953125 C 18.28125 27.550781 21.261719 21.152344 22.859375 14.953125 C 25.121094 6.210938 38.167969 1.300781 48.859375 4.800781 C 62.378906 9.230469 66.058594 20.300781 59.5 37.640625 L 71.570312 39.09375 C 71.449219 30.832031 71.699219 22.210938 78.710938 16.800781 C 82.03125 14.242188 87.351562 12.980469 91.648438 13.222656 C 104.828125 13.953125 113.359375 23.703125 112.210938 35.460938 C 110.929688 48.160156 101.308594 55.351562 86.941406 54.132812 "/></symbol>',
    '<symbol id="i-esp-reunion_privee" viewBox="2.06 -1.69 174.55 244.73"><path fill="rgb(10.196078%,10.196078%,10.196078%)" d="M 94.402344 7.371094 C 92.171875 9.371094 88.199219 11.113281 87.96875 13.292969 C 86.460938 27.460938 85.570312 41.710938 85.050781 55.953125 C 84.992188 57.652344 88.378906 59.480469 90.160156 61.25 C 91.710938 59.382812 94.339844 57.660156 94.601562 55.632812 C 95.878906 45.851562 96.679688 35.992188 97.308594 26.140625 C 97.671875 20.390625 97.371094 14.601562 97.371094 8.820312 Z M 128.539062 27.890625 C 121.082031 37.511719 113.539062 47.113281 106.671875 57.121094 C 105.007812 59.542969 104.050781 65.070312 105.460938 66.480469 C 108.992188 70.011719 112.1875 65.921875 114.929688 63.5625 C 116.566406 61.925781 118.035156 60.132812 119.320312 58.210938 C 124.980469 50.921875 130.679688 43.660156 136.242188 36.300781 C 138.71875 33.03125 140.910156 29.550781 143.390625 25.933594 C 136.660156 21.441406 132.140625 23.273438 128.539062 27.910156 Z M 39.921875 24.972656 C 42.660156 30.621094 45.960938 35.980469 49.769531 40.972656 C 54.769531 47.480469 60.492188 53.433594 65.769531 59.691406 C 68.179688 62.53125 70.589844 65.691406 74.652344 62.839844 C 78.960938 59.792969 77.152344 56.113281 74.550781 53 C 65.628906 42.335938 56.628906 31.722656 47.550781 21.160156 C 46.371094 19.792969 44.6875 18.863281 41.609375 16.453125 C 40.78125 20.273438 39.070312 23.261719 39.921875 24.972656 M 29.300781 210.441406 C 29.410156 222.601562 30.460938 223.441406 41.480469 221.910156 C 45.652344 221.339844 49.902344 221.433594 54.089844 221 C 85.089844 217.773438 116.089844 214.402344 147.089844 211.3125 C 151.019531 210.910156 152.949219 209.589844 152.96875 205.671875 C 152.96875 203.140625 153.429688 200.523438 152.871094 198.121094 C 152.582031 196.863281 150.53125 195.050781 149.332031 195.121094 C 131 195.75 112.640625 196.230469 94.332031 197.589844 C 75.21875 199 56.1875 201.640625 37.082031 203.042969 C 30.921875 203.460938 27.757812 204.730469 29.300781 210.441406 M 24.589844 84.78125 C 24.589844 89.402344 24.492188 92.050781 24.589844 94.691406 C 25.402344 113.242188 26.402344 131.792969 27.039062 150.351562 C 27.429688 161.742188 27.429688 173.140625 27.320312 184.542969 C 27.257812 190.132812 29.320312 191.660156 34.96875 191.171875 C 71.339844 187.992188 107.730469 184.902344 144.152344 182.402344 C 151.152344 181.921875 152.550781 179.402344 152.359375 173.261719 C 151.558594 147.710938 151.109375 122.152344 150.492188 96.601562 C 150.4375 94.832031 150.03125 93.082031 149.558594 89.691406 L 143.390625 96.980469 C 138.21875 103.089844 133.199219 109.320312 127.839844 115.242188 C 124.839844 118.5625 121.507812 117.972656 118.609375 114.640625 C 114.308594 109.703125 110.039062 104.730469 105.609375 99.882812 C 101.4375 95.300781 97.121094 90.882812 92.390625 85.882812 C 89.980469 89.441406 88.199219 92.023438 86.449219 94.621094 C 81.289062 102.332031 76.179688 110.082031 70.96875 117.761719 C 68.789062 120.980469 65.96875 121.371094 62.800781 119.132812 C 60.902344 117.800781 59.078125 116.367188 57.339844 114.832031 C 47 105.300781 36.582031 95.761719 24.589844 84.78125 M 65.371094 106.332031 C 71.300781 97.441406 76.769531 89.210938 82.28125 81.011719 C 83.808594 78.730469 85.28125 76.421875 87.03125 74.292969 C 91.03125 69.292969 94.75 69.140625 99.089844 73.902344 C 105.910156 81.390625 112.691406 88.902344 119.210938 96.660156 C 123.03125 101.191406 125.421875 100.660156 128.789062 95.960938 C 135.171875 87.070312 141.859375 78.351562 149.070312 70.132812 C 153.660156 64.890625 158.480469 66.492188 160.378906 73.402344 C 161.429688 77.277344 162.097656 81.246094 162.378906 85.25 C 165.007812 121.890625 167.550781 158.53125 164.671875 195.25 C 164.050781 203.25 163.75 211.25 163.492188 219.25 C 163.351562 223.441406 161.160156 224.25 157.371094 224.53125 C 124.949219 226.871094 92.558594 229.453125 60.152344 231.902344 C 51.152344 232.582031 42.039062 233.300781 32.980469 233.613281 C 22.042969 233.972656 20.160156 232.441406 18.851562 221.261719 C 17.371094 208.472656 16.011719 195.632812 15.410156 182.78125 C 13.792969 148.203125 12.601562 113.601562 11.269531 79.011719 C 11.128906 76.902344 11.195312 74.785156 11.46875 72.691406 C 12.46875 66.800781 17.582031 64.261719 22.71875 67.152344 C 24.722656 68.316406 26.574219 69.730469 28.230469 71.351562 C 39.378906 81.980469 50.460938 92.683594 61.582031 103.351562 C 62.492188 104.230469 63.539062 104.902344 65.371094 106.332031 "/></symbol>',
    '<symbol id="i-soleil" viewBox="0 0 191 178"><path fill="rgb(0%,35.686275%,13.333333%)" d="M 31.738281 41.210938 C 38.699219 52.425781 45.9375 63.476562 53.015625 74.621094 C 55.007812 77.734375 57.722656 80.527344 60.972656 77.746094 C 62.40625 76.523438 62.316406 71.777344 61.164062 69.570312 C 55.644531 58.988281 49.71875 48.597656 43.523438 38.394531 C 41.214844 34.921875 38.402344 31.8125 35.179688 29.167969 C 34.113281 28.222656 31.609375 28.351562 30.007812 28.820312 C 29.074219 29.097656 28.617188 31.015625 27.910156 32.261719 C 29.222656 35.53125 30.078125 38.632812 31.699219 41.25 Z M 193.601562 149.601562 C 193.9375 148.386719 191.757812 145.464844 190.128906 144.839844 C 175.332031 139.101562 160.464844 133.53125 145.4375 128.421875 C 143.230469 127.664062 138.617188 128.777344 137.691406 130.410156 C 135.40625 134.546875 138.957031 136.734375 142.527344 138.097656 C 153.464844 142.261719 164.402344 146.4375 175.339844 150.484375 C 179.4375 152.007812 183.664062 153.191406 189.085938 154.921875 C 190.585938 153.269531 192.960938 151.6875 193.558594 149.601562 Z M 122.847656 82.339844 C 130.117188 72.625 137.316406 62.839844 144.316406 52.933594 C 146.566406 49.914062 148.324219 46.558594 149.527344 42.988281 C 150.171875 40.882812 148.890625 38.1875 148.460938 35.761719 C 146.554688 36.4375 143.886719 36.546875 142.855469 37.898438 C 133.902344 49.671875 125.152344 61.644531 116.492188 73.699219 C 115.058594 75.6875 113.65625 78.191406 113.507812 80.527344 C 113.410156 82.578125 115.140625 84.714844 116.492188 87.859375 C 119.484375 85.261719 121.503906 84.070312 122.847656 82.339844 M 100.691406 14.660156 C 99.308594 14.390625 96.246094 16.875 95.808594 18.636719 C 91.898438 34.210938 88.339844 49.871094 84.871094 65.542969 C 83.875 69.878906 83.957031 74.621094 89.414062 75.597656 C 95.28125 76.640625 95.949219 71.378906 96.753906 67.402344 C 98.324219 59.617188 99.476562 51.761719 100.730469 43.925781 C 101.984375 36.089844 103.277344 28.234375 104.828125 18.6875 C 103.953125 17.710938 102.558594 15.015625 100.710938 14.660156 Z M 143.835938 105.082031 C 152.070312 102.714844 160.367188 100.496094 168.46875 97.742188 C 175.164062 95.449219 181.71875 92.757812 188.089844 89.679688 C 189.480469 89 189.78125 86.058594 190.585938 84.160156 C 188.867188 83.484375 186.945312 81.921875 185.445312 82.25 C 170.160156 85.652344 154.9375 89.300781 139.703125 93.050781 C 137.433594 93.503906 135.335938 94.574219 133.636719 96.140625 C 132.003906 97.882812 130.117188 100.863281 130.652344 102.683594 C 131.1875 104.503906 134.433594 105.667969 136.003906 106.761719 C 139.382812 106.054688 141.660156 105.707031 143.859375 105.082031 Z M 105.84375 133.203125 C 106.15625 119.558594 95.351562 108.246094 81.707031 107.929688 C 81.621094 107.929688 81.535156 107.925781 81.449219 107.925781 C 66.953125 107.304688 54.695312 118.550781 54.078125 133.050781 C 54.0625 133.359375 54.054688 133.667969 54.054688 133.980469 C 54.21875 147.640625 65.25 158.671875 78.914062 158.839844 C 94.375 158.839844 105.742188 147.988281 105.863281 133.222656 Z M 128.8125 130.886719 C 128.554688 157.964844 106.539062 179.980469 79.925781 179.78125 C 52.082031 179.582031 30.117188 157.964844 30.335938 131.054688 C 30.554688 104.148438 53.585938 81.960938 80.941406 82.179688 C 107.339844 82.136719 128.777344 103.503906 128.820312 129.902344 C 128.820312 130.230469 128.820312 130.558594 128.8125 130.886719 "/></symbol>',
    '<symbol id="i-menu" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></symbol>',
    '<symbol id="i-play" viewBox="0 0 24 24"><path d="M6 3.5 20 12 6 20.5z"/></symbol>',
    '<symbol id="i-radio" viewBox="0.94 0.94 22.12 22.12" stroke-width="1.843"><circle cx="12" cy="11" r="1.7"/><path d="M12 12.7 9.6 20.5h4.8z"/><path d="M8.7 7.7a5.3 5.3 0 0 0 0 6.6M15.3 7.7a5.3 5.3 0 0 1 0 6.6"/><path d="M5.7 4.9a9.6 9.6 0 0 0 0 12.2M18.3 4.9a9.6 9.6 0 0 1 0 12.2"/></symbol>',
    '<symbol id="i-plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></symbol>',
    '<symbol id="i-minus" viewBox="0 0 24 24"><path d="M5 12h14"/></symbol>',
    '<symbol id="i-x" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></symbol>',
    '<symbol id="i-copie" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></symbol>',
    '<symbol id="i-telecharger" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/></symbol>',
    '<symbol id="i-plan" viewBox="-3.759 -4.009 31.519 31.519" stroke-width="2.627"><path d="M15 5.5 9 3 3 5.5v15L9 18l6 2.5 6-2.5v-15L15 5.5z"/><path d="M9 3v15M15 5.5v15"/></symbol>',
    '<symbol id="i-roots" viewBox="-2.230 -1.730 27.460 27.460" stroke-width="2.288"><path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/></symbol>',
    '<symbol id="i-pause" viewBox="0 0 24 24"><path d="M9 5v14M15 5v14"/></symbol>',
    '<symbol id="i-lecture" viewBox="0 0 24 24"><path d="M7 4.5 19.5 12 7 19.5z"/></symbol>',
    '<symbol id="i-roam" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.5"/><path d="M16.2 7.8 14.1 14.1 7.8 16.2 9.9 9.9z"/></symbol>',
    '<symbol id="i-carte" viewBox="0 0 24 24"><path d="M3 2v7a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6a2 2 0 0 0 2 2h3z"/></symbol>',
    '<symbol id="i-ticket" viewBox="0 0 24 24"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/><path d="M13 5v2M13 11v2M13 17v2"/></symbol>',
    '<symbol id="i-calendrier" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></symbol>',
    '<symbol id="i-chevron" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></symbol>',
    '<symbol id="i-recherche" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4 4"/></symbol>',
    '<symbol id="i-check" viewBox="0 0 24 24"><path d="m4.5 12.5 5 5 10-11"/></symbol>',
    '<symbol id="i-table" viewBox="0 0 24 24"><path d="M20 10c0 6.2-8 12-8 12s-8-5.8-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></symbol>',
    '<symbol id="i-sac" viewBox="0 0 24 24"><path d="M6 2 3 6.5V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.5L18 2z"/><path d="M3 6.5h18"/><path d="M16 10.5a4 4 0 0 1-8 0"/></symbol>'
  ].join('');

  function sprite() {
    if (document.getElementById('roots-planche')) return;
    var hote = document.createElement('div');
    hote.id = 'roots-planche';
    hote.setAttribute('aria-hidden', 'true');
    hote.style.display = 'none';
    hote.innerHTML = '<svg>' + PLANCHE + '</svg>';
    document.body.insertAdjacentElement('afterbegin', hote);
  }


  /* ------------------------------------------------------------------
     LE RAIL HORIZONTAL — grammaire, pas ecran.
     Une bande qui defile a l'horizontale doit s'atteindre par TROIS chemins,
     et chacun sert un usager que les deux autres laissent dehors :

       le DOIGT      — le navigateur s'en charge ;
       le POINTEUR   — rien ne l'attrape par defaut, et la molette verticale
                       ne concerne pas une bande horizontale ; on rend donc le
                       glissement et la molette disponibles, et un glissement
                       ne se termine jamais en clic sur l'element survole ;
       UN SEUL APPUI — deux commandes, sans glisser. La barre de defilement
                       est masquee, or c'est sur elle que s'appuie l'exigence
                       de mouvement sans glissement. Sans ces commandes, il
                       n'existe AUCUN chemin vers une carte hors ecran qui ne
                       demande pas de faire glisser.

     LE CLAVIER. Une bande dont les enfants sont focalisables est deja
     parcourue par la tabulation, et le navigateur ramene dans la vue ce qui
     prend le foyer : lui ajouter un arret de tabulation en creerait un de
     trop. Une bande dont les enfants ne le sont PAS n'a aucun chemin : elle
     devient alors une zone de defilement focalisable, ou les fleches agissent
     nativement. Le choix se fait sur ce que la bande contient, jamais par
     declaration.

     LES COMMANDES ne prennent jamais le foyer quand on les presse, elles
     restent perceptibles et focalisables en bout de course — refusees, pas
     retirees — et le defilement suit le reglage de mouvement de l'appareil.
     ------------------------------------------------------------------ */
  var FOCALISABLE = 'a[href],button,input,select,textarea,[tabindex]';
  var railSeq = 0;
  /* Les deux libelles vivent ICI et non dans la table du chrome : ce module
     est charge separement et n'en voit pas la portee. Deux mots recopies
     coutent moins qu'une dependance entre deux modules. */
  var MOTS_RAIL = { fr: { prec: 'Précédent', suiv: 'Suivant' },
                    en: { prec: 'Previous', suiv: 'Next' } };

  function nommerRail(bande) {
    if (bande.hasAttribute('aria-label') || bande.hasAttribute('aria-labelledby')) return;
    if (bande.dataset.railNom) { bande.setAttribute('aria-label', bande.dataset.railNom); return; }
    /* Le nom se prend au titre qui precede, jamais invente : un rail sans
       titre reste sans nom, et cela se voit. */
    var t = bande.previousElementSibling;
    while (t && !/^H[1-6]$/.test(t.tagName)) t = t.previousElementSibling;
    if (!t) return;
    if (!t.id) t.id = 'rail-t-' + (++railSeq);
    bande.setAttribute('aria-labelledby', t.id);
  }

  function poserCommandes(bande) {
    if (bande.parentNode && bande.parentNode.classList.contains('rail')) return null;
    var rail = document.createElement('div');
    rail.className = 'rail';
    bande.parentNode.insertBefore(rail, bande);
    var prec = document.createElement('button');
    var suiv = document.createElement('button');
    [prec, suiv].forEach(function (b, i) {
      b.type = 'button';
      b.className = 'rail-cmd ' + (i ? 'suiv' : 'prec');
      b.setAttribute('aria-label', (MOTS_RAIL[langueRail()] || MOTS_RAIL.fr)[i ? 'suiv' : 'prec']);
      b.innerHTML = '<svg class="i" aria-hidden="true"><use href="#i-chevron"/></svg>';
    });
    rail.appendChild(prec);
    rail.appendChild(bande);
    rail.appendChild(suiv);
    return { prec: prec, suiv: suiv };
  }

  function langueRail() {
    try { return localStorage.getItem('roots.langue') === 'en' ? 'en' : 'fr'; } catch (e) { return 'fr'; }
  }

  function glisser(bande) {
    if (!bande || bande.dataset.glisse) return;
    bande.dataset.glisse = '1';
    var actif = false, departX = 0, departScroll = 0, bouge = false;

    if (!bande.getAttribute('role')) bande.setAttribute('role', 'group');
    nommerRail(bande);
    /* Zone de defilement focalisable SEULEMENT si rien dedans ne l'est — et
       la question se repose a CHAQUE changement de contenu : une bande posee
       avant que ses cartes n'arrivent est vide au moment ou on l'installe, et
       une decision prise a cet instant serait fausse une seconde plus tard. */
    function reglerTabulation() {
      if (bande.hasAttribute('data-tabindex-tenu')) return;
      if (bande.querySelector(FOCALISABLE)) bande.removeAttribute('tabindex');
      else bande.setAttribute('tabindex', '0');
    }
    if (bande.hasAttribute('tabindex')) bande.setAttribute('data-tabindex-tenu', '1');
    reglerTabulation();

    var cmd = poserCommandes(bande);

    function pas() {
      var carte = bande.firstElementChild;
      var l = carte ? carte.getBoundingClientRect().width : 0;
      return Math.max(l + 12, Math.round(bande.clientWidth * 0.8));
    }
    function doux() {
      return (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
        ? 'auto' : 'smooth';
    }
    function direBouts() {
      if (!cmd) return;
      var g = bande.scrollLeft <= 1;
      var d = bande.scrollLeft + bande.clientWidth >= bande.scrollWidth - 1;
      var hors = bande.scrollWidth <= bande.clientWidth + 1;
      cmd.prec.setAttribute('aria-disabled', (g || hors) ? 'true' : 'false');
      cmd.suiv.setAttribute('aria-disabled', (d || hors) ? 'true' : 'false');
      cmd.prec.hidden = cmd.suiv.hidden = hors;
    }
    if (cmd) {
      [['prec', -1], ['suiv', 1]].forEach(function (x) {
        cmd[x[0]].addEventListener('click', function () {
          if (cmd[x[0]].getAttribute('aria-disabled') === 'true') return;
          bande.scrollBy({ left: x[1] * pas(), behavior: doux() });
        });
      });
      bande.addEventListener('scroll', direBouts, { passive: true });
      window.addEventListener('resize', direBouts);
      direBouts();
    }
    if (window.MutationObserver) {
      new MutationObserver(function () {
        reglerTabulation();
        direBouts();
      }).observe(bande, { childList: true });
    }

    function suivre(e) {
      if (!actif) return;
      var d = e.clientX - departX;
      if (Math.abs(d) > 3) bouge = true;
      bande.scrollLeft = departScroll - d;
      e.preventDefault();
    }
    function relacher() {
      if (!actif) return;
      actif = false;
      bande.classList.remove('glisse');
      window.removeEventListener('pointermove', suivre);
      window.removeEventListener('pointerup', relacher);
      window.removeEventListener('pointercancel', relacher);
    }
    bande.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'touch') return;
      if (bande.scrollWidth <= bande.clientWidth) return;
      actif = true;
      bouge = false;
      departX = e.clientX;
      departScroll = bande.scrollLeft;
      bande.classList.add('glisse');
      window.addEventListener('pointermove', suivre);
      window.addEventListener('pointerup', relacher);
      window.addEventListener('pointercancel', relacher);
    });
    bande.addEventListener('click', function (e) {
      if (!bouge) return;
      bouge = false;
      e.stopPropagation();
      e.preventDefault();
    }, true);
    /* La molette verticale pousse la bande a l'horizontale tant qu'il lui
       reste du chemin. Au bout, elle ne retient le geste que le temps d'une
       CALE : passe ce delai, la page reprend la main et le defilement
       continue dans le sens du geste — vers le bas si la bande est a sa fin,
       vers le haut si elle est a son debut. Sans cette remise, un rail au
       bout retiendrait la page indefiniment.
       La cale se rearme quand la bande quitte son bout, quand le geste change
       de sens, et quand la main s'arrete assez longtemps pour qu'un nouveau
       geste commence. */
    var CALE = 320;
    var REARMEMENT = 900;
    var boutDepuis = 0, boutSens = 0;
    bande.addEventListener('wheel', function (e) {
      if (bande.scrollWidth <= bande.clientWidth) return;
      if (Math.abs(e.deltaX) >= Math.abs(e.deltaY) || !e.deltaY) return;
      var sens = e.deltaY > 0 ? 1 : -1;
      var auBout = sens > 0
        ? bande.scrollLeft + bande.clientWidth >= bande.scrollWidth - 1
        : bande.scrollLeft <= 1;
      if (!auBout) {
        boutDepuis = 0;
        bande.scrollLeft += e.deltaY;
        e.preventDefault();
        return;
      }
      var t = Date.now();
      if (boutSens !== sens || !boutDepuis || t - boutDepuis > REARMEMENT) {
        boutSens = sens;
        boutDepuis = t;
      }
      if (t - boutDepuis < CALE) e.preventDefault();
    }, { passive: false });
  }

  /* ------------------------------------------------------------------
     LA POSE DE LA COQUE HORS LIGNE.
     Elle est ICI, et non dans un script en ligne de chaque ecran, pour une
     raison mecanique : roots.js est un fichier EXTERNE, couvert par
     script-src 'self'. Aucun condensat de politique de securite ne bouge.
     Et roots.js est charge par les six ecrans publics et par aucun autre :
     payer.html ne le charge pas, hors-ligne.html non plus. La liste des
     ecrans qui posent la coque est donc tenue par le chargement lui-meme,
     et il n'y a aucune liste a maintenir a cote.
     La pose attend le chargement complet : elle ne dispute jamais le reseau
     au premier affichage.
     ------------------------------------------------------------------ */
  function poserCoque() {
    if (!('serviceWorker' in navigator)) return;
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js', { scope: './' })['catch'](function (e) {
        /* Une coque qui ne se pose pas n'empeche rien de fonctionner : on
           ne rend pas l'application dependante d'elle. On le dit, et on
           continue. */
        if (window.console) console.warn('[Roots] coque non posee :', e && e.message);
      });
    });
  }

  /* L'ordre de retrait, a la main depuis la console d'un testeur bloque :
       Roots.retirerCoque()
     Il desinstalle la coque, vide tous ses caches, et recharge. Il doit
     exister des la pose : une coque deja installee chez un client ne
     disparait PAS quand sw.js disparait du serveur — elle continue de
     repondre jusqu'a ce qu'on lui ordonne de partir. */
  function retirerCoque() {
    if (!('serviceWorker' in navigator)) return false;
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage('roots:retirer');
      return true;
    }
    navigator.serviceWorker.getRegistrations().then(function (rs) {
      rs.forEach(function (r) { r.unregister(); });
      if (window.caches) caches.keys().then(function (ks) {
        ks.forEach(function (k) { caches['delete'](k); });
      });
      location.reload();
    });
    return true;
  }

  /* ------------------------------------------------------------------
     LA FEUILLE FERMEE NE GARDE PAS LE FOYER.

     Une feuille du bas se ferme par une translation hors du cadre. Elle reste
     donc rendue au sens du calcul, et tout ce qu'elle contient reste dans
     l'ordre de tabulation : le foyer disparait dans un panneau que personne
     ne voit, et il faut le traverser en entier pour en sortir.

     `inert` retire l'element ET sa descendance du foyer, du pointeur et de
     l'arbre d'accessibilite ; `aria-modal` ne couvre que l'etat OUVERT et ne
     dit rien de l'etat ferme. La classe qui rend la feuille visible est la
     seule source : l'attribut la suit, il ne la double pas.

     Ce qui casse si on le modifie : retirer l'observateur fige l'etat au
     chargement, et une feuille ouverte par script reste inerte, donc
     inutilisable. Ecrire `inert` dans le balisage d'un ecran cree une seconde
     source de verite sur l'ouverture. */
  var CLASSE_OUVERTE = 'visible';

  function accorderInerte(feuille) {
    var ouverte = feuille.classList.contains(CLASSE_OUVERTE);
    if (ouverte === !feuille.hasAttribute('inert')) return;
    if (ouverte) {
      feuille.removeAttribute('inert');
      /* Le foyer entre dans la feuille A L'OUVERTURE. Un script qui ouvre et
         focalise dans le meme geste echoue : l'inertie ne tombe qu'apres son
         tour. La garantie se pose donc ici, une fois l'inertie levee — et
         seulement si le foyer n'est pas deja dedans. */
      var actif = document.activeElement;
      var saisitDeja = actif && (actif.tagName === 'INPUT' || actif.tagName === 'TEXTAREA');
      /* Une saisie active hors de la feuille n'est jamais un foyer perdu :
         un appareil peut ouvrir la feuille depuis son propre champ — la
         garantie ne le lui arrache pas. */
      if (!feuille.contains(actif) && !saisitDeja) {
        var premier = feuille.querySelector('input:not([hidden]),select,textarea,button:not(.fermer),[tabindex]');
        if (premier && premier.focus) { try { premier.focus(); } catch (e) {} }
      }
    } else feuille.setAttribute('inert', '');
  }

  function poserInerte() {
    var feuilles = document.querySelectorAll('.feuille-bas');
    if (!feuilles.length) return 0;
    var oeil = new MutationObserver(function (lots) {
      for (var i = 0; i < lots.length; i++) accorderInerte(lots[i].target);
    });
    Array.prototype.forEach.call(feuilles, function (f) {
      accorderInerte(f);
      oeil.observe(f, { attributes: true, attributeFilter: ['class'] });
    });
    return feuilles.length;
  }

  global.Roots = global.Roots || {};
  global.Roots.sprite = sprite;
  global.Roots.glisser = glisser;
  global.Roots.retirerCoque = retirerCoque;
  global.Roots.poserInerte = poserInerte;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', poserInerte);
  } else {
    poserInerte();
  }

  poserCoque();
})(window);
