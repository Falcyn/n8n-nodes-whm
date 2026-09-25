import type { INodeProperties } from 'n8n-workflow';
import { customParametersFor, listOptionsFor, paginationFor, showFor } from './SharedFields';

const show = showFor('apiToken');

export const apiTokenOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: show(),
		options: [
			{ name: 'Create', value: 'create', action: 'Create an API token', description: 'WHM function: api_token_create' },
			{ name: 'Get Many', value: 'getAll', action: 'Get many API tokens', description: 'WHM function: api_token_list' },
			{ name: 'Revoke', value: 'revoke', action: 'Revoke an API token', description: 'WHM function: api_token_revoke' },
			{ name: 'Update', value: 'update', action: 'Update an API token', description: 'WHM function: api_token_update' },
		],
		default: 'getAll',
	},
];

export const apiTokenFields: INodeProperties[] = [
	...paginationFor('apiToken', ['getAll']),
	listOptionsFor('apiToken', ['getAll']),
	// The token *name* is a public label, not the secret — the secret is only ever in the Create response.
	// eslint-disable-next-line n8n-nodes-base/node-param-type-options-password-missing
	{ displayName: 'Token Name', name: 'token_name', type: 'string', default: '', required: true, displayOptions: show(['create', 'revoke', 'update']) },
	{
		displayName: 'ACLs',
		name: 'acl',
		type: 'string',
		default: '',
		placeholder: 'list-accts,create-acct',
		description: 'Comma-separated list of WHM ACL names the token is limited to (e.g. list-accts, create-acct, kill-acct, all). Leave empty on Create for full privileges of the authenticating user.',
		displayOptions: show(['create', 'update']),
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['create', 'update']),
		options: [
			{ displayName: 'Expires At', name: 'expires_at', type: 'number', default: 0, description: 'Unix timestamp at which the token expires. 0 = never.' },
			{ displayName: 'New Name', name: 'new_name', type: 'string', default: '', description: 'Rename the token (Update only)' },
		],
	},
	{
		displayName: 'The token secret is only returned once, in the Create response. Store it securely.',
		name: 'tokenNotice',
		type: 'notice',
		default: '',
		displayOptions: show(['create']),
	},

	customParametersFor('apiToken'),
];
