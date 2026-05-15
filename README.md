# UAB · Auditoria GEO · Març 2026

Auditoria de visibilitat de la **Universitat Autònoma de Barcelona (UAB)** a motors d'IA generativa (ChatGPT i Gemini), basada en l'anàlisi de **10.955 respostes** sobre educació superior, recerca, graus, màsters, doctorats, vida de campus i formació contínua.

Projecte realitzat per **498 Advisory Services** sota la metodologia **GEORadar**.

---

## Resum

| Mètrica | Valor | Posició |
|---|---|---|
| **BIS global** | 45.3 | #1 sector (+4.6 sobre la mitjana top 10) |
| **BIS ChatGPT** | 47.1 | #1 |
| **BIS Gemini** | 43.7 | #1 |
| **SOBV** | 54.9% | #1 (duopoli amb UB) |
| **SOV** | 37.2% | excepcional (mitjana sectorial 2-12%) |
| **AAS** (Academic Authority) | 76/100 | #1 (+24% vs UB) |
| **RVI** (Research Visibility) | 78/100 | #1 (+53% vs UB) |
| **IMS** (International Mobility) | — | #1 (+68% vs UB) |

**Lideratge en 6/6 línies de servei a ChatGPT i 7/7 perfils de persona.**

---

## Contingut del repositori

```
UAB/
├── README.md                                    ← Aquest fitxer
├── _outputs/
│   ├── 20260514_INFORME_uab_geo-audit-marc2026_v1.html   ← Informe complet (25 pàgines)
│   ├── UAB en la IA.html                                  ← Deck de presentació (14 slides)
│   └── UAB en la IA_files/                                ← CSS/JS del deck
│       ├── base.css
│       ├── components.css
│       ├── components-extended.css
│       ├── theme-light.css
│       └── app.js
└── assets/
    └── TRIOTECA en la IA.html                   ← Deck de referència (estructura base)
```

### Informe complet — `_outputs/20260514_INFORME_uab_geo-audit-marc2026_v1.html`

Document A4 de 25 pàgines amb el desglossament tècnic complet de l'auditoria:

1. Glossari de mètriques (BIS, SOV, SOBV, AAS, ENI, RVI)
2. Resum executiu
3. Metodologia (8 persones × 6 línies × 3 funnels × 2 motors)
4. Estudi de prompts (10.955 consultes)
5. BIS desglossat global · BIS per motor
6. SOV i SOBV
7. Ranking competitiu: matriu per línia
8. UAB vs UB · UAB vs privades (UOC, UIC, UVic)
9. Funnels · Intentions
10. Línies de servei (deep dive per motor)
11. Persones (deep dive per motor)
12. Com ens anomena la IA
13. Atributs i percepció · ENI
14. Què no es veu · Confusions i riscos
15. Fonts citades · DAFO · Pla d'acció · Conclusió

### Deck de presentació — `_outputs/UAB en la IA.html`

Deck HTML de 14 slides per a exposició executiva, organitzat en 4 seccions:

- **Portada** (1) · Cover
- **El Context** (2) · Metodologia
- **Anàlisi Detallada** (3-12) · Resum executiu, BIS, SOV/SOBV, no-gap de recomanació, on guanya/on perd, funnel, línies de servei, persones, atributs i percepció, fonts citades
- **Síntesi i Acció** (13-14) · El que hem trobat, Pla d'acció

Tecnologia: HTML + CSS estàtic basat en el web component `<deck-stage>` (GEORadar design system). Navegació amb teclat (←/→/Space), exportable a PDF amb el navegador.

---

## Visualització

Obrir qualsevol fitxer HTML directament al navegador:

```bash
# Informe complet
open "_outputs/20260514_INFORME_uab_geo-audit-marc2026_v1.html"

# Deck de presentació
open "_outputs/UAB en la IA.html"
```

### Exportar el deck a PDF

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless --print-to-pdf="_outputs/UAB-en-la-IA.pdf" \
  --no-margins "_outputs/UAB en la IA.html"
```

---

## Findings clau

1. **BIS 45.3 — líder absolut del sistema universitari espanyol.** En ambdós motors, totes les línies, tots els perfils.
2. **KPIs sectorials Education amplifiquen el lideratge.** AAS +24%, RVI +53%, IMS +68% vs UB.
3. **Sense gap de recomanació** — patró rar i positiu (45.3 → 47.7 → 47.6).
4. **Sincrotró ALBA: 3 mencions a ChatGPT.** La major infraestructura científica d'Espanya, gairebé invisible. Gap més clar de l'estudi.
5. **ENI — líder en volum, #4-5 en sentiment.** Falten dades concretes d'inserció laboral. Quick win d'impacte més alt.
6. **"Lluny de Barcelona": Gemini ho amplifica 4×** (319 mencions vs 81 a ChatGPT).
7. **Dos motors, dues llengües.** ChatGPT diu "Universidad" (Wikipedia ES), Gemini "Universitat" (uab.cat).

## Pla d'acció (resum)

**Impacte alt:**
1. Activar Sincrotró ALBA i actius de recerca invisibles (Sociologia, GreenMetric, Veterinària)
2. Publicar dades concretes d'empleabilitat (% inserció, salari, top empleadors)
3. Wikipedia (ES, CA, EN) — millorar la font #1 de ChatGPT

**Impacte mitjà:**
4. Narrativa "campus a 25 min" com a avantatge
5. Dominar inclusivitat — replicar el lideratge de ChatGPT a Gemini
6. Vigilar la UOC i optimitzar microcredencials per a Gemini

---

## Stack tècnic

- HTML5 + CSS3 estàtic (sense build)
- Tipografies: Inter · Instrument Serif · Geist Mono
- Color corporatiu UAB: `#006935`
- Deck system: GEORadar design system (`<deck-stage>` web component)

## Crèdits

- **Anàlisi i metodologia:** GEORadar by 498 Advisory Services
- **Client:** Universitat Autònoma de Barcelona
- **Període d'anàlisi:** Març 2026
- **Motors avaluats:** ChatGPT (5.478 respostes) · Gemini 2.5 Flash (5.477 respostes)
