import type { INodeProperties } from 'n8n-workflow';
import { customParametersFor, listOptionsFor, paginationFor, showFor } from './SharedFields';

const show = showFor('reseller');

export const resellerOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: show(),
		options: [
			{ name: 'Get Account Counts', value: 'getAccountCounts', action: 'Get reseller account counts', description: 'WHM function: acctcounts' },
			{ name: 'Get ACL Lists', value: 'getAclLists', action: 'Get saved ACL lists', description: 'WHM function: listacls' },
			{ name: 'Get IP Addresses', value: 'getIps', action: 'Get reseller IP addresses', description: 'WHM function: getresellerips' },
			{ name: 'Get Many', value: 'getAll', action: 'Get many resellers', description: 'WHM function: listresellers' },
			{ name: 'Get Stats', value: 'getStats', action: 'Get reseller statistics', description: 'WHM function: resellerstats' },
			{ name: 'Grant Privileges', value: 'create', action: 'Grant reseller privileges to an account', description: 'WHM function: setupreseller' },
			{ name: 'Revoke Privileges', value: 'remove', action: 'Revoke reseller privileges', description: 'WHM function: unsetupreseller' },
			{ name: 'Set ACLs', value: 'setAcls', action: 'Set reseller access control list', description: 'WHM function: setacls' },
			{ name: 'Set IP Addresses', value: 'setIps', action: 'Set reseller IP addresses', description: 'WHM function: setresellerips' },
			{ name: 'Set Limits', value: 'setLimits', action: 'Set reseller limits', description: 'WHM function: setresellerlimits' },
			{ name: 'Set Main IP', value: 'setMainIp', action: 'Set reseller main IP', description: 'WHM function: setresellermainip' },
			{ name: 'Set Nameservers', value: 'setNameservers', action: 'Set reseller nameservers', description: 'WHM function: setresellernameservers' },
			{ name: 'Set Package Limit', value: 'setPackageLimit', action: 'Set a reseller package limit', description: 'WHM function: setresellerpackagelimit' },
			{ name: 'Suspend', value: 'suspend', action: 'Suspend a reseller', description: 'WHM function: suspendreseller — suspends the reseller and every account it owns' },
			{ name: 'Terminate', value: 'terminate', action: 'Terminate a reseller', description: 'WHM function: terminatereseller — removes the reseller and optionally all of its accounts' },
			{ name: 'Unsuspend', value: 'unsuspend', action: 'Unsuspend a reseller', description: 'WHM function: unsuspendreseller' },
		],
		default: 'getAll',
	},
];

const userField = (operations: string[], description = 'The reseller username'): INodeProperties => ({
	displayName: 'Reseller Username',
	name: 'user',
	type: 'string',
	default: '',
	required: true,
	description,
	displayOptions: show(operations),
});

