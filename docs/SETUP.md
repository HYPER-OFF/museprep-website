# Einrichtung auf GitHub

Checkliste für das GitHub-Konto **HYPER-OFF** und die beiden Repositories.
Die Repositories liegen vorerst im persönlichen Konto. Eine spätere Übertragung
in eine Organisation behält die Historie, und GitHub leitet die alten Adressen
weiter.

| Repository | Sichtbarkeit | Zweck |
|---|---|---|
| `HYPER-OFF/museprep-website` | öffentlich | Vorlagen, Prüfskripte, Workflow |
| `HYPER-OFF/museprep-content` | privat | Texte, Bilder, `.pages.yml` |

Das Website-Repository muss öffentlich sein: Pflicht-Prüfer für Umgebungen
gibt es bei privaten Repositories nur im Enterprise-Tarif.

## 1. Konto HYPER-OFF absichern

- [ ] Settings → Password and authentication: Passkey oder Hardware-Schlüssel
      einrichten, dazu einen zweiten Schlüssel als Reserve.
- [ ] Zwei-Faktor-Anmeldung ist aktiv, Wiederherstellungscodes sind offline
      abgelegt.
- [ ] Settings → SSH and GPG keys: nur Schlüssel, die wirklich gebraucht werden.

## 2. Inhalts-Repository `museprep-content`

- [ ] Settings → Actions → General → **Disable actions**. Das Inhalts-Repository
      hat keinen Workflow und keinen Schlüssel.
- [ ] Settings → Collaborators → Autoren einladen. Jeder Autor braucht ein
      eigenes GitHub-Konto mit Zwei-Faktor-Anmeldung (bei persönlichen Konten
      lässt sich das nicht erzwingen, also beim Einladen nachfragen).
- [ ] Pages CMS: auf <https://app.pagescms.org> mit HYPER-OFF anmelden und die
      GitHub-App installieren. Dabei **Only select repositories** wählen und
      nur `museprep-content` freigeben, nicht „All repositories“.
- [ ] Deploy Key für den Build eintragen, siehe Abschnitt 5.

## 3. Website-Repository `museprep-website`

- [ ] Keine Collaborators. Schreibrecht hat nur HYPER-OFF.
- [ ] Settings → Rules → Rulesets → New branch ruleset
  - Name `main`, Enforcement **Active**, Bypass-Liste leer
  - Target: Default branch
  - **Restrict deletions** und **Block force pushes** aktivieren
- [ ] Settings → Actions → General
  - Actions permissions: **Allow HYPER-OFF, and select non-HYPER-OFF, actions
    and reusable workflows** → nur **Allow actions created by GitHub**
  - **Require actions to be pinned to a full-length commit SHA** aktivieren
  - Fork pull request workflows: **Require approval for all external
    contributors**
  - Workflow permissions: **Read repository contents and packages
    permissions**; „Allow GitHub Actions to create and approve pull requests“
    aus
- [ ] Settings → Environments → New environment `production`
  - **Required reviewers**: HYPER-OFF
  - **Prevent self-review aus**. Zeitgesteuerte Läufe gelten als von dem
    Konto ausgelöst, das die Zeitsteuerung zuletzt geändert hat, also von
    HYPER-OFF. Mit eingeschalteter Sperre könnte niemand freigeben.
  - **Allow administrators to bypass** aus
  - Deployment branches and tags: **Selected branches and tags** → nur `main`
- [ ] Settings → Code security: Secret scanning und Push protection sind an
      (bei öffentlichen Repositories Standard).
- [ ] Secrets und Variablen für den Workflow, siehe Abschnitt 5.

## 4. Abnahme Paket 1

Ein Autor schreibt ins Inhalts-Repository und wird im Website-Repository
abgewiesen:

1. Der Autor meldet sich auf <https://app.pagescms.org> mit seinem GitHub-Konto an.
2. `HYPER-OFF/museprep-content` erscheint, `HYPER-OFF/museprep-website` nicht.
3. Der Autor ändert die Startseite (Deutsch) und speichert. Im Inhalts-Repository
   erscheint ein neuer Commit von ihm.
4. Im Website-Repository hat der Autor kein Schreibrecht: Auf github.com fehlt
   „Edit“ bzw. GitHub bietet nur einen Fork an, und `git push` wird abgewiesen.

## 5. Workflow: Schlüssel, Secrets, Variablen

Die Schlüsselpaare liegen lokal in `~/museprep-keys/` (außerhalb der Repos):

| Datei | Zweck | Fingerprint |
|---|---|---|
| `content-deploy` / `.pub` | Build liest `museprep-content` | `SHA256:lJdd1HCWmTAZE1C3nIZInEzaMHW/Fvb9hu0GXCHUJ0A` |
| `upload` / `.pub` | Upload ins Webverzeichnis | `SHA256:m/AaCRGE02nHtlyaWEQiMvHg3KAMCmjz3DfjyCWdCLU` |

Zum Kopieren ohne Anzeige: `pbcopy < ~/museprep-keys/content-deploy.pub`
(öffentlich) bzw. `pbcopy < ~/museprep-keys/content-deploy` (privat).

**Lese-Schlüssel (jetzt):**

