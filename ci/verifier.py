#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
verifier — les controles du depot, sans rien a installer.

Ce fichier vit DANS le depot public et ne porte aucune reference : il ne
compare pas a une liste de valeurs attendues, il verifie des proprietes
structurelles. Un controle qui porte sa propre copie de la reference finit par
mesurer contre elle.

  A  JETONS      tout `var(--x)` employe est declare quelque part            REFUS
  B  COULEURS    la feuille de style n'ecrit aucune couleur en dur           REFUS
  C  TAILLES     la feuille de style n'ecrit aucune taille de police en dur  REFUS
  D  COMMENTAIRES  un commentaire ne porte que ce qui sert a intervenir      REFUS

Sens de l'echec : le refus. Sortie 1 des qu'un controle refuse.
Usage : python3 verifier.py [dossier]
"""
import pathlib
import re
import sys

# La piece qui DECLARE les jetons. Elle est la seule ou une valeur nue est
# legitime : porter les nombres et les encres est son role.
JETONS = "roots-tokens.css"

# Nom de feuille employe par les jeux d'essai de l'epreuve, plus bas. Les
# controles, eux, ne connaissent aucun nom de feuille : ils lisent le dossier.
FEUILLE = "roots.css"


def feuilles(d):
    """Toute feuille de style du dossier SAUF la piece des jetons.

    La portee est le dossier, jamais un nom en dur : un ecran qui livre sa
    propre feuille entre dans le champ des controles sans qu'on y touche. Une
    liste nommee laisserait une feuille neuve hors mesure, et un controle qui
    ne lit rien rend le meme verdict qu'un controle qui n'a rien a redire.
    """
    return sorted(f for f in d.glob("*.css") if f.name != JETONS)

# Ce qu'un commentaire ne doit pas porter. Categories generiques : aucune
# valeur propre au projet n'est inscrite ici.
MOTIFS = [
    ("premiere personne",
     r"\b(nous|notre|nos|moi|je|j'ai|mon|ma|mes)\b"),
    ("aveu qu'un dispositif n'est pas en place",
     r"n'est (?:pas|plus) (?:encore )?(?:tenue?|branch|pos|appliqu|impl)"),
    # Une plage numerique (« 5-12 % ») n'est pas une date : le jour sur deux
    # chiffres et la barre oblique sont exiges pour la forme courte.
    ("date",
     r"\b[0-3]\d/[01]\d(?:/(?:20)?\d\d)?\b|\b20\d\d-[01]\d-[0-3]\d\b"),
    ("note a faire",
     r"\b(TODO|FIXME|(?:à|a) faire\b|reste (?:à|a) faire\b|pas encore\b|"
     r"non branch)"),
    ("renvoi vers un instrument ou un document interne",
     r"\b\w+\.(py|sh|sql|md)\b|\bvoir (la note|le document|le carnet)"),
    ("recit d'un evenement de travail",
     r"\b(l'audit|la contre-épreuve|le défaut|le relevé|"
     r"la version antérieure|jusqu'au|corrigé le|posé le|relevé le|"
     r"avait perdu|n'aurait pas dû|a été corrigé)\b"),
    ("reference a une decision",
     r"tranch[ée]_(par|le)|act[ée]_(par|le)|\b(acté par|tranché par|"
     r"décision de|validé par|arbitr(é|age) du)\b"),
]
# Vocabulaire technique legitime, qui ne doit pas faire rougir.
TEMOINS = [
    r"par défaut", r"par defaut", r"valeur par défaut",
    r"\bpx\b", r"\bem\b", r"navigateur",
]


def commentaires(txt, suffixe):
    """Rend (numero de ligne, texte) pour chaque ligne de commentaire."""
    out = []
    if suffixe == ".css":
        for m in re.finditer(r"/\*.*?\*/", txt, re.S):
            depart = txt[:m.start()].count("\n") + 1
            for i, l in enumerate(m.group(0).splitlines()):
                out.append((depart + i, l))
    else:
        for i, l in enumerate(txt.splitlines(), 1):
            m = re.search(r"//(.*)$|/\*(.*?)\*/", l)
            if m:
                out.append((i, m.group(0)))
    return out


def controle_a(d, dire, mal):
    """Tout jeton employe est declare."""
    lus = feuilles(d) + ([d / JETONS] if (d / JETONS).exists() else [])
    css = "".join(f.read_text(encoding="utf-8") for f in lus)
    if not css:
        return mal("A · aucune feuille de style lisible dans le dossier.")
    # Un jeton cite en exemple dans un commentaire n'est pas un jeton employe.
    css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
    employes = set(re.findall(r"var\(\s*(--[\w-]+)", css))
    declares = set(re.findall(r"(--[\w-]+)\s*:", css))
    manque = sorted(employes - declares)
    dire(f"A · {len(lus)} feuille(s) · jetons employés {len(employes)} · "
         f"déclarés {len(declares)} · manquants {len(manque)}")
    for j in manque[:12]:
        mal(f"A · `{j}` est employé et n'est déclaré nulle part.")
    if len(manque) > 12:
        mal(f"A · … et {len(manque) - 12} autres.")


def controle_b(d, dire, mal):
    """La feuille de style n'ecrit aucune couleur."""
    lues = feuilles(d)
    if not lues:
        return
    txt = re.sub(r"/\*.*?\*/", "",
                 "".join(f.read_text(encoding="utf-8") for f in lues), flags=re.S)
    # L'hexadecimal ne suffit PAS : une couleur employee sous transparence
    # s'ecrit `rgba(10, 51, 46, .06)` et echappe alors a toute recherche de `#`.
    # Une valeur retiree survit ainsi indefiniment. La forme admise sous
    # transparence est `rgba(var(--jeton-rgb), alpha)`.
    durs = sorted(set(re.findall(r"#[0-9A-Fa-f]{3,8}\b", txt)))
    durs += sorted(set(re.findall(r"(?:rgba?|hsla?)\(\s*[\d.]+[\s,]", txt)))
    dire(f"B · couleurs écrites en dur, {len(lues)} feuille(s) : {len(durs)}")
    for c in durs:
        mal(f"B · `{c.strip()}` est écrit en dur. Une couleur passe par son jeton — "
            f"sous transparence, `rgba(var(--jeton-rgb), alpha)`.")


