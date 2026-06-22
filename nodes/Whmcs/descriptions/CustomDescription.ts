import type { INodeProperties } from 'n8n-workflow';

const show = (): INodeProperties['displayOptions'] => ({ show: { resource: ['custom'] } });

export const customOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: show(),
		options: [
			{
				name: 'Execute API Action',
				value: 'execute',
				action: 'Execute any WHMCS API action',
				description: 'Call any of the 200+ documented WHMCS actions directly',
			},
		],
		default: 'execute',
	},
];

export const customFields: INodeProperties[] = [
	{
		displayName: 'Action',
		name: 'action',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'GetClientsDetails',
		description:
			'The exact WHMCS API action name (case-sensitive). See the WHMCS API Reference for the full list.',
		displayOptions: show(),
	},
	{
		displayName: 'Parameters',
		name: 'parameters',
		type: 'json',
		default: '{}',
		description:
			'Action parameters as a JSON object. Keys must match the WHMCS API Reference exactly. The identifier, secret and responsetype are added automatically.',
		displayOptions: show(),
	},
];
