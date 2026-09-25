import type { IDataObject } from 'n8n-workflow';
import type { ApiKind } from './GenericFunctions';

/** Helpers handed to an operation's `build` hook. */
export interface BuildContext {
	/** Read a node parameter for the current item (undefined if not shown / unset). */
	getParam: <T = unknown>(name: string, fallback?: T) => T;
	/** Abort with a user-facing error. */
	fail: (message: string) => never;
}

/**
 * Declarative description of how a resource/operation maps onto the cPanel &
 * WHM APIs. The node's execute() is fully generic and driven by this table.
 */
export interface OperationSpec {
	/** API family — WHM API 1 (default), UAPI or API 2 (both proxied through WHM as a cPanel user). */
	kind?: ApiKind;
	/** WHM API 1 function, or the UAPI / API 2 function name. */
	fn: string;
	/** UAPI / API 2 module (e.g. Email, Mysql). */
	module?: string;
	/** Top-level node parameters copied 1:1 into the request (the node param name is the API param name). */
	fields?: string[];
	/** Collection-type node parameters whose entries are flattened 1:1 into the request. */
	collections?: string[];
	/** Whether the result is a list: enables Return All / Limit and one-item-per-record output. */
	list?: boolean;
	/** Set to false for lists that are split into records but are too small to page (no Return All / Limit UI). */
	paginate?: boolean;
	/** Key inside the WHM `data` object that holds the records (skips the single-key heuristic). */
	dataKey?: string;
	/** Custom extraction of the list payload from the `data` object. */
	pick?: (data: IDataObject) => unknown;
	/** Last-chance hook to rename / derive / validate parameters. */
	build?: (params: IDataObject, ctx: BuildContext) => void;
}

/** Split "user@domain" into UAPI's separate `email` (local part) and `domain` params. */
function splitEmail(params: IDataObject, ctx: BuildContext): void {
	const full = String(params.email ?? '').trim();
	const at = full.lastIndexOf('@');
	if (at <= 0 || at === full.length - 1) ctx.fail(`"${full}" is not a full email address (user@domain).`);
	params.email = full.slice(0, at);
	params.domain = full.slice(at + 1);
}

/** Drop numeric "unset" markers (0) for optional date-ish filters. */
function dropZero(params: IDataObject, keys: string[]): void {
	for (const key of keys) {
		if (params[key] === 0 || params[key] === '0') delete params[key];
	}
}

const uapi = (module: string, fn: string, spec: Omit<OperationSpec, 'kind' | 'fn' | 'module'> = {}): OperationSpec => ({
	kind: 'uapi',
	module,
	fn,
	...spec,
});
const api2 = (module: string, fn: string, spec: Omit<OperationSpec, 'kind' | 'fn' | 'module'> = {}): OperationSpec => ({
	kind: 'api2',
	module,
	fn,
	...spec,
});

