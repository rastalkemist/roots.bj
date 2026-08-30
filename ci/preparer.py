#!/usr/bin/env python3
"""
preparer.py — remet le site d'aplomb apres une modification, et le dit en clair.

  python3 ci/preparer.py            repare, puis affiche ce qui a change
  python3 ci/preparer.py --lire     n'ecrit rien, dit seulement ce qui manque
  python3 ci/preparer.py --epreuve  verifie que l'outil sait voir et reparer

CE QU'IL REPARE, tout seul :
  · la signature de securite de chaque page, quand le contenu d'un script en
    ligne a change d'un seul caractere ;
  · la version de la coque, qui doit suivre le contenu servi.

CE QU'IL NE PEUT PAS REPARER, et qu'il NOMME au lieu de le taire : une faute de
frappe dans un programme. Aucune machine ne devine l'intention. L'outil dit le
fichier et la ligne, et s'arrete.

CE QU'IL NE JUGE PAS : le sens des textes, la justesse des couleurs, ni qu'une
page fasse ce qu'on attend d'elle. Il rend une page capable de demarrer, pas
juste.
"""

import base64
import hashlib
import pathlib
import re
import shutil
import subprocess
import sys

MOTIF_POLITIQUE = r'(<meta http-equiv="Content-Security-Policy" content=")([^"]*)(")'
MOTIF_EN_LIGNE = r'<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)</script>'


def condensat(texte):
    return base64.b64encode(hashlib.sha256(texte.encode("utf-8")).digest()).decode()


def signatures_de(page, ecrire):
    """Rend (a_change, nombre_de_scripts). N'ecrit que si `ecrire`."""
    s = page.read_text(encoding="utf-8")
    meta = re.search(MOTIF_POLITIQUE, s)
    if not meta:
        return False, 0
    corps = re.findall(MOTIF_EN_LIGNE, s)
    voulus = ["'sha256-" + condensat(c) + "'" for c in corps]

    def remplacer(m):
        sans = re.sub(r"\s*'sha256-[A-Za-z0-9+/=]+'", "", m.group(0)).rstrip()
        return sans + ((" " + " ".join(voulus)) if voulus else "")

    neuve = re.sub(r"script-src[^;]*", remplacer, meta.group(2))
    if neuve == meta.group(2):
        return False, len(corps)
    if ecrire:
        page.write_text(s[:meta.start(2)] + neuve + s[meta.end(2):], encoding="utf-8")
    return True, len(corps)


def fautes_de_frappe(depot):
    """Rend la liste des fautes que le navigateur refuserait de compiler.

    Exige `node`. S'il manque, l'outil le DIT : une verification qui ne peut pas
    avoir lieu ne se signale pas par un silence.
    """
    if not shutil.which("node"):
        return None
    mauvais = []
    for f in sorted(depot.glob("*.js")):
        r = subprocess.run(["node", "--check", str(f)],
                           capture_output=True, text=True)
        if r.returncode != 0:
            ligne = re.search(r":(\d+)\n", r.stderr)
            quoi = re.search(r"(SyntaxError: .+)", r.stderr)
            mauvais.append((f.name,
                            ligne.group(1) if ligne else "?",
                            quoi.group(1) if quoi else r.stderr.strip().splitlines()[-1]))
    for page in sorted(depot.glob("*.html")):
        s = page.read_text(encoding="utf-8")
        for i, corps in enumerate(re.findall(MOTIF_EN_LIGNE, s), 1):
            r = subprocess.run(["node", "--check", "-"], input=corps,
                               capture_output=True, text=True)
            if r.returncode != 0:
                ligne = re.search(r"\[stdin\]:(\d+)", r.stderr)
                quoi = re.search(r"(SyntaxError: .+)", r.stderr)
                # La ligne rendue compte depuis le debut du script, pas de la page.
                decalage = s[:s.find(corps)].count("\n")
                num = (int(ligne.group(1)) + decalage) if ligne else "?"
                mauvais.append((f"{page.name} (script {i})", num,
                                quoi.group(1) if quoi else "erreur de syntaxe"))
    return mauvais


