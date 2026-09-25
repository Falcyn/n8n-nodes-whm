import type { INodeProperties } from 'n8n-workflow';
import { customParametersFor, listOptionsFor, paginationFor, showFor } from './SharedFields';

const show = showFor('service');

export const serviceOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: show(),
		options: [
			{ name: 'Configure', value: 'configure', action: 'Enable disable or monitor a service', description: 'WHM function: configureservice' },
			{ name: 'Get Status', value: 'getStatus', action: 'Get service status', description: 'WHM function: servicestatus' },
			{ name: 'Restart', value: 'restart', action: 'Restart a service', description: 'WHM function: restartservice' },
		],
		default: 'getStatus',
	},
];


export const serviceFields: INodeProperties[] = [
	...paginationFor('service', ['getStatus']),
	listOptionsFor('service', ['getStatus']),
	{
		displayName: 'Service',
		name: 'service',
		type: 'string',
		default: '',
		placeholder: 'httpd',
		description: 'Service name as shown in WHM » Service Manager. Leave empty to return every service.',
		displayOptions: show(['getStatus']),
	},
	{
		displayName: 'Service',
		name: 'serviceName',
		type: 'options',
		default: 'httpd',
		options: [
			{ name: 'Apache', value: 'httpd' },
			{ name: 'cPanel Service', value: 'cpsrvd' },
			{ name: 'cPHulk Brute Force Protection', value: 'cphulkd' },
			{ name: 'Cron', value: 'crond' },
			{ name: 'DNS Server', value: 'named' },
			{ name: 'Dovecot IMAP/POP3', value: 'imap' },
			{ name: 'Exim', value: 'exim' },
			{ name: 'FTP', value: 'ftpd' },
			{ name: 'MySQL', value: 'mysql' },
			{ name: 'Other (Enter Name)', value: '__other__' },
			{ name: 'PHP-FPM for Apache', value: 'apache_php_fpm' },
			{ name: 'PostgreSQL', value: 'postgresql' },
			{ name: 'SpamAssassin', value: 'spamd' },
			{ name: 'SSH', value: 'sshd' },
			{ name: 'TailWatch', value: 'tailwatchd' },
		],
		displayOptions: show(['restart', 'configure']),
	},
	{
		displayName: 'Service Name',
		name: 'serviceOther',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'clamd',
		description: 'Exact service name as known to WHM',
		displayOptions: { show: { resource: ['service'], operation: ['restart', 'configure'], serviceName: ['__other__'] } },
	},
	{ displayName: 'Enabled', name: 'enabled', type: 'boolean', default: true, description: 'Whether the service is enabled', displayOptions: show(['configure']) },
	{ displayName: 'Monitored', name: 'monitored', type: 'boolean', default: true, description: 'Whether ChkServd monitors and auto-restarts the service', displayOptions: show(['configure']) },

	customParametersFor('service'),
];
