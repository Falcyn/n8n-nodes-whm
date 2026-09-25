import type { INodeProperties } from 'n8n-workflow';
import { cpanelUserFor, customParametersFor, paginationFor, showFor } from './SharedFields';

const show = showFor('cpanelFtp');

export const cpanelFtpOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: show(),
		options: [
			{ name: 'Change Password', value: 'changePassword', action: 'Change an FTP account password', description: 'UAPI: Ftp::passwd' },
			{ name: 'Create', value: 'create', action: 'Create an FTP account', description: 'UAPI: Ftp::add_ftp' },
			{ name: 'Delete', value: 'delete', action: 'Delete an FTP account', description: 'UAPI: Ftp::delete_ftp' },
			{ name: 'Get Many', value: 'getAll', action: 'Get many FTP accounts', description: 'UAPI: Ftp::list_ftp_with_disk' },
			{ name: 'Set Home Directory', value: 'setHomedir', action: 'Set an FTP account home directory', description: 'UAPI: Ftp::set_homedir' },
			{ name: 'Set Quota', value: 'setQuota', action: 'Set an FTP account quota', description: 'UAPI: Ftp::set_quota' },
		],
		default: 'getAll',
	},
];

export const cpanelFtpFields: INodeProperties[] = [
	cpanelUserFor('cpanelFtp'),
	...paginationFor('cpanelFtp', ['getAll']),

	{ displayName: 'FTP Username', name: 'user', type: 'string', default: '', required: true, placeholder: 'uploads', description: 'The FTP account name (without the @domain part). cPanel serves it as name@primarydomain.', displayOptions: show(['create', 'delete', 'changePassword', 'setQuota', 'setHomedir']) },
	{ displayName: 'Password', name: 'pass', type: 'string', typeOptions: { password: true }, default: '', required: true, displayOptions: show(['create', 'changePassword']) },
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['create']),
		options: [
			{ displayName: 'Home Directory', name: 'homedir', type: 'string', default: '', placeholder: 'public_html/uploads', description: 'Directory relative to the account home. Defaults to a folder named after the FTP user.' },
			{ displayName: 'Quota (MB)', name: 'quota', type: 'number', default: 0, description: '0 = unlimited' },
		],
	},
	{ displayName: 'Quota (MB)', name: 'quota', type: 'number', default: 0, required: true, description: '0 = unlimited', displayOptions: show(['setQuota']) },
	{ displayName: 'Home Directory', name: 'homedir', type: 'string', default: '', required: true, placeholder: 'public_html/uploads', description: 'Directory relative to the account home', displayOptions: show(['setHomedir']) },
	{ displayName: 'Delete Home Directory', name: 'destroy', type: 'boolean', default: false, description: 'Whether to also delete the FTP account\'s home directory and its contents', displayOptions: show(['delete']) },

	customParametersFor('cpanelFtp'),
];
