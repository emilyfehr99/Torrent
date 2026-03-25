# Torrent: free protected link setup

This repo now deploys to GitHub Pages automatically from `main`.

## 1) Turn on GitHub Pages

1. Open repository Settings -> Pages.
2. Under Build and deployment, choose **GitHub Actions**.
3. Push to `main` to trigger deploy.
4. Your public Pages URL appears in Actions/Pages settings.

## 2) Add custom domain in GitHub Pages

You need a custom domain to put Cloudflare Access in front of the site.

1. Buy/use a domain (or subdomain) managed in Cloudflare.
2. In GitHub Pages settings, set **Custom domain** (example: `torrent.yourdomain.com`).
3. Add matching DNS record in Cloudflare:
   - `CNAME torrent -> emilyfehr99.github.io`
4. Keep Cloudflare proxy **ON** (orange cloud).
5. Enable HTTPS in GitHub Pages.

## 3) Protect it with Cloudflare Access (free tier)

1. Cloudflare dashboard -> Zero Trust -> Access -> Applications -> Add application.
2. Type: **Self-hosted**.
3. Domain: your custom domain (example `torrent.yourdomain.com`).
4. Policy:
   - Include: your email(s) or your domain.
   - Authentication method: One-time PIN or OAuth (Google/GitHub).
5. Save and test in an incognito browser.

Now the site has one link, but requires login before content is served.

## 4) Accessibility checklist

- Keyboard navigation only: all links/buttons reachable.
- Visible focus styles (`:focus-visible`) on controls.
- Color contrast >= WCAG AA.
- Proper labels/headings/landmarks (`main`, `h1`, `label`).
- Images/charts have alt text or aria descriptions.

## Notes

- GitHub Pages alone is public and not password-protected.
- Client-side password prompts are not secure.
- Cloudflare Access in front of your custom domain is the free secure gate.
