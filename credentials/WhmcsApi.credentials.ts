import type {
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';

/**
 * WHMCS API credentials.
 *
 * WHMCS authenticates each request against an API Identifier + Secret pair that
 * is generated under Configuration > System Settings > Manage API Credentials.
 * The admin role tied to the credential must have the "API Access" permission.
 *
 * Because WHMCS exposes a single endpoint (includes/api.php) that receives the
 * desired "action" as a POST field, the credential cannot be tested with a bare
 * GET. We therefore authenticate by injecting the identifier/secret into the
 * request body and validate using the lightweight `WhmcsDetails` action.
 */
export class WhmcsApi implements ICredentialType {
	name = 'whmcsApi';

	displayName = 'WHMCS API';

	documentationUrl = 'https://developers.whmcs.com/api/';

	properties: INodeProperties[] = [
		{
			displayName: 'WHMCS Base URL',
			name: 'baseUrl',
			type: 'string',
			default: '',
			placeholder: 'https://billing.example.com',
			required: true,
			description:
				'Root URL of your WHMCS installation, without a trailing slash. The node appends the API path automatically.',
		},
		{
			displayName: 'API Path',
			name: 'apiPath',
			type: 'string',
			default: '/includes/api.php',
			required: true,
			description:
				'Path to the WHMCS external API endpoint relative to the base URL. Only change this if your installation lives in a sub-directory.',
		},
		{
			displayName: 'API Identifier',
			name: 'identifier',
			type: 'string',
			default: '',
			required: true,
			description:
				'The API Identifier generated in WHMCS under Configuration > System Settings > Manage API Credentials.',
		},
		{
			displayName: 'API Secret',
			name: 'secret',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'The API Secret paired with the identifier above. Store it securely — WHMCS only shows it once.',
		},
		{
			displayName: 'Access Key',
			name: 'accessKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description:
				'Optional. The value of $api_access_key from configuration.php. Set this if your n8n host IP is not whitelisted under Setup > General Settings > Security and you want to bypass IP restrictions.',
		},
		{
			displayName: 'Ignore SSL Issues',
			name: 'allowUnauthorizedCerts',
			type: 'boolean',
			default: false,
			description:
				'Whether to connect even if SSL certificate validation fails. Only enable for trusted internal/staging hosts.',
		},
	];

	/**
	 * Inject the identifier / secret / optional access key into the form body of
	 * every request the node makes. WHMCS expects application/x-www-form-urlencoded.
	 */
	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		const body = (requestOptions.body as Record<string, unknown>) ?? {};

		body.identifier = credentials.identifier;
		body.secret = credentials.secret;
		if (credentials.accessKey) {
			body.accesskey = credentials.accessKey;
		}
		if (!body.responsetype) {
			body.responsetype = 'json';
		}

		requestOptions.body = body;
		requestOptions.headers = {
			...requestOptions.headers,
			'Content-Type': 'application/x-www-form-urlencoded',
		};

		return requestOptions;
	}

	/**
	 * Validate the credential by calling the harmless WhmcsDetails action.
	 * A wrong identifier/secret returns result=error which n8n surfaces to the user.
	 */
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl.replace(new RegExp("/$"), "")}}',
			url: '={{$credentials.apiPath}}',
			method: 'POST',
			body: {
				action: 'WhmcsDetails',
				responsetype: 'json',
			},
		},
		rules: [
			{
				type: 'responseSuccessBody',
				properties: {
					key: 'result',
					value: 'error',
					message:
						'WHMCS rejected the credentials. Check the identifier/secret, the API Access role permission, and IP/access-key restrictions.',
				},
			},
		],
	};
}
