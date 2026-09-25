import type { INodeProperties } from 'n8n-workflow';
import { customParametersFor, listOptionsFor, paginationFor, showFor } from './SharedFields';

const show = showFor('account');

export const accountOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: show(),
		options: [
			{ name: 'Change Package', value: 'changePackage', action: 'Change an account package', description: 'WHM function: changepackage' },
			{ name: 'Change Password', value: 'changePassword', action: 'Change an account password', description: 'WHM function: passwd' },
			{ name: 'Change Primary IP', value: 'changeIp', action: 'Change an account IP address', description: 'WHM function: setsiteip' },
			{ name: 'Create', value: 'create', action: 'Create an account', description: 'WHM function: createacct' },
			{ name: 'Create Login Session', value: 'createSession', action: 'Create a single sign on login URL', description: 'WHM function: create_user_session' },
			{ name: 'Force Password Change', value: 'forcePasswordChange', action: 'Force a password change at next login', description: 'WHM function: forcepasswordchange' },
			{ name: 'Get', value: 'get', action: 'Get an account summary', description: 'WHM function: accountsummary' },
			{ name: 'Get Bandwidth Usage', value: 'getBandwidth', action: 'Get bandwidth usage', description: 'WHM function: showbw' },
			{ name: 'Get Disk Usage', value: 'getDiskUsage', action: 'Get disk usage for all accounts', description: 'WHM function: get_disk_usage' },
			{ name: 'Get Many', value: 'getAll', action: 'Get many accounts', description: 'WHM function: listaccts' },
			{ name: 'Get Suspended', value: 'getSuspended', action: 'Get suspended accounts', description: 'WHM function: listsuspended' },
			{ name: 'Modify', value: 'modify', action: 'Modify an account', description: 'WHM function: modifyacct' },
			{ name: 'Set Bandwidth Limit', value: 'setBandwidthLimit', action: 'Set an account bandwidth limit', description: 'WHM function: limitbw' },
			{ name: 'Set Disk Quota', value: 'setDiskQuota', action: 'Set an account disk quota', description: 'WHM function: editquota' },
			{ name: 'Suspend', value: 'suspend', action: 'Suspend an account', description: 'WHM function: suspendacct' },
			{ name: 'Terminate', value: 'terminate', action: 'Terminate an account', description: 'WHM function: removeacct' },
			{ name: 'Unsuspend', value: 'unsuspend', action: 'Unsuspend an account', description: 'WHM function: unsuspendacct' },
		],
		default: 'getAll',
	},
];

const userField = (operations: string[], description?: string): INodeProperties => ({
	displayName: 'Username',
	name: 'user',
	type: 'string',
	default: '',
	required: true,
	placeholder: 'examplecom',
	description: description ?? 'The cPanel account username',
	displayOptions: show(operations),
});

