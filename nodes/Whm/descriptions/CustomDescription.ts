import type { INodeProperties } from 'n8n-workflow';
import { showFor } from './SharedFields';

const show = showFor('custom');

export const customOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: show(),
		options: [
			{
				name: 'Execute WHM API 1 Function',
				value: 'execute',
				action: 'Execute any whm api 1 function',
				description: 'Call any of the several hundred documented WHM API 1 functions directly',
			},
		],
		default: 'execute',
	},
];

export const customFields: INodeProperties[] = [
	{
		displayName: 'Function',
		name: 'function',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'listaccts',
		description: 'The exact WHM API 1 function name (case-sensitive). See the WHM API 1 reference for the full list.',
		displayOptions: show(),
	},
	{
		displayName: 'Parameters',
		name: 'parameters',
		type: 'json',
		default: '{}',
		description: 'Function parameters as a JSON object. Keys must match the WHM API 1 reference exactly. api.version=1 is added automatically; booleans are sent as 1 / 0 and arrays as repeated keys.',
		displayOptions: show(),
	},
	{
		displayName: 'Split List Result',
		name: 'splitList',
		type: 'boolean',
		default: false,
		description: 'Whether to output one item per record when the function returns a list (e.g. data.acct for listaccts) instead of a single item',
		displayOptions: show(),
	},
];
