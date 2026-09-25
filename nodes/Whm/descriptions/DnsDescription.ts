import type { INodeProperties } from 'n8n-workflow';
import { customParametersFor, listOptionsFor, paginationFor, showFor } from './SharedFields';

const show = showFor('dns');

export const dnsOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: show(),
		options: [
			{ name: 'Add Record', value: 'addRecord', action: 'Add a DNS record', description: 'WHM function: addzonerecord' },
			{ name: 'Create Zone', value: 'createZone', action: 'Create a DNS zone', description: 'WHM function: adddns' },
			{ name: 'Delete Record', value: 'deleteRecord', action: 'Delete a DNS record', description: 'WHM function: removezonerecord' },
			{ name: 'Delete Zone', value: 'deleteZone', action: 'Delete a DNS zone', description: 'WHM function: killdns' },
			{ name: 'Edit Record', value: 'editRecord', action: 'Edit a DNS record', description: 'WHM function: editzonerecord' },
			{ name: 'Get Many', value: 'getAll', action: 'Get many DNS zones', description: 'WHM function: listzones' },
			{ name: 'Get MX Records', value: 'getMx', action: 'Get MX records', description: 'WHM function: listmxs' },
			{ name: 'Get Record', value: 'getRecord', action: 'Get a DNS record', description: 'WHM function: getzonerecord' },
			{ name: 'Get Zone', value: 'getZone', action: 'Get a DNS zone', description: 'WHM function: dumpzone — every record in the zone' },
			{ name: 'Lookup Nameserver IP', value: 'lookupNsIp', action: 'Look up a nameserver IP', description: 'WHM function: lookupnsip' },
			{ name: 'Reset Zone', value: 'resetZone', action: 'Reset a DNS zone to defaults', description: 'WHM function: resetzone' },
			{ name: 'Save MX Record', value: 'saveMx', action: 'Add or update an MX record', description: 'WHM function: savemxs' },
		],
		default: 'getAll',
	},
];

const domainField = (operations: string[], description = 'The zone name, e.g. example.com'): INodeProperties => ({
	displayName: 'Zone (Domain)',
	name: 'domain',
	type: 'string',
	default: '',
	required: true,
	placeholder: 'example.com',
	description,
	displayOptions: show(operations),
});

/** Record-type-specific data fields shared by Add Record and Edit Record. */
const recordData: INodeProperties['options'] = [
	{ displayName: 'Address (A / AAAA)', name: 'address', type: 'string', default: '', description: 'IPv4 or IPv6 address for A and AAAA records' },
	{ displayName: 'CAA Flag', name: 'flag', type: 'number', default: 0 },
	{ displayName: 'CAA Tag', name: 'tag', type: 'options', default: 'issue', options: [{ name: 'Iodef', value: 'iodef' }, { name: 'Issue', value: 'issue' }, { name: 'Issuewild', value: 'issuewild' }] },
	{ displayName: 'CAA Value', name: 'value', type: 'string', default: '', placeholder: 'letsencrypt.org' },
	{ displayName: 'Class', name: 'class', type: 'string', default: 'IN' },
	{ displayName: 'CNAME Target', name: 'cname', type: 'string', default: '', placeholder: 'target.example.com' },
	{ displayName: 'MX Exchange', name: 'exchange', type: 'string', default: '', placeholder: 'mail.example.com' },
	{ displayName: 'MX Preference', name: 'preference', type: 'number', default: 10 },
	{ displayName: 'NS Nameserver', name: 'nsdname', type: 'string', default: '', placeholder: 'ns1.example.com' },
	{ displayName: 'PTR Name', name: 'ptrdname', type: 'string', default: '' },
	{ displayName: 'SRV Port', name: 'port', type: 'number', default: 0 },
	{ displayName: 'SRV Priority', name: 'priority', type: 'number', default: 0 },
	{ displayName: 'SRV Target', name: 'target', type: 'string', default: '' },
	{ displayName: 'SRV Weight', name: 'weight', type: 'number', default: 0 },
	{ displayName: 'TTL', name: 'ttl', type: 'number', default: 14400 },
	{ displayName: 'TXT Data', name: 'txtdata', type: 'string', default: '', description: 'The text value, e.g. "v=spf1 +a +mx -all"' },
];

