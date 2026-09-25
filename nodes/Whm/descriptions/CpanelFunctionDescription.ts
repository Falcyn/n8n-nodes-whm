import type { INodeProperties } from 'n8n-workflow';
import { cpanelUserFor, showFor } from './SharedFields';

const show = showFor('cpanelFunction');

export const cpanelFunctionOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: show(),
		options: [
			{ name: 'Execute API 2 Function', value: 'api2', action: 'Execute a cpanel api 2 function as a user', description: 'Call any cPanel API 2 module::function for an account through WHM' },
			{ name: 'Execute UAPI Function', value: 'uapi', action: 'Execute a cpanel uapi function as a user', description: 'Call any cPanel UAPI module::function for an account through WHM' },
		],
		default: 'uapi',
	},
];

export const cpanelFunctionFields: INodeProperties[] = [
	cpanelUserFor('cpanelFunction'),
	{ displayName: 'Module', name: 'module', type: 'string', default: '', required: true, placeholder: 'Email', description: 'The API module, e.g. Email, Mysql, Ftp, DomainInfo, SSL, Fileman', displayOptions: show() },
	{ displayName: 'Function', name: 'function', type: 'string', default: '', required: true, placeholder: 'list_pops', description: 'The function within the module, e.g. list_pops (UAPI) or listpops (API 2)', displayOptions: show() },
	{
		displayName: 'Parameters',
		name: 'parameters',
		type: 'json',
		default: '{}',
		description: 'Function parameters as a JSON object. Keys must match the cPanel API reference exactly. Booleans are sent as 1 / 0; arrays as repeated keys.',
		displayOptions: show(),
	},
];