- [ ] `museprep-content` → Settings → Deploy keys → **Add deploy key**:
      Titel `museprep-website build`, Inhalt von `content-deploy.pub`,
      **„Allow write access“ nicht anhaken**.
- [ ] `museprep-website` → Settings → Secrets and variables → Actions →
      **New repository secret**: Name `CONTENT_DEPLOY_KEY`, Inhalt der
      privaten Datei `content-deploy` (komplett, mit BEGIN/END-Zeilen).

Ohne diesen Secret endet jeder Lauf mit dem Hinweis „CONTENT_DEPLOY_KEY
fehlt“, aber ohne Fehler-Mail.

**Upload (sobald der Hoster feststeht):**

- [ ] Beim Hoster: eigener SSH-Benutzer, der nur ins Webverzeichnis schreiben
      darf; `upload.pub` in dessen `~/.ssh/authorized_keys`, wenn möglich mit
      `restrict,command="rrsync -wo <webverzeichnis>" ssh-ed25519 …`.
- [ ] Host-Schlüssel des Servers mit `ssh-keyscan -t ed25519 <host>` holen, den
      Fingerprint mit der Angabe des Hosters vergleichen und die Zeile in
      `deploy/known_hosts` eintragen (Commit im Website-Repository).
- [ ] Umgebung `production` → **Environment secrets**: `DEPLOY_SSH_KEY` =
      Inhalt der privaten Datei `upload`.
- [ ] Umgebung `production` → **Environment variables**: `DEPLOY_TARGET` =
      `benutzer@host:pfad/zum/webverzeichnis/` (mit Schrägstrich am Ende).
- [ ] Optional, solange die Domain noch auf WordPress zeigt:
      Repository-Variable `LIVE_URL` = Adresse, unter der die neue Seite
      erreichbar ist (für die Kontrolle nach dem Upload).
- [ ] Zuletzt Repository-Variable `DEPLOY_ENABLED` = `true`. Vorher läuft der
      Upload-Job gar nicht, es kommen also keine Freigabe-Mails.

Sind die Schlüssel in GitHub und beim Hoster hinterlegt, die privaten Dateien
in einem Passwortmanager sichern und aus `~/museprep-keys/` löschen.

## 6. Wie der Workflow arbeitet

- **Start:** alle 15 Minuten, bei jedem Push auf `main` im Website-Repository
  und per Hand (Actions → Build und Upload → Run workflow). Pull Requests
  starten nichts.
- **Nur einmal bauen:** Ist der Inhaltsstand mit dem aktuellen Website-Stand
  schon gebaut, endet der Lauf nach wenigen Sekunden. Das gilt auch, wenn der
  Build gescheitert oder die Freigabe abgelehnt wurde. Neu bauen: „Run
  workflow“ mit Häkchen **force**.
- **Freigabe:** Der Upload-Job wartet in der Umgebung `production`; GitHub
  schickt eine Mail. Unter Actions → Lauf → **Review deployments** freigeben
  oder ablehnen. Kommt vorher ein neuer Stand, ersetzt dessen Lauf den
  wartenden.
- **Bericht:** In der Zusammenfassung jedes Laufs stehen geänderte Dateien
  und neue externe Links gegenüber dem zuletzt hochgeladenen Stand.
- **Öffentlich:** Das Website-Repository ist öffentlich, damit auch Logs,
  Berichte und das Artefakt `public` (7 Tage). Sie enthalten nur, was nach der
  Freigabe ohnehin auf der Website steht – ein abgelehnter Stand bleibt aber
  bis zu 7 Tage als Artefakt herunterladbar.
- **Historie:** Wurde die Historie des Inhalts-Repositorys umgeschrieben
  (Force-Push), bricht der Build ab.
- **Zeitsteuerung:** GitHub schaltet zeitgesteuerte Läufe in öffentlichen
  Repositories nach 60 Tagen ohne Aktivität ab und schickt dann eine Mail.
  Dependabot (`.github/dependabot.yml`) schlägt monatlich Updates der Actions
  vor; gemergte Updates zählen als Aktivität. Kommt die Mail trotzdem: Actions
  → Build und Upload → **Enable workflow**.
- **Fehler:** Schlägt ein Schritt fehl, endet der Lauf und die Live-Seite
  bleibt unverändert.

## 7. Abnahme Paket 5

1. Eine Änderung in Pages CMS speichern. Innerhalb von 15 Minuten startet ein
   Lauf, baut und wartet auf Freigabe.
2. **Ablehnen** → die Live-Seite bleibt unverändert.
3. Neue Änderung speichern, **freigeben** → die Änderung ist live, die
   Kontrolle meldet die Content-Security-Policy.
4. Zwei Läufe kurz hintereinander per „Run workflow“ mit force → der ältere,
   noch wartende wird abgebrochen.

## Grenzen bis zur Übertragung in eine Organisation

- Zwei-Faktor-Anmeldung lässt sich für Collaborators nicht erzwingen.
- Actions-Richtlinien gelten pro Repository, nicht für alle zentral.
- Collaborators haben in privaten Repositories immer volles Schreibrecht. Im
  kostenlosen Tarif gibt es dort keinen Branch-Schutz. Der Build prüft deshalb
  selbst, ob die Historie des Inhalts-Repositorys umgeschrieben wurde (Paket 5).
