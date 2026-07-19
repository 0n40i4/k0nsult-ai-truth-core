# POLICY-LAB-KIT

**Repo:** `k0nsult-ai-truth-core`  
**Warstwa / Layer:** metodologia weryfikacji (policy-lab) — FALA P1  
**Evidence class (dokumentu):** NARRACJA (rama pojęciowa; nie jest sama w sobie DOWODEM ani GAP-em)  
**Status:** publikowalny / publishable  
**Doktryna (NIEZMIENNA):** `claim <= proof` · silnik ukryty · agents-not-people · reputacja soulbound (NIE krypto) · No Password Custody · chain = warstwa zaufania (NIE blockchain)

---

## 0. Po co ten kit / Why this kit exists

Policy-Lab to **stół weryfikacyjny**: bierze pojedynczy *claim* (twierdzenie) i przepuszcza go przez powtarzalną procedurę, na końcu której claim ma **przypisaną klasę dowodową** i — jeśli twierdzi o faktach — **werdykt panelu sędziów**.

Kit NIE zawiera i NIGDY nie będzie zawierał:
- kodu silnika `k0nsult.cloud` (silnik ukryty),
- danych osobowych / PII (agents-not-people),
- scoringu osób (tylko agentów i twierdzeń),
- sekretów (klucze, tokeny, hasła — No Password Custody).

Kit zawiera wyłącznie **procedurę, progi i format zapisu**. Implementacja panelu żyje po stronie ukrytego silnika; tutaj publikujemy *kontrakt*, nie *maszynerię*.

> **Zasada nadrzędna:** `claim <= proof`. Twierdzenie może rościć sobie **co najwyżej tyle, ile udźwignie jego dowód**. Nadwyżka rości = overclaim = defekt do naprawy, nie do publikacji.

---

## 1. Trzy klasy dowodowe / The three evidence classes

Każdy claim MUSI dostać dokładnie jedną klasę. Klasa nie jest oceną „dobry/zły" — jest **deklaracją, czym twierdzenie jest**.

| Klasa | Znaczenie | Warunek konieczny | Przykład |
|---|---|---|---|
| **DOWOD** | Twierdzenie weryfikowalne niezależnie | Istnieje `proof` z rozstrzygalnym odnośnikiem: link, hash treści, cytat ze źródła pierwotnego, wynik testu | „Plik `validate.mjs` zwraca exit 0 dla `claims-sample.json` — hash `sha256:…`" |
| **GAP** | Luka jawnie zadeklarowana jako ROADMAP | Twierdzenie opisuje coś **jeszcze niezrobionego lub niezweryfikowanego**, oznaczone jako brak | „Panel 4-provider nie ma jeszcze konektora `groq` w tym repo — ROADMAP" |
| **NARRACJA** | Rama, interpretacja, intencja | Nie rości faktu weryfikowalnego; nie jest naruszeniem (reguła K02) | „Uważamy, że evidence-first buduje zaufanie" |

**Reguła rozstrzygająca (kolejność testów):**
1. Czy twierdzenie da się **obalić lub potwierdzić** niezależnym odnośnikiem? → jeśli TAK i odnośnik istnieje → **DOWOD**.
2. Czy twierdzenie opisuje **stan pożądany / niezrobiony / niezweryfikowany**? → **GAP** (musi być oznaczone jako ROADMAP).
3. W przeciwnym razie → **NARRACJA** (interpretacja/intencja — dozwolona, ale nigdy nie udaje DOWODU).

> **Anty-wzorzec:** twierdzenie faktyczne bez odnośnika NIE jest DOWODEM. Jest **GAP** (dopóki brak dowodu) albo NARRACJA (jeśli to opinia). „Zgodność 100%" bez wskazania *przeciw czemu* porównujesz = wrażenie, nie pomiar → NARRACJA lub GAP, nigdy DOWOD.

---

## 2. Procedura `dowod-albo-gap` na pojedynczym claimie

Wejście: jeden obiekt claim (patrz `examples/claims-sample.json`).  
Wyjście: ten sam claim z ustaloną `evidence_class` i — dla klasy DOWOD twierdzącej o faktach — werdyktem panelu.

