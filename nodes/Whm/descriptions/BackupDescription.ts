import type { INodeProperties } from 'n8n-workflow';
import { customParametersFor, listOptionsFor, paginationFor, showFor } from './SharedFields';

const show = showFor('backup');

export const backupOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: show(),
		options: [
			{ name: 'Get Backup Dates', value: 'getDates', action: 'Get available backup dates', description: 'WHM function: backup_date_list' },
			{ name: 'Get Backup Users', value: 'getUsers', action: 'Get users with backups', description: 'WHM function: backup_user_list' },
			{ name: 'Get Configuration', value: 'getConfig', action: 'Get the backup configuration', description: 'WHM function: backup_config_get' },
			{ name: 'Get Skip-All Status', value: 'getSkipAllStatus', action: 'Get whether all users are skipped', description: 'WHM function: backup_skip_users_all_status' },
			{ name: 'Get User Backup Sets', value: 'getSets', action: 'Get backup sets for a user', description: 'WHM function: backup_set_list' },
			{ name: 'Restore Account', value: 'restoreAccount', action: 'Restore an account from a backup', description: 'WHM function: restoreaccount' },
			{ name: 'Restore From Archive', value: 'restoreArchive', action: 'Restore an account from a cpmove archive', description: 'WHM function: restorepkg' },
			{ name: 'Set Configuration', value: 'setConfig', action: 'Update the backup configuration', description: 'WHM function: backup_config_set' },
			{ name: 'Skip All Users', value: 'skipAll', action: 'Enable or disable backups for all users', description: 'WHM function: backup_skip_users_all' },
			{ name: 'Toggle User Backups', value: 'toggleUser', action: 'Toggle backups for a user', description: 'WHM function: toggle_user_backup_state' },
		],
		default: 'getConfig',
	},
];

export const backupFields: INodeProperties[] = [
	...paginationFor('backup', ['getDates', 'getUsers', 'getSets']),
	listOptionsFor('backup', ['getDates', 'getUsers', 'getSets']),
	// ---- Users / sets ----
	{ displayName: 'Restore Point (Date)', name: 'restore_point', type: 'string', default: '', placeholder: '2026-01-31', description: 'Backup date in YYYY-MM-DD form. Leave empty for all.', displayOptions: show(['getUsers']) },
	{ displayName: 'Username', name: 'user', type: 'string', default: '', required: true, displayOptions: show(['getSets', 'toggleUser']) },
	{ displayName: 'Restore Point (Date)', name: 'restore_point', type: 'string', default: '', placeholder: '2026-01-31', description: 'Restrict to this backup date (YYYY-MM-DD)', displayOptions: show(['getSets']) },
	{ displayName: 'Legacy Backups', name: 'legacy', type: 'boolean', default: false, description: 'Whether to toggle the legacy backup setting instead of the current backup system', displayOptions: show(['toggleUser']) },

	// ---- Skip all ----
	{ displayName: 'Skip', name: 'state', type: 'boolean', default: true, description: 'Whether to skip (disable) backups for every user', displayOptions: show(['skipAll']) },

	// ---- Restore account ----
	{ displayName: 'Username', name: 'user', type: 'string', default: '', required: true, description: 'The account to restore', displayOptions: show(['restoreAccount']) },
	{ displayName: 'Backup Date', name: 'timestamp', type: 'string', default: '', required: true, placeholder: '2026-01-31', description: 'The backup date to restore from (YYYY-MM-DD), see Get Backup Dates', displayOptions: show(['restoreAccount']) },
	{
		displayName: 'Restore Options',
		name: 'restoreOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: show(['restoreAccount', 'restoreArchive']),
		options: [
			{ displayName: 'Dedicated IP', name: 'give_ip', type: 'boolean', default: false, description: 'Whether to assign a dedicated IP to the restored account' },
			{ displayName: 'Restore Mail Configuration', name: 'mail_config', type: 'boolean', default: true, description: 'Whether to restore the mail configuration' },
			{ displayName: 'Restore MySQL', name: 'mysql', type: 'boolean', default: true, description: 'Whether to restore MySQL databases' },
			{ displayName: 'Restore Subdomains', name: 'subdomains', type: 'boolean', default: true, description: 'Whether to restore subdomains' },
		],
	},

	// ---- Restore archive ----
	{ displayName: 'Username', name: 'username', type: 'string', default: '', required: true, description: 'The account name of the cpmove archive in /home (e.g. cpmove-USER.tar.gz)', displayOptions: show(['restoreArchive']) },
	{ displayName: 'IP Address', name: 'ip', type: 'string', default: '', description: 'IP to assign. Leave empty for the server\'s shared IP.', displayOptions: show(['restoreArchive']) },

	// ---- Set configuration ----
	{
		displayName: 'Settings',
		name: 'backupSettings',
		type: 'collection',
		placeholder: 'Add Setting',
		default: {},
		description: 'Only the settings you add are changed. Any other backup_config_set parameter can be sent via Custom Parameters.',
		displayOptions: show(['setConfig']),
		options: [
			{ displayName: 'Backup Accounts', name: 'backupaccts', type: 'boolean', default: true, description: 'Whether to back up user accounts' },
			{ displayName: 'Backup Databases', name: 'backupsql', type: 'options', default: 'accounts', options: [{ name: 'Per Account Only', value: 'accounts' }, { name: 'Entire MySQL Directory', value: 'entire' }, { name: 'Both', value: 'both' }] },
			{ displayName: 'Backup Directory', name: 'backupdir', type: 'string', default: '/backup' },
			{ displayName: 'Backup Enabled', name: 'backupenable', type: 'boolean', default: true, description: 'Whether backups are enabled' },
			{ displayName: 'Backup Logs', name: 'backuplogs', type: 'boolean', default: false, description: 'Whether to back up access logs' },
			{ displayName: 'Backup System Files', name: 'backupfiles', type: 'boolean', default: true, description: 'Whether to back up system files' },
			{ displayName: 'Backup Type', name: 'backuptype', type: 'options', default: 'compressed', options: [{ name: 'Compressed', value: 'compressed' }, { name: 'Incremental', value: 'incremental' }, { name: 'Uncompressed', value: 'uncompressed' }] },
			{ displayName: 'Daily Backups Enabled', name: 'backup_daily_enable', type: 'boolean', default: true, description: 'Whether daily backups run' },
			{ displayName: 'Daily Retention', name: 'backup_daily_retention', type: 'number', default: 1, description: 'Number of daily backups to keep' },
			{ displayName: 'Days', name: 'backupdays', type: 'string', default: '0,1,2,3,4,5,6', description: 'Comma-separated weekdays (0 = Sunday) on which daily backups run' },
			{ displayName: 'Keep Local Copy', name: 'keeplocal', type: 'boolean', default: true, description: 'Whether to keep a local copy when remote destinations are configured' },
			{ displayName: 'Minimum Free Space (MB)', name: 'min_free_space', type: 'number', default: 0 },
			{ displayName: 'Monthly Backups Enabled', name: 'backup_monthly_enable', type: 'boolean', default: false, description: 'Whether monthly backups run' },
			{ displayName: 'Monthly Retention', name: 'backup_monthly_retention', type: 'number', default: 1 },
			{ displayName: 'Weekly Backups Enabled', name: 'backup_weekly_enable', type: 'boolean', default: false, description: 'Whether weekly backups run' },
			{ displayName: 'Weekly Retention', name: 'backup_weekly_retention', type: 'number', default: 1 },
		],
	},

	customParametersFor('backup'),
];