def controle_c(d, dire, mal):
    """La feuille de style n'ecrit aucune taille de police."""
    lues = feuilles(d)
    if not lues:
        return
    txt = re.sub(r"/\*.*?\*/", "",
                 "".join(f.read_text(encoding="utf-8") for f in lues), flags=re.S)
    durs = re.findall(r"font-size:\s*([0-9.]+)px", txt)
    dire(f"C · tailles de police écrites en dur, {len(lues)} feuille(s) : {len(durs)}")
    for t in sorted(set(durs)):
        mal(f"C · `font-size: {t}px` est écrit en dur. Une taille prend un jeton.")


def controle_d(d, dire, mal):
    """Un commentaire ne porte que ce qui sert a intervenir."""
    n = 0
    for f in sorted(d.glob("*.css")) + sorted(d.glob("*.js")):
        txt = f.read_text(encoding="utf-8")
        for ligne, contenu in commentaires(txt, f.suffix):
            if any(re.search(t, contenu, re.I) for t in TEMOINS) and \
               not re.search(r"\b(nous|notre|nos)\b", contenu, re.I):
                continue
            for nom, motif in MOTIFS:
                if re.search(motif, contenu, re.I):
                    mal(f"D · {f.name}:{ligne} · {nom} · "
                        f"{contenu.strip()[:70]}")
                    n += 1
                    break
    dire(f"D · commentaires refusés : {n}")


EMPREINTE = "empreinte.csv"
SCEAU = "jeton,rang,valeur\n--encre,0,#1A1A1A\n--t-corps,0,16px\n"

# --- matiere de l'epreuve du controle F -------------------------------------
# Un script en ligne minimal, son condensat juste, et le meme condensat fausse
# d'un caractere. Les deux pages sont autrement identiques : ce que l'epreuve
# mesure est le seul ecart entre le script servi et ce que la politique autorise.
_SCRIPT_F = "(function(){})();"
_CONDENSAT_F = __import__("base64").b64encode(
    __import__("hashlib").sha256(_SCRIPT_F.encode("utf-8")).digest()).decode()

def _page_f(condensat):
    return ('<!DOCTYPE html><html><head><meta http-equiv="Content-Security-Policy" '
            f"content=\"script-src 'self' 'sha256-{condensat}'\">"
            f"</head><body><script>{_SCRIPT_F}</script></body></html>")

PAGE = "index.html"