```
  claim
    │
    ▼
  [1] Czy to twierdzenie o faktach?  ──NIE──►  NARRACJA  ──►  (koniec, publikowalne)
    │ TAK
    ▼
  [2] Czy istnieje rozstrzygalny proof?  ──NIE──►  GAP (oznacz ROADMAP)  ──►  (koniec)
    │ TAK
    ▼
  [3] Panel sędziów 4-provider (patrz §3)
    │
    ├─ >=3/4 NIE obalili  ──►  DOWOD (CONFIRMED)  ──►  wpis do audit-log  ──►  (koniec)
    │
    └─ <3/4  ──►  cofnij do GAP (proof niewystarczający)  ──►  ROADMAP: wzmocnij dowód
```

**Downgrade jest zawsze legalny, upgrade nigdy nie jest darmowy.** Claim może w każdej chwili spaść DOWOD→GAP (gdy odnośnik umrze / dowód okaże się słaby). Wejście GAP→DOWOD wymaga świeżego proof + przejścia panelu.

---

## 3. Judge-panel — próg 3/4 providerów / Adversarial judge panel

Weryfikacja twierdzeń faktycznych jest **adwersaryjna**: każdy sędzia jest promptowany, **żeby obalić** claim, nie żeby go pochwalić.

### 3.1 Skład panelu

| Rola | Provider (rodzina) | Zadanie |
|---|---|---|
| Sędzia A | anthropic | Szukaj kontrprzykładu / logicznej dziury |
| Sędzia B | google | Sprawdź zgodność ze źródłem pierwotnym |
| Sędzia C | groq | Sprawdź, czy `claim <= proof` (brak overclaimu) |
| Sędzia D | openai | Sprawdź rozstrzygalność odnośnika (czy da się sfalsyfikować) |

> Nazwy providerów to **rodziny modeli**, nie konkretne wersje. Kit definiuje *kontrakt* (4 niezależne źródła + próg), nie wiąże się z żadnym konkretnym endpointem. Implementacja = ukryty silnik.

### 3.2 Próg / Threshold

```
PRZEŻYWA (CONFIRMED)   ⇔   liczba sędziów, którzy NIE obalili  >=  3  z  4
OBALONY (REFUTED)      ⇔   >=2 sędziów przedstawiło rozstrzygalny kontrargument
```

- **4/4 nie obalili** → DOWOD mocny (strong).
- **3/4 nie obalili** → DOWOD (próg spełniony); zapisz zastrzeżenie obalającego sędziego w audit-log.
- **<=2/4 nie obalili** → claim NIE jest DOWODEM. Cofnij do GAP; obalenia stają się ROADMAP-em wzmocnienia.

**Remis / niepewność:** brak 3/4 to zawsze **brak DOWODU**, nigdy „prawie DOWOD". Doktryna nie zna zaokrągleń w górę.

### 3.3 Zapis werdyktu

Każdy przebieg panelu produkuje rekord (bez PII, bez treści promptów-sekretów):

```json
{
  "claim_id": "<id>",
  "panel": [
    {"provider_family": "anthropic", "refuted": false, "note": "brak kontrprzykładu"},
    {"provider_family": "google",    "refuted": false, "note": "zgodne ze zrodlem"},
    {"provider_family": "groq",      "refuted": false, "note": "claim<=proof OK"},
    {"provider_family": "openai",    "refuted": true,  "note": "odnosnik czesciowo nieostry"}
  ],
  "survivors": 3,
  "threshold": 3,
  "verdict": "CONFIRMED"
}
```

---

## 4. Audit-log soulbound (append-only) / Soulbound audit log

Każda zmiana klasy dowodowej i każdy werdykt panelu trafia do **logu przypisanego (soulbound)**: nieprzenoszalnego, tylko-dopisywalnego rejestru zdarzeń.

### 4.1 Własności

- **Append-only:** nic się nie kasuje ani nie nadpisuje. Korekta = nowy wpis odwołujący poprzedni (`supersedes`). *(Zasada: archiwizuj, nie usuwaj.)*
- **Soulbound:** wpis jest związany z **agentem-autorem** (identyfikator agenta), a **nie z osobą**. Nie da się go przenieść, sprzedać ani scedować. To reputacja, **nie token** — nie ma płynności, nie ma rynku wtórnego, nie ma blockchaina.
- **Chain = warstwa zaufania:** wpisy łączy hash poprzednika (`prev_hash`) — to łańcuch integralności (tamper-evidence), **nie** rejestr rozproszony i **nie** aktywo. Publiczna nieodwracalność (np. zapis do zewnętrznego rejestru) jest **aktem wymagającym ACK**, nie skutkiem ubocznym.
- **Bez PII:** autor = `agent:<slug>`, nigdy imię/nazwisko/e-mail/urządzenie osoby.

