import type { INodeProperties } from 'n8n-workflow';
import { customParametersFor, listOptionsFor, paginationFor, showFor } from './SharedFields';

const show = showFor('ssl');

export const sslOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: show(),
		options: [
			{ name: 'Delete Installed Certificate', value: 'delete', action: 'Remove the SSL certificate from a vhost', description: 'WHM function: delete_ssl_vhost' },
			{ name: 'Generate Self-Signed', value: 'generate', action: 'Generate a self signed certificate', description: 'WHM function: generatessl' },
			{ name: 'Get AutoSSL Providers', value: 'getAutosslProviders', action: 'Get automatic SSL providers', description: 'WHM function: get_autossl_providers' },
			{ name: 'Get Certificate Info', value: 'getInfo', action: 'Get certificate information', description: 'WHM function: fetchsslinfo' },
			{ name: 'Get Many', value: 'getAll', action: 'Get many installed certificates', description: 'WHM function: fetch_ssl_vhosts' },
			{ name: 'Get Vhost Components', value: 'getVhostComponents', action: 'Get certificate key and chain for a vhost', description: 'WHM function: fetch_vhost_ssl_components' },
			{ name: 'Install', value: 'install', action: 'Install an SSL certificate', description: 'WHM function: installssl' },
			{ name: 'List Certificates', value: 'listCertificates', action: 'List stored certificates', description: 'WHM function: listcrts' },
			{ name: 'Run AutoSSL for All Users', value: 'autosslAll', action: 'Run automatic SSL for all users', description: 'WHM function: start_autossl_check_for_all_users' },
			{ name: 'Run AutoSSL for User', value: 'autosslUser', action: 'Run automatic SSL for one user', description: 'WHM function: start_autossl_check_for_one_user' },
			{ name: 'Set AutoSSL Provider', value: 'setAutosslProvider', action: 'Set the automatic SSL provider', description: 'WHM function: set_autossl_provider' },
		],
		default: 'getAll',
	},
];

export const sslFields: INodeProperties[] = [
	// ---- Get Installed ----
	...paginationFor('ssl', ['getAll', 'listCertificates', 'getVhostComponents', 'getAutosslProviders']),
	listOptionsFor('ssl', ['getAll', 'listCertificates', 'getVhostComponents', 'getAutosslProviders']),

	// ---- Install ----
	{ displayName: 'Domain', name: 'domain', type: 'string', default: '', required: true, placeholder: 'example.com', description: 'Domain (vhost) to install the certificate on', displayOptions: show(['install']) },
	{ displayName: 'Certificate (PEM)', name: 'crt', type: 'string', typeOptions: { rows: 6 }, default: '', required: true, description: 'The certificate in PEM format', displayOptions: show(['install']) },
	{ displayName: 'Private Key (PEM)', name: 'key', type: 'string', typeOptions: { rows: 6, password: true }, default: '', required: true, description: 'The private key in PEM format', displayOptions: show(['install']) },
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['install']),
		options: [
			{ displayName: 'CA Bundle (PEM)', name: 'cab', type: 'string', typeOptions: { rows: 6 }, default: '', description: 'Intermediate certificate chain. WHM fetches it automatically if omitted and available.' },
			{ displayName: 'Enable SNI for Mail', name: 'enable_sni_for_mail', type: 'boolean', default: false, description: 'Whether to also use the certificate for the mail services on this domain' },
			{ displayName: 'IP Address', name: 'ip', type: 'string', default: '', description: 'Install on this IP instead of the vhost\'s current IP' },
		],
	},

	// ---- Delete ----
	{ displayName: 'Domain', name: 'host', type: 'string', default: '', required: true, placeholder: 'example.com', description: 'The vhost (domain) to remove the certificate from', displayOptions: show(['delete']) },

	// ---- Info ----
	{ displayName: 'Look Up By', name: 'lookupBy', type: 'options', default: 'domain', options: [{ name: 'Certificate Text', value: 'crtdata' }, { name: 'Domain', value: 'domain' }], displayOptions: show(['getInfo']) },
	{ displayName: 'Domain', name: 'domain', type: 'string', default: '', required: true, displayOptions: { show: { resource: ['ssl'], operation: ['getInfo'], lookupBy: ['domain'] } } },
	{ displayName: 'Certificate (PEM)', name: 'crtdata', type: 'string', typeOptions: { rows: 6 }, default: '', required: true, displayOptions: { show: { resource: ['ssl'], operation: ['getInfo'], lookupBy: ['crtdata'] } } },

	// ---- Vhost components ----
	{ displayName: 'Domain', name: 'domain', type: 'string', default: '', placeholder: 'example.com', description: 'Restrict to one vhost. Leave empty for all.', displayOptions: show(['getVhostComponents']) },

	// ---- List certificates ----
	{
		displayName: 'Filters',
		name: 'crtFilters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: show(['listCertificates']),
		options: [
			{ displayName: 'Registered Only', name: 'registered', type: 'boolean', default: false, description: 'Whether to only return certificates signed by a CA (not self-signed)' },
			{ displayName: 'Username', name: 'user', type: 'string', default: '', description: 'Only certificates owned by this account' },
		],
	},

	// ---- Generate ----
	{ displayName: 'Domain', name: 'domain', type: 'string', default: '', required: true, placeholder: 'example.com', displayOptions: show(['generate']) },
	{
		displayName: 'Certificate Details',
		name: 'certDetails',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['generate']),
		options: [
			{ displayName: 'City', name: 'localityName', type: 'string', default: '' },
			{ displayName: 'Company', name: 'organizationName', type: 'string', default: '' },
			{ displayName: 'Company Division', name: 'organizationalUnitName', type: 'string', default: '' },
			{ displayName: 'Country Code', name: 'countryName', type: 'string', default: '', placeholder: 'US', description: 'Two-letter ISO country code' },
			{ displayName: 'Email', name: 'emailAddress', type: 'string', placeholder: 'name@email.com', default: '' },
			{ displayName: 'Key Size', name: 'keysize', type: 'options', default: 2048, options: [{ name: '2048', value: 2048 }, { name: '4096', value: 4096 }] },
			{ displayName: 'Skip Email', name: 'noemail', type: 'boolean', default: false, description: 'Whether to skip emailing the generated certificate to the contact address' },
			{ displayName: 'State / Province', name: 'stateOrProvinceName', type: 'string', default: '' },
			{ displayName: 'Username', name: 'user', type: 'string', default: '', description: 'Owner of the certificate. Defaults to the domain owner.' },
		],
	},

	// ---- AutoSSL ----
	{ displayName: 'Username', name: 'username', type: 'string', default: '', required: true, description: 'The cPanel account to run AutoSSL for', displayOptions: show(['autosslUser']) },
	{ displayName: 'Provider', name: 'provider', type: 'string', default: '', required: true, placeholder: 'LetsEncrypt', description: 'Provider module name, e.g. LetsEncrypt or cPanel (see Get AutoSSL Providers)', displayOptions: show(['setAutosslProvider']) },

	customParametersFor('ssl'),
];