export const dnsFields: INodeProperties[] = [
	// ---- Get Zones ----
	...paginationFor('dns', ['getAll', 'getZone']),
	listOptionsFor('dns', ['getAll']),

	// ---- Create Zone ----
	domainField(['createZone'], 'The domain to create a zone for'),
	{ displayName: 'IP Address', name: 'ip', type: 'string', default: '', required: true, description: 'IP address the zone\'s A records point to', displayOptions: show(['createZone']) },
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['createZone']),
		options: [
			{ displayName: 'Owner', name: 'trueowner', type: 'string', default: '', description: 'Account that owns the zone. Defaults to the authenticating user.' },
			{ displayName: 'Template', name: 'template', type: 'options', default: 'standard', options: [{ name: 'Simple', value: 'simple' }, { name: 'Standard', value: 'standard' }, { name: 'Standard + Virtual FTP', value: 'standardvirtualftp' }] },
		],
	},

	// ---- Delete Zone / Get Zone / Reset / MX list ----
	domainField(['deleteZone', 'getZone', 'resetZone', 'getMx']),

	// ---- Add Record ----
	domainField(['addRecord']),
	{ displayName: 'Name', name: 'name', type: 'string', default: '', required: true, placeholder: 'www.example.com.', description: 'Record name. Use a fully-qualified name ending in a dot, or a relative name like "www".', displayOptions: show(['addRecord']) },
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		default: 'A',
		required: true,
		options: [
			{ name: 'A', value: 'A' }, { name: 'AAAA', value: 'AAAA' }, { name: 'CAA', value: 'CAA' }, { name: 'CNAME', value: 'CNAME' },
			{ name: 'MX', value: 'MX' }, { name: 'NS', value: 'NS' }, { name: 'PTR', value: 'PTR' }, { name: 'SRV', value: 'SRV' }, { name: 'TXT', value: 'TXT' },
		],
		displayOptions: show(['addRecord']),
	},
	{
		displayName: 'Record Data',
		name: 'recordData',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		description: 'Fill in the fields that apply to the chosen record type',
		displayOptions: show(['addRecord']),
		options: recordData,
	},

	// ---- Edit Record ----
	domainField(['editRecord']),
	{ displayName: 'Line', name: 'line', type: 'number', default: 0, required: true, description: 'Line number of the record in the zone file, as returned by Get Zone', displayOptions: show(['editRecord']) },
	{
		displayName: 'Record Data',
		name: 'recordData',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		description: 'Fields to change. Include Name / Type here to change them.',
		displayOptions: show(['editRecord']),
		options: [
			{ displayName: 'Name', name: 'name', type: 'string', default: '' },
			{ displayName: 'Type', name: 'type', type: 'string', default: '', placeholder: 'A' },
			...recordData,
		],
	},

	// ---- Get / Delete Record ----
	domainField(['getRecord', 'deleteRecord']),
	{ displayName: 'Line', name: 'line', type: 'number', default: 0, required: true, description: 'Line number of the record in the zone file, as returned by Get Zone', displayOptions: show(['getRecord', 'deleteRecord']) },

	// ---- Save MX ----
	domainField(['saveMx']),
	{ displayName: 'Exchange', name: 'exchange', type: 'string', default: '', required: true, placeholder: 'mail.example.com', description: 'Mail server hostname', displayOptions: show(['saveMx']) },
	{ displayName: 'Preference', name: 'preference', type: 'number', default: 10, required: true, displayOptions: show(['saveMx']) },
	{
		displayName: 'Additional Fields',
		name: 'mxFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['saveMx']),
		options: [
			{ displayName: 'Always Accept', name: 'alwaysaccept', type: 'options', default: 'auto', options: [{ name: 'Auto', value: 'auto' }, { name: 'Local', value: 'local' }, { name: 'Remote', value: 'remote' }, { name: 'Secondary', value: 'secondary' }], description: 'The mail routing setting for the domain' },
			{ displayName: 'Name', name: 'name', type: 'string', default: '', description: 'Subdomain the MX applies to. Leave empty for the zone itself.' },
			{ displayName: 'Old Exchange', name: 'oldexchange', type: 'string', default: '', description: 'When replacing a record: the exchange value being replaced' },
			{ displayName: 'Old Preference', name: 'oldpreference', type: 'number', default: 0, description: 'When replacing a record: the preference value being replaced' },
		],
	},

	// ---- Lookup NS IP ----
	{ displayName: 'Nameserver', name: 'nameserver', type: 'string', default: '', required: true, placeholder: 'ns1.example.com', displayOptions: show(['lookupNsIp']) },

	customParametersFor('dns'),
];