### 4.2 Kształt wpisu

```json
{
  "seq": 42,
  "ts": "2026-07-19T00:00:00Z",
  "agent": "agent:policy-lab-runner",
  "event": "CLASS_ASSIGNED",
  "claim_id": "clm-0003",
  "from": "GAP",
  "to": "DOWOD",
  "verdict": "CONFIRMED",
  "prev_hash": "sha256:...",
  "supersedes": null
}
```

> **Soulbound ≠ krypto.** Nieprzenoszalność egzekwuje *reguła rejestru*, nie kontrakt on-chain. Wartością jest **historia dobrze zaklasyfikowanych twierdzeń**, a nie zbywalny żeton.

---

## 5. Uruchomienie kitu / Running the kit (kontrakt, nie kod silnika)

Policy-Lab operuje na artefaktach tego repo:

1. **Wejście:** `examples/claims-sample.json` (lub własny plik zgodny z `tools/finding-v1.schema.json`).
2. **Walidacja składni + klas:** `validate.mjs` — sprawdza, że każdy claim ma dozwoloną `evidence_class` i wymagane pola dla swojej klasy (DOWOD wymaga `proof`; GAP wymaga `roadmap`; NARRACJA nie wymaga odnośnika).
3. **Procedura `dowod-albo-gap`** (§2) na każdym claimie.
4. **Judge-panel** (§3) dla klasy DOWOD twierdzącej o faktach.
5. **Zapis** werdyktów i zmian klas do audit-log soulbound (§4).

`validate.mjs` i schemat żyją w repo (P0). Panel i log żyją w **ukrytym silniku** — kit definiuje ich *kontrakt wejścia/wyjścia*, nie ich implementację.

---

## 6. Definition of Done — kryteria akceptacji przebiegu

Przebieg policy-lab jest **zamknięty** wtedy i tylko wtedy, gdy:

- [ ] Każdy claim ma dokładnie jedną `evidence_class`.
- [ ] Każdy DOWOD ma rozstrzygalny `proof` **i** werdykt `CONFIRMED` (>=3/4).
- [ ] Każdy GAP ma pole `roadmap` (co i jak domknąć).
- [ ] Żadna NARRACJA nie jest przedstawiona jako DOWOD.
- [ ] Zero PII, zero sekretów, zero kodu silnika w wyjściu.
- [ ] Wszystkie zmiany klas i werdykty zapisane w audit-log (append-only, `prev_hash` spięty).
- [ ] `validate.mjs` na pliku wynikowym zwraca exit 0.

Brak któregokolwiek = przebieg **niezamknięty**. Nie zaokrąglamy w górę.

---

## 7. Anty-wzorce / Anti-patterns (czego kit NIE robi)

- ❌ **Własna linijka metryki.** „100% pokrycia" liczone własnym mianownikiem = NARRACJA. Podaj *przeciw czemu* mierzysz albo nie mów „100%".
- ❌ **Weryfikacja przed przeczytaniem źródła.** Nie buduj narzędzia do sprawdzenia danych, których źródła nie otworzyłeś — narzędzie staje się źródłem błędu.
- ❌ **Kod HTTP zamiast treści.** „200 OK" nie dowodzi twierdzenia o treści. Dowodem jest treść, nie metadana.
- ❌ **Scoring osób.** Panel ocenia *twierdzenia i agentów*, nigdy ludzi. Zero PII w logu.
- ❌ **Upgrade GAP→DOWOD bez świeżego proof.** Klasa nie rośnie „bo minął czas".
- ❌ **Publikacja nieodwracalna bez ACK.** Zapis do zewnętrznego, publicznego rejestru = akt wymagający zgody operatora, nie automat.

---

*Ten dokument to kontrakt metodologiczny (NARRACJA). Twierdzenia faktyczne o repo są wydzielone do `examples/claims-sample.json` i tam podlegają procedurze, którą ten kit opisuje.*
