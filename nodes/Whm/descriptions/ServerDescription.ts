import type { INodeProperties } from 'n8n-workflow';
import { customParametersFor, listOptionsFor, paginationFor, showFor } from './SharedFields';

const show = showFor('server');

export const serverOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: show(),
		options: [
			{ name: 'Add IP Addresses', value: 'addIps', action: 'Add IP addresses to the server', description: 'WHM function: addips' },
			{ name: 'Delete IP Address', value: 'deleteIp', action: 'Delete an IP address from the server', description: 'WHM function: delip' },
			{ name: 'Get Applications', value: 'getApplications', action: 'Get installed applications', description: 'WHM function: applist' },
			{ name: 'Get Disk Usage', value: 'getDiskUsage', action: 'Get server disk usage', description: 'WHM function: getdiskusage' },
			{ name: 'Get Hostname', value: 'getHostname', action: 'Get the server hostname', description: 'WHM function: gethostname' },
			{ name: 'Get IP Addresses', value: 'getIps', action: 'Get server IP addresses', description: 'WHM function: listips' },
			{ name: 'Get Languages', value: 'getLanguages', action: 'Get available languages', description: 'WHM function: getlanglist' },
			{ name: 'Get Load Average', value: 'getLoadAverage', action: 'Get the system load average', description: 'WHM function: systemloadavg' },
			{ name: 'Get Tweak Setting', value: 'getTweakSetting', action: 'Get a tweak setting', description: 'WHM function: get_tweaksetting' },
			{ name: 'Get Version', value: 'getVersion', action: 'Get the cpanel whm version', description: 'WHM function: version' },
			{ name: 'Reboot', value: 'reboot', action: 'Reboot the server', description: 'WHM function: reboot' },
			{ name: 'Set Hostname', value: 'setHostname', action: 'Set the server hostname', description: 'WHM function: sethostname' },
			{ name: 'Set Tweak Setting', value: 'setTweakSetting', action: 'Set a tweak setting', description: 'WHM function: set_tweaksetting' },
		],
		default: 'getVersion',
	},
];

export const serverFields: INodeProperties[] = [
	// ---- IPs ----
	...paginationFor('server', ['getIps', 'getDiskUsage', 'getLanguages', 'getApplications']),
	listOptionsFor('server', ['getIps', 'getDiskUsage', 'getLanguages', 'getApplications']),
	{ displayName: 'IP Addresses', name: 'ips', type: 'string', default: '', required: true, placeholder: '192.0.2.10 or 192.0.2.10-20', description: 'IP address, range (192.0.2.10-20) or CIDR block to add', displayOptions: show(['addIps']) },
	{ displayName: 'Netmask', name: 'netmask', type: 'string', default: '255.255.255.0', required: true, displayOptions: show(['addIps']) },
	{ displayName: 'Excludes', name: 'excludes', type: 'string', default: '', placeholder: '192.0.2.15', description: 'Comma-separated IPs within the range to skip', displayOptions: show(['addIps']) },

	{ displayName: 'IP Address', name: 'ip', type: 'string', default: '', required: true, displayOptions: show(['deleteIp']) },
	{ displayName: 'Ethernet Device', name: 'ethernetdev', type: 'string', default: '', placeholder: 'eth0:2', description: 'Only needed if WHM cannot determine the device itself', displayOptions: show(['deleteIp']) },
	{ displayName: 'Skip If Shutdown', name: 'skipifshutdown', type: 'boolean', default: false, description: 'Whether to skip the removal if the interface is already down', displayOptions: show(['deleteIp']) },

	// ---- Tweak settings ----
	{ displayName: 'Key', name: 'key', type: 'string', default: '', required: true, placeholder: 'skipboxtrapper', description: 'The tweak setting name as shown in WHM » Tweak Settings', displayOptions: show(['getTweakSetting', 'setTweakSetting']) },
	{ displayName: 'Value', name: 'value', type: 'string', default: '', required: true, displayOptions: show(['setTweakSetting']) },
	{ displayName: 'Module', name: 'module', type: 'string', default: '', placeholder: 'Main', description: 'The settings module. Leave empty for the default (Main).', displayOptions: show(['getTweakSetting', 'setTweakSetting']) },

	// ---- Hostname ----
	{ displayName: 'Hostname', name: 'hostname', type: 'string', default: '', required: true, placeholder: 'server.example.com', description: 'A fully-qualified hostname', displayOptions: show(['setHostname']) },

	// ---- Reboot ----
	{ displayName: 'Force', name: 'force', type: 'boolean', default: false, description: 'Whether to force an immediate reboot instead of a graceful one', displayOptions: show(['reboot']) },

	customParametersFor('server'),
];
