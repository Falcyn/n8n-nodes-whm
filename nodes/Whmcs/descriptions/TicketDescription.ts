import type { INodeProperties } from 'n8n-workflow';
import { customParameters, paginationFields } from './SharedFields';

const show = (operations: string[]): INodeProperties['displayOptions'] => ({
	show: { resource: ['ticket'], operation: operations },
});

export const ticketOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['ticket'] } },
		options: [
			{ name: 'Create', value: 'create', action: 'Open a ticket', description: 'WHMCS action: OpenTicket' },
			{ name: 'Delete', value: 'delete', action: 'Delete a ticket', description: 'WHMCS action: DeleteTicket' },
			{ name: 'Get', value: 'get', action: 'Get a ticket', description: 'WHMCS action: GetTicket' },
			{ name: 'Get Departments', value: 'getDepartments', action: 'Get support departments', description: 'WHMCS action: GetSupportDepartments' },
			{ name: 'Get Many', value: 'getAll', action: 'Get many tickets', description: 'WHMCS action: GetTickets' },
			{ name: 'Reply', value: 'reply', action: 'Reply to a ticket', description: 'WHMCS action: AddTicketReply' },
			{ name: 'Update', value: 'update', action: 'Update a ticket', description: 'WHMCS action: UpdateTicket' },
		],
		default: 'getAll',
	},
];

export const ticketFields: INodeProperties[] = [
	// ---- Create ----
	{ displayName: 'Department ID', name: 'deptid', type: 'number', default: 0, required: true, displayOptions: show(['create']) },
	{ displayName: 'Subject', name: 'subject', type: 'string', default: '', required: true, displayOptions: show(['create']) },
	{ displayName: 'Message', name: 'message', type: 'string', typeOptions: { rows: 4 }, default: '', required: true, displayOptions: show(['create']) },
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['create']),
		options: [
			{ displayName: 'Client ID', name: 'clientid', type: 'number', default: 0, description: 'Open against an existing client' },
			{ displayName: 'Email', name: 'email', type: 'string', placeholder: 'name@email.com', default: '' },
			{ displayName: 'Name', name: 'name', type: 'string', default: '', description: 'Required for non-client (guest) tickets' },
			{ displayName: 'Priority', name: 'priority', type: 'options', default: 'Medium', options: [
				{ name: 'Low', value: 'Low' }, { name: 'Medium', value: 'Medium' }, { name: 'High', value: 'High' },
			] },
			{ displayName: 'Service ID', name: 'serviceid', type: 'number', default: 0 },
			{ displayName: 'Suppress Email', name: 'noemail', type: 'boolean', default: false },
		],
	},

	// ---- Ticket-targeted ----
	{ displayName: 'Ticket ID', name: 'ticketid', type: 'number', default: 0, required: true, displayOptions: show(['get', 'reply', 'update', 'delete']) },

	// ---- Reply ----
	{ displayName: 'Message', name: 'message', type: 'string', typeOptions: { rows: 4 }, default: '', required: true, displayOptions: show(['reply']) },
	{
		displayName: 'Reply Options',
		name: 'replyOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: show(['reply']),
		options: [
			{ displayName: 'Admin Username', name: 'adminusername', type: 'string', default: '', description: 'Post the reply as this admin (staff reply)' },
			{ displayName: 'Client ID', name: 'clientid', type: 'number', default: 0, description: 'Post the reply as this client' },
			{ displayName: 'Status', name: 'status', type: 'string', default: '', description: 'Set the ticket status after replying, e.g. "Answered"' },
			{ displayName: 'Mark As', name: 'markdown', type: 'boolean', default: false },
		],
	},

	// ---- Update ----
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['update']),
		options: [
			{ displayName: 'Department ID', name: 'deptid', type: 'number', default: 0 },
			{ displayName: 'Flag To Admin ID', name: 'flag', type: 'number', default: 0 },
			{ displayName: 'Priority', name: 'priority', type: 'options', default: 'Medium', options: [
				{ name: 'Low', value: 'Low' }, { name: 'Medium', value: 'Medium' }, { name: 'High', value: 'High' },
			] },
			{ displayName: 'Status', name: 'status', type: 'string', default: '', description: 'E.g. Open, Answered, Closed.' },
			{ displayName: 'Subject', name: 'subject', type: 'string', default: '' },
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
			{ displayName: 'Department ID', name: 'deptid', type: 'number', default: 0 },
			{ displayName: 'Client ID', name: 'clientid', type: 'number', default: 0 },
			{ displayName: 'Status', name: 'status', type: 'string', default: '', description: 'E.g. Open, Answered, Closed.' },
			{ displayName: 'Subject Filter', name: 'subject', type: 'string', default: '' },
		],
	},

	{ ...customParameters, displayOptions: { show: { resource: ['ticket'] } } },
];
