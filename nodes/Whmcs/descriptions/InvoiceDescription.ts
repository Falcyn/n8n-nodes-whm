import type { INodeProperties } from 'n8n-workflow';
import { customParameters, paginationFields } from './SharedFields';

const show = (operations: string[]): INodeProperties['displayOptions'] => ({
	show: { resource: ['invoice'], operation: operations },
});

export const invoiceOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['invoice'] } },
		options: [
			{ name: 'Add Payment', value: 'addPayment', action: 'Add a payment to an invoice', description: 'WHMCS action: AddInvoicePayment' },
			{ name: 'Apply Credit', value: 'applyCredit', action: 'Apply credit to an invoice', description: 'WHMCS action: ApplyCredit' },
			{ name: 'Create', value: 'create', action: 'Create an invoice', description: 'WHMCS action: CreateInvoice' },
			{ name: 'Generate Due Invoices', value: 'generate', action: 'Generate due invoices', description: 'WHMCS action: GenInvoices' },
			{ name: 'Get', value: 'get', action: 'Get an invoice', description: 'WHMCS action: GetInvoice' },
			{ name: 'Get Many', value: 'getAll', action: 'Get many invoices', description: 'WHMCS action: GetInvoices' },
			{ name: 'Update', value: 'update', action: 'Update an invoice', description: 'WHMCS action: UpdateInvoice' },
		],
		default: 'getAll',
	},
];

export const invoiceFields: INodeProperties[] = [
	// ---- Create ----
	{ displayName: 'Client ID', name: 'userid', type: 'number', default: 0, required: true, displayOptions: show(['create']) },
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['create']),
		options: [
			{ displayName: 'Date', name: 'date', type: 'string', default: '', description: 'YYYY-MM-DD' },
			{ displayName: 'Due Date', name: 'duedate', type: 'string', default: '', description: 'YYYY-MM-DD' },
			{ displayName: 'Line Item 1 Amount', name: 'itemamount1', type: 'number', default: 0 },
			{ displayName: 'Line Item 1 Description', name: 'itemdescription1', type: 'string', default: '' },
			{ displayName: 'Line Item 1 Taxed', name: 'itemtaxed1', type: 'boolean', default: false },
			{ displayName: 'Payment Method', name: 'paymentmethod', type: 'string', default: '' },
			{ displayName: 'Send Invoice Email', name: 'sendinvoice', type: 'boolean', default: false },
			{ displayName: 'Status', name: 'status', type: 'options', default: 'Unpaid', options: [
				{ name: 'Draft', value: 'Draft' }, { name: 'Unpaid', value: 'Unpaid' }, { name: 'Paid', value: 'Paid' },
			] },
		],
	},

	// ---- Get single ----
	{ displayName: 'Invoice ID', name: 'invoiceid', type: 'number', default: 0, required: true, displayOptions: show(['get', 'update', 'addPayment', 'applyCredit']) },

	// ---- Add Payment ----
	{ displayName: 'Transaction ID', name: 'transid', type: 'string', default: '', required: true, description: 'Unique transaction reference from the gateway', displayOptions: show(['addPayment']) },
	{
		displayName: 'Payment Fields',
		name: 'paymentFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['addPayment']),
		options: [
			{ displayName: 'Amount', name: 'amount', type: 'number', default: 0, description: 'Leave blank to settle the full balance' },
			{ displayName: 'Date', name: 'date', type: 'string', default: '', description: 'YYYY-MM-DD HH:MM:SS' },
			{ displayName: 'Fees', name: 'fees', type: 'number', default: 0 },
			{ displayName: 'Gateway', name: 'gateway', type: 'string', default: '', description: 'Gateway module name' },
			{ displayName: 'Send Email', name: 'noemail', type: 'boolean', default: false, description: 'Whether to suppress the payment confirmation email when true' },
		],
	},

	// ---- Apply Credit ----
	{ displayName: 'Amount', name: 'amount', type: 'number', default: 0, required: true, description: 'Credit amount to apply', displayOptions: show(['applyCredit']) },

	// ---- Update ----
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['update']),
		options: [
			{ displayName: 'Status', name: 'status', type: 'options', default: 'Unpaid', options: [
				{ name: 'Cancelled', value: 'Cancelled' }, { name: 'Collections', value: 'Collections' }, { name: 'Draft', value: 'Draft' }, { name: 'Paid', value: 'Paid' }, { name: 'Payment Pending', value: 'Payment Pending' }, { name: 'Refunded', value: 'Refunded' }, { name: 'Unpaid', value: 'Unpaid' },
			] },
			{ displayName: 'Due Date', name: 'duedate', type: 'string', default: '', description: 'YYYY-MM-DD' },
			{ displayName: 'Notes', name: 'notes', type: 'string', default: '' },
			{ displayName: 'Payment Method', name: 'paymentmethod', type: 'string', default: '' },
		],
	},

	// ---- Generate due invoices: no params required ----

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
			{ displayName: 'Client ID', name: 'userid', type: 'number', default: 0 },
			{ displayName: 'Status', name: 'status', type: 'options', default: 'Unpaid', options: [
				{ name: 'Cancelled', value: 'Cancelled' }, { name: 'Draft', value: 'Draft' }, { name: 'Overdue', value: 'Overdue' }, { name: 'Paid', value: 'Paid' }, { name: 'Unpaid', value: 'Unpaid' },
			] },
		],
	},

	{ ...customParameters, displayOptions: { show: { resource: ['invoice'] } } },
];