export const OPERATIONS: Record<string, Record<string, OperationSpec>> = {
	account: {
		create: { fn: 'createacct', fields: ['username', 'domain'], collections: ['additionalFields'] },
		get: { fn: 'accountsummary', fields: ['user', 'domain'], list: true, paginate: false, dataKey: 'acct' },
		getAll: { fn: 'listaccts', collections: ['filters'], list: true, dataKey: 'acct' },
		getSuspended: { fn: 'listsuspended', list: true, dataKey: 'account' },
		modify: { fn: 'modifyacct', fields: ['user'], collections: ['updateFields'] },
		suspend: { fn: 'suspendacct', fields: ['user', 'reason', 'disallow'] },
		unsuspend: { fn: 'unsuspendacct', fields: ['user'] },
		terminate: { fn: 'removeacct', fields: ['user', 'keepdns'] },
		changePackage: { fn: 'changepackage', fields: ['user', 'pkg'] },
		changePassword: { fn: 'passwd', fields: ['user', 'password', 'db_pass_update'] },
		setBandwidthLimit: { fn: 'limitbw', fields: ['user', 'bwlimit'] },
		setDiskQuota: { fn: 'editquota', fields: ['user', 'quota'] },
		changeIp: { fn: 'setsiteip', fields: ['user', 'ip'] },
		getBandwidth: {
			fn: 'showbw',
			collections: ['bandwidthFilters'],
			build: (params) => dropZero(params, ['month', 'year']),
		},
		getDiskUsage: { fn: 'get_disk_usage', fields: ['cache_mode'], list: true, dataKey: 'accounts' },
		createSession: { fn: 'create_user_session', fields: ['user', 'service'], collections: ['sessionFields'] },
		forcePasswordChange: {
			fn: 'forcepasswordchange',
			fields: ['stop_on_failure'],
			build: (params, ctx) => {
				const users = String(ctx.getParam('users', ''))
					.split(',')
					.map((u) => u.trim())
					.filter(Boolean);
				if (users.length === 0) ctx.fail('At least one username is required.');
				const map: IDataObject = {};
				for (const u of users) map[u] = 1;
				params.users_json = JSON.stringify(map);
			},
		},
	},

	package: {
		create: { fn: 'addpkg', fields: ['name'], collections: ['packageSettings'] },
		update: { fn: 'editpkg', fields: ['name'], collections: ['packageSettings'] },
		delete: { fn: 'killpkg', fields: ['pkgname'] },
		get: { fn: 'getpkginfo', fields: ['pkg'] },
		getAll: { fn: 'listpkgs', list: true, dataKey: 'pkg' },
		getFeatureLists: { fn: 'getfeaturelist', list: true },
		getFeatureList: { fn: 'get_featurelist_data', fields: ['featurelist'] },
	},

	domain: {
		getAll: { fn: 'get_domain_info', fields: ['domain'], list: true, dataKey: 'domains' },
		getOwner: { fn: 'getdomainowner', fields: ['domain'] },
		getUserData: { fn: 'domainuserdata', fields: ['domain'] },
		resolve: { fn: 'resolvedomainname', fields: ['domain'] },
		park: { fn: 'park', fields: ['user', 'newdomain', 'topdomain'] },
		unpark: { fn: 'unpark', fields: ['user', 'domain', 'topdomain'] },
	},

	dns: {
		getAll: { fn: 'listzones', list: true, dataKey: 'zone' },
		createZone: { fn: 'adddns', fields: ['domain', 'ip'], collections: ['additionalFields'] },
		deleteZone: { fn: 'killdns', fields: ['domain'] },
		getZone: {
			fn: 'dumpzone',
			fields: ['domain'],
			list: true,
			pick: (data) => ((data.zone as IDataObject[] | undefined)?.[0]?.record as unknown) ?? data,
		},
		resetZone: { fn: 'resetzone', fields: ['domain'] },
		getMx: { fn: 'listmxs', fields: ['domain'], list: true, paginate: false, dataKey: 'record' },
		addRecord: { fn: 'addzonerecord', fields: ['domain', 'name', 'type'], collections: ['recordData'] },
		editRecord: { fn: 'editzonerecord', fields: ['domain', 'line'], collections: ['recordData'] },
		getRecord: { fn: 'getzonerecord', fields: ['domain', 'line'] },
		deleteRecord: {
			fn: 'removezonerecord',
			fields: ['line'],
			build: (params, ctx) => {
				params.zone = ctx.getParam('domain', '');
			},
		},
		saveMx: { fn: 'savemxs', fields: ['domain', 'exchange', 'preference'], collections: ['mxFields'] },
		lookupNsIp: { fn: 'lookupnsip', fields: ['nameserver'] },
	},

	reseller: {
		getAll: { fn: 'listresellers', list: true, dataKey: 'reseller' },
		create: { fn: 'setupreseller', fields: ['user', 'makeowner'] },
		remove: { fn: 'unsetupreseller', fields: ['user'] },
		getStats: { fn: 'resellerstats', fields: ['user'] },
		getAccountCounts: { fn: 'acctcounts', fields: ['user'] },
		getIps: { fn: 'getresellerips', fields: ['user'] },
		getAclLists: { fn: 'listacls' },
		suspend: { fn: 'suspendreseller', fields: ['user', 'reason', 'disallow'] },
		unsuspend: { fn: 'unsuspendreseller', fields: ['user'] },
		terminate: {
			fn: 'terminatereseller',
			fields: ['user'],
			build: (params, ctx) => {
				if (ctx.getParam<boolean>('confirm', false) !== true) {
					ctx.fail('Terminating a reseller is irreversible. Enable "Confirm Irrevocable Removal" to proceed.');
				}
				params.terminatereseller = `I understand this will irrevocably remove all the accounts owned by the reseller ${params.user}`;
			},
		},
		setIps: { fn: 'setresellerips', fields: ['user', 'delegate', 'ips'] },
		setMainIp: { fn: 'setresellermainip', fields: ['user', 'ip'] },
		setNameservers: { fn: 'setresellernameservers', fields: ['user', 'nameservers'] },
		setLimits: { fn: 'setresellerlimits', fields: ['user'], collections: ['limits'] },
		setPackageLimit: { fn: 'setresellerpackagelimit', fields: ['user', 'package', 'allowed', 'no_limit', 'number'] },
		setAcls: { fn: 'setacls', fields: ['reseller', 'acllist'] },
	},

	server: {
		getVersion: { fn: 'version' },
		getHostname: { fn: 'gethostname' },
		getLoadAverage: { fn: 'systemloadavg' },
		getDiskUsage: { fn: 'getdiskusage', list: true, dataKey: 'partition' },
		getLanguages: { fn: 'getlanglist', list: true, dataKey: 'lang' },
		getApplications: { fn: 'applist', list: true, dataKey: 'app' },
		getIps: { fn: 'listips', list: true, dataKey: 'ip' },
		addIps: { fn: 'addips', fields: ['ips', 'netmask', 'excludes'] },
		deleteIp: { fn: 'delip', fields: ['ip', 'ethernetdev', 'skipifshutdown'] },
		getTweakSetting: { fn: 'get_tweaksetting', fields: ['key', 'module'] },
		setTweakSetting: { fn: 'set_tweaksetting', fields: ['key', 'value', 'module'] },
		setHostname: { fn: 'sethostname', fields: ['hostname'] },
		reboot: { fn: 'reboot', fields: ['force'] },
	},

	service: {
		getStatus: { fn: 'servicestatus', fields: ['service'], list: true, dataKey: 'service' },
		restart: {
			fn: 'restartservice',
			build: (params, ctx) => {
				const chosen = String(ctx.getParam('serviceName', ''));
				params.service = chosen === '__other__' ? String(ctx.getParam('serviceOther', '')).trim() : chosen;
				if (!params.service) ctx.fail('A service name is required.');
			},
		},
		configure: {
			fn: 'configureservice',
			fields: ['enabled', 'monitored'],
			build: (params, ctx) => {
				const chosen = String(ctx.getParam('serviceName', ''));
				params.service = chosen === '__other__' ? String(ctx.getParam('serviceOther', '')).trim() : chosen;
				if (!params.service) ctx.fail('A service name is required.');
			},
		},
	},

	ssl: {
		getAll: { fn: 'fetch_ssl_vhosts', list: true, dataKey: 'vhosts' },
		listCertificates: { fn: 'listcrts', collections: ['crtFilters'], list: true, dataKey: 'crt' },
		install: { fn: 'installssl', fields: ['domain', 'crt', 'key'], collections: ['additionalFields'] },
		delete: { fn: 'delete_ssl_vhost', fields: ['host'] },
		getInfo: { fn: 'fetchsslinfo', fields: ['domain', 'crtdata'] },
		getVhostComponents: { fn: 'fetch_vhost_ssl_components', fields: ['domain'], list: true, dataKey: 'components' },
		generate: { fn: 'generatessl', fields: ['domain'], collections: ['certDetails'] },
		autosslUser: { fn: 'start_autossl_check_for_one_user', fields: ['username'] },
		autosslAll: { fn: 'start_autossl_check_for_all_users' },
		getAutosslProviders: { fn: 'get_autossl_providers', list: true },
		setAutosslProvider: { fn: 'set_autossl_provider', fields: ['provider'] },
	},

	backup: {
		getConfig: { fn: 'backup_config_get' },
		setConfig: { fn: 'backup_config_set', collections: ['backupSettings'] },
		getDates: { fn: 'backup_date_list', list: true, dataKey: 'dates' },
		getUsers: { fn: 'backup_user_list', fields: ['restore_point'], list: true, dataKey: 'users' },
		getSets: { fn: 'backup_set_list', fields: ['user', 'restore_point'], list: true },
		getSkipAllStatus: { fn: 'backup_skip_users_all_status' },
		skipAll: { fn: 'backup_skip_users_all', fields: ['state'] },
		toggleUser: { fn: 'toggle_user_backup_state', fields: ['user', 'legacy'] },
		restoreAccount: { fn: 'restoreaccount', fields: ['user', 'timestamp'], collections: ['restoreOptions'] },
		restoreArchive: { fn: 'restorepkg', fields: ['username', 'ip'], collections: ['restoreOptions'] },
	},

	apiToken: {
		getAll: { fn: 'api_token_list', list: true, dataKey: 'tokens' },
		create: {
			fn: 'api_token_create',
			fields: ['token_name'],
			collections: ['additionalFields'],
			build: (params, ctx) => {
				const acls = String(ctx.getParam('acl', ''))
					.split(',')
					.map((a) => a.trim())
					.filter(Boolean);
				if (acls.length) params.acl = acls;
				dropZero(params, ['expires_at']);
			},
		},
		update: {
			fn: 'api_token_update',
			fields: ['token_name'],
			collections: ['additionalFields'],
			build: (params, ctx) => {
				const acls = String(ctx.getParam('acl', ''))
					.split(',')
					.map((a) => a.trim())
					.filter(Boolean);
				if (acls.length) params.acl = acls;
				dropZero(params, ['expires_at']);
			},
		},
		revoke: { fn: 'api_token_revoke', fields: ['token_name'] },
	},

	cpanelEmail: {
		getAll: uapi('Email', 'list_pops_with_disk', { collections: ['filters'], list: true }),
		create: uapi('Email', 'add_pop', { fields: ['email', 'password'], collections: ['additionalFields'], build: splitEmail }),
		delete: uapi('Email', 'delete_pop', { fields: ['email', 'flags'], build: splitEmail }),
		changePassword: uapi('Email', 'passwd_pop', { fields: ['email', 'password'], build: splitEmail }),
		getQuota: uapi('Email', 'get_pop_quota', { fields: ['email'], build: splitEmail }),
		setQuota: uapi('Email', 'edit_pop_quota', { fields: ['email', 'quota'], build: splitEmail }),
		suspendLogin: uapi('Email', 'suspend_login', { fields: ['email'] }),
		unsuspendLogin: uapi('Email', 'unsuspend_login', { fields: ['email'] }),
		getForwarders: uapi('Email', 'list_forwarders', { fields: ['domain'], list: true }),
		addForwarder: uapi('Email', 'add_forwarder', { fields: ['domain', 'email', 'fwdopt', 'fwdemail', 'failmsgs'] }),
		deleteForwarder: uapi('Email', 'delete_forwarder', { fields: ['address', 'forwarder'] }),
		getMailDomains: uapi('Email', 'list_mail_domains', { list: true }),
	},

	cpanelDatabase: {
		getAll: uapi('Mysql', 'list_databases', { list: true }),
		getUsers: uapi('Mysql', 'list_users', { list: true }),
		create: uapi('Mysql', 'create_database', { fields: ['name'] }),
		delete: uapi('Mysql', 'delete_database', { fields: ['name'] }),
		rename: uapi('Mysql', 'rename_database', { fields: ['oldname', 'newname'] }),
		createUser: uapi('Mysql', 'create_user', { fields: ['name', 'password'] }),
		deleteUser: uapi('Mysql', 'delete_user', { fields: ['name'] }),
		setUserPassword: uapi('Mysql', 'set_password', { fields: ['user', 'password'] }),
		setPrivileges: uapi('Mysql', 'set_privileges_on_database', { fields: ['user', 'database', 'privileges'] }),
		getPrivileges: uapi('Mysql', 'get_privileges_on_database', { fields: ['user', 'database'], list: true, paginate: false }),
		addHost: uapi('Mysql', 'add_host', { fields: ['host'] }),
		deleteHost: uapi('Mysql', 'delete_host', { fields: ['host'] }),
	},

	cpanelDomain: {
		getAll: uapi('DomainInfo', 'list_domains'),
		getData: uapi('DomainInfo', 'domains_data', {
			fields: ['domain'],
			list: true,
			build: (params) => {
				params.format = params.domain ? 'hash' : 'list';
			},
		}),
		addAddon: api2('AddonDomain', 'addaddondomain', { fields: ['newdomain', 'subdomain', 'dir'] }),
		deleteAddon: api2('AddonDomain', 'deladdondomain', { fields: ['domain', 'subdomain'] }),
		addSubdomain: api2('SubDomain', 'addsubdomain', { fields: ['domain', 'rootdomain', 'dir'] }),
		deleteSubdomain: api2('SubDomain', 'delsubdomain', { fields: ['domain'] }),
		addAlias: api2('Park', 'park', { fields: ['domain', 'topdomain'] }),
		deleteAlias: api2('Park', 'unpark', { fields: ['domain'] }),
	},

	cpanelFtp: {
		getAll: uapi('Ftp', 'list_ftp_with_disk', { list: true }),
		create: uapi('Ftp', 'add_ftp', { fields: ['user', 'pass'], collections: ['additionalFields'] }),
		delete: uapi('Ftp', 'delete_ftp', { fields: ['user', 'destroy'] }),
		changePassword: uapi('Ftp', 'passwd', { fields: ['user', 'pass'] }),
		setQuota: uapi('Ftp', 'set_quota', { fields: ['user', 'quota'] }),
		setHomedir: uapi('Ftp', 'set_homedir', { fields: ['user', 'homedir'] }),
	},
};