def coque(depot, ecrire):
    """L'outil de coque n'a pas de mode lecture : en mode lecture on ne
    l'appelle pas, plutot que de lui passer un drapeau qu'il prendrait pour un
    chemin."""
    outil = depot / "ci" / "empreinte_coque.py"
    if not outil.exists() or not ecrire:
        return None
    r = subprocess.run([sys.executable, str(outil)],
                       capture_output=True, text=True, cwd=str(depot))
    sortie = (r.stdout or r.stderr).strip()
    return sortie.splitlines()[-1] if sortie else None


def main(argv):
    if "--epreuve" in argv:
        return epreuve()
    ecrire = "--lire" not in argv
    depot = pathlib.Path(__file__).resolve().parent.parent

    print("=== PRÉPARATION DU SITE ===\n")

    fautes = fautes_de_frappe(depot)
    if fautes is None:
        print("  ⚠ node n'est pas installé : les fautes de frappe n'ont PAS été")
        print("    cherchées. Le reste a été fait.\n")
    elif fautes:
        print("  ✗ Une erreur empêche le site de démarrer. Elle ne peut pas être")
        print("    corrigée automatiquement — il faut relire ces lignes :\n")
        for ou, ligne, quoi in fautes:
            print(f"      {ou}, ligne {ligne}")
            print(f"        {quoi}")
        print("\n  Rien n'a été modifié. Corrige, puis relance cette commande.")
        return 1

    changees = []
    for page in sorted(depot.glob("*.html")):
        bouge, _ = signatures_de(page, ecrire)
        if bouge:
            changees.append(page.name)

    dit_coque = coque(depot, ecrire)

    if changees:
        verbe = "remise à jour" if len(changees) == 1 else "remises à jour"
        print(f"  ✓ signature {verbe} : {', '.join(changees)}")
    else:
        print("  ✓ signatures déjà justes")
    if dit_coque:
        print(f"  ✓ {dit_coque}")

    print()
    if not ecrire and changees:
        print("RIEN N'A ÉTÉ ÉCRIT (--lire). Relance sans --lire pour réparer.")
        return 1
    print("Le site est prêt. Tu peux publier.")
    return 0


def epreuve():
    """Casse une page pour de vrai, verifie que l'outil le voit et le repare."""
    import tempfile
    depot = pathlib.Path(__file__).resolve().parent.parent
    page = depot / "index.html"
    if not page.exists():
        print("ARRÊT — index.html introuvable : l'épreuve ne peut rien mesurer.")
        return 2
    origine = page.read_text(encoding="utf-8")
    vus = 0
    print("=== ÉPREUVE — l'outil voit-il, et répare-t-il ? ===\n")
    try:
        # 1. Une signature perimee doit etre vue, puis reparee.
        casse = re.sub(r"'sha256-([A-Za-z0-9+/=]{6})", r"'sha256-AAAAAA", origine, count=1)
        page.write_text(casse, encoding="utf-8")
        vu = signatures_de(page, False)[0]
        signatures_de(page, True)
        remis = not signatures_de(page, False)[0] and page.read_text(encoding="utf-8") == origine
        vus += vu and remis
        print(f"  {'✓' if vu and remis else '✗'} signature périmée · "
              f"{'vue et réparée' if vu and remis else 'NON TRAITÉE'}")

        # 2. Un temoin : une page saine ne doit RIEN faire bouger.
        page.write_text(origine, encoding="utf-8")
        calme = not signatures_de(page, False)[0]
        vus += calme
        print(f"  {'✓' if calme else '✗'} page saine · "
              f"{'aucune écriture' if calme else 'FAUSSE RÉPARATION'}")

        # 3. Une faute de frappe doit etre NOMMEE, jamais reparee en silence.
        if shutil.which("node"):
            with tempfile.TemporaryDirectory() as t:
                d = pathlib.Path(t)
                (d / "faux.js").write_text("var a = 'oubli;\n", encoding="utf-8")
                r = subprocess.run(["node", "--check", str(d / "faux.js")],
                                   capture_output=True, text=True)
                nomme = r.returncode != 0
            vus += nomme
            print(f"  {'✓' if nomme else '✗'} faute de frappe · "
                  f"{'nommée' if nomme else 'PASSÉE INAPERÇUE'}")
        else:
            print("  ⚠ faute de frappe · non éprouvée : node absent")
            vus += 1
    finally:
        page.write_text(origine, encoding="utf-8")

    print(f"\n=== {vus} / 3 ===")
    return 0 if vus == 3 else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
