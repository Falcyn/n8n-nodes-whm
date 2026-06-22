import type { INodeProperties } from 'n8n-workflow';
import { customParameters, paginationFields } from './SharedFields';

const show = (operations: string[]): INodeProperties['displayOptions'] => ({
	show: { resource: ['client'], operation: operations },
});

export const clientOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['client'] } },
		options: [
			{ name: 'Close', value: 'close', action: 'Close a client', description: 'WHMCS action: CloseClient' },
			{ name: 'Create', value: 'create', action: 'Create a client', description: 'WHMCS action: AddClient' },
			{ name: 'Delete', value: 'delete', action: 'Delete a client', description: 'WHMCS action: DeleteClient' },
			{ name: 'Get', value: 'get', action: 'Get a client', description: 'WHMCS action: GetClientsDetails' },
			{ name: "Get Client's Domains", value: 'getDomains', action: 'Get a client domains', description: 'WHMCS action: GetClientsDomains' },
			{ name: "Get Client's Products", value: 'getProducts', action: 'Get a client products', description: 'WHMCS action: GetClientsProducts' },
			{ name: 'Get Many', value: 'getAll', action: 'Get many clients', description: 'WHMCS action: GetClients' },
			{ name: 'Update', value: 'update', action: 'Update a client', description: 'WHMCS action: UpdateClient' },
		],
		default: 'getAll',
	},
];

export const clientFields: INodeProperties[] = [
	// ---- Create ----
	{ displayName: 'First Name', name: 'firstname', type: 'string', default: '', required: true, displayOptions: show(['create']) },
	{ displayName: 'Last Name', name: 'lastname', type: 'string', default: '', required: true, displayOptions: show(['create']) },
	{ displayName: 'Email', name: 'email', type: 'string', placeholder: 'name@email.com', default: '', required: true, displayOptions: show(['create']) },
	{ displayName: 'Password', name: 'password2', type: 'string', typeOptions: { password: true }, default: '', required: true, description: 'New client portal password', displayOptions: show(['create']) },
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['create']),
		options: [
			{ displayName: 'Address 1', name: 'address1', type: 'string', default: '' },
			{ displayName: 'City', name: 'city', type: 'string', default: '' },
			{ displayName: 'Client Group ID', name: 'groupid', type: 'number', default: 0 },
			{ displayName: 'Company Name', name: 'companyname', type: 'string', default: '' },
			{ displayName: 'Country', name: 'country', type: 'string', default: '', description: 'Two-letter ISO country code, e.g. US' },
			{ displayName: 'Currency ID', name: 'currency', type: 'number', default: 1 },
			{ displayName: 'Phone Number', name: 'phonenumber', type: 'string', default: '' },
			{ displayName: 'Postcode', name: 'postcode', type: 'string', default: '' },
			{ displayName: 'Skip Welcome Email', name: 'noemail', type: 'boolean', default: false },
			{ displayName: 'State', name: 'state', type: 'string', default: '' },
		],
	},

	// ---- Get (single) ----
	{ displayName: 'Client ID', name: 'clientid', type: 'number', default: 0, description: 'Numeric ID of the client. Leave 0 to look up by email instead.', displayOptions: show(['get']) },
	{ displayName: 'Email', name: 'email', type: 'string', placeholder: 'name@email.com', default: '', description: 'Look up the client by email if no Client ID is supplied', displayOptions: show(['get']) },

	// ---- Update / Delete / Close / GetProducts / GetDomains : client id ----
	{ displayName: 'Client ID', name: 'clientid', type: 'number', default: 0, required: true, displayOptions: show(['update', 'delete', 'close', 'getProducts', 'getDomains']) },
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['update']),
		options: [
			{ displayName: 'Address 1', name: 'address1', type: 'string', default: '' },
			{ displayName: 'City', name: 'city', type: 'string', default: '' },
			{ displayName: 'Client Group ID', name: 'groupid', type: 'number', default: 0 },
			{ displayName: 'Country', name: 'country', type: 'string', default: '' },
			{ displayName: 'Email', name: 'email', type: 'string', placeholder: 'name@email.com', default: '' },
			{ displayName: 'First Name', name: 'firstname', type: 'string', default: '' },
			{ displayName: 'Last Name', name: 'lastname', type: 'string', default: '' },
			{ displayName: 'Phone Number', name: 'phonenumber', type: 'string', default: '' },
			{ displayName: 'Status', name: 'status', type: 'options', default: 'Active', options: [
				{ name: 'Active', value: 'Active' }, { name: 'Inactive', value: 'Inactive' }, { name: 'Closed', value: 'Closed' },
			] },
		],
	},

	// ---- Get Many filters ----
	...paginationFields.map((f) => ({ ...f, displayOptions: show(['getAll']) })),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: show(['getAll']),
		options: [
			{ displayName: 'Search', name: 'search', type: 'string', default: '', description: 'Match against name, email, or company' },
			{ displayName: 'Status', name: 'status', type: 'options', default: 'Active', options: [
				{ name: 'Active', value: 'Active' }, { name: 'Inactive', value: 'Inactive' }, { name: 'Closed', value: 'Closed' },
			] },
			{ displayName: 'Sort Field', name: 'sorting', type: 'options', default: 'ASC', options: [
				{ name: 'Ascending', value: 'ASC' }, { name: 'Descending', value: 'DESC' },
			] },
		],
	},

	{ ...customParameters, displayOptions: { show: { resource: ['client'] } } },
];
