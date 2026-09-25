import type { INodeProperties } from 'n8n-workflow';
import { cpanelUserFor, customParametersFor, paginationFor, showFor } from './SharedFields';

const show = showFor('cpanelEmail');

export const cpanelEmailOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: show(),
		options: [
			{ name: 'Add Forwarder', value: 'addForwarder', action: 'Add an email forwarder', description: 'UAPI: Email::add_forwarder' },
			{ name: 'Change Password', value: 'changePassword', action: 'Change an email account password', description: 'UAPI: Email::passwd_pop' },
			{ name: 'Create', value: 'create', action: 'Create an email account', description: 'UAPI: Email::add_pop' },
			{ name: 'Delete', value: 'delete', action: 'Delete an email account', description: 'UAPI: Email::delete_pop' },
			{ name: 'Delete Forwarder', value: 'deleteForwarder', action: 'Delete an email forwarder', description: 'UAPI: Email::delete_forwarder' },
			{ name: 'Get Forwarders', value: 'getForwarders', action: 'Get email forwarders', description: 'UAPI: Email::list_forwarders' },
			{ name: 'Get Mail Domains', value: 'getMailDomains', action: 'Get domains that can receive mail', description: 'UAPI: Email::list_mail_domains' },
			{ name: 'Get Many', value: 'getAll', action: 'Get many email accounts', description: 'UAPI: Email::list_pops_with_disk — includes quota and disk usage' },
			{ name: 'Get Quota', value: 'getQuota', action: 'Get an email account quota', description: 'UAPI: Email::get_pop_quota' },
			{ name: 'Set Quota', value: 'setQuota', action: 'Set an email account quota', description: 'UAPI: Email::edit_pop_quota' },
			{ name: 'Suspend Login', value: 'suspendLogin', action: 'Suspend logins for an email account', description: 'UAPI: Email::suspend_login' },
			{ name: 'Unsuspend Login', value: 'unsuspendLogin', action: 'Unsuspend logins for an email account', description: 'UAPI: Email::unsuspend_login' },
		],
		default: 'getAll',
	},
];

const emailField = (operations: string[], description = 'The full email address, e.g. user@example.com'): INodeProperties => ({
	displayName: 'Email Address',
	name: 'email',
	type: 'string',
	default: '',
	required: true,
	placeholder: 'name@email.com',
	description,
	displayOptions: show(operations),
});

export const cpanelEmailFields: INodeProperties[] = [
	cpanelUserFor('cpanelEmail'),

	// ---- Get Many ----
	...paginationFor('cpanelEmail', ['getAll', 'getForwarders', 'getMailDomains']),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: show(['getAll']),
		options: [
			{ displayName: 'Domain', name: 'domain', type: 'string', default: '', placeholder: 'example.com', description: 'Only accounts on this domain' },
			{ displayName: 'Include Default Account', name: 'include_main', type: 'boolean', default: false, description: 'Whether to include the account\'s default (system) mailbox' },
			{ displayName: 'Regex', name: 'regex', type: 'string', default: '', description: 'Perl regular expression matched against the address' },
		],
	},

	// ---- Create ----
	emailField(['create'], 'The full address to create. The domain must belong to the cPanel account.'),
	{ displayName: 'Password', name: 'password', type: 'string', typeOptions: { password: true }, default: '', required: true, displayOptions: show(['create']) },
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['create']),
		options: [
			{ displayName: 'Quota (MB)', name: 'quota', type: 'number', default: 0, description: 'Mailbox size in MB. 0 = unlimited.' },
			{ displayName: 'Send Welcome Email', name: 'send_welcome_email', type: 'boolean', default: false, description: 'Whether to send the client-configuration welcome email to the new mailbox' },
			{ displayName: 'Skip Database Update', name: 'skip_update_db', type: 'boolean', default: false, description: 'Whether to skip updating the mail database (faster for bulk creation; run a rebuild afterwards)' },
		],
	},

	// ---- Delete ----
	emailField(['delete']),
	{ displayName: 'Keep Mail Data', name: 'flags', type: 'options', default: '', options: [{ name: 'Delete Mailbox Data', value: '' }, { name: 'Keep Mailbox Data', value: 'keep_mail_data' }], description: 'Whether to keep the mailbox files on disk after removing the account', displayOptions: show(['delete']) },

	// ---- Change password ----
	emailField(['changePassword']),
	{ displayName: 'New Password', name: 'password', type: 'string', typeOptions: { password: true }, default: '', required: true, displayOptions: show(['changePassword']) },

	// ---- Quota ----
	emailField(['getQuota', 'setQuota', 'suspendLogin', 'unsuspendLogin']),
	{ displayName: 'Quota (MB)', name: 'quota', type: 'number', default: 0, required: true, description: 'Mailbox size in MB. 0 = unlimited.', displayOptions: show(['setQuota']) },

	// ---- Forwarders ----
	{ displayName: 'Domain', name: 'domain', type: 'string', default: '', placeholder: 'example.com', description: 'Only forwarders on this domain. Leave empty for all.', displayOptions: show(['getForwarders']) },
	{ displayName: 'Domain', name: 'domain', type: 'string', default: '', required: true, placeholder: 'example.com', description: 'The domain of the address being forwarded', displayOptions: show(['addForwarder']) },
	{ displayName: 'Address to Forward', name: 'email', type: 'string', default: '', required: true, placeholder: 'sales', description: 'The local part (before the @) of the address to forward, or a full address on the domain', displayOptions: show(['addForwarder']) },
	{
		displayName: 'Forward To',
		name: 'fwdopt',
		type: 'options',
		default: 'fwd',
		options: [
			{ name: 'Blackhole (Discard)', value: 'blackhole' },
			{ name: 'Email Address', value: 'fwd' },
			{ name: 'Fail With Message', value: 'fail' },
			{ name: 'Pipe to Program', value: 'pipe' },
			{ name: 'System Account', value: 'system' },
		],
		displayOptions: show(['addForwarder']),
	},
	{ displayName: 'Destination', name: 'fwdemail', type: 'string', default: '', placeholder: 'name@email.com', description: 'The destination address (Email Address), program path (Pipe) or system user (System Account)', displayOptions: { show: { resource: ['cpanelEmail'], operation: ['addForwarder'], fwdopt: ['fwd', 'pipe', 'system'] } } },
	{ displayName: 'Failure Message', name: 'failmsgs', type: 'string', default: '', displayOptions: { show: { resource: ['cpanelEmail'], operation: ['addForwarder'], fwdopt: ['fail'] } } },
	{ displayName: 'Address', name: 'address', type: 'string', default: '', required: true, placeholder: 'sales@example.com', description: 'The forwarded address', displayOptions: show(['deleteForwarder']) },
	{ displayName: 'Forwarder Destination', name: 'forwarder', type: 'string', default: '', required: true, placeholder: 'name@email.com', description: 'The exact destination the forwarder points to', displayOptions: show(['deleteForwarder']) },

	customParametersFor('cpanelEmail'),
];
