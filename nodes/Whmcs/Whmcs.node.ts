import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { whmcsApiRequest, parseCustomParameters } from './GenericFunctions';
import {
	clientOperations,
	clientFields,
	orderOperations,
	orderFields,
	invoiceOperations,
	invoiceFields,
	productOperations,
	productFields,
	ticketOperations,
	ticketFields,
	domainOperations,
	domainFields,
	systemOperations,
	systemFields,
	customOperations,
	customFields,
} from './descriptions';

/**
 * Maps a resource + operation to the corresponding WHMCS API action name.
 * Operations not listed (e.g. Custom) are handled directly in execute().
 */
const ACTION_MAP: Record<string, Record<string, string>> = {
	client: {
		create: 'AddClient',
		get: 'GetClientsDetails',
		getAll: 'GetClients',
		update: 'UpdateClient',
		delete: 'DeleteClient',
		close: 'CloseClient',
		getProducts: 'GetClientsProducts',
		getDomains: 'GetClientsDomains',
	},
	order: {
		create: 'AddOrder',
		getAll: 'GetOrders',
		accept: 'AcceptOrder',
		pending: 'PendingOrder',
		cancel: 'CancelOrder',
		delete: 'DeleteOrder',
		fraud: 'FraudOrder',
	},
	invoice: {
		create: 'CreateInvoice',
		get: 'GetInvoice',
		getAll: 'GetInvoices',
		update: 'UpdateInvoice',
		addPayment: 'AddInvoicePayment',
		applyCredit: 'ApplyCredit',
		generate: 'GenInvoices',
	},
	product: {
		getCatalogue: 'GetProducts',
		getServices: 'GetClientsProducts',
		update: 'UpdateClientProduct',
		upgrade: 'UpgradeProduct',
		suspend: 'ModuleSuspend',
		unsuspend: 'ModuleUnsuspend',
		terminate: 'ModuleTerminate',
	},
	ticket: {
		create: 'OpenTicket',
		get: 'GetTicket',
		getAll: 'GetTickets',
		reply: 'AddTicketReply',
		update: 'UpdateTicket',
		delete: 'DeleteTicket',
		getDepartments: 'GetSupportDepartments',
	},
	domain: {
		getAll: 'GetClientsDomains',
		register: 'DomainRegister',
		renew: 'DomainRenew',
		transfer: 'DomainTransfer',
		getNameservers: 'DomainGetNameservers',
		updateNameservers: 'DomainUpdateNameservers',
		toggleIdProtect: 'DomainToggleIdProtect',
		update: 'UpdateClientDomain',
	},
	system: {
		getStats: 'GetStats',
		details: 'WhmcsDetails',
		sendEmail: 'SendEmail',
		getActivityLog: 'GetActivityLog',
		getCurrencies: 'GetCurrencies',
		getPaymentMethods: 'GetPaymentMethods',
	},
};

/** Collection param names that should be flattened straight into the request body. */
const FLATTEN_COLLECTIONS = [
	'additionalFields',
	'updateFields',
	'filters',
	'paymentFields',
	'replyOptions',
	'acceptOptions',
	'orderItems',
	'registerFields',
	'upgradeFields',
	'updateNameservers',
	'nameservers',
	'serviceFilters',
	'catalogueFilters',
	'logFilters',
	'emailFields',
];

export class Whmcs implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'WHMCS',
		name: 'whmcs',
		icon: 'file:whmcs.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with the WHMCS billing & automation API',
		defaults: { name: 'WHMCS' },
		inputs: ['main'],
		outputs: ['main'],
		credentials: [{ name: 'whmcsApi', required: true }],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Client', value: 'client' },
					{ name: 'Custom API Call', value: 'custom' },
					{ name: 'Domain', value: 'domain' },
					{ name: 'Invoice', value: 'invoice' },
					{ name: 'Order', value: 'order' },
					{ name: 'Product / Service', value: 'product' },
					{ name: 'System', value: 'system' },
					{ name: 'Ticket', value: 'ticket' },
				],
				default: 'client',
			},
			...clientOperations,
			...clientFields,
			...orderOperations,
			...orderFields,
			...invoiceOperations,
			...invoiceFields,
			...productOperations,
			...productFields,
			...ticketOperations,
			...ticketFields,
			...domainOperations,
			...domainFields,
			...systemOperations,
			...systemFields,
			...customOperations,
			...customFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				let action: string;
				const body: IDataObject = {};

				if (resource === 'custom') {
					action = this.getNodeParameter('action', i) as string;
					const rawParams = this.getNodeParameter('parameters', i, {}) as IDataObject | string;
					const parsed = typeof rawParams === 'string' ? JSON.parse(rawParams || '{}') : rawParams;
					Object.assign(body, parsed as IDataObject);
				} else {
					action = ACTION_MAP[resource]?.[operation];
					if (!action) {
						throw new NodeOperationError(this.getNode(), `Unsupported operation "${operation}" for resource "${resource}".`);
					}

					// Collect every simple parameter declared for this operation by walking
					// the node's known field names. Unknown / hidden params resolve to undefined
					// and are skipped.
					const SIMPLE_FIELDS = [
						'firstname', 'lastname', 'email', 'password2', 'clientid', 'userid',
						'orderid', 'paymentmethod', 'invoiceid', 'transid', 'amount',
						'serviceid', 'suspendreason', 'deptid', 'subject', 'message', 'ticketid',
						'domainid', 'regperiod', 'eppcode', 'idprotect', 'messagename',
					];
					for (const field of SIMPLE_FIELDS) {
						const value = this.getNodeParameter(field, i, undefined) as unknown;
						if (value !== undefined && value !== '' && value !== 0) {
							body[field] = value as IDataObject[string];
						} else if (value === 0 && ['clientid', 'invoiceid', 'orderid', 'ticketid', 'domainid', 'serviceid', 'userid', 'deptid'].includes(field)) {
							// Allow explicit non-zero IDs only; zero means "not set" for these.
							continue;
						}
					}

					// Flatten collection-style parameters into the body.
					for (const coll of FLATTEN_COLLECTIONS) {
						const value = this.getNodeParameter(coll, i, {}) as IDataObject;
						if (value && typeof value === 'object') {
							Object.assign(body, value);
						}
					}

					// Pagination → WHMCS limitnum / limitstart.
					const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
					if (operation === 'getAll') {
						if (!returnAll) {
							body.limitnum = this.getNodeParameter('limit', i, 25) as number;
						} else {
							body.limitnum = 1000;
						}
					}

					// Merge the free-form Custom Parameters collection.
					const custom = this.getNodeParameter('customParameters', i, {}) as IDataObject;
					Object.assign(body, parseCustomParameters(custom));
				}

				const response = await whmcsApiRequest.call(this, action, body);

				returnData.push({
					json: response,
					pairedItem: { item: i },
				});
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
