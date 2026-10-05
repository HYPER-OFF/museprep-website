# Go-Live: museprep.com auf die neue Seite umstellen

Checkliste für Paket 9. Reihenfolge einhalten; jeder Schritt ist umkehrbar,
solange die Domain noch auf WordPress zeigt.

## 1. Hoster wählen

- [ ] SSH-Zugang mit eigenem Benutzer, der nur ins Webverzeichnis schreiben darf
- [ ] `rsync` auf dem Server verfügbar (am besten `rrsync` für den eingeschränkten Schlüssel)
- [ ] Apache oder LiteSpeed mit `.htaccess` (`AllowOverride` mindestens `FileInfo`,
      `Options`, `AuthConfig`, `Indexes`), `mod_headers`, `mod_alias`, `mod_mime`
- [ ] TLS-Zertifikat (z. B. Let's Encrypt) und Option „HTTPS erzwingen“
- [ ] Vertrag zur Auftragsverarbeitung (Art. 28 DSGVO)
- [ ] Angaben für die Datenschutzerklärung: Name und Anschrift des Hosters,
      Speicherdauer der Server-Protokolle

## 2. Rechtstexte freigeben

Die Entwürfe liegen im Inhalts-Repository unter `content/impressum/` und
`content/datenschutz/` (Deutsch und Englisch).

- [ ] Impressum: zweiten Kontaktweg ergänzen (z. B. Telefonnummer), Platzhalter entfernen
- [ ] Datenschutzerklärung: Hoster und Speicherdauer eintragen, Platzhalter entfernen
- [ ] Beide Texte rechtlich prüfen lassen, danach den Hinweis „Entwurf – rechtlich
      zu prüfen“ oben entfernen
- [ ] Prüfen: `grep -rn "PLATZHALTER\|PLACEHOLDER\|Entwurf\|Draft" content/` im
      Inhalts-Repository findet nichts mehr

## 3. Inhalte aufräumen

- [ ] Beispiel- und Testartikel löschen: `content/artikel/notenlesen/` (Beispiel aus
      Paket 2) und `content/artikel/die-d-dur-tonleiter/` (Pages-CMS-Test)
- [ ] Platzhaltersatz auf den Startseiten ersetzen (`content/_index.de.md`,
      `content/_index.en.md`)
- [ ] `docs/MIGRATION.md` durchgehen: Affiliate-Links, Bilder, Quiz-Umwandlung,
      frühere Beitragsnamen
- [ ] Optional nach der Search-Console-Auswertung: Beiträge ohne Zugriffe löschen
      (die Weiterleitung dann im Werkzeug auf `/en/articles/` umbiegen)

## 4. Server einrichten und testen

- [ ] Neues, **leeres** Webverzeichnis anlegen – nicht ins Verzeichnis der
      WordPress-Installation hochladen (`rsync --delete` würde WordPress löschen;
      `--max-delete=300` bricht vorher ab)
- [ ] `.htaccess` zuerst in einem Unterordner testen (manche Hoster antworten auf
      unbekannte Direktiven mit Fehler 500)
- [ ] Schlüssel, `deploy/known_hosts`, `DEPLOY_TARGET` und `DEPLOY_ENABLED` nach
      [`SETUP.md`](SETUP.md), Abschnitt 5
- [ ] Vorläufige Adresse beim Hoster (Subdomain oder Test-URL) als Repository-Variable
      `LIVE_URL` setzen, damit die Kontrolle nach dem Upload die neue Seite prüft
- [ ] Ersten Lauf per „Run workflow“ starten, freigeben, Seite unter der vorläufigen
      Adresse ansehen
- [ ] Kopfzeilen prüfen: `curl -sI <vorläufige-adresse>` zeigt
      `content-security-policy`, `strict-transport-security`, `x-content-type-options`
- [ ] Abnahme Paket 5 durchführen (SETUP.md, Abschnitt 7)

## 5. Domain umstellen

- [ ] Einen Tag vorher die TTL der DNS-Einträge auf 300 Sekunden senken
- [ ] WordPress sichern (Datenbank und `wp-content`), dann die Einträge `A`/`AAAA`
      (und ggf. `www`) auf den neuen Hoster zeigen lassen
- [ ] TLS-Zertifikat für `museprep.com` und `www.museprep.com` beim Hoster ausstellen
- [ ] `www.museprep.com` per 301 auf `https://museprep.com/` leiten (Hoster-Einstellung)
- [ ] Repository-Variable `LIVE_URL` löschen (Standard ist `https://museprep.com/`)

## 6. Nach der Umstellung prüfen

- [ ] `tools/check-live-redirects.sh` – jede alte Adresse antwortet mit 200, 301 oder 410
- [ ] Startseite, Artikelübersicht, ein Artikel, Impressum, Datenschutz in beiden
      Sprachen öffnen; in den Entwicklerwerkzeugen keine Anfragen an fremde Server
- [ ] Search Console: Sitemap `https://museprep.com/sitemap.xml` einreichen,
      in den folgenden Wochen „Nicht gefunden (404)“ beobachten
- [ ] Nach zwei bis vier Wochen ohne Probleme HSTS in `static/.htaccess` von
      `max-age=300` auf `max-age=31536000` erhöhen
- [ ] DNS-TTL wieder hochsetzen; WordPress-Installation und alten Hoster kündigen,
      sobald alles läuft
