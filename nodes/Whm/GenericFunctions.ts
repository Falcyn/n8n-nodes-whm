import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

type Ctx = IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions;

/** Which cPanel & WHM API family a request targets. */
export type ApiKind = 'whm' | 'uapi' | 'api2';

/** Keys that must never be copied from user input into an object (prototype pollution). */
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/** Header / body keys that carry credentials and must never appear in error output. */
const SECRET_KEYS = ['authorization', 'password', 'pass', 'apitoken', 'token', 'key', 'crt'];

/**
 * Defence-in-depth: walk a caught error and redact credential-bearing keys so a
 * failed request can never carry the API token (or a private key being
 * installed) into execution logs. Bounded in depth and never allowed to mask
 * the real error.
 */
function redactSecretKeys(value: unknown, depth = 0): void {
	if (depth > 5 || value === null || typeof value !== 'object') return;
	const obj = value as Record<string, unknown>;
	for (const key of Object.keys(obj)) {
		if (SECRET_KEYS.includes(key.toLowerCase())) {
			try {
				obj[key] = '***redacted***';
			} catch {
				// read-only property — skip it
			}
		} else {
			redactSecretKeys(obj[key], depth + 1);
		}
	}
}

/** Build the `https://host:port` origin from the credential. */
export function whmBaseUrl(credentials: IDataObject): string {
	const host = String(credentials.host ?? '')
		.trim()
		.replace(/^https?:\/\//i, '')
		.replace(/\/.*$/, '')
		.replace(/:\d+$/, '');
	const scheme = credentials.useSsl === false ? 'http' : 'https';
	const port = Number(credentials.port) || (scheme === 'https' ? 2087 : 2086);
	return `${scheme}://${host}:${port}`;
}

/**
 * Convert an n8n parameter value into what WHM expects on the wire.
 * Booleans become 1 / 0, objects are JSON-encoded (used by a handful of
 * functions such as `forcepasswordchange`), everything else is stringified.
 */
export function toWireValue(value: unknown): string | string[] | undefined {
	if (value === undefined || value === null) return undefined;
	if (typeof value === 'boolean') return value ? '1' : '0';
	if (Array.isArray(value)) {
		return value
			.map((v) => toWireValue(v))
			.filter((v): v is string => typeof v === 'string');
	}
	if (typeof value === 'object') return JSON.stringify(value);
	const str = String(value);
	return str === '' ? undefined : str;
}

/**
 * Serialise parameters as application/x-www-form-urlencoded. Arrays are sent
 * as repeated keys (`acl=a&acl=b`), which is how WHM expects multi-valued
 * parameters. Empty values are dropped so an untouched optional field never
 * overwrites existing data.
 */
export function encodeForm(params: IDataObject): string {
	const search = new URLSearchParams();
	for (const [key, raw] of Object.entries(params)) {
		if (DANGEROUS_KEYS.has(key)) continue;
		const value = toWireValue(raw);
		if (value === undefined) continue;
		if (Array.isArray(value)) {
			for (const v of value) search.append(key, v);
		} else {
			search.append(key, value);
		}
	}
	return search.toString();
}

/** Copy own keys from a user-supplied object into a target, skipping prototype-polluting keys. */
export function safeMerge(target: IDataObject, source: IDataObject | undefined): IDataObject {
	if (!source || typeof source !== 'object') return target;
	for (const [key, value] of Object.entries(source)) {
		if (DANGEROUS_KEYS.has(key)) continue;
		target[key] = value;
	}
	return target;
}

/** Parse the reusable "Custom Parameters" fixedCollection into a flat object. */
export function parseCustomParameters(raw: IDataObject | undefined): IDataObject {
	const out: IDataObject = {};
	if (!raw) return out;
	const params = (raw.parameter as IDataObject[]) ?? [];
	for (const p of params) {
		const name = String(p.name ?? '').trim();
		if (name !== '' && !DANGEROUS_KEYS.has(name)) {
			out[name] = p.value;
		}
	}
	return out;
}

/** Parse a JSON-typed node parameter (string or already-parsed object). */
export function parseJsonParameter(
	this: IExecuteFunctions,
	value: unknown,
	fieldName: string,
	itemIndex: number,
): IDataObject {
	if (value === undefined || value === null) return {};
	if (typeof value === 'object') return value as IDataObject;
	const trimmed = String(value).trim();
	if (trimmed === '') return {};
	try {
		const parsed = JSON.parse(trimmed);
		if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
			throw new Error('not an object');
		}
		return parsed as IDataObject;
	} catch {
		throw new NodeOperationError(this.getNode(), `The field "${fieldName}" must contain a valid JSON object.`, {
			itemIndex,
		});
	}
}

/**
 * Perform the raw HTTP call against WHM, with the credential's Authorization
 * header injected by n8n, and return the parsed JSON body.
 */