export const resellerFields: INodeProperties[] = [
	// ---- Get Many ----
	...paginationFor('reseller', ['getAll']),
	listOptionsFor('reseller', ['getAll']),

	// ---- Grant ----
	userField(['create'], 'The existing cPanel account to give reseller privileges to'),
	{ displayName: 'Make Owner of Itself', name: 'makeowner', type: 'boolean', default: true, description: 'Whether the new reseller becomes the owner of its own account', displayOptions: show(['create']) },

	// ---- Simple user-only ops ----
	userField(['remove', 'getStats', 'getAccountCounts', 'getIps', 'unsuspend']),

	// ---- Suspend ----
	userField(['suspend']),
	{ displayName: 'Reason', name: 'reason', type: 'string', default: '', displayOptions: show(['suspend']) },
	{ displayName: 'Prevent Reseller Unsuspend', name: 'disallow', type: 'boolean', default: false, description: 'Whether to block the reseller from unsuspending its own accounts', displayOptions: show(['suspend']) },

	// ---- Terminate ----
	userField(['terminate']),
	{
		displayName: 'Confirm Irrevocable Removal',
		name: 'confirm',
		type: 'boolean',
		default: false,
		required: true,
		description: 'Whether you understand this will irrevocably remove all the accounts owned by the reseller. WHM requires this acknowledgement; the call is refused unless it is enabled.',
		displayOptions: show(['terminate']),
	},

	// ---- Set IPs ----
	userField(['setIps']),
	{ displayName: 'Delegate IPs', name: 'delegate', type: 'boolean', default: true, description: 'Whether to restrict the reseller to the listed IPs (true) or lift the restriction (false)', displayOptions: show(['setIps']) },
	{ displayName: 'IP Addresses', name: 'ips', type: 'string', default: '', placeholder: '192.0.2.10,192.0.2.11', description: 'Comma-separated list of IP addresses the reseller may use', displayOptions: show(['setIps']) },

	// ---- Set Main IP ----
	userField(['setMainIp']),
	{ displayName: 'IP Address', name: 'ip', type: 'string', default: '', required: true, displayOptions: show(['setMainIp']) },

	// ---- Set Nameservers ----
	userField(['setNameservers']),
	{ displayName: 'Nameservers', name: 'nameservers', type: 'string', default: '', placeholder: 'ns1.example.com,ns2.example.com', description: 'Comma-separated list. Leave empty to reset to the server defaults.', displayOptions: show(['setNameservers']) },

	// ---- Set Limits ----
	userField(['setLimits']),
	{
		displayName: 'Limits',
		name: 'limits',
		type: 'collection',
		placeholder: 'Add Limit',
		default: {},
		displayOptions: show(['setLimits']),
		options: [
			{ displayName: 'Account Limit', name: 'account_limit', type: 'number', default: 0, description: 'Maximum number of accounts the reseller may create' },
			{ displayName: 'Bandwidth Limit (MB)', name: 'bandwidth_limit', type: 'number', default: 0 },
			{ displayName: 'Disk Space Limit (MB)', name: 'diskspace_limit', type: 'number', default: 0 },
			{ displayName: 'Enable Account Limit', name: 'enable_account_limit', type: 'boolean', default: false, description: 'Whether to enforce the account limit' },
			{ displayName: 'Enable Overselling', name: 'enable_overselling', type: 'boolean', default: false, description: 'Whether the reseller may oversell resources' },
			{ displayName: 'Enable Overselling Bandwidth', name: 'enable_overselling_bandwidth', type: 'boolean', default: false, description: 'Whether the reseller may oversell bandwidth' },
			{ displayName: 'Enable Overselling Disk Space', name: 'enable_overselling_diskspace', type: 'boolean', default: false, description: 'Whether the reseller may oversell disk space' },
			{ displayName: 'Enable Package Limit Numbers', name: 'enable_package_limit_numbers', type: 'boolean', default: false, description: 'Whether to limit how many accounts per package the reseller may create' },
			{ displayName: 'Enable Package Limits', name: 'enable_package_limits', type: 'boolean', default: false, description: 'Whether to restrict which packages the reseller may use' },
			{ displayName: 'Enable Resource Limits', name: 'enable_resource_limits', type: 'boolean', default: false, description: 'Whether to enforce the disk space and bandwidth limits' },
		],
	},

	// ---- Set Package Limit ----
	userField(['setPackageLimit']),
	{ displayName: 'Package', name: 'package', type: 'string', default: '', required: true, displayOptions: show(['setPackageLimit']) },
	{ displayName: 'Allowed', name: 'allowed', type: 'boolean', default: true, description: 'Whether the reseller may create accounts with this package', displayOptions: show(['setPackageLimit']) },
	{ displayName: 'No Limit', name: 'no_limit', type: 'boolean', default: true, description: 'Whether the number of accounts on this package is unlimited', displayOptions: show(['setPackageLimit']) },
	{ displayName: 'Number', name: 'number', type: 'number', default: 0, description: 'Maximum number of accounts on this package (when No Limit is off)', displayOptions: { show: { resource: ['reseller'], operation: ['setPackageLimit'], no_limit: [false] } } },

	// ---- Set ACLs ----
	{ displayName: 'Reseller Username', name: 'reseller', type: 'string', default: '', required: true, displayOptions: show(['setAcls']) },
	{ displayName: 'ACL List Name', name: 'acllist', type: 'string', default: '', description: 'Name of a saved ACL list (see Get ACL Lists) to apply. Individual ACLs can be set with Custom Parameters using names like "acl-add-pkg" = 1.', displayOptions: show(['setAcls']) },

	customParametersFor('reseller'),
];
