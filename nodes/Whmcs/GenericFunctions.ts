import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IHttpRequestOptions,
	IHttpRequestMethods,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

/**
 * Low-level request helper for the WHMCS external API.
 *
 * Every WHMCS API call is an HTTP POST to a single endpoint (includes/api.php)
 * with an `action` field that names the operation. The identifier/secret are
 * injected by the credential's authenticate() method, so this helper only has
 * to assemble the body, send it as application/x-www-form-urlencoded, and turn
 * WHMCS's `result: error` envelope into a real n8n error.
 *
 * @param action  The WHMCS API action, e.g. "GetClients".
 * @param body    Action-specific parameters. Empty / undefined values are dropped.
 */
export async function whmcsApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions,
	action: string,
	body: IDataObject = {},
): Promise<IDataObject> {
	const credentials = await this.getCredentials('whmcsApi');

	const baseUrl = (credentials.baseUrl as string).replace(/\/$/, '');
	const apiPath = (credentials.apiPath as string) || '/includes/api.php';

	// Build the form payload. WHMCS ignores unknown keys, but sending null /
	// undefined / empty strings can overwrite existing data on update calls,
	// so we strip them out here.
	const form: IDataObject = { action, responsetype: 'json' };
	for (const [key, value] of Object.entries(body)) {
		if (value === undefined || value === null || value === '') {
			continue;
		}
		form[key] = value;
	}

	const options: IHttpRequestOptions = {
		method: 'POST' as IHttpRequestMethods,
		url: `${baseUrl}${apiPath}`,
		body: form,
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		json: true,
		skipSslCertificateValidation: credentials.allowUnauthorizedCerts === true,
	};

	let response: IDataObject;
	try {
		response = (await this.helpers.httpRequestWithAuthentication.call(
			this,
			'whmcsApi',
			options,
		)) as IDataObject;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}

	// Some response types arrive as a JSON string — normalise to an object.
	if (typeof response === 'string') {
		try {
			response = JSON.parse(response);
		} catch {
			throw new NodeOperationError(
				this.getNode(),
				`WHMCS returned a non-JSON response for action "${action}". Confirm responsetype=json is permitted.`,
			);
		}
	}

	if (response.result === 'error') {
		throw new NodeOperationError(
			this.getNode(),
			`WHMCS API error on "${action}": ${response.message ?? 'Unknown error'}`,
			{ description: 'Check the action parameters and the API role permissions in WHMCS.' },
		);
	}

	return response;
}

/**
 * Parse the "Additional Fields → Custom Parameters" fixedCollection used across
 * resources, returning a plain key/value object ready to merge into the body.
 */
export function parseCustomParameters(raw: IDataObject | undefined): IDataObject {
	const out: IDataObject = {};
	if (!raw) return out;
	const params = (raw.parameter as IDataObject[]) ?? [];
	for (const p of params) {
		if (p.name !== undefined && p.name !== '') {
			out[p.name as string] = p.value;
		}
	}
	return out;
}

/**
 * WHMCS array-style parameters (e.g. customfields, configoptions) are normally
 * base64-encoded serialized PHP. To keep the node usable from n8n we accept a
 * JSON object and let advanced users pass the pre-encoded string untouched.
 */
export function maybeJsonToObject(
	this: IExecuteFunctions,
	value: string | IDataObject,
	fieldName: string,
	itemIndex: number,
): IDataObject {
	if (typeof value !== 'string') return value;
	const trimmed = value.trim();
	if (trimmed === '') return {};
	try {
		return JSON.parse(trimmed) as IDataObject;
	} catch {
		throw new NodeOperationError(
			this.getNode(),
			`The field "${fieldName}" must contain valid JSON.`,
			{ itemIndex },
		);
	}
}

// Minimal local alias so we don't depend on the JsonObject export path.
type JsonObject = { [key: string]: unknown };