async function rawRequest(this: Ctx, path: string, form: string): Promise<IDataObject> {
	const credentials = await this.getCredentials('whmApi');
	const options: IHttpRequestOptions = {
		method: 'POST',
		url: `${whmBaseUrl(credentials)}${path}`,
		body: form,
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			Accept: 'application/json',
		},
		json: true,
		skipSslCertificateValidation: credentials.allowUnauthorizedCerts === true,
	};

	let response: unknown;
	try {
		response = await this.helpers.httpRequestWithAuthentication.call(this, 'whmApi', options);
	} catch (error) {
		try {
			redactSecretKeys(error);
		} catch {
			// never let redaction itself swallow the real error
		}
		const status = (error as { httpCode?: string | number }).httpCode;
		const hint =
			String(status) === '401' || String(status) === '403'
				? 'WHM refused the credentials. Check the username and token/password, and that the token has the required ACLs.'
				: 'Check the host, port, SSL settings and that WHM (port 2087) is reachable from n8n.';
		throw new NodeApiError(this.getNode(), error as JsonObject, { description: hint });
	}

	if (typeof response === 'string') {
		try {
			return JSON.parse(response) as IDataObject;
		} catch {
			throw new NodeOperationError(
				this.getNode(),
				`WHM returned a non-JSON response for ${path}. This usually means the request hit a login page — check the credentials and port.`,
			);
		}
	}
	if (response === null || typeof response !== 'object') {
		throw new NodeOperationError(this.getNode(), `WHM returned an empty response for ${path}.`);
	}
	return response as IDataObject;
}

/**
 * Call a WHM API 1 function.
 *
 * WHM API 1 lives at `/json-api/<function>` and wraps every reply in
 * `{ metadata: { result: 1|0, reason, command, version }, data: {...} }`.
 * A `result` of 0 is a failure even though the HTTP status is 200, so it is
 * converted to a real n8n error here.
 */
export async function whmApiRequest(this: Ctx, fn: string, params: IDataObject = {}): Promise<IDataObject> {
	const name = fn.trim();
	if (!/^[A-Za-z0-9_]+$/.test(name)) {
		throw new NodeOperationError(this.getNode(), `"${fn}" is not a valid WHM API function name.`);
	}

	const form = encodeForm({ 'api.version': 1, ...params });
	const response = await rawRequest.call(this, `/json-api/${name}`, form);

	const metadata = (response.metadata ?? {}) as IDataObject;
	if (metadata.result !== undefined && Number(metadata.result) === 0) {
		throw new NodeOperationError(this.getNode(), `WHM API error on "${name}": ${metadata.reason ?? 'Unknown error'}`, {
			description: 'Check the function parameters and that the API token / reseller has the required ACLs.',
		});
	}

	// A few legacy functions report failure via a top-level cpanelresult.error.
	const cpanelresult = response.cpanelresult as IDataObject | undefined;
	if (cpanelresult?.error) {
		throw new NodeOperationError(this.getNode(), `WHM API error on "${name}": ${cpanelresult.error}`);
	}

	return response;
}

/**
 * Call a cPanel UAPI (apiversion 3) or API 2 (apiversion 2) function *as a
 * cPanel user* through WHM's `/json-api/cpanel` proxy. This lets root or a
 * reseller manage email accounts, databases, FTP, addon domains, etc. for any
 * account they own without needing that account's password.
 */
export async function cpanelApiRequest(
	this: Ctx,
	kind: 'uapi' | 'api2',
	cpanelUser: string,
	module: string,
	fn: string,
	params: IDataObject = {},
): Promise<IDataObject> {
	const user = cpanelUser.trim();
	if (!/^[A-Za-z0-9_.-]+$/.test(user)) {
		throw new NodeOperationError(this.getNode(), `"${cpanelUser}" is not a valid cPanel username.`);
	}
	if (!/^[A-Za-z0-9_]+$/.test(module.trim()) || !/^[A-Za-z0-9_]+$/.test(fn.trim())) {
		throw new NodeOperationError(this.getNode(), `"${module}::${fn}" is not a valid cPanel API module/function.`);
	}

	const form = encodeForm({
		'api.version': 1,
		cpanel_jsonapi_user: user,
		cpanel_jsonapi_apiversion: kind === 'uapi' ? 3 : 2,
		cpanel_jsonapi_module: module.trim(),
		cpanel_jsonapi_func: fn.trim(),
		...params,
	});
	const response = await rawRequest.call(this, '/json-api/cpanel', form);

	// WHM-level failure (bad user, ACL, etc.)
	const metadata = response.metadata as IDataObject | undefined;
	if (metadata && metadata.result !== undefined && Number(metadata.result) === 0) {
		throw new NodeOperationError(this.getNode(), `WHM error calling ${module}::${fn} for "${user}": ${metadata.reason}`);
	}

	if (kind === 'uapi') {
		const result = (response.result ?? response.data ?? {}) as IDataObject;
		if (result.status !== undefined && Number(result.status) === 0) {
			const errors = (result.errors as string[] | null) ?? [];
			throw new NodeOperationError(
				this.getNode(),
				`UAPI ${module}::${fn} failed for "${user}": ${errors.join('; ') || 'Unknown error'}`,
			);
		}
		return response;
	}

	const cpanelresult = (response.cpanelresult ?? {}) as IDataObject;
	const event = (cpanelresult.event ?? {}) as IDataObject;
	if (cpanelresult.error || (event.result !== undefined && Number(event.result) === 0)) {
		const dataErr = Array.isArray(cpanelresult.data)
			? ((cpanelresult.data[0] as IDataObject | undefined)?.reason as string | undefined)
			: undefined;
		throw new NodeOperationError(
			this.getNode(),
			`API 2 ${module}::${fn} failed for "${user}": ${cpanelresult.error ?? dataErr ?? 'Unknown error'}`,
		);
	}
	// API 2 functions frequently signal per-record failure inside data[].result
	if (Array.isArray(cpanelresult.data)) {
		const first = cpanelresult.data[0] as IDataObject | undefined;
		if (first && first.result !== undefined && Number(first.result) === 0 && first.reason) {
			throw new NodeOperationError(this.getNode(), `API 2 ${module}::${fn} failed for "${user}": ${first.reason}`);
		}
	}
	return response;
}

