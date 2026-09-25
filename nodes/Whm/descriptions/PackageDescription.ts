import type { INodeProperties } from 'n8n-workflow';
import { customParametersFor, listOptionsFor, paginationFor, showFor } from './SharedFields';

const show = showFor('package');

export const packageOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: show(),
		options: [
			{ name: 'Create', value: 'create', action: 'Create a package', description: 'WHM function: addpkg' },
			{ name: 'Delete', value: 'delete', action: 'Delete a package', description: 'WHM function: killpkg' },
			{ name: 'Get', value: 'get', action: 'Get a package', description: 'WHM function: getpkginfo' },
			{ name: 'Get Feature List', value: 'getFeatureList', action: 'Get a feature list', description: 'WHM function: get_featurelist_data' },
			{ name: 'Get Feature Lists', value: 'getFeatureLists', action: 'Get all feature lists', description: 'WHM function: getfeaturelist' },
			{ name: 'Get Many', value: 'getAll', action: 'Get many packages', description: 'WHM function: listpkgs' },
			{ name: 'Update', value: 'update', action: 'Update a package', description: 'WHM function: editpkg' },
		],
		default: 'getAll',
	},
];

const packageSettings: INodeProperties['options'] = [
	{ displayName: 'Bandwidth Limit (MB)', name: 'bwlimit', type: 'string', default: '', description: 'A number in MB, or "unlimited"' },
	{ displayName: 'CGI Access', name: 'cgi', type: 'boolean', default: true, description: 'Whether accounts may run CGI scripts' },
	{ displayName: 'Dedicated IP', name: 'ip', type: 'options', default: 'n', options: [{ name: 'No (Shared)', value: 'n' }, { name: 'Yes (Dedicated)', value: 'y' }], description: 'Whether accounts on this package get a dedicated IP' },
	{ displayName: 'Feature List', name: 'featurelist', type: 'string', default: 'default' },
	{ displayName: 'Language', name: 'language', type: 'string', default: '', placeholder: 'en' },
	{ displayName: 'Max Addon Domains', name: 'maxaddon', type: 'string', default: '', description: 'A number, or "unlimited"' },
	{ displayName: 'Max Deferred Mail Percentage', name: 'max_defer_fail_percentage', type: 'string', default: '', description: 'A number, or "unlimited"' },
	{ displayName: 'Max Email Account Quota (MB)', name: 'max_emailacct_quota', type: 'string', default: '', description: 'A number in MB, or "unlimited"' },
	{ displayName: 'Max Email Accounts', name: 'maxpop', type: 'string', default: '', description: 'A number, or "unlimited"' },
	{ displayName: 'Max Emails Per Hour', name: 'max_email_per_hour', type: 'string', default: '', description: 'A number, or "unlimited"' },
	{ displayName: 'Max FTP Accounts', name: 'maxftp', type: 'string', default: '', description: 'A number, or "unlimited"' },
	{ displayName: 'Max Mailing Lists', name: 'maxlst', type: 'string', default: '', description: 'A number, or "unlimited"' },
	{ displayName: 'Max Parked Domains', name: 'maxpark', type: 'string', default: '', description: 'A number, or "unlimited"' },
	{ displayName: 'Max SQL Databases', name: 'maxsql', type: 'string', default: '', description: 'A number, or "unlimited"' },
	{ displayName: 'Max Subdomains', name: 'maxsub', type: 'string', default: '', description: 'A number, or "unlimited"' },
	{ displayName: 'Quota (MB)', name: 'quota', type: 'string', default: '', description: 'Disk quota in MB, or "unlimited"' },
	{ displayName: 'Shell Access', name: 'hasshell', type: 'boolean', default: false, description: 'Whether accounts get SSH / shell access' },
	{ displayName: 'Theme', name: 'cpmod', type: 'string', default: '', placeholder: 'jupiter' },
];

export const packageFields: INodeProperties[] = [
	// ---- Create / Update ----
	{ displayName: 'Package Name', name: 'name', type: 'string', default: '', required: true, description: 'Name of the package. Resellers\' packages are automatically prefixed with "reseller_".', displayOptions: show(['create', 'update']) },
	{
		displayName: 'Package Settings',
		name: 'packageSettings',
		type: 'collection',
		placeholder: 'Add Setting',
		default: {},
		displayOptions: show(['create', 'update']),
		options: packageSettings,
	},

	// ---- Delete ----
	{ displayName: 'Package Name', name: 'pkgname', type: 'string', default: '', required: true, displayOptions: show(['delete']) },

	// ---- Get ----
	{ displayName: 'Package Name', name: 'pkg', type: 'string', default: '', required: true, displayOptions: show(['get']) },

	// ---- Get Many ----
	...paginationFor('package', ['getAll', 'getFeatureLists']),
	listOptionsFor('package', ['getAll']),

	// ---- Feature list ----
	{ displayName: 'Feature List Name', name: 'featurelist', type: 'string', default: '', required: true, displayOptions: show(['getFeatureList']) },

	customParametersFor('package'),
];