DEFAUTS = [
    ("A", {FEUILLE: "a { color: var(--jeton-absent); }", JETONS: ":root{--x:1;}"}),
    ("B", {FEUILLE: "a { color: #C1502A; }", JETONS: ":root{--x:1;}"}),
    ("B", {FEUILLE: "a { box-shadow: 0 1px 2px rgba(10, 51, 46, .06); }",
           JETONS: ":root{--x:1;}"}),
    ("C", {FEUILLE: "a { font-size: 19px; }", JETONS: ":root{--x:1;}"}),
    ("D", {FEUILLE: "/* nous gardons cette regle */\na{color:var(--x);}",
           JETONS: ":root{--x:1;}"}),
]
DEFAUTS.append(("E", {FEUILLE: "a { color: var(--encre); }",
                      JETONS: ":root { --encre: #1A1A1A; --t-corps: 21px; }",
                      EMPREINTE: SCEAU}))
DEFAUTS.append(("F", {PAGE: _page_f("A" + _CONDENSAT_F[1:])}))
DEFAUTS.append(("H", {"coque.js": "<<<<<<< Updated upstream\nvar V=1;\n=======\nvar V=2;\n>>>>>>> Stashed changes\n"}))


SAIN = {FEUILLE: "/* La pilule ne descend pas sous 44 px : cible tactile. */\n"
                 "a { color: var(--encre); font-size: var(--t-corps); }",
        JETONS: ":root { --encre: #1A1A1A; --t-corps: 16px; }",
        EMPREINTE: SCEAU,
        PAGE: _page_f(_CONDENSAT_F)}


def controle_e(d, dire, mal):
    """E — le fichier de jetons est-il celui qui est sorti du generateur ?

    L'empreinte porte un nom de jeton et une valeur par ligne, et rien d'autre.
    Elle est produite en meme temps que le fichier de jetons ; toute divergence
    signifie que le fichier a ete retouche a la main depuis, ou que l'empreinte
    n'a pas suivi. Les deux se corrigent en regenerant, jamais en editant.

    Ce controle ne dit PAS que les valeurs sont les bonnes : il dit qu'elles
    n'ont pas bouge. La justesse se verifie en amont, contre la piece.
    """
    css = d / "roots-tokens.css"
    emp = d / "ci" / "empreinte.csv"
    if not emp.exists():
        emp = d / "empreinte.csv"
    if not css.exists() or not emp.exists():
        dire("E · empreinte ou jetons absents — contrôle non applicable")
        return
    sans_prose = re.sub(r"/\*.*?\*/", "", css.read_text(encoding="utf-8"), flags=re.S)
    vues = {}
    for nom, valeur in re.findall(r"(?<![\w-])(--[a-z0-9-]+)\s*:\s*([^;{}]+);", sans_prose):
        vues.setdefault(nom, []).append(" ".join(valeur.split()))
    attendu, ecarts = 0, []
    for ligne in emp.read_text(encoding="utf-8").splitlines():
        if ligne.startswith("#") or not ligne.strip() or ligne.startswith("jeton,"):
            continue
        nom, rang, valeur = ligne.split(",", 2)
        attendu += 1
        rendu = vues.get(nom, [])
        r = int(rang)
        if r >= len(rendu):
            ecarts.append(f"{nom} manque dans les jetons")
        elif rendu[r] != valeur:
            ecarts.append(f"{nom} — les jetons portent « {rendu[r]} », "
                          f"l'empreinte « {valeur} »")
    surplus = sum(len(v) for v in vues.values()) - attendu
    dire(f"E · empreinte : {attendu} déclarations attendues · "
         f"{len(ecarts)} divergence(s) · {surplus} déclaration(s) en trop")
    for e in ecarts[:8]:
        mal("E · " + e)
    if len(ecarts) > 8:
        mal(f"E · et {len(ecarts) - 8} autre(s) divergence(s)")
    if surplus > 0:
        mal(f"E · {surplus} déclaration(s) des jetons ne figurent pas "
            f"à l'empreinte")
    if ecarts or surplus:
        # Les deux cotes sont produits ensemble. Un ecart dit qu'ils ne l'ont
        # pas ete, sans dire lequel a bouge : jetons retouches a la main, ou
        # empreinte non livree avec eux. Nommer une cause ici ferait diagnostiquer
        # a la place du lecteur, sur une information que ce controle n'a pas.
        dire("  ⓘ L'empreinte n'est pas la référence des valeurs : c'est le "
             "sceau des jetons,")
        dire("    posé au même moment qu'eux. Un écart dit qu'ils ont été "
             "séparés — il ne dit")
        dire("    pas lequel des deux a raison. Les deux se corrigent en "
             "regénérant, jamais")
        dire("    en éditant, et les deux fichiers se livrent ensemble.")


