# Adding an activity

> Projects on GorzaWebK and GorzaWebA are found once a day and added to the site automatically (see "New activities are found automatically" in README.md). Use the steps below for anything else, or to tidy an entry that was added automatically.

Adding an activity takes **one new entry in `activities.json`** and a thumbnail image. You don't need to change any HTML, CSS or JavaScript.

## 1. Make the thumbnail

- Take a screenshot of the activity (or use one from its repo, for example `docs/media/title.jpg`).
- Resize it to **640 × 360** and save it as **WebP**, under 80 KB, in `assets/thumbs/`, named after the id, for example `assets/thumbs/star-sorter.webp`.
  Any image editor can do this, or <https://squoosh.app> in the browser.

## 2. Add the entry

Open `activities.json` and add an entry inside the square brackets (put a comma after the previous entry):

```json
{
  "id": "star-sorter",
  "title": "Star Sorter",
  "description": "One short, pupil-friendly sentence about what you do.",
  "category": "Logic",
  "url": "https://example.github.io/Star-Sorter/",
  "thumbnail": "assets/thumbs/star-sorter.webp",
  "devices": ["computer", "tablet", "phone"],
  "inputs": ["mouse", "keyboard", "touch"],
  "controls": [
    { "action": "Move", "how": "Arrow keys, or swipe" },
    { "action": "Pause", "how": "Esc" }
  ],
  "noTimer": false,
  "needsSound": false,
  "pcOnly": false,
  "hasOnline": false,
  "onlineNote": "",
  "enabled": true
}
```

| Field | What to put |
| --- | --- |
| `id` | Short, unique, lowercase with dashes. It appears in the link: `activity.html?id=star-sorter`. |
| `title` | The activity's name. |
| `description` | One plain sentence a pupil would understand. |
| `category` | One word, such as `Reflex`, `Logic`, `Rhythm`, `Strategy`, `Physics`. A new category gets its own filter button automatically. |
| `url` | The live `https://` address of the activity. It must allow being shown in a frame (GitHub Pages does). |
| `thumbnail` | The path to the image from step 1. |
| `devices` | Any of `"computer"`, `"tablet"`, `"phone"`. Include `"tablet"` for it to show under **Works on tablets**. |
| `inputs` | Optional, for reference: `"mouse"`, `"keyboard"`, `"touch"`, `"gamepad"`. |
| `controls` | Rows for the controls table on the activity page. |
| `noTimer` | `true` if there is no timer or time pressure. It's then listed under "quiet time" on the teacher page. |
| `needsSound` | `true` if it can't be done without sound (for example rhythm activities). |
| `pcOnly` | `true` if it needs a keyboard and mouse. Phones and tablets then see a "please use a computer" message. Set `devices` to `["computer"]`. |
| `hasOnline` | `true` if it has leaderboards, nicknames, online matches or chat. |
| `onlineNote` | Required when `hasOnline` is `true`: a sentence for teachers and the privacy page explaining the online parts. |
| `enabled` | `true` to show it, `false` to hide it everywhere. |

Words to avoid in titles, descriptions and categories: game, play, arcade, fun, gaming, unblocked. The check script flags them.

## 3. Check it

```bash
node tools/check.mjs
```

This confirms every entry has all its fields, the thumbnail exists, and the URL answers. The same check runs automatically before every deploy; if it fails, the site isn't updated.

## 4. Publish

Commit and push to `main`. GitHub Actions checks and deploys the site in about a minute.

## Switching an activity off

Set `"enabled": false`. It disappears from Home, search, the teacher page lists and its activity page. Set it back to `true` to bring it back.
