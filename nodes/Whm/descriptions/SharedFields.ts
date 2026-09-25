import type { INodeProperties } from 'n8n-workflow';

/** displayOptions helper: show a property for the given resource + operations. */
export const showFor =
	(resource: string) =>
	(operations?: string[]): INodeProperties['displayOptions'] =>
		operations ? { show: { resource: [resource], operation: operations } } : { show: { resource: [resource] } };

/**
 * A reusable "Custom Parameters" collection. WHM functions accept far more
 * parameters than it is practical to expose individually, so every resource
 * gets this escape hatch: arbitrary name/value pairs merged straight into the
 * request. Names must match the cPanel & WHM API documentation exactly.
 */
export const customParametersFor = (resource: string, operations?: string[]): INodeProperties => ({
	displayName: 'Custom Parameters',
	name: 'customParameters',
	placeholder: 'Add Parameter',
	type: 'fixedCollection',
	typeOptions: { multipleValues: true },
	default: {},
	displayOptions: showFor(resource)(operations),
	description:
		'Any additional API parameter not covered by the fields above. Names must match the cPanel & WHM API reference exactly (case-sensitive). Booleans are sent as 1 / 0.',
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
					description: 'API parameter name, e.g. "cpmod" or "featurelist"',
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
});

/** "Return All / Limit" pair used by list operations. */
export const paginationFor = (resource: string, operations: string[]): INodeProperties[] => [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: true,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: showFor(resource)(operations),
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 50,
		description: 'Max number of results to return',
		displayOptions: { show: { resource: [resource], operation: operations, returnAll: [false] } },
	},
];

/**
 * WHM API 1 server-side filtering & sorting (api.filter.* / api.sort.*).
 * Only WHM API 1 list functions support this; UAPI / API 2 lists are
 * filtered in n8n with a Filter node instead.
 */
export const listOptionsFor = (resource: string, operations: string[]): INodeProperties => ({
	displayName: 'List Options',
	name: 'listOptions',
	type: 'collection',
	placeholder: 'Add Option',
	default: {},
	displayOptions: showFor(resource)(operations),
	options: [
		{
			displayName: 'Filters',
			name: 'filters',
			type: 'fixedCollection',
			typeOptions: { multipleValues: true },
			default: {},
			placeholder: 'Add Filter',
			description: 'Server-side filters applied by WHM before the data is returned. Multiple filters are ANDed.',
			options: [
				{
					name: 'filter',
					displayName: 'Filter',
					values: [
						{
							displayName: 'Field',
							name: 'field',
							type: 'string',
							default: '',
							description: 'Name of the field in the returned records, e.g. "user", "domain", "owner" or "plan"',
						},
						{
							displayName: 'Type',
							name: 'type',
							type: 'options',
							default: 'eq',
							options: [
								{ name: 'Begins With', value: 'begins' },
								{ name: 'Contains', value: 'contains' },
								{ name: 'Equals', value: 'eq' },
								{ name: 'Greater Than', value: 'gt' },
								{ name: 'Greater Than (Unlimited = Infinity)', value: 'gt_handle_unlimited' },
								{ name: 'Less Than', value: 'lt' },
								{ name: 'Less Than (Unlimited = Infinity)', value: 'lt_handle_unlimited' },
							],
						},
						{ displayName: 'Value', name: 'value', type: 'string', default: '' },
					],
				},
			],
		},
		{
			displayName: 'Sort',
			name: 'sort',
			type: 'fixedCollection',
			typeOptions: { multipleValues: true },
			default: {},
			placeholder: 'Add Sort Rule',
			options: [
				{
					name: 'rule',
					displayName: 'Rule',
					values: [
						{ displayName: 'Field', name: 'field', type: 'string', default: '' },
						{
							displayName: 'Method',
							name: 'method',
							type: 'options',
							default: 'lexicographic',
							options: [
								{ name: 'IPv4', value: 'ipv4' },
								{ name: 'Lexicographic', value: 'lexicographic' },
								{ name: 'Numeric', value: 'numeric' },
								{ name: 'Numeric (Zero as Max)', value: 'numeric_zero_as_max' },
							],
						},
						{
							displayName: 'Reverse',
							name: 'reverse',
							type: 'boolean',
							default: false,
							description: 'Whether to sort in descending order',
						},
					],
				},
			],
		},
	],
});

/** The cPanel account a UAPI / API 2 call is executed for. */
export const cpanelUserFor = (resource: string, operations?: string[]): INodeProperties => ({
	displayName: 'cPanel Username',
	name: 'cpanelUser',
	type: 'string',
	default: '',
	required: true,
	placeholder: 'examplecom',
	description: 'The cPanel account (system username) to run this call for. Root can target any account; a reseller only accounts it owns.',
	displayOptions: showFor(resource)(operations),
});

/** Node-wide output options shown for every resource. */
export const outputOptions: INodeProperties = {
	displayName: 'Options',
	name: 'options',
	type: 'collection',
	placeholder: 'Add Option',
	default: {},
	options: [
		{
			displayName: 'Raw Response',
			name: 'rawResponse',
			type: 'boolean',
			default: false,
			description:
				'Whether to return the complete API envelope (metadata + data) as a single item instead of the simplified data. Useful for debugging or for functions with unusual response shapes.',
		},
	],
};