def controle_f(d, dire, mal):
    """F — chaque script en ligne est-il autorise par la politique de sa page ?

    Une politique de securite autorise un script en ligne par le condensat de
    son contenu. Changer UN caractere du script change le condensat : le
    navigateur refuse alors le script entier, en silence pour qui ne lit pas la
    console. La page se charge, son style s'applique, et plus rien ne repond —
    seuls les liens ordinaires marchent encore.

    Ce controle refuse dans les deux sens :
      · un script en ligne dont le condensat n'est declare nulle part ;
      · un condensat declare que plus aucun script ne porte.
    Le second n'est pas fatal a l'affichage, mais il signale une politique qui
    a cesse de decrire sa page.

    Ce controle ne dit PAS que la politique est bien conçue : il dit que ce
    qu'elle autorise correspond a ce que la page contient.
    """
    import base64
    import hashlib

    pages = sorted(d.glob("*.html"))
    if not pages:
        mal("F · aucune page HTML lisible — le contrôle s'arrête plutôt que de verdir")
        return

    total_scripts = total_pages = 0
    for page in pages:
        txt = page.read_text(encoding="utf-8")
        meta = re.search(
            r'<meta http-equiv="Content-Security-Policy" content="([^"]*)"', txt)
        if not meta:
            continue
        total_pages += 1
        declares = set(re.findall(r"'sha256-([A-Za-z0-9+/=]+)'", meta.group(1)))
        corps = re.findall(
            r'<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)</script>', txt)
        reels = {
            base64.b64encode(hashlib.sha256(c.encode("utf-8")).digest()).decode(): c
            for c in corps
        }
        total_scripts += len(corps)

        orphelins = [c for h, c in reels.items() if h not in declares]
        if orphelins:
            mal(f"F · {page.name} — {len(orphelins)} script(s) en ligne que la "
                f"politique n'autorise pas ; la page sera muette")
        perimes = declares - set(reels)
        if perimes:
            mal(f"F · {page.name} — {len(perimes)} condensat(s) déclaré(s) que "
                f"plus aucun script ne porte")

    dire(f"F · {total_scripts} script(s) en ligne sur {total_pages} page(s) à politique")


def epreuve():
    """Pose des defauts volontaires et verifie qu'ils sont vus."""
    import tempfile
    vus = 0
    print("=== ÉPREUVE — le contrôle voit-il ce qu'il prétend voir ? ===\n")
    for lettre, fichiers in DEFAUTS:
        with tempfile.TemporaryDirectory() as t:
            d = pathlib.Path(t)
            for nom, txt in fichiers.items():
                (d / nom).write_text(txt, encoding="utf-8")
            pris = []
            for c in (controle_a, controle_b, controle_c, controle_d, controle_e, controle_f,
                      controle_g, controle_h):
                c(d, lambda _: None, pris.append)
            ok = any(p.startswith(lettre + " ") for p in pris)
            vus += ok
            print(f"  {'✓' if ok else '✗'} défaut {lettre} · "
                  f"{'vu' if ok else 'PASSÉ INAPERÇU'} · {len(pris)} refus levé(s)")
    with tempfile.TemporaryDirectory() as t:
        d = pathlib.Path(t)
        for nom, txt in SAIN.items():
            (d / nom).write_text(txt, encoding="utf-8")
        pris = []
        for c in (controle_a, controle_b, controle_c, controle_d, controle_e, controle_f,
                      controle_g, controle_h):
            c(d, lambda _: None, pris.append)
        ok = not pris
        vus += ok
        print(f"  {'✓' if ok else '✗'} cas sain · "
              f"{'aucun refus' if ok else 'FAUX REFUS : ' + ' | '.join(pris)}")
    print(f"\n=== {vus} / {len(DEFAUTS) + 1} ===")
    return 0 if vus == len(DEFAUTS) + 1 else 1


RE_REGLE = re.compile(r"([^{}]+)\{([^{}]*)\}")
AIR_EDITORIAL = re.compile(r"var\(\s*--air-(?:soude|colle|lie|separe|rompu-h[23])\s*\)")
AIR_INTERFACE = re.compile(r"var\(\s*--air-i\d\s*\)")


