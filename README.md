# BilanciAI Pro

BilanciAI Pro è un'applicazione web per analizzare i bilanci aziendali. Consente di caricare file in formato **PDF**, **CSV**, **TXT** o **Excel** e genera metriche e indicatori chiave.

## Funzionalità principali

- Estrazione dei dati da file di diversi formati.
- Calcolo di metriche come ricavi totali, EBITDA e margine netto.
- Visualizzazione di grafici con lo storico di ricavi, costi e liquidità.
- Esportazione dei risultati in PDF, Excel o JSON.
- Funzionamento offline tramite *Service Worker* (quando si usa `sw.js`).

## Utilizzo

1. Clona questo repository o scarica i file.
2. Apri `webapp.html` nel tuo browser.
3. Trascina il file del bilancio o selezionalo manualmente.
4. Controlla le metriche e le raccomandazioni generate.
5. Eventuali aggiornamenti sono relativi allo script, basta scaricare da `releases` l'ultimo file e sostituirlo nella cartella

Non sono necessarie dipendenze o compilazioni aggiuntive: tutto il codice è contenuto nei file `webapp.js` e `webapp.css` inclusi.

## Licenza

Questo progetto è distribuito sotto licenza MIT. Consulta il file [`LICENSE`](LICENSE) per maggiori informazioni.
