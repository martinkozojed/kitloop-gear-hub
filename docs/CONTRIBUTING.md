# Kitloop — Pravidla pro dokumentaci

> Tento soubor definuje jak dokumentujeme. Platí pro všechny soubory v `docs/`.
> Nedodržení pravidel = dokument je neplatný a agent ho může ignorovat.

---

## 1) Povinná hlavička každého živého dokumentu

Každý soubor v `docs/` (mimo `history/`) musí mít na začátku tento blok:

```markdown
---
verze: 1.0
datum: YYYY-MM-DD
autor: [jméno nebo "Antigravity" / "Claude Code"]
změna: [proč byl dokument vytvořen nebo upraven]
nadřazený dokument: [odkaz nebo "—"]
---
```

**Příklad:**

```markdown
---
verze: 1.2
datum: 2026-04-13
autor: Antigravity + Martin
změna: Přidána sekce o monetizaci po strategické diskuzi
nadřazený dokument: strategy/ssot_v1.1.md
---
```

---

## 2) Verzování

| Typ změny | Co zvednout |
|-----------|-------------|
| Oprava překlepy, formátování | `1.0` → `1.0` (bez změny) |
| Doplnění sekce, upřesnění | `1.0` → `1.1` |
| Přepsání nebo zásadní přeformulování | `1.0` → `2.0` |
| Konflikt se starší verzí (SCOPE CHANGE) | nová verze + změna v `ssot_v1.1.md` |

---

## 3) Kdy archivovat do `history/`

Dokument jde do `history/` pokud:
- je plně nahrazen novější verzí,
- popisuje stav, který už neexistuje (staging report, P0 audit z minulé fáze),
- nebo ho žádný živý dokument neodkazuje a nemá operativní hodnotu.

Při přesunu do `history/` **nepřejmenovávej** soubor. Zachování názvu umožňuje dohledání přes Git.

---

## 4) Kdy aktualizovat vs. vytvořit nový soubor

- **AKTUALIZUJ** existující soubor pokud jde o stejné téma a stejnou odpovědnost.
- **VYTVOŘ NOVÝ** pokud jde o nové téma, novou vrstvu produktu nebo nový typ rozhodnutí (ADR).
- **NIKDY** nevytvářej duplicitní dokumenty ke stejnému tématu — jeden zdroj pravdy.

---

## 5) Struktura složek (opakování pro přehlednost)

```
docs/
├── README.md              ← navigační mapa (neměnit bez dobrého důvodu)
├── CONTRIBUTING.md        ← tento soubor
├── strategy/              ← strategické SSOT dokumenty
├── architecture/          ← technické audity, ADR výsledky
├── adr/                   ← Architecture Decision Records
├── ops/                   ← provozní runbooky, feature flagy
└── history/               ← archiv (číst jen pro historický kontext)
```

---

## 6) Co nepatří do dokumentace

- Debugging výstupy a konzolové logy → neukládat vůbec
- Staging execution evidence → `history/`
- TODO komentáře bez assignee a data → dát do `ops/PAIN_BACKLOG.md`
- Duplicitní potvrzení ("Hotovo!", "✅ Done") → neukládat jako soubor, jen do chatu

---

## 7) Pravidlo pro agenty

Pokud jsi agent (Antigravity nebo Claude Code) a vytváříš nebo upravuješ dokument:
1. Přidej/aktualizuj povinnou hlavičku.
2. Zvedni verzi dle tabulky výše.
3. Zapiš stručně důvod změny do pole `změna:`.
4. Pokud odstraňuješ nebo přepisuješ víc než 50 % obsahu — přesuň původní verzi do `history/` a vytvoř nový soubor.

---

*Verze: 1.0 | Datum: 2026-04-13 | Autor: Antigravity + Martin*