/**
 * Extract the useful payload from a response envelope.
 *  - WHM API 1  → `data`
 *  - UAPI       → `result.data`
 *  - API 2      → `cpanelresult.data`
 */
export function extractData(kind: ApiKind, response: IDataObject): unknown {
	if (kind === 'uapi') {
		const result = (response.result ?? response.data ?? {}) as IDataObject;
		return result.data ?? result;
	}
	if (kind === 'api2') {
		const cpanelresult = (response.cpanelresult ?? {}) as IDataObject;
		return cpanelresult.data ?? cpanelresult;
	}
	return response.data ?? response;
}

/**
 * Turn a list-style payload into an array of records for one-item-per-record
 * output. WHM API 1 list functions return `data: { <key>: [ ... ] }` (for
 * example `data.acct` for listaccts); some return a hash keyed by name
 * (`api_token_list` → `data.tokens.<name>`), which is flattened to its values.
 */
export function toRecordList(payload: unknown, dataKey?: string): IDataObject[] {
	let value: unknown = payload;
	if (dataKey && value && typeof value === 'object' && !Array.isArray(value)) {
		value = (value as IDataObject)[dataKey];
	} else if (value && typeof value === 'object' && !Array.isArray(value)) {
		const keys = Object.keys(value as IDataObject);
		if (keys.length === 1) {
			const inner = (value as IDataObject)[keys[0]];
			if (Array.isArray(inner) || (inner && typeof inner === 'object')) value = inner;
		}
	}
	if (Array.isArray(value)) {
		return value.map((v) => (v && typeof v === 'object' ? (v as IDataObject) : { value: v }));
	}
	if (value && typeof value === 'object') {
		// A hash keyed by name (only when explicitly addressed via dataKey) becomes one record per entry;
		// any other object is a single record.
		if (dataKey && value !== payload) {
			return Object.entries(value as IDataObject).map(([key, v]) =>
				v && typeof v === 'object' ? { _key: key, ...(v as IDataObject) } : { _key: key, value: v },
			);
		}
		return [value as IDataObject];
	}
	if (value === undefined || value === null) return [];
	return [{ value }];
}

/** Letters used by WHM API 1 to index multiple filter / sort specs: a, b, c … */
export function whmFieldSpec(index: number): string {
	return 'z'.repeat(Math.floor(index / 26)) + 'abcdefghijklmnopqrstuvwxyz'.charAt(index % 26);
}

/**
 * Translate the node's List Options (filters / sorting) into the WHM API 1
 * `api.filter.*` and `api.sort.*` parameters.
 */
export function applyListOptions(params: IDataObject, listOptions: IDataObject | undefined): void {
	if (!listOptions) return;

	const filters = ((listOptions.filters as IDataObject)?.filter as IDataObject[]) ?? [];
	filters.forEach((f, index) => {
		if (index === 0) {
			params['api.filter.enable'] = 1;
			params['api.filter.verbose'] = 1;
		}
		const prefix = `api.filter.${whmFieldSpec(index)}`;
		params[`${prefix}.field`] = f.field;
		params[`${prefix}.type`] = f.type ?? 'eq';
		params[`${prefix}.arg0`] = f.value;
	});

	const sorts = ((listOptions.sort as IDataObject)?.rule as IDataObject[]) ?? [];
	sorts.forEach((s, index) => {
		if (index === 0) params['api.sort.enable'] = 1;
		const prefix = `api.sort.${whmFieldSpec(index)}`;
		params[`${prefix}.field`] = s.field;
		params[`${prefix}.reverse`] = s.reverse ? 1 : 0;
		params[`${prefix}.method`] = s.method ?? 'lexicographic';
	});
}

/** Add server-side pagination parameters for the given API family. */
export function applyLimit(kind: ApiKind, params: IDataObject, limit: number): void {
	if (kind === 'whm') {
		params['api.chunk.enable'] = 1;
		params['api.chunk.verbose'] = 1;
		params['api.chunk.start'] = 1;
		params['api.chunk.size'] = limit;
	} else if (kind === 'uapi') {
		params['api.paginate'] = 1;
		params['api.paginate_start'] = 1;
		params['api.paginate_size'] = limit;
	} else {
		params.api2_paginate = 1;
		params.api2_paginate_start = 1;
		params.api2_paginate_size = limit;
	}
}
