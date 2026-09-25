import type { INodeProperties } from 'n8n-workflow';
import { cpanelUserFor, customParametersFor, paginationFor, showFor } from './SharedFields';

const show = showFor('cpanelDatabase');

export const cpanelDatabaseOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: show(),
		options: [
			{ name: 'Add Remote Host', value: 'addHost', action: 'Allow a remote host to connect', description: 'UAPI: Mysql::add_host' },
			{ name: 'Create Database', value: 'create', action: 'Create a database', description: 'UAPI: Mysql::create_database' },
			{ name: 'Create User', value: 'createUser', action: 'Create a database user', description: 'UAPI: Mysql::create_user' },
			{ name: 'Delete Database', value: 'delete', action: 'Delete a database', description: 'UAPI: Mysql::delete_database' },
			{ name: 'Delete Remote Host', value: 'deleteHost', action: 'Remove a remote host', description: 'UAPI: Mysql::delete_host' },
			{ name: 'Delete User', value: 'deleteUser', action: 'Delete a database user', description: 'UAPI: Mysql::delete_user' },
			{ name: 'Get Many', value: 'getAll', action: 'Get many databases', description: 'UAPI: Mysql::list_databases' },
			{ name: 'Get Privileges', value: 'getPrivileges', action: 'Get a user privileges on a database', description: 'UAPI: Mysql::get_privileges_on_database' },
			{ name: 'Get Users', value: 'getUsers', action: 'Get many database users', description: 'UAPI: Mysql::list_users' },
			{ name: 'Rename Database', value: 'rename', action: 'Rename a database', description: 'UAPI: Mysql::rename_database' },
			{ name: 'Set Privileges', value: 'setPrivileges', action: 'Set a user privileges on a database', description: 'UAPI: Mysql::set_privileges_on_database' },
			{ name: 'Set User Password', value: 'setUserPassword', action: 'Set a database user password', description: 'UAPI: Mysql::set_password' },
		],
		default: 'getAll',
	},
];

const prefixNote =
	'Include the account\'s database prefix if prefixing is enabled on the server, e.g. "examplecom_shop"';

export const cpanelDatabaseFields: INodeProperties[] = [
	cpanelUserFor('cpanelDatabase'),
	...paginationFor('cpanelDatabase', ['getAll', 'getUsers']),

	// ---- Database name ----
	{ displayName: 'Database Name', name: 'name', type: 'string', default: '', required: true, placeholder: 'examplecom_shop', description: prefixNote, displayOptions: show(['create', 'delete']) },
	{ displayName: 'Current Name', name: 'oldname', type: 'string', default: '', required: true, description: prefixNote, displayOptions: show(['rename']) },
	{ displayName: 'New Name', name: 'newname', type: 'string', default: '', required: true, description: prefixNote, displayOptions: show(['rename']) },

	// ---- Users ----
	{ displayName: 'Database User', name: 'name', type: 'string', default: '', required: true, placeholder: 'examplecom_app', description: prefixNote, displayOptions: show(['createUser', 'deleteUser']) },
	{ displayName: 'Password', name: 'password', type: 'string', typeOptions: { password: true }, default: '', required: true, displayOptions: show(['createUser', 'setUserPassword']) },
	{ displayName: 'Database User', name: 'user', type: 'string', default: '', required: true, placeholder: 'examplecom_app', description: prefixNote, displayOptions: show(['setUserPassword', 'setPrivileges', 'getPrivileges']) },

	// ---- Privileges ----
	{ displayName: 'Database Name', name: 'database', type: 'string', default: '', required: true, placeholder: 'examplecom_shop', description: prefixNote, displayOptions: show(['setPrivileges', 'getPrivileges']) },
	{ displayName: 'Privileges', name: 'privileges', type: 'string', default: 'ALL PRIVILEGES', required: true, placeholder: 'SELECT,INSERT,UPDATE,DELETE', description: 'Comma-separated MySQL privileges, or "ALL PRIVILEGES"', displayOptions: show(['setPrivileges']) },

	// ---- Hosts ----
	{ displayName: 'Host', name: 'host', type: 'string', default: '', required: true, placeholder: '203.0.113.10 or %.example.com', description: 'Hostname, IP address or wildcard pattern allowed to connect remotely', displayOptions: show(['addHost', 'deleteHost']) },

	customParametersFor('cpanelDatabase'),
];
