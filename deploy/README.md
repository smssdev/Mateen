# Deploying Hafiz Fahim to hafiz.smszs.tech

The site (landing page `/`, web app `/app/`, brand guide `/identity/`) is plain static files, served by nginx on
the same CloudPanel VPS as `smszs.tech` and `orbit.smszs.tech`. Each deploy uploads the build into a new
directory under `releases/` and switches the `current` symlink to it in one step, so visitors never see a
half-uploaded site, and the last five releases stay on the server for rollbacks.

## One-time setup

1. **DNS** (Hostinger panel, where `smszs.tech`'s DNS lives): add an `A` record `hafiz` → `2.24.47.100`
   (the same IP as `orbit`).
2. **Site** (root shell on the VPS):

    ```bash
    clpctl site:add:static --domainName=hafiz.smszs.tech --siteUser=hafiz --siteUserPassword='…'
    mkdir -p /home/hafiz/htdocs/hafiz.smszs.tech/releases
    chown -R hafiz:hafiz /home/hafiz/htdocs/hafiz.smszs.tech
    ```

3. **Document root**: CloudPanel → Sites → hafiz.smszs.tech → Settings → *Root Directory* =
   `hafiz.smszs.tech/current` (the first deploy creates `current`).
4. **SSH key**: put your public key (and, for automatic deploys, a separate `github_actions` key) in
   `/home/hafiz/.ssh/authorized_keys` — CloudPanel → Sites → hafiz.smszs.tech → SSH/FTP, or by hand.
5. **HTTPS** once DNS points at the server:
   `clpctl lets-encrypt:install:certificate --domainName=hafiz.smszs.tech`

## Deploy

From your computer, in this repository:

```bash
npm ci
deploy/deploy.sh hafiz@2.24.47.100
```

It builds with `BASE=/` and `VITE_SITE_URL=https://hafiz.smszs.tech/`, uploads, activates and checks that
`https://hafiz.smszs.tech/app/` answers. Override `DOMAIN`, `APP_DIR` (default
`/home/hafiz/htdocs/hafiz.smszs.tech`) or `SSH_PORT` with environment variables if yours differ.

### Optional: deploy automatically on push (as Orbit does)

`.github/workflows/deploy.yml` runs the same script after the checks pass. It only uploads to your server —
nothing is hosted on GitHub — and it is skipped until these repository secrets exist:
`SSH_HOST` (`2.24.47.100`), `SSH_USER` (`hafiz`), `SSH_KEY` (the private `github_actions` key, BEGIN/END lines
included), and `SSH_PORT` only if SSH is not on 22. Set the variable `APP_DIR` if the site lives elsewhere.

## Day to day

| Task      | How                                                                                                   |
| --------- | ----------------------------------------------------------------------------------------------------- |
| Roll back | `ln -sfn /home/hafiz/htdocs/hafiz.smszs.tech/releases/<older> /home/hafiz/htdocs/hafiz.smszs.tech/current` |
| Releases  | `ls -lt /home/hafiz/htdocs/hafiz.smszs.tech/releases`                                                 |
