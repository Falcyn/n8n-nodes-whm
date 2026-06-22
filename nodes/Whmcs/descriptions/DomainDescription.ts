import type { INodeProperties } from 'n8n-workflow';
import { customParameters, paginationFields } from './SharedFields';

const show = (operations: string[]): INodeProperties['displayOptions'] => ({
	show: { resource: ['domain'], operation: operations },
});

export const domainOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['domain'] } },
		options: [
			{ name: 'Get Many', value: 'getAll', action: 'Get many domains', description: 'WHMCS action: GetClientsDomains' },
			{ name: 'Get Nameservers', value: 'getNameservers', action: 'Get nameservers', description: 'WHMCS action: DomainGetNameservers' },
			{ name: 'Register', value: 'register', action: 'Register a domain', description: 'WHMCS action: DomainRegister' },
			{ name: 'Renew', value: 'renew', action: 'Renew a domain', description: 'WHMCS action: DomainRenew' },
			{ name: 'Toggle ID Protection', value: 'toggleIdProtect', action: 'Toggle ID protection', description: 'WHMCS action: DomainToggleIdProtect' },
			{ name: 'Transfer', value: 'transfer', action: 'Transfer a domain', description: 'WHMCS action: DomainTransfer' },
			{ name: 'Update', value: 'update', action: 'Update a client domain', description: 'WHMCS action: UpdateClientDomain' },
			{ name: 'Update Nameservers', value: 'updateNameservers', action: 'Update nameservers', description: 'WHMCS action: DomainUpdateNameservers' },
		],
		default: 'getAll',
	},
];

export const domainFields: INodeProperties[] = [
	// ---- Domain-ID-targeted operations ----
	{
		displayName: 'Domain ID',
		name: 'domainid',
		type: 'number',
		default: 0,
		required: true,
		description: 'ID of the client domain record (tbldomains.ID)',
		displayOptions: show(['register', 'renew', 'transfer', 'getNameservers', 'updateNameservers', 'toggleIdProtect', 'update']),
	},

	// ---- Register ----
	{
		displayName: 'Registration Fields',
		name: 'registerFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['register']),
		options: [
			{ displayName: 'Registration Period (Years)', name: 'regperiod', type: 'number', default: 1 },
		],
	},

	// ---- Renew ----
	{ displayName: 'Registration Period (Years)', name: 'regperiod', type: 'number', default: 1, displayOptions: show(['renew']) },

	// ---- Transfer ----
	{ displayName: 'EPP / Auth Code', name: 'eppcode', type: 'string', default: '', displayOptions: show(['transfer']) },

	// ---- Update Nameservers ----
	{
		displayName: 'Nameservers',
		name: 'nameservers',
		type: 'collection',
		placeholder: 'Add Nameserver',
		default: {},
		displayOptions: show(['updateNameservers']),
		options: [
			{ displayName: 'NS1', name: 'ns1', type: 'string', default: '' },
			{ displayName: 'NS2', name: 'ns2', type: 'string', default: '' },
			{ displayName: 'NS3', name: 'ns3', type: 'string', default: '' },
			{ displayName: 'NS4', name: 'ns4', type: 'string', default: '' },
			{ displayName: 'NS5', name: 'ns5', type: 'string', default: '' },
		],
	},

	// ---- Toggle ID Protect ----
	{ displayName: 'Enable Protection', name: 'idprotect', type: 'boolean', default: true, displayOptions: show(['toggleIdProtect']) },

	// ---- Update (client domain) ----
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['update']),
		options: [
			{ displayName: 'Do Not Renew', name: 'donotrenew', type: 'boolean', default: false },
			{ displayName: 'Expiry Date', name: 'expirydate', type: 'string', default: '', description: 'YYYY-MM-DD' },
			{ displayName: 'Next Due Date', name: 'nextduedate', type: 'string', default: '', description: 'YYYY-MM-DD' },
			{ displayName: 'Recurring Amount', name: 'recurringamount', type: 'number', default: 0 },
			{ displayName: 'Registrar', name: 'registrar', type: 'string', default: '' },
			{ displayName: 'Status', name: 'status', type: 'string', default: '', description: 'E.g. Active, Pending, Expired, Cancelled.' },
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
			{ displayName: 'Client ID', name: 'clientid', type: 'number', default: 0 },
			{ displayName: 'Domain ID', name: 'domainid', type: 'number', default: 0 },
		],
	},

	{ ...customParameters, displayOptions: { show: { resource: ['domain'] } } },
];
