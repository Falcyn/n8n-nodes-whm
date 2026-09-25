import type { INodeProperties } from 'n8n-workflow';
import { cpanelUserFor, customParametersFor, paginationFor, showFor } from './SharedFields';

const show = showFor('cpanelDomain');

export const cpanelDomainOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: show(),
		options: [
			{ name: 'Add Addon Domain', value: 'addAddon', action: 'Add an addon domain', description: 'API 2: AddonDomain::addaddondomain' },
			{ name: 'Add Alias (Parked)', value: 'addAlias', action: 'Add an alias parked domain', description: 'API 2: Park::park' },
			{ name: 'Add Subdomain', value: 'addSubdomain', action: 'Add a subdomain', description: 'API 2: SubDomain::addsubdomain' },
			{ name: 'Delete Addon Domain', value: 'deleteAddon', action: 'Delete an addon domain', description: 'API 2: AddonDomain::deladdondomain' },
			{ name: 'Delete Alias (Parked)', value: 'deleteAlias', action: 'Delete an alias parked domain', description: 'API 2: Park::unpark' },
			{ name: 'Delete Subdomain', value: 'deleteSubdomain', action: 'Delete a subdomain', description: 'API 2: SubDomain::delsubdomain' },
			{ name: 'Get Domain Data', value: 'getData', action: 'Get vhost data for the account domains', description: 'UAPI: DomainInfo::domains_data — document roots, IPs and PHP versions' },
			{ name: 'Get Many', value: 'getAll', action: 'Get many domains on the account', description: 'UAPI: DomainInfo::list_domains — main, addon, parked and sub domains' },
		],
		default: 'getAll',
	},
];

export const cpanelDomainFields: INodeProperties[] = [
	cpanelUserFor('cpanelDomain'),
	...paginationFor('cpanelDomain', ['getData']),

	// ---- Domain data ----
	{ displayName: 'Domain', name: 'domain', type: 'string', default: '', placeholder: 'example.com', description: 'Restrict to a single domain. Leave empty for all domains on the account.', displayOptions: show(['getData']) },

	// ---- Addon ----
	{ displayName: 'New Domain', name: 'newdomain', type: 'string', default: '', required: true, placeholder: 'addon.com', displayOptions: show(['addAddon']) },
	{ displayName: 'Subdomain Label', name: 'subdomain', type: 'string', default: '', required: true, placeholder: 'addon', description: 'Internal subdomain used to serve the addon domain (usually the domain name without the TLD)', displayOptions: show(['addAddon']) },
	{ displayName: 'Document Root', name: 'dir', type: 'string', default: '', placeholder: 'public_html/addon.com', description: 'Directory relative to the account home. Defaults to public_html/&lt;domain&gt;.', displayOptions: show(['addAddon']) },

	{ displayName: 'Domain', name: 'domain', type: 'string', default: '', required: true, placeholder: 'addon.com', description: 'The addon domain to remove', displayOptions: show(['deleteAddon']) },
	{ displayName: 'Subdomain', name: 'subdomain', type: 'string', default: '', required: true, placeholder: 'addon_example.com', description: 'The internal subdomain of the addon, in the form "label_maindomain.com" as shown in cPanel', displayOptions: show(['deleteAddon']) },

	// ---- Subdomain ----
	{ displayName: 'Subdomain Label', name: 'domain', type: 'string', default: '', required: true, placeholder: 'blog', description: 'The new subdomain label (the part before the root domain)', displayOptions: show(['addSubdomain']) },
	{ displayName: 'Root Domain', name: 'rootdomain', type: 'string', default: '', required: true, placeholder: 'example.com', displayOptions: show(['addSubdomain']) },
	{ displayName: 'Document Root', name: 'dir', type: 'string', default: '', placeholder: 'public_html/blog', description: 'Directory relative to the account home. Defaults to public_html/&lt;label&gt;.', displayOptions: show(['addSubdomain']) },
	{ displayName: 'Subdomain', name: 'domain', type: 'string', default: '', required: true, placeholder: 'blog.example.com', description: 'The full subdomain to remove', displayOptions: show(['deleteSubdomain']) },

	// ---- Alias ----
	{ displayName: 'Domain', name: 'domain', type: 'string', default: '', required: true, placeholder: 'alias.com', description: 'The domain to add as an alias', displayOptions: show(['addAlias']) },
	{ displayName: 'Target Domain', name: 'topdomain', type: 'string', default: '', placeholder: 'example.com', description: 'The existing domain to alias. Defaults to the primary domain.', displayOptions: show(['addAlias']) },
	{ displayName: 'Domain', name: 'domain', type: 'string', default: '', required: true, placeholder: 'alias.com', description: 'The alias to remove', displayOptions: show(['deleteAlias']) },

	customParametersFor('cpanelDomain'),
];