export const accountFields: INodeProperties[] = [
	// ---- Create ----
	{ displayName: 'Username', name: 'username', type: 'string', default: '', required: true, placeholder: 'examplecom', description: 'System username for the new account. Lowercase letters and digits, max 16 characters, must not start with a digit or "test".', displayOptions: show(['create']) },
	{ displayName: 'Domain', name: 'domain', type: 'string', default: '', required: true, placeholder: 'example.com', description: 'The primary domain of the new account', displayOptions: show(['create']) },
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['create']),
		options: [
			{ displayName: 'Bandwidth Limit (MB)', name: 'bwlimit', type: 'number', default: 0, description: 'Monthly bandwidth limit in MB. 0 = unlimited. Ignored when a package is set.' },
			{ displayName: 'CGI Access', name: 'cgi', type: 'boolean', default: true, description: 'Whether the account may run CGI scripts' },
			{ displayName: 'Contact Email', name: 'contactemail', type: 'string', placeholder: 'name@email.com', default: '' },
			{ displayName: 'Dedicated IP', name: 'ip', type: 'options', default: 'n', options: [{ name: 'No (Shared)', value: 'n' }, { name: 'Yes (Dedicated)', value: 'y' }], description: 'Whether to assign a dedicated IP address from the free pool' },
			{ displayName: 'Enable DKIM', name: 'dkim', type: 'boolean', default: true, description: 'Whether to create DKIM keys for the domain' },
			{ displayName: 'Enable SPF', name: 'spf', type: 'boolean', default: true, description: 'Whether to add an SPF record for the domain' },
			{ displayName: 'Feature List', name: 'featurelist', type: 'string', default: '', description: 'Name of the feature list to assign' },
			{ displayName: 'Force DNS Overwrite', name: 'forcedns', type: 'boolean', default: false, description: 'Whether to overwrite an existing DNS zone for the domain' },
			{ displayName: 'Language', name: 'language', type: 'string', default: '', placeholder: 'en' },
			{ displayName: 'Mailbox Format', name: 'mailbox_format', type: 'options', default: 'maildir', options: [{ name: 'Maildir', value: 'maildir' }, { name: 'Mdbox', value: 'mdbox' }] },
			{ displayName: 'Max Addon Domains', name: 'maxaddon', type: 'string', default: '', description: 'A number, or "unlimited"' },
			{ displayName: 'Max Email Accounts', name: 'maxpop', type: 'string', default: '', description: 'A number, or "unlimited"' },
			{ displayName: 'Max Emails Per Hour', name: 'max_email_per_hour', type: 'string', default: '', description: 'A number, or "unlimited"' },
			{ displayName: 'Max FTP Accounts', name: 'maxftp', type: 'string', default: '', description: 'A number, or "unlimited"' },
			{ displayName: 'Max Mailing Lists', name: 'maxlst', type: 'string', default: '', description: 'A number, or "unlimited"' },
			{ displayName: 'Max Parked Domains', name: 'maxpark', type: 'string', default: '', description: 'A number, or "unlimited"' },
			{ displayName: 'Max SQL Databases', name: 'maxsql', type: 'string', default: '', description: 'A number, or "unlimited"' },
			{ displayName: 'Max Subdomains', name: 'maxsub', type: 'string', default: '', description: 'A number, or "unlimited"' },
			{ displayName: 'MX Check', name: 'mxcheck', type: 'options', default: 'auto', options: [{ name: 'Auto', value: 'auto' }, { name: 'Local', value: 'local' }, { name: 'Remote', value: 'remote' }, { name: 'Secondary', value: 'secondary' }], description: 'How the server handles mail for the domain' },
			{ displayName: 'Owner (Reseller)', name: 'owner', type: 'string', default: '', description: 'Username of the reseller that owns the account. Defaults to the authenticating user.' },
			{ displayName: 'Package', name: 'plan', type: 'string', default: '', description: 'Name of the package (plan) to assign. Package values override the individual limits below.' },
			{ displayName: 'Password', name: 'password', type: 'string', typeOptions: { password: true }, default: '', description: 'Account password. If omitted WHM generates a random one and returns it.' },
			{ displayName: 'Quota (MB)', name: 'quota', type: 'number', default: 0, description: 'Disk quota in MB. 0 = unlimited. Ignored when a package is set.' },
			{ displayName: 'Reseller Privileges', name: 'reseller', type: 'boolean', default: false, description: 'Whether to give the new account reseller privileges' },
			{ displayName: 'Shell Access', name: 'hasshell', type: 'boolean', default: false, description: 'Whether the account gets SSH / shell access' },
			{ displayName: 'Theme', name: 'cpmod', type: 'string', default: '', placeholder: 'jupiter', description: 'Theme name, e.g. jupiter' },
			{ displayName: 'Use Registered Nameservers', name: 'useregns', type: 'boolean', default: false, description: 'Whether to use the nameservers registered for the domain instead of the server defaults' },
		],
	},

	// ---- Get ----
	{ displayName: 'Look Up By', name: 'lookupBy', type: 'options', default: 'user', options: [{ name: 'Domain', value: 'domain' }, { name: 'Username', value: 'user' }], displayOptions: show(['get']) },
	{ displayName: 'Username', name: 'user', type: 'string', default: '', required: true, displayOptions: { show: { resource: ['account'], operation: ['get'], lookupBy: ['user'] } } },
	{ displayName: 'Domain', name: 'domain', type: 'string', default: '', required: true, placeholder: 'example.com', description: 'Any domain on the account (primary, addon, parked or sub)', displayOptions: { show: { resource: ['account'], operation: ['get'], lookupBy: ['domain'] } } },

	// ---- Get Many ----
	...paginationFor('account', ['getAll', 'getSuspended', 'getDiskUsage']),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: show(['getAll']),
		options: [
			{ displayName: 'Fields to Return', name: 'want', type: 'string', default: '', placeholder: 'user,domain,plan,suspended', description: 'Comma-separated list of fields to include in each record. Leave empty for all fields.' },
			{ displayName: 'Search', name: 'search', type: 'string', default: '', description: 'Perl-compatible regular expression matched against the field chosen in Search Type' },
			{ displayName: 'Search Type', name: 'searchtype', type: 'options', default: 'user', options: [{ name: 'Domain', value: 'domain' }, { name: 'IP Address', value: 'ip' }, { name: 'Owner', value: 'owner' }, { name: 'Package', value: 'package' }, { name: 'Username', value: 'user' }] },
		],
	},
	listOptionsFor('account', ['getAll', 'getSuspended', 'getDiskUsage']),

	// ---- Modify ----
	userField(['modify']),
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['modify']),
		options: [
			{ displayName: 'Bandwidth Limit (MB)', name: 'BWLIMIT', type: 'string', default: '', description: 'A number in MB, or "unlimited"' },
			{ displayName: 'CGI Access', name: 'HASCGI', type: 'boolean', default: true, description: 'Whether the account may run CGI scripts' },
			{ displayName: 'Contact Email', name: 'contactemail', type: 'string', placeholder: 'name@email.com', default: '' },
			{ displayName: 'Enable DKIM', name: 'HASDKIM', type: 'boolean', default: true, description: 'Whether DKIM is enabled for the account' },
			{ displayName: 'Enable SPF', name: 'HASSPF', type: 'boolean', default: true, description: 'Whether SPF is enabled for the account' },
			{ displayName: 'Hold Outgoing Mail', name: 'outgoing_mail_hold', type: 'boolean', default: false, description: 'Whether to hold (queue) outgoing mail from the account' },
			{ displayName: 'Language', name: 'LANG', type: 'string', default: '' },
			{ displayName: 'Locale', name: 'LOCALE', type: 'string', default: '', placeholder: 'en' },
			{ displayName: 'Max Addon Domains', name: 'MAXADDON', type: 'string', default: '', description: 'A number, or "unlimited"' },
			{ displayName: 'Max Deferred Mail Percentage', name: 'MAX_DEFER_FAIL_PERCENTAGE', type: 'string', default: '', description: 'A number, or "unlimited"' },
			{ displayName: 'Max Email Accounts', name: 'MAXPOP', type: 'string', default: '', description: 'A number, or "unlimited"' },
			{ displayName: 'Max Emails Per Hour', name: 'MAX_EMAIL_PER_HOUR', type: 'string', default: '', description: 'A number, or "unlimited"' },
			{ displayName: 'Max FTP Accounts', name: 'MAXFTP', type: 'string', default: '', description: 'A number, or "unlimited"' },
			{ displayName: 'Max Mailing Lists', name: 'MAXLST', type: 'string', default: '', description: 'A number, or "unlimited"' },
			{ displayName: 'Max Parked Domains', name: 'MAXPARK', type: 'string', default: '', description: 'A number, or "unlimited"' },
			{ displayName: 'Max SQL Databases', name: 'MAXSQL', type: 'string', default: '', description: 'A number, or "unlimited"' },
			{ displayName: 'Max Subdomains', name: 'MAXSUB', type: 'string', default: '', description: 'A number, or "unlimited"' },
			{ displayName: 'New Primary Domain', name: 'DNS', type: 'string', default: '', placeholder: 'example.com', description: 'Change the primary domain of the account' },
			{ displayName: 'New Username', name: 'newuser', type: 'string', default: '', description: 'Rename the account. Only allowed when the server permits username changes.' },
			{ displayName: 'Owner (Reseller)', name: 'owner', type: 'string', default: '' },
			{ displayName: 'Shell', name: 'shell', type: 'string', default: '', placeholder: '/bin/bash', description: 'Path to the login shell, e.g. /bin/bash, /usr/local/cpanel/bin/jailshell or /usr/local/cpanel/bin/noshell' },
			{ displayName: 'Suspend Outgoing Mail', name: 'outgoing_mail_suspended', type: 'boolean', default: false, description: 'Whether to suspend outgoing mail from the account' },
			{ displayName: 'Theme', name: 'CPTHEME', type: 'string', default: '', placeholder: 'jupiter' },
		],
	},

	// ---- Suspend ----
	userField(['suspend']),
	{ displayName: 'Reason', name: 'reason', type: 'string', default: '', description: 'Reason shown in WHM and to the account owner', displayOptions: show(['suspend']) },
	{ displayName: 'Prevent Reseller Unsuspend', name: 'disallow', type: 'boolean', default: false, description: 'Whether to block the owning reseller from unsuspending the account (root only)', displayOptions: show(['suspend']) },

	// ---- Unsuspend ----
	userField(['unsuspend']),

	// ---- Terminate ----
	userField(['terminate']),
	{ displayName: 'Keep DNS Zone', name: 'keepdns', type: 'boolean', default: false, description: 'Whether to keep the DNS zone(s) after removing the account', displayOptions: show(['terminate']) },

	// ---- Change Package ----
	userField(['changePackage']),
	{ displayName: 'Package', name: 'pkg', type: 'string', default: '', required: true, description: 'Name of the package to assign', displayOptions: show(['changePackage']) },

	// ---- Change Password ----
	userField(['changePassword']),
	{ displayName: 'New Password', name: 'password', type: 'string', typeOptions: { password: true }, default: '', required: true, displayOptions: show(['changePassword']) },
	{ displayName: 'Update Database Password', name: 'db_pass_update', type: 'boolean', default: false, description: 'Whether to also change the MySQL / PostgreSQL password for the account', displayOptions: show(['changePassword']) },

	// ---- Set Bandwidth Limit ----
	userField(['setBandwidthLimit']),
	{ displayName: 'Bandwidth Limit (MB)', name: 'bwlimit', type: 'string', default: '', required: true, description: 'A number in MB, or "unlimited"', displayOptions: show(['setBandwidthLimit']) },

	// ---- Set Disk Quota ----
	userField(['setDiskQuota']),
	{ displayName: 'Quota (MB)', name: 'quota', type: 'string', default: '', required: true, description: 'A number in MB, or "unlimited" (0 also means unlimited)', displayOptions: show(['setDiskQuota']) },

	// ---- Change IP ----
	userField(['changeIp'], 'The account to move. Leave empty and use Custom Parameters with "domain" to target by domain instead.'),
	{ displayName: 'IP Address', name: 'ip', type: 'string', default: '', required: true, description: 'The IP address to assign. Must already exist on the server.', displayOptions: show(['changeIp']) },

	// ---- Bandwidth ----
	{
		displayName: 'Filters',
		name: 'bandwidthFilters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: show(['getBandwidth']),
		options: [
			{ displayName: 'Month', name: 'month', type: 'number', default: 0, description: 'Month number (1-12). Defaults to the current month.' },
			{ displayName: 'Reseller', name: 'showres', type: 'string', default: '', description: 'Only show accounts owned by this reseller' },
			{ displayName: 'Search', name: 'search', type: 'string', default: '', description: 'Regular expression matched against the Search Type field' },
			{ displayName: 'Search Type', name: 'searchtype', type: 'options', default: 'user', options: [{ name: 'Domain', value: 'domain' }, { name: 'IP Address', value: 'ip' }, { name: 'Owner', value: 'owner' }, { name: 'Package', value: 'package' }, { name: 'Username', value: 'user' }] },
			{ displayName: 'Year', name: 'year', type: 'number', default: 0, description: 'Four-digit year. Defaults to the current year.' },
		],
	},

	// ---- Disk Usage ----
	{ displayName: 'Cache Mode', name: 'cache_mode', type: 'options', default: 'on', options: [{ name: 'Off (Recalculate)', value: 'off' }, { name: 'On (Use Cached)', value: 'on' }], description: 'Whether to use cached usage data (fast) or recompute it (slow on large servers)', displayOptions: show(['getDiskUsage']) },

	// ---- Create Session ----
	userField(['createSession']),
	{ displayName: 'Service', name: 'service', type: 'options', default: 'cpaneld', options: [{ name: 'cPanel', value: 'cpaneld' }, { name: 'Webmail', value: 'webmaild' }, { name: 'WHM', value: 'whostmgrd' }], description: 'Which interface the login URL opens', displayOptions: show(['createSession']) },
	{
		displayName: 'Additional Fields',
		name: 'sessionFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['createSession']),
		options: [
			{ displayName: 'App', name: 'app', type: 'string', default: '', placeholder: 'Email_Accounts', description: 'Interface to open directly after login, e.g. Email_Accounts or FileManager_Home' },
			{ displayName: 'Locale', name: 'locale', type: 'string', default: '', placeholder: 'en' },
		],
	},

	// ---- Force Password Change ----
	{ displayName: 'Usernames', name: 'users', type: 'string', default: '', required: true, placeholder: 'user1,user2', description: 'Comma-separated list of accounts that must change their password at next login', displayOptions: show(['forcePasswordChange']) },
	{ displayName: 'Stop On Failure', name: 'stop_on_failure', type: 'boolean', default: false, description: 'Whether to stop processing the list at the first failure', displayOptions: show(['forcePasswordChange']) },

	customParametersFor('account'),
];
