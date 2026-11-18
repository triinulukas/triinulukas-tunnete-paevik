# Minu päev — tunnete päevik lapsele

Väike veebiäpp (PWA) 6–8-aastasele lapsele. Laps õpib selle abil oma tundeid ära tundma ja nendega toime tulema.
Äpp töötab **täielikult ilma internetita**. Kõik andmed, ka häälsalvestused, jäävad ainult telefoni.

## Mida laps teeb

| Millal | Mis | Kestus |
|---|---|---|
| 🌅 Hommik | Tunne → kuidas magas → oma **kui-siis plaanid** ütleb valjult → valib päeva eesmärgi | ~1 min |
| 🌙 Õhtu | Päeva suurim tunne → kui suur see oli (termomeeter) → kuidas eesmärk läks → kus oli raskem / kus parem → 2 häälküsimust | ~3 min |
| 🐢 Igal ajal | Rahunemisnurk: kilpkonn, õhupalli hingamine, pigista ja lase lahti | 1–2 min |

**Äpp loeb iga küsimuse ise ette** (eesti hääl: TartuNLP Neurokõne, kõneleja „mari“), nii et laps ei pea lugema. Ettelugemise saab avalehel 🔊 nupust välja lülitada ja 🔊 nupuga paremal üleval saab küsimust uuesti kuulata. Vanema kirjutatud kui-siis plaanidele luuakse hääl salvestamisel (selleks peab internet korraks sees olema). Vanem võib küsimused ka oma häälega sisse lugeda, siis kasutatakse tema häält.

Avalehel on **„Minu nädal“**: 🌟 eesmärk õnnestus, 👍 natuke, 🌱 kasvab veel. Laps näeb ainult oma edenemist, mitte raskete päevade statistikat, sest see jääb vanema vaatesse.

Iga hommiku ja õhtu eest saab laps tähe. Vanem saab anda boonustähti ja lunastada auhindu (ühine aeg, mitte toit ega ekraan).

## Vanema vaade (PIN-iga)

- **Päevad**: sissekanded, lapse häälvastuste kuulamine, vanema märkused.
- **Juhtumid**: ABC-logi (mis juhtus enne → mida ta tegi → mis järgnes) psühholoogi või arenguvestluse jaoks.
- **Mustrid**: viimase 4 nädala rasked päevad nädalapäeviti, tunded, eesmärkide õnnestumine, kus on raskem ja kus parem, uni ja rasked päevad, juhtumid. Prinditav.
- **Tähed**: boonustähed ja auhindade lunastamine.
- **Juhend**: emotsioonide juhendamine, parandamine pärast tülli, selged korraldused.
- **Seaded**: eesmärgid, kui-siis plaanid, auhinnad, oma häälega sisseloetud küsimused, varukoopia.

PIN hoiab last juhuslikult vanema vaatesse sattumast. See ei ole turvamehhanism.

## Teaduslik alus

- **Tunde nimetamine** (*affect labeling*, Lieberman jt 2007). Kui tunnet sõnadega nimetada, väheneb selle intensiivsus.
- **Emotsioonide juhendamine** (*emotion coaching*, Gottman 1997; Havighurst jt, *Tuning in to Kids*). Vanem märkab ja nimetab tunnet, tunnustab seda, seab piiri käitumisele ja otsib koos lapsega lahenduse.
- **Kui-siis plaanid** (*implementation intentions*, Gollwitzer 1999). Gawrilow jt 2011 näitasid, et need parandavad enesekontrolli ka ADHD-ga lastel.
- **Enesejälgimine** (*self-monitoring*). Lapse enda hinnang eesmärgi kohta parandab tunnis keskendumist (metaanalüüsid, nt Bruhn jt 2015).
- **Positiivne kinnitus / žetoonisüsteem**. See on osa vanemaprogrammidest (Incredible Years / „Imelised aastad“, Triple P): tasu on kiire ja väike ning seda karistuseks ära ei võeta.
- **ABC-vaatlus** (*antecedent–behavior–consequence*) on funktsionaalse käitumishinnangu põhivahend. **Uni** on oluline, sest unepuudus võib tekitada ADHD-sarnaseid sümptomeid.
- **Kilpkonna tehnika** (Schneider 1974; kasutusel Incredible Years Dina programmis), **aeglane hingamine** ja **lihaste lõdvestamine**.
- **Positiivsed küsimused** (*savoring*, tugevustele keskenduv lähenemine). Õhtu lõpeb alati millegi heaga.

Äpp toetab vanemaprogrammi ja spetsialisti abi, kuid ei asenda neid.

## Arendus

```bash
python3 -m http.server 8765   # ava http://localhost:8765
npm test                      # loogika testid
```

Kui muudad äpi ettelaetavaid lauseid (`SAY`, küsimused või rahunemise sammud failis `logic.js`), genereeri helid uuesti:

```bash
node scripts/generate-audio.mjs   # macOS, kasutab afconvert'i; saadab teenusele ainult äpi üldised laused
```

Ühtegi sõltuvust ega build-sammu pole. Tavaline HTML, CSS ja JS (ES-moodulid).
Pärast muudatusi tõsta `sw.js`-is `CACHE` versiooni, et telefon uue versiooni alla laeks.

## Telefoni paigaldamine

Mikrofon ja võrguühenduseta töö vajavad HTTPS-aadressi. Paigaldamine käib nii:

1. Ava äpi aadress üks kord telefonis, kui internet on sees.
2. **Lisa avakuvale** (iPhone: Jaga → Lisa avakuvale; Android: ⋮ → Installi rakendus).
3. Ava äpp avakuvalt, luba mikrofon ja lülita internet välja. Äpp töötab edasi.
4. Tee aeg-ajalt varukoopia (Vanemale → Seaded → Tee varukoopia).
