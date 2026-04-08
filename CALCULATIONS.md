# Come funzionano le dashboard — Calcoli e fonti dati

Tutte le metriche derivano da dati reali Strava. Nessuna stima inventata.

---

## Fonti dati Strava

**Activity summary** (da `/athlete/activities`): distance, moving_time, average_speed, average_heartrate, total_elevation_gain, start_date, name

**Splits per km** (da `/activities/{id}`): average_speed, elevation_difference, average_heartrate per km

**Best efforts** (da `/activities/{id}`): miglior tempo per distanze standard (1K, 5K, 10K, mezza, maratona)

---

## Dashboard principale

### KPI Cards
| KPI | Formula | Delta |
|---|---|---|
| Distanza | `sum(distance/1000)` km | % vs periodo precedente |
| Attivita | count delle corse | — |
| Ritmo medio | `mean(1000/average_speed)` sec/km — NON pesata per distanza | sec/km vs precedente |
| Dislivello | `sum(total_elevation_gain)` m | — |
| Tempo | `sum(moving_time)/3600` ore | — |
| FC media | `mean(average_heartrate)` solo corse con HR | — |

### Chilometraggio settimanale
- Raggruppa per settimana (Lun-Dom)
- Somma km per settimana
- Barra piu' alta = arancione pieno, altre al 35%

### Progressione Long Run
**Con piano**: linea tratteggiata blu = km pianificati (dal campo `long_run` di ogni settimana), linea solida viola = km effettivi (dall'attivita' validata nel piano per quella sessione). Match per data ±3 giorni.

**Senza piano**: corsa piu' lunga per settimana (min 8km). Pallini arancioni = >21km.

### Trend Ritmo
**Con piano**: classifica per tipo dal piano.
- Qualita' (Tempo/Interval): **core pace** = rimuove ~1km warmup + ~1km cooldown. Formula: `coreTime = moving_time - (2km * pace_medio * 1.15)`, `corePace = coreTime / (km_totali - 2)`
- Easy/Recovery: ritmo medio completo
- Long Run: ritmo medio completo

**Senza piano**: threshold <5:30/km = qualita', >5:30 = easy/long

### Zone HR
- Ogni attivita' assegnata alla zona dove cade la sua FC media
- Zone default: Z1 0-120, Z2 120-140, Z3 140-160, Z4 160-175, Z5 175-220 bpm
- Personalizzabili dall'utente (dati Apple Watch)

### Carico allenamento (TSS stimato)
- Formula semplificata: `TSS = ore_durata * (1 + FC_media/150) * 30`
- NON e' il vero TSS (che richiede FTP e potenza)
- Barre colorate per intensita' (piu' caldo = piu' carico)
- Ultime 12 settimane

### Heatmap giorni settimana
- Km totali per giorno della settimana nel periodo
- Intensita' = `km_giorno / km_giorno_massimo`

---

## Pagina Analisi — Singola corsa

### Narrativa (2-4 frasi generate dai dati)
1. Regolarita' pacing (se calcolabile)
2. Negative/positive split (se >4 km)
3. Km piu' lento con contesto pendenza (se salita >5m)
4. HR drift (se valido)

### Pace per km
- Barre colorate: verde = veloce, arancione = lento (normalizzato sulla corsa)
- Label fisse: ritmo mm:ss sopra ogni barra
- Asse Y invertito (alto = veloce)

### HR per km
- Line chart FC media per km (solo se HR presente negli splits)
- Padding top per evitare label tagliate

### Profilo altimetrico
- Dislivello cumulativo (area chart)
- Totali D+ e D- in alto
- Hover: altitudine + gradiente %

### Indice di regolarita'
- Formula: `(deviazione_standard(paces) / media(paces)) * 100`
- <5% = molto costante, 5-10% = normale, >10% = irregolare

### Negative/Even/Positive split
- Divide la corsa a meta', calcola pace medio di ogni meta'
- Delta <3 sec/km = even, positivo = negative split (2a meta' piu' veloce), negativo = positive split (2a meta' piu' lenta)

