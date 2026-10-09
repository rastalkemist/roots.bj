/* Les pages À propos du site : une page présente un document et propose de le
   télécharger.

   Ce script tient la langue de la page et pose le chrome du tronc. Il ne
   dessine rien : les mots vivent dans le balisage en français, et chaque
   élément qui se traduit porte `data-t`, la clé de sa chaîne dans le
   dictionnaire ci-dessous. Une clé absente laisse le texte en place.

   Exige : `Roots` chargé avant lui, un bouton `#btnLangue`, une annonce
   `#toast`. Le nom de la page, le titre de l'onglet et la description
   relèvent de `site.js`. */
(function () {
  'use strict';

  var T = {
    fr: {
      saut: 'Aller au contenu',
      piedSejourner: 'Séjourner', piedDecouvrir: 'Découvrir', piedInfos: 'Infos',
      piedPolitique: 'Politique de confidentialité',
      toastNu: 'Le mode NU (communauté) arrive bientôt.',

      projTitre: 'Roots — Le projet',
      projChapo: 'Plus qu’une expérience d’accueil, Michael et son équipe ont fait de la résidence un espace de connexion humaine et de reconnexion à soi, aux racines, à la terre-mère.',
      projDocTitre: 'Rapport d’activités 2024-2025 — de Kër Yawa à Roots Inc.',
      projTelecharger: 'Télécharger le rapport',
      projMeta: 'PDF · 6,73 Mo · 31 doubles pages. Il se lit au mieux sur un grand écran, ou imprimé.',
      projHistoire: 'L’histoire',
      projP1: 'En 2022, Michael Gnimadi – traducteur et rédacteur autoentrepreneur en pleine crise existentielle devant l’automatisation progressive de sa profession – parvient à convaincre sa famille de le laisser rénover une maisonnette au bord de l’abandon à Cotonou.',
      projP2: 'En 2025, l’incendie du marché Ste-Rita a cristallisé notre élan d’impact via l’art. Le collectif NU s’est alors constitué autour du programme NU Futures, grand succès pour des moyens inexistants. Puis, la maison Kër Yawa a peu à peu laissé place au « jardin connecté » du Roots Café, amorçant notre mue progressive en tiers-lieu grassroots au service des industries créatives & culturelles.',
      projP3: 'La mue est presque complète : 2026 est l’année de son parachèvement.',
      projRepere: 'En quelques chiffres',
      projC1: '75 avis de voyageurs, 4,88 sur 5.',
      projC2: 'Le café-coworking a au moins doublé en un an.',
      projC3: 'Près des trois quarts des revenus d’hébergement viennent désormais de réservations directes.',
      projC4: 'NU Futures, 2025 : après l’incendie du marché Sainte-Rita, des dizaines de jeunes bénévoles ont accompagné 22 commerçantes.',
      projContactAvant: 'Parlons-nous à l’adresse',
      projContactApres: ' pour plus d’infos ou toute possibilité de partenariat.',

      visTitre: 'Roots Fest — La vision',
      visChapo: 'À l’horizon 2030, nous sommes un tiers-lieu incontournable dans la sous-région pour les jeunes des industries créatives et culturelles. Nous atteignons cet objectif en allouant majoritairement nos ressources au support des activités culturelles de la communauté.',
      visDocTitre: 'Feuille de route 2030 : Road to Roots Fest',
      visTelecharger: 'Télécharger la feuille de route',
      visMeta: 'PDF · 4,62 Mo · 25 doubles pages. Elle se lit au mieux sur un grand écran, ou imprimée.',
      visFest: 'Le Roots Fest',
      visP1: 'Le Roots Fest est un festival qui célèbre la renaissance Africaine et incarne le retour des afrodescendant·es sur la terre-mère. C’est notre programme tourné vers la diaspora et le reste du monde, qui se déroule chaque année pendant les Vodun Days autour du 10 janvier à Ouidah.',
      visP2: 'L’événement se tient au Roots Camp, notre espace de camping de 1500 m2 situé sur la plage de Djègbadji, à 10 minutes à pied de la Porte du non-retour et en cours d’aménagement.',
      visP3: 'Le Roots Fest est le rêve, le projet vers lequel nous nous dirigeons avec tous les jalons précédents : un rendez-vous annuel des afrodescendants et des curieux ou amoureux du Bénin, près de ce qui est pour nous à présent la porte du Retour.',
      visContactAvant: 'Pour nous rejoindre lors des prochains Vodun Days du 2 au 9 janvier 2027, contactez-nous dès maintenant par WhatsApp au +229 01 46 75 55 75 ou par courriel à',
      visContactApres: '.'
    },
    en: {
      saut: 'Skip to content',
      piedSejourner: 'Stay', piedDecouvrir: 'Discover', piedInfos: 'Info',
      piedPolitique: 'Privacy policy',
      toastNu: 'NU, the community side of Roots, is coming soon.',

      projTitre: 'Roots — The project',
      projChapo: 'The Roots is a tourism and culture third place in the heart of Cotonou, Benin.',
      projDocTitre: 'Rapport d’activités 2024-2025 — de Kër Yawa à Roots Inc.',
      projTelecharger: 'Download the report',
      projMeta: 'PDF, in French · 6.73 MB · 31 double pages. Best read on a large screen, or printed.',
      projHistoire: 'The story',
      projP1: 'In 2022, Michael Gnimadi — Mika to everyone — was a freelance translator and writer watching automation eat his trade. He persuaded his family to let him restore a small house in Cotonou that was close to falling down.',
      projP2: 'The turn came in 2025, when fire destroyed the Sainte-Rita market. Young creatives who had gathered in the garden organised themselves into a collective, NU, and ran their first programme, NU Futures. That same year the house gave way, little by little, to the “connected garden” of the Roots Café, and the guesthouse became a third place.',
      projP3: '2026 is the year the transformation completes.',
      projRepere: 'At a glance',
      projC1: '75 guest reviews, rated 4.88 out of 5.',
      projC2: 'The café and coworking space more than doubled in a year.',
      projC3: 'Nearly three quarters of lodging revenue now comes through direct bookings.',
      projC4: 'NU Futures, 2025: after the fire at the Sainte-Rita market, dozens of young volunteers supported 22 women traders.',
      projContactAvant: 'For more information or any partnership, write to',
      projContactApres: '.',

      visTitre: 'Roots Fest — The vision',
      visChapo: 'Roots Fest is the programme facing the diaspora and the world: a festival of African renaissance and return, held each year during the Vodun Days around 10 January in Ouidah.',
      visDocTitre: 'Feuille de route 2030 : Road to Roots Fest',
      visTelecharger: 'Download the roadmap',
      visMeta: 'PDF, in French · 4.62 MB · 25 double pages. Best read on a large screen, or printed.',
      visFest: 'Roots Fest',
      visP1: 'Roots Camp is a campsite in development on some 1,500 m² at Djègbadji, Ouidah, a short walk from the beach and ten minutes from the Door of No Return.',
      visP2: 'It will hold a camping area with two to six lodgings, a community space with a library, a garden and a café-coworking corner, and a central square for gatherings, festivities and performances.',
      visP3: 'Every year, during the Vodun Days, it will host Roots Fest — seven days for the African renaissance and for the return of people of African descent to the motherland.',
      visContactAvant: 'To join us for the next Vodun Days, 2 to 9 January 2027, message us on WhatsApp at +229 01 46 75 55 75 or write to',
      visContactApres: '.'
    }
  };

  var langue = Roots.langueRetenue(Roots.langueParDefaut());
  var bouton = document.getElementById('btnLangue');

  function appliquerLangue() {
    var d = T[langue] || T.fr;
    document.documentElement.lang = langue;
    /* Le bouton nomme la langue vers laquelle on bascule, jamais la courante. */
    if (bouton) {
      bouton.textContent = langue === 'fr' ? 'EN' : 'FR';
      bouton.setAttribute('lang', langue === 'fr' ? 'en' : 'fr');
    }
    Array.prototype.forEach.call(document.querySelectorAll('[data-t]'), function (el) {
      var v = d[el.getAttribute('data-t')];
      if (typeof v === 'string') el.textContent = v;
    });
    if (Roots.poserLibelles) Roots.poserLibelles(langue);
    if (chrome && chrome.dessinerSections) chrome.dessinerSections();
  }

  function basculerLangue() {
    langue = (langue === 'fr') ? 'en' : 'fr';
    Roots.retenirLangue(langue);
    appliquerLangue();
    document.dispatchEvent(new CustomEvent('roots:langue'));
  }

  var chrome = Roots.initChrome({ toastId: 'toast',
    getLangue: function () { return langue; }, getSections: Roots.nav,
    toastNu: function (l) { return (T[l] || T.fr).toastNu; },
    radio: true,
    onLangue: function () { basculerLangue(); }
  });
  if (bouton) bouton.addEventListener('click', function () { basculerLangue(); });

  appliquerLangue();
})();
