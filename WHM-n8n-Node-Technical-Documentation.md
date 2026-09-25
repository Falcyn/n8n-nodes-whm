# WHM n8n Community Node — Technical Documentation

**Package:** `n8n-nodes-whm`
**Version:** 1.0.0
**Author:** Anthony Tuberville
**Last updated:** 25 September 2026

---

## 1. Overview

`n8n-nodes-whm` exposes [cPanel & WHM](https://cpanel.net/) (WebHost Manager) as
native nodes inside n8n workflows. It covers the two API layers a hosting server has:

| Layer | Who it acts as | What it manages | How the node reaches it |
|-------|----------------|-----------------|-------------------------|
| **WHM API 1** | root or a reseller | accounts, packages, DNS, SSL, resellers, server, services, backups, API tokens | `POST https://host:2087/json-api/<function>` |
| **cPanel UAPI / API 2** | a specific cPanel user | email, databases, addon/sub/parked domains, FTP, … | proxied through WHM: `POST https://host:2087/json-api/cpanel` with `cpanel_jsonapi_user=<user>` |

The package contains two nodes:

| Node | Type | Purpose |
|------|------|---------|
| **WHM** | Action | 16 resources / 140 operations plus generic *Custom WHM Call* and *cPanel Function* escape hatches. |
| **WHM Trigger** | Trigger (webhook) | Starts a workflow when a cPanel *Standardized Hook* fires, delivered by the bundled Perl bridge. |

### 1.1 Why a dedicated node

1. **Two API families with different envelopes.** WHM API 1 wraps replies in
   `{ metadata: { result, reason }, data }`; UAPI in `{ result: { status, errors, data } }`;
   API 2 in `{ cpanelresult: { event: { result }, error, data } }`. A failed call very
   often comes back as **HTTP 200** — the node inspects the envelope and raises a real
   n8n error with the server's reason text.
2. **Non-obvious authentication.** WHM uses a custom `Authorization: whm user:token`
   scheme (or HTTP Basic). The credential handles both.
3. **Perl-style parameter conventions.** Booleans are `1`/`0`, multi-valued parameters
   are repeated keys (`acl=a&acl=b`), list filtering/sorting/paging uses the
   `api.filter.a.field=…` / `api.sort.a.field=…` / `api.chunk.size=…` family. The node
   encodes all of this for you.
4. **No outbound webhooks.** cPanel & WHM only has in-process *hooks*. The trigger ships
   a signed bridge script so WHM events can start workflows safely.

---

## 2. cPanel & WHM API fundamentals

### 2.1 Endpoints and ports

| Port | Interface | Used by |
|------|-----------|---------|
| 2087 | WHM over HTTPS | **this node (default)** |
| 2086 | WHM over HTTP | only on trusted private networks |
| 2083 / 2082 | cPanel (user-level, direct) | not used — the node proxies UAPI/API 2 through WHM |

WHM API 1 functions live at `/json-api/<function>` and require `api.version=1`.
cPanel functions are reached at `/json-api/cpanel` with:

| Parameter | Value |
|-----------|-------|
| `cpanel_jsonapi_user` | the cPanel account to act as |
| `cpanel_jsonapi_apiversion` | `3` for UAPI, `2` for API 2 |
| `cpanel_jsonapi_module` | e.g. `Email`, `Mysql`, `Ftp`, `DomainInfo`, `AddonDomain` |
| `cpanel_jsonapi_func` | e.g. `add_pop`, `create_database` |

Root may act as any user; a reseller only as accounts it owns.

### 2.2 Authentication

| Method | Header | Notes |
|--------|--------|-------|
| **API token** *(recommended)* | `Authorization: whm <user>:<token>` | Created in *WHM » Development » Manage API Tokens*. Can be restricted to ACLs and given an expiry. |
| Password | `Authorization: Basic base64(<user>:<password>)` | Works, but exposes the full account password to n8n. |

The credential's `authenticate()` builds the header; `test` calls `GET /json-api/version?api.version=1`.
A wrong token yields HTTP 401/403, which the test surfaces.

### 2.3 Response envelopes

**WHM API 1 — success**
```json
{ "metadata": { "version": 1, "command": "listaccts", "result": 1, "reason": "OK" },
  "data": { "acct": [ { "user": "examplecom", "domain": "example.com", "suspended": 0 } ] } }
```
**WHM API 1 — failure (still HTTP 200)**
```json
{ "metadata": { "version": 1, "command": "createacct", "result": 0,
                "reason": "The domain \"example.com\" already exists." }, "data": {} }
```
**UAPI via WHM**
```json
{ "result": { "status": 1, "errors": null, "messages": null,
              "data": [ { "email": "info@example.com", "diskused": 12 } ] } }
```
**API 2 via WHM**
```json
{ "cpanelresult": { "apiversion": 2, "module": "AddonDomain", "func": "addaddondomain",
                    "event": { "result": 1 }, "data": [ { "result": 1, "reason": "OK" } ] } }
```

### 2.4 List features (WHM API 1 only)

| Feature | Parameters sent by the node |
|---------|-----------------------------|
| Filter  | `api.filter.enable=1`, `api.filter.verbose=1`, `api.filter.a.field`, `api.filter.a.type` (`eq`, `begins`, `contains`, `gt`, `lt`, `gt_handle_unlimited`, `lt_handle_unlimited`), `api.filter.a.arg0`; second filter uses `b.`, etc. |
| Sort    | `api.sort.enable=1`, `api.sort.a.field`, `api.sort.a.reverse` (0/1), `api.sort.a.method` (`lexicographic`, `numeric`, `numeric_zero_as_max`, `ipv4`) |
| Limit   | `api.chunk.enable=1`, `api.chunk.verbose=1`, `api.chunk.start=1`, `api.chunk.size=<limit>` |

UAPI lists use `api.paginate=1&api.paginate_start=1&api.paginate_size=<limit>`; API 2 lists use
`api2_paginate=1&api2_paginate_start=1&api2_paginate_size=<limit>`. The node also slices client-side
so *Limit* is honoured even for functions that ignore chunking.

---

## 3. Architecture & package layout

```
n8n-nodes-whm/
├── package.json                       # n8n manifest (credentials + nodes paths)
├── tsconfig.json · gulpfile.js        # build: tsc + icon copy
├── .eslintrc.js                       # eslint-plugin-n8n-nodes-base rules
├── credentials/
│   └── WhmApi.credentials.ts          # host/port/SSL, token or password, auth header, test
├── nodes/Whm/
│   ├── Whm.node.ts                    # action node: resource list + generic execute()
│   ├── WhmTrigger.node.ts             # webhook trigger node (HMAC verification, event filter)
│   ├── GenericFunctions.ts            # request helpers, envelope parsing, encoding, list helpers
│   ├── operations.ts                  # declarative resource/operation → API function registry
│   ├── whm.svg                        # node icon
│   └── descriptions/                  # one file per resource (UI field definitions)
│       ├── AccountDescription.ts      ├── CpanelEmailDescription.ts
│       ├── ApiTokenDescription.ts     ├── CpanelFtpDescription.ts
│       ├── BackupDescription.ts       ├── CpanelFunctionDescription.ts
│       ├── CpanelDatabaseDescription.ts ├── CustomDescription.ts
│       ├── CpanelDomainDescription.ts ├── DnsDescription.ts
│       ├── DomainDescription.ts       ├── PackageDescription.ts
│       ├── ResellerDescription.ts     ├── ServerDescription.ts
│       ├── ServiceDescription.ts      ├── SslDescription.ts
│       ├── SharedFields.ts            # Custom Parameters, pagination, List Options, cPanel user, Options
│       └── index.ts
└── bridge/
    ├── n8n-whm-hook-bridge.pl         # Standardized Hooks script (runs on the WHM server)
    ├── n8n-whm-hooks.sh               # installer / manage_hooks wrapper
    └── n8n-whm-hook-bridge.conf.example
```

### 3.1 Request flow

```
n8n item
   │  resource + operation + fields
   ▼
Whm.node.execute()
   │  looks up OPERATIONS[resource][operation]  (operations.ts)
   │  copies declared fields/collections, runs the spec's build() hook,
   │  merges Custom Parameters, adds chunk/filter/sort for lists
   ▼
whmApiRequest() / cpanelApiRequest()        (GenericFunctions.ts)
   │  encodes application/x-www-form-urlencoded (1/0 booleans, repeated keys)
   ▼
credential.authenticate()                   (WhmApi.credentials.ts)
   │  adds Authorization: whm user:token  (or Basic)
   ▼
HTTP POST  →  https://host:2087/json-api/<function>   (or /json-api/cpanel)
   │
   ▼
envelope check → NodeOperationError on result=0 / status=0 / event.result=0
   │
   ▼
extractData() → data | result.data | cpanelresult.data
   │  lists: toRecordList() → one n8n item per record  (Options → Raw Response bypasses this)
   ▼
n8n output items
```

### 3.2 The operation registry

`operations.ts` is the single source of truth for what each operation calls:

```ts
suspend:  { fn: 'suspendacct', fields: ['user', 'reason', 'disallow'] },
getAll:   { fn: 'listaccts', collections: ['filters'], list: true, dataKey: 'acct' },
create:   uapi('Email', 'add_pop', { fields: ['email', 'password'],
                                     collections: ['additionalFields'], build: splitEmail }),
```

| Key | Meaning |
|-----|---------|
| `kind` | `whm` (default), `uapi` or `api2` |
| `fn` / `module` | API function (and module for UAPI / API 2) |
| `fields` | top-level node parameters copied 1:1 (node param name **is** the API param name) |
| `collections` | collection parameters flattened 1:1 |
| `list` | enables Return All / Limit, filter/sort, and one-item-per-record output |
| `dataKey` / `pick` | where the records live inside `data` |
| `build(params, ctx)` | last-chance hook: derive, rename or validate parameters (e.g. reseller termination confirmation, `users_json`, splitting `user@domain`) |

Adding an operation is therefore: one option in the resource's *Operation* list, the
fields it needs in the description file, and one line in `OPERATIONS`.

### 3.3 Value encoding

| n8n value | Sent as |
|-----------|---------|
| `true` / `false` | `1` / `0` |
| `''`, `null`, `undefined` | dropped (never overwrites existing data) |
| `0` | `0` (meaningful in WHM: unlimited quota / bandwidth) |
| array | repeated key (`acl=a&acl=b`) |
| object | JSON string (e.g. `users_json`) |

Keys `__proto__`, `constructor` and `prototype` are always discarded from user-supplied
objects (Custom Parameters, JSON parameters) to prevent prototype pollution.

---

## 4. Resources and operations

| Resource | Operation | API call |
|----------|-----------|----------|
| Account | Create | `createacct` |
| | Get | `accountsummary` (by user or domain) |
| | Get Many | `listaccts` (+ search/searchtype, filter, sort, chunk) |
| | Get Suspended | `listsuspended` |
| | Modify | `modifyacct` |
| | Suspend / Unsuspend / Terminate | `suspendacct` / `unsuspendacct` / `removeacct` |
| | Change Package / Password / Primary IP | `changepackage` / `passwd` / `setsiteip` |
| | Set Bandwidth Limit / Disk Quota | `limitbw` / `editquota` |
| | Get Bandwidth Usage / Disk Usage | `showbw` / `get_disk_usage` |
| | Create Login Session | `create_user_session` (SSO URL for cPanel / Webmail / WHM) |
| | Force Password Change | `forcepasswordchange` (`users_json`) |
| Package | Create / Update / Delete / Get / Get Many | `addpkg` / `editpkg` / `killpkg` / `getpkginfo` / `listpkgs` |
| | Get Feature Lists / Get Feature List | `getfeaturelist` / `get_featurelist_data` |
| Domain | Get Many / Get Owner / Get User Data / Resolve | `get_domain_info` / `getdomainowner` / `domainuserdata` / `resolvedomainname` |
| | Park / Unpark | `park` / `unpark` |
| DNS Zone | Get Many / Create / Delete / Get / Reset Zone | `listzones` / `adddns` / `killdns` / `dumpzone` / `resetzone` |
| | Add / Edit / Get / Delete Record | `addzonerecord` / `editzonerecord` / `getzonerecord` / `removezonerecord` |
| | Get MX / Save MX / Lookup NS IP | `listmxs` / `savemxs` / `lookupnsip` |
| Reseller | Get Many / Grant / Revoke | `listresellers` / `setupreseller` / `unsetupreseller` |
| | Get Stats / Account Counts / IPs | `resellerstats` / `acctcounts` / `getresellerips` |
| | Set IPs / Main IP / Nameservers / Limits / Package Limit / ACLs | `setresellerips` / `setresellermainip` / `setresellernameservers` / `setresellerlimits` / `setresellerpackagelimit` / `setacls` |
| | Get ACL Lists | `listacls` |
| | Suspend / Unsuspend / Terminate | `suspendreseller` / `unsuspendreseller` / `terminatereseller` (requires explicit confirmation) |
| Server | Get Version / Hostname / Load / Disk Usage / Languages / Applications | `version` / `gethostname` / `systemloadavg` / `getdiskusage` / `getlanglist` / `applist` |
| | Get / Add / Delete IP Addresses | `listips` / `addips` / `delip` |
| | Get / Set Tweak Setting, Set Hostname, Reboot | `get_tweaksetting` / `set_tweaksetting` / `sethostname` / `reboot` |
| Service | Get Status / Restart / Configure | `servicestatus` / `restartservice` / `configureservice` |
| SSL | Get Many / Install / Delete / Info / Vhost Components / List Certificates / Generate | `fetch_ssl_vhosts` / `installssl` / `delete_ssl_vhost` / `fetchsslinfo` / `fetch_vhost_ssl_components` / `listcrts` / `generatessl` |
| | AutoSSL user / all / providers / set provider | `start_autossl_check_for_one_user` / `start_autossl_check_for_all_users` / `get_autossl_providers` / `set_autossl_provider` |
| Backup | Get / Set Config, Dates, Users, Sets | `backup_config_get` / `backup_config_set` / `backup_date_list` / `backup_user_list` / `backup_set_list` |
| | Restore Account / From Archive | `restoreaccount` / `restorepkg` |
| | Toggle User, Skip All, Skip-All Status | `toggle_user_backup_state` / `backup_skip_users_all` / `backup_skip_users_all_status` |
| API Token | Get Many / Create / Update / Revoke | `api_token_list` / `api_token_create` / `api_token_update` / `api_token_revoke` |
| cPanel Email | Get Many / Create / Delete / Change Password | UAPI `Email::list_pops_with_disk` / `add_pop` / `delete_pop` / `passwd_pop` |
| | Get / Set Quota, Suspend / Unsuspend Login | `get_pop_quota` / `edit_pop_quota` / `suspend_login` / `unsuspend_login` |
| | Forwarders, Mail Domains | `list_forwarders` / `add_forwarder` / `delete_forwarder` / `list_mail_domains` |
| cPanel Database | databases, users, privileges, hosts | UAPI `Mysql::list_databases` / `create_database` / `delete_database` / `rename_database` / `list_users` / `create_user` / `delete_user` / `set_password` / `set_privileges_on_database` / `get_privileges_on_database` / `add_host` / `delete_host` |
| cPanel Domain | Get Many / Get Domain Data | UAPI `DomainInfo::list_domains` / `domains_data` |
| | Addon / Subdomain / Alias add & delete | API 2 `AddonDomain::addaddondomain` / `deladdondomain`, `SubDomain::addsubdomain` / `delsubdomain`, `Park::park` / `unpark` |
| cPanel FTP | Get Many / Create / Delete / Change Password / Set Quota / Set Home Directory | UAPI `Ftp::list_ftp_with_disk` / `add_ftp` / `delete_ftp` / `passwd` / `set_quota` / `set_homedir` |
| cPanel Function | Execute UAPI / API 2 function | any `module::function` as a user |
| Custom WHM Call | Execute WHM API 1 function | any function |

---

## 5. WHM Trigger and the hook bridge

### 5.1 How cPanel hooks work

cPanel & WHM's *Standardized Hooks* system runs registered scripts before (`pre`) or
after (`post`) an action. A script hook receives one JSON document on STDIN:

```json
{ "context": { ... },
  "data":    { "user": "examplecom", "domain": "example.com", "plan": "starter", "pass": "…" },
  "hook":    { "category": "Whostmgr", "event": "Accounts::Create", "stage": "post", ... } }
```

and reports back with a single line on STDOUT: `1 <message>` for success. A hook
that fails or times out in a *blocking* pre stage can stop the WHM action, so the bridge
is deliberately non-blocking: it uses a short timeout and **always** prints a success line.

### 5.2 The bridge script

`bridge/n8n-whm-hook-bridge.pl` (runs with cPanel's bundled Perl at
`/usr/local/cpanel/3rdparty/bin/perl`, core modules only):

1. Reads STDIN and decodes the JSON.
2. Redacts every key in the configurable `redact` list (defaults cover `pass`, `password`,
   `passwd`, `db_pass`, `key`, …) — recursively, in `data` and `context`.
3. Builds the outbound event:
   ```json
   { "event": "Whostmgr::Accounts::Create", "category": "Whostmgr", "name": "Accounts::Create",
     "stage": "post", "hook": {…}, "context": {…}, "data": {…},
     "hostname": "server.example.com", "timestamp": "2026-09-25T12:00:00+0000" }
   ```
4. Signs the canonical JSON body with **HMAC-SHA256** using the shared secret and sends
   `X-WHM-Signature: sha256=<hex>` (plus `X-WHM-Event`).
5. POSTs with `HTTP::Tiny` (falls back to `curl` if the Perl lacks SSL support),
   honouring `timeout` and `insecure`.
6. Logs failures to the configured log file and prints `1 n8n bridge: …` regardless.

Configuration is read from `/etc/n8n-whm-hook-bridge.conf` (override with the
`N8N_WHM_BRIDGE_CONF` environment variable), which the installer creates with mode 600.

### 5.3 Registering events

`bridge/n8n-whm-hooks.sh` wraps `/usr/local/cpanel/bin/manage_hooks`:

```bash
./n8n-whm-hooks.sh install --url https://n8n.example.com/webhook/<id>/whm --secret '<secret>'
./n8n-whm-hooks.sh add Cpanel UAPI::Email::passwd_pop post
./n8n-whm-hooks.sh remove Whostmgr Accounts::Modify post
./n8n-whm-hooks.sh list
./n8n-whm-hooks.sh uninstall
```

Under the hood each registration is:

```bash
/usr/local/cpanel/bin/manage_hooks add script /opt/n8n-whm-hook-bridge/n8n-whm-hook-bridge.pl \
    --manual --category Whostmgr --event Accounts::Create --stage post
```

`Cpanel`-category events additionally get `--escalateprivs 1` so the script runs as
root (it must read the root-only config file). Default events installed:

| Category | Events |
|----------|--------|
| Whostmgr | `Accounts::Create`, `Accounts::Remove`, `Accounts::Modify`, `Accounts::change_package`, `Accounts::suspendacct`, `Accounts::unsuspendacct`, `Domain::park`, `Domain::unpark` |
| Passwd | `ChangePasswd` |
| Cpanel | `UAPI::Email::add_pop`, `UAPI::Email::delete_pop`, `Api2::AddonDomain::addaddondomain`, `Api2::AddonDomain::deladdondomain`, `Api2::SubDomain::addsubdomain`, `Api2::SubDomain::delsubdomain`, `UAPI::Mysql::create_database`, `UAPI::Ftp::add_ftp` |

Any other event from cPanel's *Guide to Standardized Hooks* can be added; put its
`Category::Event` name into the node's **Custom Events** field.

### 5.4 The trigger node

| Setting | Behaviour |
|---------|-----------|
| Events / Custom Events | Accept only these `Category::Event` names (`*` = all). Others are acknowledged with `{ received: true, ignored: … }` and do not start the workflow. |
| Stage | `any`, `pre` or `post` |
| Shared Secret | If set, the request must carry a valid `X-WHM-Signature` (HMAC-SHA256 over the raw body). A plain `X-WHM-Secret` header is accepted as a fallback for hand-rolled senders. Comparison is constant-time. Missing / wrong → HTTP 401. |

Output is the bridge's JSON event, one item per hook invocation.

---

## 6. Error handling

| Situation | Result |
|-----------|--------|
| HTTP 401 / 403 | `NodeApiError` with a hint to check the token / ACLs |
| Connection / TLS failure | `NodeApiError` with a hint to check host, port, SSL |
| `metadata.result = 0` | `NodeOperationError`: `WHM API error on "<fn>": <reason>` |
| UAPI `status = 0` | `NodeOperationError` with the joined `errors` array |
| API 2 `event.result = 0` / `error` / `data[0].result = 0` | `NodeOperationError` with the reason |
| Non-JSON body | `NodeOperationError` (usually a login page → wrong port / credentials) |

Credential-bearing keys (`authorization`, `password`, `token`, `key`, `crt`, …) are
redacted from any error object before it is thrown. *Continue On Fail* is honoured:
the failing item becomes `{ error: "<message>" }`.

---

## 7. Security considerations

- **Least privilege.** Generate the token with only the ACLs the workflow needs; use a
  reseller token when the workflow only touches that reseller's accounts.
- **Destructive operations** (terminate account, terminate reseller, delete zone, delete
  database, reboot, …) are plain operations — protect the workflow itself. Reseller
  termination additionally requires the explicit confirmation switch.
- **Trigger authentication.** Always set a Shared Secret. Rotate it by updating both
  the node and `/etc/n8n-whm-hook-bridge.conf`.
- **PII / secrets in hook payloads.** Account creation and password hooks include
  plaintext passwords; the bridge redacts them by default. Extend `redact` for custom
  events. Hook payloads also carry contact emails and domains — send them over HTTPS.
- **Self-signed WHM certificates.** Prefer installing a real certificate on the WHM
  hostname (AutoSSL does this for free) over enabling *Ignore SSL Issues*.

---

## 8. Build, lint, test

```bash
npm install
npm run build        # tsc → dist/, gulp copies whm.svg
npm run lint         # eslint-plugin-n8n-nodes-base (community rules)
npm run lintfix
npm run prepublishOnly   # build + stricter prepublish lint
```

Requirements: Node ≥ 18.10, n8n ≥ 1.x (`n8n-workflow` is a peer dependency).

There is no live WHM server in the development environment; the package was verified
with an offline harness that loads the compiled node, checks every operation against
the registry (140 operations across 16 resources), exercises the request encoding
against a fake WHM, and runs the real Perl bridge against a local HTTP server to
confirm the trigger accepts its signature and that passwords are redacted.

---

## 9. Sources

- cPanel & WHM developer documentation — *WHM API 1*, *UAPI*, *cPanel API 2*,
  *Guide to API Authentication*, *Guide to Standardized Hooks*:
  https://api.docs.cpanel.net/
- cPanel's official `@cpanel/api` TypeScript client (wire-format reference for
  `api.filter.*`, `api.sort.*`, `api.chunk.*` and the `whm user:token` header):
  https://www.npmjs.com/package/@cpanel/api
- n8n community node guidelines: https://docs.n8n.io/integrations/creating-nodes/
