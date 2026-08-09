/* ===========================================================================
   CLIENT — AMORCE
   Ne simule rien d'autoritaire. Il envoie sa direction de deplacement et sa
   direction de visee, recoit des instantanes a 20 Hz, et comble les trous par
   interpolation. Seul son propre personnage est predit localement.
   
   Ce fichier ne contient QUE du cablage. La regle qui tient tout le reste :
   une couche n'importe que des couches d'indice strictement inferieur, et
   celle-ci est la derniere. L'ordre des imports ci-dessous EST celui des
   couches ; il n'est pas cosmetique, c'est l'ordre d'evaluation.
   
     core/state   etat de session et de partie, zero dependance interne
     ui/dom       les noeuds de la page
     render/*     stage, fx, decor, actors, boss, puis world qui orchestre
     net/*        interp (horloge de rendu), ingest, router
     ui/*         build, screens, pause, boot
     input        clavier et souris
   =========================================================================== */

import { setReconnecter } from "./core/state.js";
import { connect } from "./net/router.js";
import { boucleDeRendu } from "./render/world.js";

/* Importes pour leurs effets : ces modules posent des ecouteurs et des
   gestionnaires au chargement. L'ordre suit les couches. */
import "./ui/dom.js";
import "./render/stage.js";
import "./net/interp.js";
import "./render/fx.js";
import "./render/decor.js";
import "./render/actors.js";
import "./render/boss.js";
import "./ui/build.js";
import "./ui/screens.js";
import "./ui/pause.js";
import "./input.js";
import "./ui/boot.js";
import "./net/ingest.js";

/* La socket est ouverte par le routeur, l'etat vit en couche 0 : le crochet
   est ce qui evite l'unique arete remontante du client. */
setReconnecter(connect);

requestAnimationFrame(boucleDeRendu);
