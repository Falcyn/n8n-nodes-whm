import type { INodeProperties } from 'n8n-workflow';

/**
 * A reusable "Custom Parameters" collection. WHMCS actions accept far more
 * fields than it is practical to expose individually, so every resource gets
 * this escape hatch: arbitrary name/value pairs merged straight into the
 * request body. This keeps the node capable of every documented action even
 * where a dedicated field is not provided.
 */
export const customParameters: INodeProperties = {
	displayName: 'Custom Parameters',
	name: 'customParameters',
	placeholder: 'Add Parameter',
	type: 'fixedCollection',
	typeOptions: { multipleValues: true },
	default: {},
	description:
		'Any additional WHMCS parameter not covered by the fields above. Names must match the WHMCS API Reference exactly (case-sensitive).',
	options: [
		{
			name: 'parameter',
			displayName: 'Parameter',
			values: [
				{
					displayName: 'Name',
					name: 'name',
					type: 'string',
					default: '',
					description: 'WHMCS parameter name, e.g. "customfields" or "noemail"',
				},
				{
					displayName: 'Value',
					name: 'value',
					type: 'string',
					default: '',
				},
			],
		},
	],
};

/** Standard "Return All / Limit" pair used by the list operations. */
export const paginationFields: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 50,
		description: 'Max number of results to return',
		displayOptions: { show: { returnAll: [false] } },
	},
];
