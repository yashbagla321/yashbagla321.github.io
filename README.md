# yashbagla321.github.io

Static personal website for Yash Bagla, designed for GitHub Pages.

Live site:

```text
https://yashbagla321.github.io/
```

Repository:

```text
https://github.com/yashbagla321/yashbagla321.github.io
```

## Files

- `images/headshot.png` - portrait photo shown in the header and hero
- `images/headshot-robot.png` - alternate portrait used in the rotating headshot animation
- `index.html` - page content and structure
- `styles.css` - responsive visual design
- `script.js` - animated autonomy / motion-planning canvas
- `404.html` - branded not-found page with a homepage link
- `.nojekyll` - tells GitHub Pages to serve the static files directly

## GitHub Pages Setup

This is a GitHub user site because the repository is named:

```text
yashbagla321.github.io
```

and it belongs to the GitHub account:

```text
yashbagla321
```

GitHub Pages should publish the site at:

```text
https://yashbagla321.github.io/
```

If Pages is not already enabled, open the repository on GitHub and go to:

```text
Settings -> Pages
```

Then choose either:

```text
Source: GitHub Actions
```

The repo includes `.github/workflows/pages.yml`, which deploys the static site using Node.js 24–compatible actions.

Or deploy directly from the branch:

```text
Source: Deploy from a branch
Branch: main
Folder: / (root)
```

## Local Preview

Because this is a static site, you can open `index.html` directly in a browser.

If Python is available, you can also preview it with:

```bash
python -m http.server 4173
```

Then open:

```text
http://127.0.0.1:4173/
```

## Suggested Next Edits

- Add confirmed citation metrics from Google Scholar as they grow.
- Add invited talks, peer review, judging, mentoring, or media appearances to the Recognition section.
- Replace any confidential employment details with public-safe language before publishing.
