/* ===========================================================================
   PERSISTANCE DE LA PROGRESSION (lot D) — cote serveur uniquement.

   Un seul fichier, `data/progress.json`, ecrit par le processus qui sert deja
   le jeu. Trois risques traites des la premiere ligne :

     - le VERSIONNAGE : le champ `version` est present des la premiere
       ecriture, et une version inconnue est ignoree en journalisant — le
       premier changement de format n'efface pas la progression du groupe ;
     - l'ECRITURE ATOMIQUE : on ecrit dans `progress.json.tmp` puis on renomme.
       Une coupure en pleine ecriture sur le fichier unique emporterait toute
       la progression ; le renommage est atomique sur les systemes de fichiers
       courants (et `fs.rename` remplace la cible existante, y compris sous
       Windows) ;
     - un fichier CORROMPU OU ABSENT ne bloque jamais le demarrage : on repart
       d'un fichier neuf en journalisant l'incident.

   L'ecriture est synchrone et c'est assume : elle n'a lieu qu'au salon, a la
   fin d'une manche ou au depart d'un joueur — JAMAIS pendant une vague, ou un
   acces disque dans la boucle de simulation produirait un a-coup visible. */

import { readFileSync, writeFileSync, renameSync, mkdirSync } from "node:fs";
import { join } from "node:path";

import { PROG_CFG, newProfile } from "./shared/progression.js";

export function createStore(root, log = console.log) {
  const dir = join(root, "data");
  const file = join(dir, "progress.json");

  let data = { version: PROG_CFG.VERSION, players: {} };
  try {
    const raw = JSON.parse(readFileSync(file, "utf8"));
    if (raw && typeof raw === "object" && raw.players && typeof raw.players === "object") {
      if (raw.version === PROG_CFG.VERSION) {
        data = raw;
      } else {
        // Migration explicite : la seule version connue est la premiere. Une
        // version future ajoutera son cas ICI plutot que d'ecraser le fichier.
        log(`progress.json en version ${raw.version} inconnue — fichier ignoré, progression neuve`);
      }
    }
  } catch (e) {
    if (e.code !== "ENOENT") {
      log(`progress.json illisible (${e.message}) — progression neuve`);
    }
  }

  function save() {
    try {
      mkdirSync(dir, { recursive: true });
      const tmp = file + ".tmp";
      writeFileSync(tmp, JSON.stringify(data));
      renameSync(tmp, file);
    } catch (e) {
      // Un disque plein ou un droit manquant ne doit pas tuer le serveur en
      // pleine partie : on journalise, la progression vivra en memoire.
      log(`écriture de progress.json impossible : ${e.message}`);
    }
  }

  /* Le PSEUDO n'est pas une identite : n'importe qui peut taper le tien. La
     cle est un identifiant tire au sort a la premiere connexion, stocke dans
     le localStorage du client et envoye au join — le pseudo n'est plus qu'un
     affichage, mis a jour a chaque connexion. */
  function profileFor(uid, name) {
    let p = data.players[uid];
    if (!p) {
      p = newProfile(name);
      data.players[uid] = p;
    } else if (name) {
      p.name = name;
    }
    return p;
  }

  return { data, save, profileFor };
}