def controle_g(d, dire, mal):
    """Chaque rampe d'air reste dans son registre.

    Deux rampes coexistent : l'editoriale en fractions de 18,38 px, celle
    d'interface en fractions de 24 px. Un cran de l'une employe dans l'autre
    pose un blanc qui ne retombe sur aucune ligne, et le rythme se defait sans
    qu'aucune valeur soit fausse. La colonne de lecture longue porte
    l'editorial ; tout le reste porte l'interface.

    Ce que ce controle ne voit pas : l'air pose en attribut de style sur un
    element, et l'air pose par un script. Il lit la feuille, pas le rendu.
    """
    lues = feuilles(d)
    if not lues:
        return mal("G · aucune feuille de style lisible dans le dossier.")
    texte = re.sub(r"/\*.*?\*/", "",
                   "".join(f.read_text(encoding="utf-8") for f in lues), flags=re.S)
    croises = []
    for sel, corps in RE_REGLE.findall(texte):
        s = " ".join(sel.split())
        if not s or s.startswith("@"):
            continue
        # La colonne editoriale est la classe `.lecture`, pas toute classe dont
        # le nom contient ce mot : `.total-lecture` est une tuile de console.
        editorial = re.search(r"\.lecture(-longue)?\b", s) is not None
        if editorial and AIR_INTERFACE.search(corps):
            croises.append(f"« {s[:58]} » emploie un cran d'interface")
        if not editorial and AIR_EDITORIAL.search(corps):
            croises.append(f"« {s[:58]} » emploie un cran éditorial")
    dire(f"G · crans d'air hors registre, {len(lues)} feuille(s) : {len(croises)}")
    for c in croises[:6]:
        mal("G · " + c)
    if len(croises) > 6:
        mal(f"G · et {len(croises) - 6} autre(s)")


MARQUEUR_HAUT = re.compile(r"^<{7} ", re.M)
MARQUEUR_BAS = re.compile(r"^>{7} ", re.M)
EXT_TEXTE = (".js", ".css", ".html", ".json", ".webmanifest", ".yml", ".yaml",
             ".md", ".py", ".txt", ".svg")


def controle_h(d, dire, mal):
    """Aucun marqueur de fusion non resolu ne part dans le depot.

    Un marqueur laisse deux versions d'un meme passage l'une sous l'autre. Le
    fichier cesse d'etre analysable ; et quand les deux versions declarent la
    meme chose, c'est la SECONDE que la machine emploie, tandis qu'un
    instrument qui lit la premiere occurrence rend vert sur une valeur qui ne
    sert pas.

    Il ne cherche que les bornes ouvrante et fermante, jamais la ligne de
    signes egal seule : cette derniere est aussi un soulignement de titre.

    Ce que ce controle ne voit pas : un conflit resolu du mauvais cote.
    """
    lus = [f for f in sorted(d.rglob("*"))
           if f.is_file() and f.suffix.lower() in EXT_TEXTE
           and ".git" not in f.parts and "node_modules" not in f.parts]
    if not lus:
        return mal("H · aucun fichier de texte lisible dans le dossier.")
    atteints = []
    for f in lus:
        try:
            txt = f.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue
        if MARQUEUR_HAUT.search(txt) or MARQUEUR_BAS.search(txt):
            atteints.append(f.relative_to(d).as_posix())
    dire(f"H · marqueurs de fusion, {len(lus)} fichier(s) lu(s) : {len(atteints)}")
    for a in atteints[:6]:
        mal(f"H · « {a} » porte un marqueur de fusion non resolu")
    if len(atteints) > 6:
        mal(f"H · et {len(atteints) - 6} autre(s)")


def main(argv):
    if len(argv) > 1 and argv[1] == "--epreuve":
        return epreuve()
    d = pathlib.Path(argv[1] if len(argv) > 1 else ".").resolve()
    lignes, refus = [], []
    dire = lignes.append

    def mal(t):
        lignes.append("  REFUS — " + t)
        refus.append(t)

    print(f"=== CONTRÔLES DU DÉPÔT — {d.name} ===\n")
    for c in (controle_a, controle_b, controle_c, controle_d, controle_e, controle_f,
                      controle_g, controle_h):
        c(d, dire, mal)
    for l in lignes:
        print(("  " + l) if not l.startswith("  ") else l)
    print()
    if refus:
        print(f"REFUS — {len(refus)} écart(s). Rien ne part tant qu'ils tiennent.")
        return 1
    print("VERT — les huit contrôles passent.")
    print("ⓘ Ces contrôles vérifient des propriétés, pas du sens. La relecture reste due.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
