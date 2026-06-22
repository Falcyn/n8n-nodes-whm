import type { INodeProperties } from 'n8n-workflow';
import { customParameters } from './SharedFields';

const show = (operations: string[]): INodeProperties['displayOptions'] => ({
	show: { resource: ['system'], operation: operations },
});

export const systemOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['system'] } },
		options: [
			{ name: 'Get Activity Log', value: 'getActivityLog', action: 'Get the activity log', description: 'WHMCS action: GetActivityLog' },
			{ name: 'Get Currencies', value: 'getCurrencies', action: 'Get currencies', description: 'WHMCS action: GetCurrencies' },
			{ name: 'Get Payment Methods', value: 'getPaymentMethods', action: 'Get payment methods', description: 'WHMCS action: GetPaymentMethods' },
			{ name: 'Get Stats', value: 'getStats', action: 'Get admin dashboard stats', description: 'WHMCS action: GetStats' },
			{ name: 'Get WHMCS Details', value: 'details', action: 'Get WHMCS details', description: 'WHMCS action: WhmcsDetails' },
			{ name: 'Send Email', value: 'sendEmail', action: 'Send an email', description: 'WHMCS action: SendEmail' },
		],
		default: 'details',
	},
];

export const systemFields: INodeProperties[] = [
	// ---- Send Email ----
	{ displayName: 'Message Name', name: 'messagename', type: 'string', default: '', description: 'Name of the WHMCS email template to send. Leave blank to send a custom email.', displayOptions: show(['sendEmail']) },
	{
		displayName: 'Email Fields',
		name: 'emailFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['sendEmail']),
		options: [
			{ displayName: 'Client ID', name: 'id', type: 'number', default: 0, description: 'Recipient client ID (used with template emails)' },
			{ displayName: 'Custom Message', name: 'custommessage', type: 'string', typeOptions: { rows: 4 }, default: '' },
			{ displayName: 'Custom Subject', name: 'customsubject', type: 'string', default: '', description: 'Subject for a custom (non-template) email' },
			{ displayName: 'Custom Type', name: 'customtype', type: 'options', default: 'product', options: [
				{ name: 'General', value: 'general' }, { name: 'Product', value: 'product' }, { name: 'Domain', value: 'domain' }, { name: 'Invoice', value: 'invoice' },
			] },
			{ displayName: 'Related ID', name: 'customvars', type: 'string', default: '', description: 'Base64-encoded serialized merge variables (advanced)' },
		],
	},

	// ---- Get Activity Log ----
	{
		displayName: 'Filters',
		name: 'logFilters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: show(['getActivityLog']),
		options: [
			{ displayName: 'User ID', name: 'userid', type: 'number', default: 0 },
			{ displayName: 'Date', name: 'date', type: 'string', default: '', description: 'YYYY-MM-DD' },
			{ displayName: 'Description Filter', name: 'description', type: 'string', default: '' },
			{ displayName: 'Limit', name: 'limitnum', type: 'number', default: 25 },
		],
	},

	{ ...customParameters, displayOptions: { show: { resource: ['system'] } } },
];
