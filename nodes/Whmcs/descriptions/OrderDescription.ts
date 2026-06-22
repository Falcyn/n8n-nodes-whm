import type { INodeProperties } from 'n8n-workflow';
import { customParameters, paginationFields } from './SharedFields';

const show = (operations: string[]): INodeProperties['displayOptions'] => ({
	show: { resource: ['order'], operation: operations },
});

export const orderOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['order'] } },
		options: [
			{ name: 'Accept', value: 'accept', action: 'Accept an order', description: 'WHMCS action: AcceptOrder' },
			{ name: 'Cancel', value: 'cancel', action: 'Cancel an order', description: 'WHMCS action: CancelOrder' },
			{ name: 'Create', value: 'create', action: 'Create an order', description: 'WHMCS action: AddOrder' },
			{ name: 'Delete', value: 'delete', action: 'Delete an order', description: 'WHMCS action: DeleteOrder' },
			{ name: 'Fraud', value: 'fraud', action: 'Flag an order as fraud', description: 'WHMCS action: FraudOrder' },
			{ name: 'Get Many', value: 'getAll', action: 'Get many orders', description: 'WHMCS action: GetOrders' },
			{ name: 'Set Pending', value: 'pending', action: 'Set an order pending', description: 'WHMCS action: PendingOrder' },
		],
		default: 'getAll',
	},
];

export const orderFields: INodeProperties[] = [
	// ---- Create ----
	{ displayName: 'Client ID', name: 'clientid', type: 'number', default: 0, required: true, description: 'Client the order belongs to', displayOptions: show(['create']) },
	{ displayName: 'Payment Method', name: 'paymentmethod', type: 'string', default: 'mailin', required: true, description: 'Payment gateway module name, e.g. "paypal", "stripe", "mailin"', displayOptions: show(['create']) },
	{
		displayName: 'Order Items',
		name: 'orderItems',
		type: 'collection',
		placeholder: 'Add Item Detail',
		default: {},
		displayOptions: show(['create']),
		description: 'At least one product, domain, or addon must be supplied. Use array-style WHMCS keys.',
		options: [
			{ displayName: 'Billing Cycle', name: 'billingcycle', type: 'string', default: 'monthly', description: 'E.g. monthly, quarterly, annually. Comma-separate to match multiple pids.' },
			{ displayName: 'Domain', name: 'domain', type: 'string', default: '', description: 'Domain to associate, e.g. example.com' },
			{ displayName: 'Domain Type', name: 'domaintype', type: 'string', default: '', description: 'Register or transfer' },
			{ displayName: 'Product ID (Pid)', name: 'pid', type: 'string', default: '', description: 'Product ID. For multiple, comma-separate, e.g. "1,2".' },
			{ displayName: 'Promo Code', name: 'promocode', type: 'string', default: '' },
		],
	},

	// ---- Accept / Cancel / Delete / Fraud / Pending : order id ----
	{ displayName: 'Order ID', name: 'orderid', type: 'number', default: 0, required: true, displayOptions: show(['accept', 'cancel', 'delete', 'fraud', 'pending']) },
	{
		displayName: 'Options',
		name: 'acceptOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: show(['accept']),
		options: [
			{ displayName: 'Send Registrar', name: 'registrar', type: 'string', default: '', description: 'Auto-submit domain registration to this registrar' },
			{ displayName: 'Service Username', name: 'serviceusername', type: 'string', default: '' },
			{ displayName: 'Auto Provision', name: 'autosetup', type: 'boolean', default: false, description: 'Whether to trigger module create on accept' },
			{ displayName: 'Send Email', name: 'sendemail', type: 'boolean', default: false },
		],
	},

	// ---- Get Many ----
	...paginationFields.map((f) => ({ ...f, displayOptions: show(['getAll']) })),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: show(['getAll']),
		options: [
			{ displayName: 'Order ID', name: 'id', type: 'number', default: 0 },
			{ displayName: 'Client ID', name: 'userid', type: 'number', default: 0 },
			{ displayName: 'Status', name: 'status', type: 'options', default: 'Pending', options: [
				{ name: 'Active', value: 'Active' }, { name: 'Cancelled', value: 'Cancelled' }, { name: 'Fraud', value: 'Fraud' }, { name: 'Pending', value: 'Pending' },
			] },
		],
	},

	{ ...customParameters, displayOptions: { show: { resource: ['order'] } } },
];
