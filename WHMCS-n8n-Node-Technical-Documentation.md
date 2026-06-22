# WHMCS n8n Community Node — Technical Documentation

**Package:** `n8n-nodes-whmcs`
**Version:** 1.0.0
**Author:** Anthony Tuberville
**Last updated:** 22 June 2026

---

## 1. Overview

`n8n-nodes-whmcs` is an n8n community node package that exposes the
[WHMCS](https://www.whmcs.com/) billing and automation platform as native nodes
inside n8n workflows. It lets you read and write WHMCS data — clients, orders,
invoices, services, support tickets and domains — without writing a single HTTP
Request node, and lets WHMCS events kick off n8n workflows.

The package contains two nodes:

| Node | Type | Purpose |
|------|------|---------|
| **WHMCS** | Action | Calls the WHMCS External API. Eight resources plus a generic *Custom API Call*. |
| **WHMCS Trigger** | Trigger (webhook) | Starts a workflow when WHMCS fires a hook event, delivered through a bundled PHP bridge. |

### 1.1 Why a dedicated node

The WHMCS API has three characteristics that make a hand-rolled HTTP Request node
awkward and error-prone, and which this package handles for you:

1. **Single-endpoint, action-dispatched design.** Every call is an HTTP `POST` to
   one URL (`/includes/api.php`) with an `action` field naming the operation.
   There are no REST paths or verbs to model.
2. **Form-encoded bodies with injected credentials.** WHMCS expects
   `application/x-www-form-urlencoded` payloads and authenticates on the
   `identifier`/`secret` fields inside the body — not on an `Authorization` header.
3. **A success/error envelope rather than HTTP status codes.** A failed call often
   returns HTTP `200` with `{ "result": "error", "message": "..." }`. The node
   converts that into a real n8n error so failures stop the workflow as expected.

---

## 2. WHMCS API fundamentals

This section summarises the parts of the official WHMCS API contract the node is
built around. Sources are listed at the end of the document.

### 2.1 Endpoints

| Mode | When to use | Endpoint |
|------|-------------|----------|
| **External API** | The caller (n8n) is hosted separately from WHMCS. **This is what the node uses.** | `https://your-whmcs/includes/api.php` |
| Internal API | Calls made from inside WHMCS (modules, hooks). | `localAPI()` PHP function |

The node always uses the External API and accepts `POST` requests only.

### 2.2 Authentication

WHMCS supports three authentication styles. The node implements the modern,
recommended one and remains compatible with the others.

| Method | Mechanism | Status |
|--------|-----------|--------|
| **API Credentials** *(used by this node)* | `identifier` + `secret` provisioned under *Configuration → System Settings → Manage API Credentials*. | **Recommended (WHMCS 7.2+)** |
| Admin login | `username` + MD5-hashed `password`. | Legacy, may be deprecated |
| Identifier/secret in username/password fields | A valid identifier/secret may also be passed in the `username`/`password` fields. | Backwards-compatibility |

The admin role tied to the credential **must** have the **API Access** permission,
otherwise every call is rejected regardless of a correct identifier/secret.

### 2.3 Access control

By default the API is **IP-restricted**. Two ways to authorise n8n's host:

1. **IP allow-list** — *Setup → General Settings → Security* → add n8n's outbound IP.
2. **Access key** — define `$api_access_key` in WHMCS `configuration.php` and pass it
   as `accesskey` on every request to bypass IP restrictions. The node exposes this
   as the optional **Access Key** credential field. Permitted characters:
   `! @ # $ % . ( ) * [ ] - _` plus letters and numbers.

### 2.4 Response types

WHMCS can return JSON, XML or NVP (deprecated). The node always sends
`responsetype=json` and parses the JSON envelope.

A successful envelope looks like:

```json
{
  "result": "success",
  "totalresults": 2,
  "clients": { "client": [ { "id": 1, "firstname": "Ada" } ] }
}
```

A failed envelope (note: still HTTP 200):

```json
{ "result": "error", "message": "Invalid IP 203.0.113.10" }
```

---

## 3. Architecture & package layout

```
n8n-nodes-whmcs/
├── package.json                       # n8n manifest (credentials + nodes paths)
├── tsconfig.json · gulpfile.js        # build: tsc + icon copy
├── .eslintrc.js                       # eslint-plugin-n8n-nodes-base rules
├── credentials/
│   └── WhmcsApi.credentials.ts        # credential schema + auth injection + test
├── nodes/Whmcs/
│   ├── Whmcs.node.ts                  # action node: resources, routing, execute()
│   ├── WhmcsTrigger.node.ts           # webhook trigger node
│   ├── GenericFunctions.ts            # request helper, auth, error & data handling
│   ├── whmcs.svg                      # node icon
│   └── descriptions/                  # one file per resource (UI field definitions)
│       ├── ClientDescription.ts
│       ├── OrderDescription.ts
│       ├── InvoiceDescription.ts
│       ├── ProductDescription.ts
│       ├── TicketDescription.ts
│       ├── DomainDescription.ts
│       ├── SystemDescription.ts
│       ├── CustomDescription.ts
│       ├── SharedFields.ts            # reusable Custom Parameters + pagination
│       └── index.ts
└── bridge/
    └── whmcs-hook-bridge.php          # drop into WHMCS includes/hooks/
```

### 3.1 Request flow

```
n8n item
   │  resource + operation + fields
   ▼
Whmcs.node.execute()
   │  maps resource/operation → WHMCS action (ACTION_MAP)
   │  flattens collections, drops empty values, merges Custom Parameters
   ▼
whmcsApiRequest(action, body)            (GenericFunctions.ts)
   │  builds form body + responsetype=json
   ▼
credential.authenticate()                (WhmcsApi.credentials.ts)
   │  injects identifier / secret / accesskey, sets Content-Type
   ▼
HTTP POST  →  /includes/api.php
   │
   ▼
parse JSON → if result=error → NodeOperationError, else return to workflow
```

---

## 4. Authentication implementation

The credential class injects authentication into **every** outbound request via its
`authenticate()` method, so no operation has to think about credentials:

```ts
// credentials/WhmcsApi.credentials.ts (excerpt)
async authenticate(credentials, requestOptions) {
  const body = requestOptions.body ?? {};
  body.identifier = credentials.identifier;
  body.secret     = credentials.secret;
  if (credentials.accessKey) body.accesskey = credentials.accessKey;
  if (!body.responsetype)    body.responsetype = 'json';

  requestOptions.body = body;
  requestOptions.headers = {
    ...requestOptions.headers,
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  return requestOptions;
}
```

The credential **Test** request calls `WhmcsDetails` — a read-only action that
returns the WHMCS version — and treats `result: error` as a failed test with a
helpful message pointing at the three usual causes (wrong secret, missing API
Access role permission, IP/access-key restriction).

### 4.1 Credential fields

| Field | Required | Description |
|-------|----------|-------------|
| WHMCS Base URL | ✓ | Root URL, no trailing slash. |
| API Path | ✓ | Defaults to `/includes/api.php`. |
| API Identifier | ✓ | From *Manage API Credentials*. |
| API Secret | ✓ | Paired secret (stored encrypted by n8n). |
| Access Key | – | Matches `$api_access_key`; bypasses IP allow-list. |
| Ignore SSL Issues | – | Skips TLS validation for trusted internal hosts. |

---

## 5. Data-handling specifics

WHMCS has several quirks that the node normalises so workflows behave predictably.

### 5.1 Empty-value stripping
On update operations, sending an empty string can overwrite existing WHMCS data.
`whmcsApiRequest()` therefore **drops `undefined`, `null` and `""` values** before
sending, and the action node treats `0` as "not set" for ID fields. Only fields you
actually populate are transmitted.

### 5.2 The success/error envelope
A `result: "error"` response is raised as a `NodeOperationError` that names the
action and includes the WHMCS message, so a failed call stops the workflow (or is
captured when *Continue On Fail* is enabled) instead of silently passing a 200.

### 5.3 Array-style and serialized parameters
Some WHMCS actions accept array-style fields (`customfields`, `configoptions`,
`itemdescription1`/`itemamount1`, `ns1`–`ns5`, …). These are exposed either as
discrete fields (e.g. nameservers, invoice line items) or can be supplied verbatim
through **Custom Parameters**. WHMCS array fields like `customfields` expect a
base64-encoded serialized PHP array — pass the pre-encoded string through Custom
Parameters when you need them.

### 5.4 Pagination
List operations (*Get Many*) map n8n's **Return All / Limit** to WHMCS
`limitstart`/`limitnum`. With *Return All* off, **Limit** sets `limitnum`; with it
on, a high `limitnum` is used. WHMCS `totalresults` is preserved in the output for
your own paging logic.

### 5.5 JSON normalisation
If a response arrives as a JSON string it is parsed to an object; a non-JSON body
raises a clear error telling you to confirm `responsetype=json` is permitted.

---

## 6. Supported endpoints

Each row is one node operation. The **WHMCS Action** column is the exact API action
invoked. Beyond these, the **Custom API Call** resource can invoke *any* documented
WHMCS action.

### 6.1 Client
| Operation | WHMCS Action | Key parameters |
|-----------|--------------|----------------|
| Create | `AddClient` | firstname, lastname, email, password2, +address/currency/group |
| Get | `GetClientsDetails` | clientid *or* email |
| Get Many | `GetClients` | search, status, sorting, limit |
| Update | `UpdateClient` | clientid + any client field |
| Delete | `DeleteClient` | clientid |
| Close | `CloseClient` | clientid |
| Get Client's Products | `GetClientsProducts` | clientid |
| Get Client's Domains | `GetClientsDomains` | clientid |

### 6.2 Order
| Operation | WHMCS Action | Key parameters |
|-----------|--------------|----------------|
| Create | `AddOrder` | clientid, paymentmethod, pid/domain/billingcycle |
| Get Many | `GetOrders` | id, userid, status, limit |
| Accept | `AcceptOrder` | orderid, registrar, autosetup, sendemail |
| Set Pending | `PendingOrder` | orderid |
| Cancel | `CancelOrder` | orderid |
| Delete | `DeleteOrder` | orderid |
| Fraud | `FraudOrder` | orderid |

### 6.3 Invoice
| Operation | WHMCS Action | Key parameters |
|-----------|--------------|----------------|
| Create | `CreateInvoice` | userid, status, line items, dates |
| Get | `GetInvoice` | invoiceid |
| Get Many | `GetInvoices` | userid, status, limit |
| Update | `UpdateInvoice` | invoiceid, status, duedate, notes |
| Add Payment | `AddInvoicePayment` | invoiceid, transid, gateway, amount |
| Apply Credit | `ApplyCredit` | invoiceid, amount |
| Generate Due Invoices | `GenInvoices` | — |

### 6.4 Product / Service
| Operation | WHMCS Action | Key parameters |
|-----------|--------------|----------------|
| Get Catalogue | `GetProducts` | gid, pid, module |
| Get Client Services | `GetClientsProducts` | clientid, serviceid, domain |
| Update Service | `UpdateClientProduct` | serviceid + service fields |
| Upgrade | `UpgradeProduct` | serviceid, type, newproductid |
| Suspend | `ModuleSuspend` | serviceid, suspendreason |
| Unsuspend | `ModuleUnsuspend` | serviceid |
| Terminate | `ModuleTerminate` | serviceid |

### 6.5 Ticket
| Operation | WHMCS Action | Key parameters |
|-----------|--------------|----------------|
| Create | `OpenTicket` | deptid, subject, message, clientid/name/email |
| Get | `GetTicket` | ticketid |
| Get Many | `GetTickets` | deptid, clientid, status, subject |
| Reply | `AddTicketReply` | ticketid, message, adminusername/clientid |
| Update | `UpdateTicket` | ticketid, subject, priority, status, deptid |
| Delete | `DeleteTicket` | ticketid |
| Get Departments | `GetSupportDepartments` | — |

### 6.6 Domain
| Operation | WHMCS Action | Key parameters |
|-----------|--------------|----------------|
| Get Many | `GetClientsDomains` | clientid, domainid |
| Register | `DomainRegister` | domainid, regperiod |
| Renew | `DomainRenew` | domainid, regperiod |
| Transfer | `DomainTransfer` | domainid, eppcode |
| Get Nameservers | `DomainGetNameservers` | domainid |
| Update Nameservers | `DomainUpdateNameservers` | domainid, ns1–ns5 |
| Toggle ID Protection | `DomainToggleIdProtect` | domainid, idprotect |
| Update | `UpdateClientDomain` | domainid + domain fields |

### 6.7 System
| Operation | WHMCS Action | Key parameters |
|-----------|--------------|----------------|
| Get Stats | `GetStats` | — |
| Get WHMCS Details | `WhmcsDetails` | — |
| Send Email | `SendEmail` | messagename / custom subject+message, id |
| Get Activity Log | `GetActivityLog` | userid, date, limitnum |
| Get Currencies | `GetCurrencies` | — |
| Get Payment Methods | `GetPaymentMethods` | — |

### 6.8 Custom API Call
| Operation | WHMCS Action | Key parameters |
|-----------|--------------|----------------|
| Execute API Action | *(user-specified)* | `action` + free-form JSON `parameters` |

---

## 7. Node configuration samples

### 7.1 Create a client
```
Resource:  Client
Operation: Create
First Name: Ada
Last Name:  Lovelace
Email:      ada@example.com
Password:   ••••••••
Additional Fields:
  Country: GB
  Skip Welcome Email: true
```
Equivalent WHMCS request body:
```
action=AddClient&firstname=Ada&lastname=Lovelace&email=ada@example.com
&password2=...&country=GB&noemail=1&responsetype=json
```

### 7.2 Record a manual payment against an invoice
```
Resource:  Invoice
Operation: Add Payment
Invoice ID: 1043
Transaction ID: stripe_ch_3Q…
Payment Fields:
  Gateway: stripe
  Amount:  49.00
```

### 7.3 Suspend a service for non-payment
```
Resource:  Product / Service
Operation: Suspend
Service ID: 880
Suspension Reason: Overdue invoice 1043
```

### 7.4 Call an action the node doesn't model directly
```
Resource:  Custom API Call
Operation: Execute API Action
Action:    GetTicketCounts
Parameters: { "ignoring": "Closed" }
```

---

## 8. Trigger node & PHP hook bridge

WHMCS does not emit outbound webhooks natively. Instead it fires internal PHP
**hooks** for events such as `InvoicePaid`, `AcceptOrder` and `TicketOpen`. The
package bridges this gap:

1. The **WHMCS Trigger** node provides an n8n webhook URL.
2. The bundled `bridge/whmcs-hook-bridge.php` registers WHMCS hooks and forwards
   each event to that URL as JSON.

### 8.1 Payload shape
```json
{
  "event": "InvoicePaid",
  "timestamp": "2026-06-22T14:05:00+00:00",
  "data": { "invoiceid": 1043, "userid": 42, ... }
}
```

### 8.2 Security
Set a **Shared Secret** in the node and the same value in the PHP bridge. The bridge
sends it as the `X-WHMCS-Secret` header; the node rejects mismatches with HTTP 401.
The bridge fires with a short cURL timeout and swallows errors, so a slow or down
n8n never blocks WHMCS request processing.

### 8.3 Event filtering
The node's **Events** field filters which hook points start the workflow. `Any Event`
(`*`) lets everything through. Configure the bridge's `$forwardEvents` array to match.

### 8.4 Installation
1. Copy `whmcs-hook-bridge.php` to `<whmcs>/includes/hooks/`.
2. Set `$n8nWebhookUrl` to the node's **Production URL**.
3. Set `$sharedSecret` and `$forwardEvents`.

---

## 9. Example workflows

### 9.1 Dunning: notify on overdue invoices each morning
```
Schedule Trigger (06:00 daily)
   → WHMCS · Invoice · Get Many  (Status = Overdue, Return All)
   → Filter (balance > 0)
   → Slack / Email per item
```

### 9.2 Auto-onboard paid orders
```
WHMCS Trigger (Event: Invoice Paid)
   → WHMCS · Client · Get  (clientid from payload)
   → HTTP/Provisioning step
   → WHMCS · Ticket · Create  (welcome / onboarding ticket)
```

### 9.3 Suspend overdue services
```
WHMCS · Invoice · Get Many (Status = Overdue)
   → WHMCS · Client · Get Client's Products
   → WHMCS · Product/Service · Suspend (serviceid)
```

### 9.4 Sync new clients to a CRM
```
WHMCS Trigger (Event: Client Add)
   → CRM "Create Contact" node (HubSpot/Pipedrive/…)
```

---

## 10. Installation, build & publishing

### 10.1 Install in n8n
- **UI:** Settings → Community Nodes → Install → `n8n-nodes-whmcs`.
- **Self-hosted manual:** `npm install n8n-nodes-whmcs` inside your `N8N_CUSTOM_EXTENSIONS` / `~/.n8n/nodes` directory, then restart n8n.

### 10.2 Build from source
```bash
npm install
npm run build     # tsc → dist/, then gulp copies icons
npm run lint      # eslint-plugin-n8n-nodes-base (community ruleset)
```
> **Note:** building requires network access to the public npm registry for the
> dev dependencies (`typescript`, `n8n-workflow`, `eslint`,
> `eslint-plugin-n8n-nodes-base`, `gulp`). Run the build on a machine with registry
> access; the published package ships only the compiled `dist/` folder.

### 10.3 Publish
```bash
npm run prepublishOnly   # build + strict lint (verifies community package rules)
npm publish --access public
```
The package follows the n8n community conventions: the package name starts with
`n8n-nodes-`, includes the `n8n-community-node-package` keyword, and the `n8n` block
in `package.json` points at the compiled credential and node files.

---

## 11. Security best practices

- **Use API Credentials, never admin login.** Scope the credential's admin role to
  only the permissions your workflows need (principle of least privilege).
- **Prefer IP allow-listing** over the access key where your n8n host has a stable
  egress IP; use the access key only when it does not.
- **Always set a Trigger Shared Secret** so arbitrary internet callers cannot fire
  your workflows.
- **Keep SSL validation on.** Only enable *Ignore SSL Issues* for trusted internal
  hosts with self-signed certificates.
- **Rotate** the identifier/secret periodically via *Manage API Credentials*; n8n
  stores credentials encrypted at rest.

---

## 12. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `result: error – Invalid IP …` | n8n's IP isn't allow-listed | Add it under Setup → General Settings → Security, or set an Access Key |
| `Authentication Failed` | Wrong identifier/secret, or role lacks API Access | Re-check credentials and the admin role permission |
| `result: error – Invalid Permissions` | API role missing the specific action permission | Grant the action to the role |
| Empty `clients`/`tickets` arrays | Over-restrictive filters / pagination | Relax filters; enable Return All |
| Trigger never fires | Bridge URL wrong, secret mismatch, or event not forwarded | Verify Production URL, `$sharedSecret`, and `$forwardEvents` |
| `non-JSON response` error | Endpoint returning HTML (e.g. WAF/login page) | Confirm the API Path and that the IP/access key is authorised |

---

## 13. Extending the node

To add a new modelled operation:

1. Add the operation to the relevant `*Description.ts` (operation option + fields).
2. Add a `resource → operation → WHMCS action` entry to `ACTION_MAP` in
   `Whmcs.node.ts`.
3. If it introduces new simple field names, add them to `SIMPLE_FIELDS`; new
   collection names go in `FLATTEN_COLLECTIONS`.
4. `npm run build && npm run lint`.

Because the **Custom API Call** resource already reaches every WHMCS action, modelling
is only about giving an action a friendlier guided UI — never about capability.

---

## 14. Sources

- [WHMCS Developer Docs — Authentication](https://developers.whmcs.com/api/authentication/)
- [WHMCS Developer Docs — Access Control](https://developers.whmcs.com/api/access-control/)
- [WHMCS Developer Docs — Response Types](https://developers.whmcs.com/api/response-types/)
- [WHMCS Developer Docs — Getting Started](https://developers.whmcs.com/api/getting-started/)
- [WHMCS Developer Docs — API Index](https://developers.whmcs.com/api/api-index/)
- [WHMCS Docs — Manage API Credentials](https://docs.whmcs.com/API_Authentication_Credentials)
- [WHMCS Hook Reference](https://developers.whmcs.com/hooks-reference/)
- [n8n — Creating community nodes](https://docs.n8n.io/integrations/creating-nodes/)
