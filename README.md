# n8n-nodes-whmcs

A community node package that brings the [WHMCS](https://www.whmcs.com/) billing &
automation API into [n8n](https://n8n.io/) as native nodes.

It ships two nodes:

- **WHMCS** — an action node covering Clients, Orders, Invoices, Products/Services,
  Tickets, Domains and System operations, plus a *Custom API Call* escape hatch that
  can invoke any of the 200+ documented WHMCS actions.
- **WHMCS Trigger** — a webhook node that starts workflows from WHMCS hook events
  (new order, invoice paid, ticket opened, …) via a small PHP bridge file.

> Full design, endpoint, authentication and workflow documentation lives in
> [`WHMCS-n8n-Node-Technical-Documentation.md`](./WHMCS-n8n-Node-Technical-Documentation.md)
> (in the parent folder).

## Installation

### Via the n8n UI (recommended)
1. In n8n go to **Settings → Community Nodes → Install**.
2. Enter `n8n-nodes-whmcs` and confirm.

### Manual / self-hosted
```bash
cd ~/.n8n/nodes        # or your N8N_CUSTOM_EXTENSIONS path
npm install n8n-nodes-whmcs
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

Create an API credential in WHMCS first:

1. **Configuration → System Settings → Manage API Credentials → Generate New API Credential.**
2. Pick an admin role that has the **API Access** permission.
3. Copy the **Identifier** and **Secret** (the secret is shown only once).

Then in n8n add a **WHMCS API** credential:

| Field | Example | Notes |
|-------|---------|-------|
| WHMCS Base URL | `https://billing.example.com` | No trailing slash |
| API Path | `/includes/api.php` | Default; change only for sub-dir installs |
| API Identifier | `D4j1dKYE…` | From WHMCS |
| API Secret | `F1CKGXRI…` | From WHMCS |
| Access Key | *(optional)* | Matches `$api_access_key` in `configuration.php`; bypasses IP allow-listing |
| Ignore SSL Issues | off | Enable only for trusted internal hosts |

The credential **Test** button calls the harmless `WhmcsDetails` action to confirm the
identifier/secret and IP/access-key configuration.

## Trigger setup (optional)

1. Add a **WHMCS Trigger** node and copy its **Production URL**.
2. Copy `bridge/whmcs-hook-bridge.php` into your WHMCS `includes/hooks/` directory.
3. Edit the file: set `$n8nWebhookUrl` to the Production URL, optionally set
   `$sharedSecret`, and list the events in `$forwardEvents`.
4. Set the same secret in the node's **Shared Secret** field.

## Quick example

*Get every unpaid invoice for client 42:*

- Resource **Invoice** → Operation **Get Many**
- Filters → Client ID `42`, Status `Unpaid`

## Security

This node talks to your billing system and the trigger receives inbound HTTP, so a
few settings are security-relevant:

- **Always set a Shared Secret on the WHMCS Trigger.** If you leave it blank the
  webhook is **unauthenticated** — anyone who discovers the URL can inject fake
  events (e.g. a forged `InvoicePaid`). Set a long random secret in the node and the
  matching `$sharedSecret` in `whmcs-hook-bridge.php`. The node compares secrets in
  constant time.
- **Use HTTPS end to end.** WHMCS hook payloads can contain client and invoice PII.
  The PHP bridge should point `$n8nWebhookUrl` at an `https://` URL so that data —
  and the shared secret header — is never sent in clear text.
- **Keep "Ignore SSL Issues" off.** Only enable it for trusted internal/staging
  hosts; disabling certificate validation exposes API traffic to interception.
- **Scope the WHMCS API role.** Generate the API credential against an admin role
  granted only the permissions your workflows actually use, and restrict by IP under
  *Setup → General Settings → Security* where possible. Prefer IP allow-listing over
  the Access Key, which bypasses it.
- **Credentials** are stored in n8n's encrypted credential store and injected per
  request; they are never logged by the node, and credential values are redacted from
  error output.

## Disclaimer

This is an unofficial, community-maintained project. It is **not affiliated with,
endorsed by, or sponsored by WHMCS Limited**. "WHMCS" is a trademark of WHMCS Limited
and is used here only to describe API compatibility. This package contains **no WHMCS
source code** — it communicates with WHMCS solely through its public, documented API.
The software is provided "as is", without warranty of any kind (see [LICENSE](LICENSE.md)).

## License

[MIT](LICENSE.md) © Anthony Tuberville
