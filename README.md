# Brain Break Lab

A calm, tidy website where pupils open short browser activities for brain breaks in class: logic, strategy, rhythm, reflex and physics challenges.

- Plain HTML, CSS and vanilla JavaScript. No framework, no build step, no CDNs, no web fonts.
- Every activity is its own project on GitHub Pages, shown here in an iframe. Nothing is copied or rewritten.
- All content comes from **`activities.json`**. See [ADDING-AN-ACTIVITY.md](ADDING-AN-ACTIVITY.md).

## Pages

| Page | What it does |
| --- | --- |
| `index.html` | Grid of activity cards with search, category filters, a **Works on tablets** filter and a **Recently opened** row. |
| `activity.html?id=…` | The activity in a 16:9 frame with Fullscreen, Back, Open in new tab, notes and the controls table. PC-only activities show a "please use a computer" message on touch devices. If the frame hasn't loaded after 10 seconds, a message offers to open it in a new tab. |
| `teachers.html` | What the site is, which activities have no timer, which need sound, which have online features, and every URL for IT to allow-list. |
| `privacy.html` | Plain-English privacy notice. |
| `404.html` | Not-found page with a link back Home. |

## Activities included

| Activity | Category | Devices | Notes |
| --- | --- | --- | --- |
| Felt Links | Physics | computer, tablet, phone | No timer |
| Paper Tides | Strategy | computer, tablet, phone | No timer, turn-based |
| Blueprint Heist | Logic | computer, tablet, phone | |
| Leadlight | Physics | computer, tablet, phone | |
| Needle Drop | Rhythm | computer, tablet, phone | Needs sound |
| Hop Across | Reflex | computer, tablet, phone | |
| Orb Dash | Reflex | computer, tablet, phone | Online high-score table with usernames; needs cdnjs.cloudflare.com |
| Redline | Reflex | computer, tablet, phone | Online leaderboards, shared circuits, online races by room code |
| Skyhook | Reflex | computer only | Pointer lock; online leaderboards |
| Borderfall *(GorzaWebA)* | Strategy | computer, tablet, phone | Conquest theme; optional online matches incl. public games, Google sign-in |
| Gravity.io *(GorzaWebA)* | Physics | computer, tablet, phone | Computer opponents only |
| Idle Island *(GorzaWebA)* | Strategy | computer, tablet, phone | |
| Stuntrun *(GorzaWebA)* | Reflex | computer, tablet, phone | |
| Foundry Arena | Arena | computer only | Pointer lock; online rooms and **text chat** with other players (see below) |

### About Foundry Arena

Foundry Arena is a first-person shooter with online rooms and **text chat with other players**, which many schools won't want for under-13s. It was off by default and has been switched on. To hide it again, set `"enabled": false` for it in `activities.json`.

Other activities with online features (leaderboards, nicknames, online matches) are switched on but labelled on their cards, activity pages, the teacher page and the privacy page. Switch any of them off the same way.

## New activities are found automatically

Once a day, `.github/workflows/new-activities.yml` checks the GitHub accounts listed under `"watch"` in `site-config.json` (GorzaWebK and GorzaWebA) for public projects with a live GitHub Pages site that aren't on Brain Break Lab yet. For each one it:

- drafts an `activities.json` entry from the project's README and code (description, a guessed category, controls, devices, online features);
- takes a 640x360 WebP screenshot for the thumbnail;
- opens a pull request called **New activities: …** (or updates the open one).

**Merge the pull request to publish them.** Nothing goes live without that click, because the descriptions and categories are guesses and new projects may have online features. Anything that looks like it has text chat with other players is added switched off (`"enabled": false`).

- To run the check straight away: **Actions → Look for new activities → Run workflow**.
- To stop a project being suggested, add its repository name to `"watch" → "ignore"` in `site-config.json`.
- To watch another account, add it to `"watch" → "accounts"`.
- To see what's new without changing anything: `node tools/find-new.mjs --list`.

## Running it locally

`fetch()` doesn't work from `file://`, so serve the folder:

```bash
npx serve .        # or: python -m http.server 8000
```

## Checks

```bash
node tools/check.mjs            # fields, thumbnails, every URL returns HTTP 200
node tools/check.mjs --offline  # skip the network part
```

The GitHub Actions workflow (`.github/workflows/deploy.yml`) runs the check on every push to `main` and deploys to GitHub Pages only if it passes. In the repo's **Settings → Pages**, **Source** must be **GitHub Actions**.

## Ads (off by default)

`site-config.json` has an `ads` section that is **off**:

```json
"ads": { "enabled": false, "client": "", "slot": "" }
```

Please read this before changing it. The audience is pupils, many under 13:

- **UK (ICO Age Appropriate Design Code / Children's Code)** and **US (COPPA)** set strict rules for services children are likely to use: no personalised (behavioural) advertising, data collection kept to a minimum, and high-privacy settings by default.
- In AdSense, mark the site as **child-directed** (in the AdSense account's privacy settings for the site) as well as in the code.
- Many school networks block ad networks anyway, so the slot may simply be empty.

If you turn ads on (`"enabled": true` and `"client": "ca-pub-…"`), `assets/app.js` will:

- show **at most one** ad slot, on the **Home page only** (never on the activity page or over the iframe);
- set `requestNonPersonalizedAds = 1` (non-personalised ads) and send `tag_for_child_directed_treatment: 1` (and the `data-tag-for-child-directed-treatment` attribute) with the request;
- load AdSense only then. With ads off, the site makes no requests to any ad network.

Before switching on, check Google's current AdSense documentation for child-directed treatment and non-personalised ads (parameter names change from time to time), and **update `privacy.html`**, which currently says the site shows no adverts.

## Files

```
index.html  activity.html  teachers.html  privacy.html  404.html
activities.json         every activity (the only file to edit to add one)
site-config.json        site name and the ads switch
assets/style.css        all styles
assets/app.js           all scripts
assets/favicon.svg
assets/thumbs/*.webp    640x360 thumbnails, stored here (never hotlinked)
tools/check.mjs         data check, run in CI before deploy
tools/find-new.mjs      finds new Pages projects on the watched accounts (daily workflow)
```