### Km piu' veloce / piu' lento
- Km veloce assoluto (potrebbe essere in discesa)
- Km veloce "su piano": esclude km con discesa >2%
- Km lento: con contesto pendenza (capire se e' colpa del terreno)

### HR Drift (V2)
- `FC_ultimi_3km / FC_primi_3km`
- **Mostrato SOLO se**: >=6km, pacing index <10%, dislivello medio <15m/km
- <6% = eccellente, 6-12% = normale, >12% = significativo

### vs Media storica (V2)
- Confronta pace/HR con media stesse corse per tipo (ultime 8 settimane)
- Tipo: dal piano se associato, altrimenti automatico (>15km=long, <5:30=quality, resto=easy)
- Richiede minimo 3 corse dello stesso tipo

### VDOT Trend (V3)
- VDOT calcolato dal miglior best effort recente (ultime 4 sett) vs precedente
- Priorita': maratona > mezza > 10K > 5K > miglio > 1K
- Formula Jack Daniels: `VO2 = -4.60 + 0.182258*v + 0.000104*v^2`, `VDOT = VO2 / fraction(t)`
- Impatto su pace maratona: `delta_sec/km * 42.195 / 60` = minuti guadagnati/persi

---

## Pagina Analisi — Insights settimanali

### Volume
- Km e corse questa settimana vs scorsa (delta assoluto)
- vs media 4 settimane (delta %)
- Regola 10%: aumenti >10% settimana su settimana = rischio infortuni

### Ritmo easy run
- **Con piano**: usa le attivita' confermate come Easy/Recovery nel piano
- **Senza piano**: corse con ritmo >5:30/km e distanza <12km
- Richiede >=2 easy run in entrambe le settimane
- Delta in sec/km vs settimana precedente + media 4 settimane

### Efficienza cardiovascolare (V2)
- Trova coppie di attivita' con ritmo simile (±15%) tra le due settimane
- Confronta FC media a parita' di ritmo
- Richiede >=2 coppie valide
- "A parita' di ~5:45/km, il tuo cuore batte X bpm in meno"

---

## Pagina Piano — Statistiche compliance

### Aderenza piano
- `sessioni_completate / sessioni_passate * 100` (solo sessioni prima di oggi)

### Sessioni saltate
- Count + tasso % delle sessioni segnate come skipped
- "Non tracciate": passate, senza match, non skipped

### Km vs piano
- `km_effettivi / km_pianificati * 100` (solo periodo passato)

### Distanza rispettata
- % attivita' con km effettivi >= 95% del pianificato

### Tipologia rispettata
- % attivita' con ritmo nel range atteso per tipo:
  - Easy: 5:30-7:30/km
  - Recovery: 6:00-8:00/km
  - Tempo: 4:30-5:50/km
  - Interval: 3:30-5:30/km
  - Long Run: 5:00-7:30/km

### Aderenza per settimana
- Barre: verde = completate, giallo = saltate, grigio = future
- Settimana corrente in arancione
- Basato su sessioni non-rest

---

## Pagina Obiettivi

### 3 metodi calcolo ritmo
1. **Solo tempo run**: media corse <5:40/km e >5km (ultime 6 sett)
2. **Media pesata**: <5:20 peso 3x, 5:20-5:50 peso 2x, >5:50 peso 1x
3. **Miglior recente**: miglior singola corsa >5km ultime 6 settimane

### Proiezioni
- **Km settimanali**: media 8 settimane, on track se media >= target
- **Long run target**: stima +1.5km/settimana, data proiezione
- **Ritmo target**: delta attuale vs obiettivo

---

## Stime tempi gara (VDOT)

- Basato su best effort Strava + opzionalmente VO2 Max Apple Watch
- Blend: 60% performance Strava + 40% VO2 Apple Watch (se inserito)
- Predice: 5K, 10K, mezza, maratona
- Ritmi allenamento: Easy (65% VDOT), Maratona (79%), Tempo (86%), Intervalli (97.5%), Ripetute (110%)
