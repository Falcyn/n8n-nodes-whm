# n8n-nodes-whm

A community node package that brings [cPanel & WHM](https://cpanel.net/) (WebHost
Manager) into [n8n](https://n8n.io/) as native nodes.

It ships two nodes:

- **WHM** — an action node covering the server-level WHM API (accounts, packages,
  domains, DNS zones, resellers, server, services, SSL, backups, API tokens) **and**
  the account-level cPanel API (email accounts, MySQL databases, addon/parked/sub
  domains, FTP accounts) executed *as* any cPanel user through WHM — no per-account
  passwords needed. Two escape hatches (*Custom WHM Call* and *cPanel Function*) can
  invoke any documented WHM API 1, UAPI or API 2 function.
- **WHM Trigger** — a webhook node that starts workflows from WHM hook events
  (account created, suspended, email account added, …) via a small, signed hook
  bridge script that you register on the server.

> Design, endpoint, authentication and workflow details live in
> [`WHM-n8n-Node-Technical-Documentation.md`](./WHM-n8n-Node-Technical-Documentation.md).

## Installation

### Via the n8n UI (recommended)
1. In n8n go to **Settings → Community Nodes → Install**.
2. Enter `n8n-nodes-whm` and confirm.

### Manual / self-hosted
```bash
cd ~/.n8n/nodes        # or your N8N_CUSTOM_EXTENSIONS path
npm install n8n-nodes-whm
```

### Build from source
```bash
git clone https://github.com/Falcyn/n8n-nodes-whmcs.git
cd n8n-nodes-whmcs
npm install
npm run build      # tsc + copies icons into dist/
npm run lint       # eslint with eslint-plugin-n8n-nodes-base
```
The compiled output in `dist/` is what n8n loads (see the `n8n` block in `package.json`).

## Credentials

Create an API token in WHM first:

1. **WHM » Development » Manage API Tokens » Generate Token.**
2. Give it a name and restrict its privileges (ACLs) to what your workflows need. A
   reseller can generate a token limited to its own accounts.
3. Copy the token — WHM shows it only once.

Then in n8n add a **WHM API** credential:

| Field | Example | Notes |
|-------|---------|-------|
| Host | `server.example.com` | Hostname or IP, no scheme or port |
| Port | `2087` | 2087 = HTTPS (default), 2086 = plain HTTP |
| Use SSL | on | Keep on; the port must match |
| Username | `root` | root or a reseller username |
| Authentication | API Token | Password (HTTP Basic) is also supported |
| API Token | `U7HMR63FGY…` | From WHM |
| Ignore SSL Issues | off | Turn on only if WHM still uses its self-signed certificate |

The credential **Test** button calls the harmless `version` function.

## What the WHM node can do

| Resource | Operations |
|----------|------------|
| **Account** | Create, Get, Get Many, Get Suspended, Modify, Suspend, Unsuspend, Terminate, Change Package, Change Password, Change Primary IP, Set Bandwidth Limit, Set Disk Quota, Get Bandwidth Usage, Get Disk Usage, Create Login Session (SSO URL), Force Password Change |
| **Package** | Create, Update, Delete, Get, Get Many, Get Feature Lists, Get Feature List |
| **Domain** | Get Many (every domain on the server), Get Owner, Get User Data (vhost), Park, Unpark, Resolve |
| **DNS Zone** | Get Many, Create Zone, Delete Zone, Get Zone (all records), Reset Zone, Add / Edit / Get / Delete Record, Get MX Records, Save MX Record, Lookup Nameserver IP |
| **Reseller** | Get Many, Grant / Revoke Privileges, Get Stats, Get Account Counts, Get / Set IP Addresses, Set Main IP, Set Nameservers, Set Limits, Set Package Limit, Set ACLs, Get ACL Lists, Suspend, Unsuspend, Terminate |
| **Server** | Get Version, Get Hostname, Set Hostname, Get Load Average, Get Disk Usage, Get / Add / Delete IP Addresses, Get / Set Tweak Setting, Get Languages, Get Applications, Reboot |
| **Service** | Get Status, Restart, Configure (enable / monitor) |
| **SSL** | Get Many (installed), Install, Delete Installed, Get Certificate Info, Get Vhost Components, List Certificates, Generate Self-Signed, Run AutoSSL (user / all), Get / Set AutoSSL Provider |
| **Backup** | Get / Set Configuration, Get Backup Dates, Get Backup Users, Get User Backup Sets, Restore Account, Restore From Archive, Toggle User Backups, Skip All Users, Get Skip-All Status |
| **API Token** | Get Many, Create, Update, Revoke |
| **cPanel Email** | Get Many, Create, Delete, Change Password, Get / Set Quota, Suspend / Unsuspend Login, Get / Add / Delete Forwarders, Get Mail Domains |
| **cPanel Database** | Get Many, Create, Delete, Rename, Get Users, Create / Delete User, Set User Password, Get / Set Privileges, Add / Delete Remote Host |
| **cPanel Domain** | Get Many, Get Domain Data, Add / Delete Addon Domain, Add / Delete Subdomain, Add / Delete Alias (parked) |
| **cPanel FTP** | Get Many, Create, Delete, Change Password, Set Quota, Set Home Directory |
| **cPanel Function** | Execute any UAPI or API 2 function as a cPanel user |
| **Custom WHM Call** | Execute any WHM API 1 function |

Every operation also has a **Custom Parameters** list for parameters that are not
exposed as fields, and an **Options → Raw Response** switch that returns the
complete API envelope. *Get Many* operations support **Return All / Limit** and, for
WHM API 1 functions, server-side **Filters** and **Sort** (`api.filter.*`, `api.sort.*`).

## Trigger setup (optional)

cPanel & WHM has no outbound webhooks; it has *Standardized Hooks* that run a script
when something happens. The package ships that script.

1. Add a **WHM Trigger** node, pick the events, set a **Shared Secret**, and copy the
   **Production URL**.
2. Copy the `bridge/` folder to the WHM server and run, as root:
   ```bash
   ./n8n-whm-hooks.sh install --url https://n8n.example.com/webhook/<id>/whm --secret '<same secret>'
   ```
   This installs `/opt/n8n-whm-hook-bridge/n8n-whm-hook-bridge.pl`, writes
   `/etc/n8n-whm-hook-bridge.conf` (root-only) and registers a default set of events
   with `manage_hooks`.
3. Register extra events with `./n8n-whm-hooks.sh add <Category> <Event> [pre|post]`,
   e.g. `./n8n-whm-hooks.sh add Cpanel UAPI::Email::passwd_pop post`. Add the same
   name to the node's **Custom Events** if it is not in the list.

The bridge reads the hook's JSON from STDIN, redacts password fields, signs the body
with HMAC-SHA256 (`X-WHM-Signature`) and POSTs it to n8n with a short timeout. It
**always** reports success to cPanel, so an unreachable n8n never blocks account
creation or any other WHM action. Delivery failures are logged to
`/usr/local/cpanel/logs/n8n-whm-hook-bridge.log`.

## Quick examples

*Create a hosting account when an order comes in:*

- Resource **Account** → Operation **Create**
- Username `{{ $json.username }}`, Domain `{{ $json.domain }}`
- Additional Fields → Package `starter`, Contact Email `{{ $json.email }}`

*List every suspended account owned by reseller `acme`:*

- Resource **Account** → **Get Many**
- Filters → Search Type `Owner`, Search `^acme$`
- List Options → Filters → Field `suspended`, Type `Equals`, Value `1`

*Add a mailbox on a customer's account:*

- Resource **cPanel Email** → **Create**
- cPanel Username `examplecom`, Email Address `support@example.com`, Password …

## Security

- **Use API tokens, not passwords**, and restrict their ACLs. A root token can do
  anything on the server; a reseller token can only touch that reseller's accounts.
- **Always set a Shared Secret on the WHM Trigger.** Without it the webhook is
  unauthenticated and anyone who discovers the URL can inject fake events. The node
  verifies an HMAC-SHA256 signature over the raw body in constant time.
- **Hook payloads can contain passwords** (account creation, password changes). The
  bridge redacts common password keys before the event leaves the server; extend the
  `redact` list in the config if you register other events.
- **Use HTTPS end to end.** Point the bridge at an `https://` n8n URL and keep
  *Ignore SSL Issues* off once WHM has a valid certificate.
- **Credentials** are stored in n8n's encrypted credential store, injected per request
  as an `Authorization` header, and redacted from error output by the node.

## Disclaimer

This is an unofficial, community-maintained project. It is **not affiliated with,
endorsed by, or sponsored by cPanel, L.L.C. or WebPros**. "cPanel" and "WHM" are
trademarks of cPanel, L.L.C. and are used here only to describe API compatibility. This
package contains **no cPanel source code** — it communicates with WHM solely through
its public, documented APIs and hook system. The software is provided "as is", without
warranty of any kind (see [LICENSE](LICENSE.md)).

## License

[MIT](LICENSE.md) © Anthony Tuberville
