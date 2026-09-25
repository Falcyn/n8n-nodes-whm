import type { INodeProperties } from 'n8n-workflow';
import { customParametersFor, listOptionsFor, paginationFor, showFor } from './SharedFields';

const show = showFor('domain');

export const domainOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: show(),
		options: [
			{ name: 'Get Many', value: 'getAll', action: 'Get many domains', description: 'WHM function: get_domain_info — every domain on the server with its owner and type' },
			{ name: 'Get Owner', value: 'getOwner', action: 'Get a domain owner', description: 'WHM function: getdomainowner' },
			{ name: 'Get User Data', value: 'getUserData', action: 'Get domain vhost data', description: 'WHM function: domainuserdata — document root, IP, PHP version and other vhost settings' },
			{ name: 'Park (Alias)', value: 'park', action: 'Park a domain on an account', description: 'WHM function: park' },
			{ name: 'Resolve', value: 'resolve', action: 'Resolve a domain name to an IP', description: 'WHM function: resolvedomainname' },
			{ name: 'Unpark', value: 'unpark', action: 'Unpark a domain', description: 'WHM function: unpark' },
		],
		default: 'getAll',
	},
];

const domainField = (operations: string[], description?: string): INodeProperties => ({
	displayName: 'Domain',
	name: 'domain',
	type: 'string',
	default: '',
	required: true,
	placeholder: 'example.com',
	description,
	displayOptions: show(operations),
});

export const domainFields: INodeProperties[] = [
	// ---- Get Many ----
	{ displayName: 'Domain', name: 'domain', type: 'string', default: '', placeholder: 'example.com', description: 'Restrict the result to a single domain. Leave empty for every domain on the server.', displayOptions: show(['getAll']) },
	...paginationFor('domain', ['getAll']),
	listOptionsFor('domain', ['getAll']),

	// ---- Get Owner / User Data / Resolve ----
	domainField(['getOwner', 'getUserData', 'resolve']),

	// ---- Park ----
	{ displayName: 'Username', name: 'user', type: 'string', default: '', required: true, description: 'The account that will own the parked domain', displayOptions: show(['park']) },
	{ displayName: 'New Domain', name: 'newdomain', type: 'string', default: '', required: true, placeholder: 'alias.com', description: 'The domain to park (alias)', displayOptions: show(['park']) },
	{ displayName: 'Target Domain', name: 'topdomain', type: 'string', default: '', placeholder: 'example.com', description: 'The existing domain the alias points to. Defaults to the account\'s primary domain.', displayOptions: show(['park']) },

	// ---- Unpark ----
	{ displayName: 'Username', name: 'user', type: 'string', default: '', required: true, description: 'The account that owns the parked domain', displayOptions: show(['unpark']) },
	domainField(['unpark'], 'The parked domain to remove'),
	{ displayName: 'Target Domain', name: 'topdomain', type: 'string', default: '', placeholder: 'example.com', description: 'The domain the alias currently points to, if not the primary domain', displayOptions: show(['unpark']) },

	customParametersFor('domain'),
];
