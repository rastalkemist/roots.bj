/* Garde d'ecran — rend visible une page qui n'a pas demarre.

   CE QU'IL RESOUT. Un script refuse par la politique de securite de sa page, ou
   qui contient une faute de frappe, ne s'execute pas : la page s'affiche, le
   style s'applique, et plus rien ne repond. Rien ne le dit a l'ecran, et seuls
   les liens ordinaires marchent encore. Ce fichier transforme cette panne
   muette en un message lisible.

   POURQUOI IL VIT DANS SON PROPRE FICHIER. Un fichier charge par son adresse
   est autorise par son emplacement, jamais par une empreinte de son contenu :
   il ne peut donc pas etre la victime de la panne qu'il surveille. Le poser
   dans le balisage d'une page l'exposerait exactement au meme refus.

   CE QU'IL SURVEILLE, sans rien exiger des ecrans : le refus de la politique de
   securite, et l'erreur de compilation ou d'execution d'un script. Aucun ecran
   n'a de ligne a ajouter pour en beneficier.

   CE QU'IL NE VOIT PAS : un script qui demarre puis se trompe sans lever
   d'erreur, une porte serveur qui refuse, un texte faux. Il dit qu'un ecran
   n'a pas demarre, jamais qu'un ecran est juste. */
(function () {
  'use strict';

  var MOTS = {
    fr: {
      titre: 'Cette page n’a pas pu démarrer',
      dit: 'La dernière modification du site contient une erreur. Le reste du site fonctionne normalement.',
      politique: 'Le programme de cette page a été modifié sans que sa signature suive.',
      faute: 'Une erreur se trouve dans le programme de cette page.',
      ligne: 'ligne',
      accueil: 'Retour à l’accueil'
    },
    en: {
      titre: 'This page did not start',
      dit: 'The most recent change to the site contains an error. The rest of the site is working normally.',
      politique: 'This page’s code was changed without its signature following.',
      faute: 'There is an error in this page’s code.',
      ligne: 'line',
      accueil: 'Back to home'
    }
  };

  var pose = false;

  function langue() {
    try {
      var l = localStorage.getItem('roots.langue');
      if (l === 'en' || l === 'fr') return l;
    } catch (e) {}
    if (document.documentElement.lang === 'en') return 'en';
    return (navigator.language || 'fr').toLowerCase().indexOf('en') === 0 ? 'en' : 'fr';
  }

  /* Le detail est la seule partie du message qui vaille pour qui va corriger :
     il nomme le fichier et la ligne quand le navigateur les donne. */
  function poser(detail) {
    if (pose) return;
    pose = true;
    var m = MOTS[langue()] || MOTS.fr;

    function bloc(balise, classe, texte) {
      var e = document.createElement(balise);
      if (classe) e.className = classe;
      if (texte) e.textContent = texte;
      return e;
    }

    var b = bloc('div', 'garde-banniere');
    b.setAttribute('role', 'alert');
    b.appendChild(bloc('p', 'garde-titre', m.titre));
    b.appendChild(bloc('p', 'garde-dit', m.dit));
    if (detail) b.appendChild(bloc('p', 'garde-detail', detail));
    var a = document.createElement('a');
    a.className = 'garde-lien';
    a.href = 'index.html';
    a.textContent = m.accueil;
    b.appendChild(a);

    var ou = document.body || document.documentElement;
    ou.insertBefore(b, ou.firstChild);
  }

  function attendreLeCorps(detail) {
    if (document.body) { poser(detail); return; }
    document.addEventListener('DOMContentLoaded', function () { poser(detail); });
  }

  /* Refus de la politique de securite. On ne retient que le script : un refus
     de style ou d'image n'empeche pas l'ecran de repondre.
     ⚠ Ce refus MASQUE une eventuelle faute de frappe : le navigateur refuse le
     script avant de le compiler. Le message nomme donc l'ecart constate, et
     aucune cause.
     IL S'ADRESSE A UN VISITEUR. Il ne porte ni commande, ni chemin de fichier
     d'outillage : qui lit cet ecran n'a rien a lancer, et un ecran public ne
     decrit pas l'atelier. */
  window.addEventListener('securitypolicyviolation', function (e) {
    if (String(e.violatedDirective || '').indexOf('script-src') !== 0) return;
    attendreLeCorps((MOTS[langue()] || MOTS.fr).politique);
  });

  /* Faute de frappe dans un programme : le navigateur rend le fichier et la
     ligne. Une erreur de chargement d'une ressource porte une cible et non un
     message — elle ne concerne pas cet ecran. */
  window.addEventListener('error', function (e) {
    if (!e || !e.message) return;
    /* Un script d'une AUTRE origine ne rend qu'un message opaque, sans fichier
       ni ligne. Le widget d'encaissement en est un : une erreur chez lui
       annoncerait au client qui paie que la page est cassee, alors qu'elle
       repond. On ne retient que ce qui vient de ce site. */
    if (e.filename && e.filename.indexOf(location.origin) !== 0) return;
    if (!e.filename) return;
    var m = MOTS[langue()] || MOTS.fr;
    var ou = e.filename ? String(e.filename).split('/').pop() : '';
    var detail = m.faute;
    if (ou) detail += ' — ' + ou + (e.lineno ? ', ' + m.ligne + ' ' + e.lineno : '');
    attendreLeCorps(detail);
  });
})();
