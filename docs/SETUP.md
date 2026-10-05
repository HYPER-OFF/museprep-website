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
- [ ] Später (Paket 5): Settings → Deploy keys → Lese-Schlüssel des Builds
      hinzufügen, **ohne** „Allow write access“.

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
- [ ] Später (Paket 5): Repository-Secret `CONTENT_DEPLOY_KEY` (private Hälfte
      des Lese-Schlüssels). In der Umgebung `production`: Secret
      `DEPLOY_SSH_KEY` (Upload-Schlüssel) und Variable `DEPLOY_TARGET`
      (`benutzer@host:pfad/`).

## 4. Abnahme Paket 1

Ein Autor schreibt ins Inhalts-Repository und wird im Website-Repository
abgewiesen:

1. Der Autor meldet sich auf <https://app.pagescms.org> mit seinem GitHub-Konto an.
2. `HYPER-OFF/museprep-content` erscheint, `HYPER-OFF/museprep-website` nicht.
3. Der Autor ändert die Startseite (Deutsch) und speichert. Im Inhalts-Repository
   erscheint ein neuer Commit von ihm.
4. Im Website-Repository hat der Autor kein Schreibrecht: Auf github.com fehlt
   „Edit“ bzw. GitHub bietet nur einen Fork an, und `git push` wird abgewiesen.

## Grenzen bis zur Übertragung in eine Organisation

- Zwei-Faktor-Anmeldung lässt sich für Collaborators nicht erzwingen.
- Actions-Richtlinien gelten pro Repository, nicht für alle zentral.
- Collaborators haben in privaten Repositories immer volles Schreibrecht. Im
  kostenlosen Tarif gibt es dort keinen Branch-Schutz. Der Build prüft deshalb
  selbst, ob die Historie des Inhalts-Repositorys umgeschrieben wurde (Paket 5).
