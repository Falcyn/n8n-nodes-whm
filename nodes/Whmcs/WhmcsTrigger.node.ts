import type {
	IDataObject,
	IHookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';
import { createHash, timingSafeEqual } from 'node:crypto';

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

/**
 * WHMCS Trigger.
 *
 * WHMCS does not expose outbound webhooks natively — instead it fires internal
 * PHP "hooks" when events occur (e.g. AfterModuleCreate, InvoicePaid,
 * TicketOpen). This node exposes an n8n webhook URL; the companion PHP hook file
 * shipped with this package (whmcs-hook-bridge.php) is dropped into
 * /includes/hooks/ and forwards selected events to that URL as JSON.
 *
 * The node validates an optional shared secret so only your WHMCS install can
 * trigger the workflow, and can filter by event name.
 */
export class WhmcsTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'WHMCS Trigger',
		name: 'whmcsTrigger',
		icon: 'file:whmcs.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["events"].join(", ")}}',
		description: 'Starts a workflow when WHMCS fires a hook event (via the PHP hook bridge)',
		defaults: { name: 'WHMCS Trigger' },
		inputs: [],
		outputs: ['main'],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'whmcs',
			},
		],
		properties: [
			{
				displayName:
					'Install the bundled <code>whmcs-hook-bridge.php</code> file into your WHMCS <code>/includes/hooks/</code> directory and set its <code>$n8nWebhookUrl</code> to the Production URL shown below.',
				name: 'setupNotice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				description: 'WHMCS hook point(s) that should trigger this workflow. Must match the events the PHP bridge is configured to forward.',
				options: [
					{ name: 'After Module Create', value: 'AfterModuleCreate' },
					{ name: 'After Module Suspend', value: 'AfterModuleSuspend' },
					{ name: 'After Module Terminate', value: 'AfterModuleTerminate' },
					{ name: 'Any Event', value: '*' },
					{ name: 'Client Add', value: 'ClientAdd' },
					{ name: 'Client Close', value: 'ClientClose' },
					{ name: 'Invoice Created', value: 'InvoiceCreated' },
					{ name: 'Invoice Paid', value: 'InvoicePaid' },
					{ name: 'Order Accepted', value: 'AcceptOrder' },
					{ name: 'Order Pending', value: 'OrderPaid' },
					{ name: 'Ticket Open', value: 'TicketOpen' },
					{ name: 'Ticket Reply', value: 'TicketUserReply' },
				],
				default: ['*'],
			},
			{
				displayName: 'Shared Secret',
				name: 'sharedSecret',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				description:
					'Strongly recommended. If set, the PHP bridge must send the same value in the X-WHMCS-Secret header; requests with a missing or wrong secret are rejected with 401. If left empty the webhook is unauthenticated — anyone who learns the URL can inject events — so only leave it blank when the endpoint is protected by other means.',
			},
		],
	};

	// No external service to subscribe to — the PHP bridge handles delivery, so
	// the lifecycle methods are no-ops that simply report a configured webhook.
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

		// 1. Validate the shared secret if one is configured.
		const sharedSecret = this.getNodeParameter('sharedSecret', '') as string;
		if (sharedSecret) {
			const provided = (headers['x-whmcs-secret'] as string) ?? '';
			if (!constantTimeEquals(provided, sharedSecret)) {
				const res = this.getResponseObject();
				res.status(401).json({ message: 'Invalid WHMCS shared secret' });
				return { noWebhookResponse: true };
			}
		}

		// 2. Filter by event name.
		const events = this.getNodeParameter('events', []) as string[];
		const incomingEvent = (body.event as string) ?? '';
		if (!events.includes('*') && incomingEvent && !events.includes(incomingEvent)) {
			// Acknowledge but don't start the workflow for unwanted events.
			return { webhookResponse: JSON.stringify({ received: true, ignored: incomingEvent }) };
		}

		return {
			workflowData: [this.helpers.returnJsonArray([body])],
		};
	}
}
