/* Ce site ne porte pas de coque : rien ne se precache, rien ne s'intercepte.
   Le chrome commun demande une coque par son adresse ; ce fichier repond en
   se retirant aussitot, pour qu'aucun appareil ne garde une copie du site.
   Le supprimer rendrait une erreur reseau a chaque visite. */
'use strict';
self.addEventListener('install', function () { self.skipWaiting(); });
self.registration.unregister();
