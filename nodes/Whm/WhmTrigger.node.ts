import type {
	IDataObject,
	IHookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Constant-time string comparison. Both inputs are SHA-256 hashed first so the
 * comparison runs on equal-length buffers (timingSafeEqual throws on length
 * mismatch) and the length of the real secret is never leaked through timing.
 */
function constantTimeEquals(a: string, b: string): boolean {
	const ha = createHash('sha256').update(a, 'utf8').digest();
	const hb = createHash('sha256').update(b, 'utf8').digest();
	return timingSafeEqual(ha, hb);
}

/** Hook events offered in the UI. Any other event can be typed into Custom Events. */
const HOOK_EVENTS = [
	{ name: 'Account » Created', value: 'Whostmgr::Accounts::Create' },
	{ name: 'Account » Modified', value: 'Whostmgr::Accounts::Modify' },
	{ name: 'Account » Package Changed', value: 'Whostmgr::Accounts::change_package' },
	{ name: 'Account » Password Changed', value: 'Passwd::ChangePasswd' },
	{ name: 'Account » Removed', value: 'Whostmgr::Accounts::Remove' },
	{ name: 'Account » Suspended', value: 'Whostmgr::Accounts::suspendacct' },
	{ name: 'Account » Unsuspended', value: 'Whostmgr::Accounts::unsuspendacct' },
	{ name: 'Any Event', value: '*' },
	{ name: 'Backup » Account Packaged', value: 'PkgAcct::Create' },
	{ name: 'Backup » Account Restored', value: 'PkgAcct::Restore' },
	{ name: 'cPanel » Addon Domain Added', value: 'Cpanel::Api2::AddonDomain::addaddondomain' },
	{ name: 'cPanel » Addon Domain Deleted', value: 'Cpanel::Api2::AddonDomain::deladdondomain' },
	{ name: 'cPanel » Alias (Parked) Added', value: 'Cpanel::Api2::Park::park' },
	{ name: 'cPanel » Alias (Parked) Deleted', value: 'Cpanel::Api2::Park::unpark' },
	{ name: 'cPanel » Database Created', value: 'Cpanel::UAPI::Mysql::create_database' },
	{ name: 'cPanel » Database Deleted', value: 'Cpanel::UAPI::Mysql::delete_database' },
	{ name: 'cPanel » Email Account Created', value: 'Cpanel::UAPI::Email::add_pop' },
	{ name: 'cPanel » Email Account Deleted', value: 'Cpanel::UAPI::Email::delete_pop' },
	{ name: 'cPanel » Email Password Changed', value: 'Cpanel::UAPI::Email::passwd_pop' },
	{ name: 'cPanel » FTP Account Created', value: 'Cpanel::UAPI::Ftp::add_ftp' },
	{ name: 'cPanel » FTP Account Deleted', value: 'Cpanel::UAPI::Ftp::delete_ftp' },
	{ name: 'cPanel » SSL Certificate Installed', value: 'Cpanel::UAPI::SSL::install_ssl' },
	{ name: 'cPanel » Subdomain Added', value: 'Cpanel::Api2::SubDomain::addsubdomain' },
	{ name: 'cPanel » Subdomain Deleted', value: 'Cpanel::Api2::SubDomain::delsubdomain' },
	{ name: 'Domain » Parked (WHM)', value: 'Whostmgr::Domain::park' },
	{ name: 'Domain » Unparked (WHM)', value: 'Whostmgr::Domain::unpark' },
	{ name: 'System » cPanel Updated', value: 'System::upcp' },
];

/**
 * WHM Trigger.
 *
 * cPanel & WHM has no outbound webhooks, but it does have *Standardized Hooks*:
 * the server runs a script at well-defined points (account created, suspended,
 * email account added, …) and hands it the event data as JSON on STDIN.
 *
 * This node exposes an n8n webhook URL. The bundled `n8n-whm-hook-bridge.pl`
 * script is registered with `manage_hooks` for the events you care about and
 * forwards each one to that URL as a JSON POST, signed with a shared secret.
 */
export class WhmTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'WHM Trigger',
		name: 'whmTrigger',
		icon: 'file:whm.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["events"].join(", ")}}',
		description: 'Starts a workflow when a cPanel & WHM hook fires (account created, suspended, email added, …) via the bundled hook bridge',
		defaults: { name: 'WHM Trigger' },
		inputs: [],
		outputs: ['main'],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'whm',
			},
		],
		properties: [
			{
				displayName:
					'Install the bundled hook bridge on the WHM server (the <code>bridge/</code> folder of this package, see its README) and point its <code>webhook_url</code> at the Production URL of this node. Register the events with <code>n8n-whm-hooks.sh</code>.',
				name: 'setupNotice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				description:
					'Hook events that should start this workflow. The bridge must also be registered for them on the server. Names are Category::Event as used by manage_hooks.',
				options: HOOK_EVENTS,
				default: ['*'],
			},
			{
				displayName: 'Custom Events',
				name: 'customEvents',
				type: 'string',
				default: '',
				placeholder: 'Whostmgr::Accounts::Create,Cpanel::UAPI::Email::add_pop',
				description:
					'Comma-separated list of additional Category::Event names to accept — any hookable event cPanel supports',
			},
			{
				displayName: 'Stage',
				name: 'stage',
				type: 'options',
				default: 'any',
				options: [
					{ name: 'Any', value: 'any' },
					{ name: 'Post (After the Action)', value: 'post' },
					{ name: 'Pre (Before the Action)', value: 'pre' },
				],
				description: 'Only start the workflow for hooks fired at this stage',
			},
			{
				displayName: 'Shared Secret',
				name: 'sharedSecret',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				description:
					'Strongly recommended. Must match the "secret" in the bridge configuration. The bridge signs every request (HMAC-SHA256 in X-WHM-Signature); requests with a missing or invalid signature are rejected with 401. If left empty the webhook is unauthenticated — anyone who learns the URL can inject events.',
			},
		],
	};

	// The bridge script delivers events; nothing to register with WHM from here.
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				return true;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		const headers = this.getHeaderData() as IDataObject;
		const body = (req.body ?? {}) as IDataObject;
		const res = this.getResponseObject();

		// 1. Authenticate the sender.
		const sharedSecret = this.getNodeParameter('sharedSecret', '') as string;
		if (sharedSecret) {
			const signature = String(headers['x-whm-signature'] ?? '');
			const plain = String(headers['x-whm-secret'] ?? '');
			let ok = false;

			if (signature) {
				const raw = (req as unknown as { rawBody?: Buffer }).rawBody;
				const payload = raw instanceof Buffer ? raw : Buffer.from(JSON.stringify(body), 'utf8');
				const expected = 'sha256=' + createHmac('sha256', sharedSecret).update(payload).digest('hex');
				ok = constantTimeEquals(signature.trim(), expected);
			} else if (plain) {
				ok = constantTimeEquals(plain, sharedSecret);
			}

			if (!ok) {
				res.status(401).json({ message: 'Invalid WHM hook signature' });
				return { noWebhookResponse: true };
			}
		}

		// 2. Filter by event and stage.
		const selected = this.getNodeParameter('events', []) as string[];
		const custom = (this.getNodeParameter('customEvents', '') as string)
			.split(',')
			.map((e) => e.trim())
			.filter(Boolean);
		const wanted = new Set([...selected, ...custom]);
		const incomingEvent = String(body.event ?? '');
		const incomingStage = String(body.stage ?? '');
		const stage = this.getNodeParameter('stage', 'any') as string;

		if (!wanted.has('*') && (!incomingEvent || !wanted.has(incomingEvent))) {
			return { webhookResponse: JSON.stringify({ received: true, ignored: incomingEvent || 'unknown-event' }) };
		}
		if (stage !== 'any' && incomingStage && incomingStage !== stage) {
			return { webhookResponse: JSON.stringify({ received: true, ignored: `${incomingEvent} (${incomingStage})` }) };
		}

		return {
			workflowData: [this.helpers.returnJsonArray([body])],
		};
	}
}
