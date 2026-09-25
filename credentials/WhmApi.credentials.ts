import type {
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';

/**
 * WHM (WebHost Manager) API credentials.
 *
 * WHM exposes its API on port 2087 (HTTPS) / 2086 (HTTP). Every request is a
 * plain HTTP call to `/json-api/<function>` and is authenticated with an
 * `Authorization` header:
 *
 *   - API token  →  `Authorization: whm <username>:<token>`   (recommended)
 *   - Password   →  `Authorization: Basic base64(<username>:<password>)`
 *
 * API tokens are created in WHM under *Development » Manage API Tokens*. A
 * root token can do everything; a reseller token is limited by the reseller's
 * ACLs, which is usually what you want for automation.
 */
export class WhmApi implements ICredentialType {
	name = 'whmApi';

	displayName = 'WHM API';

	documentationUrl = 'https://api.docs.cpanel.net/whm/introduction/';

	properties: INodeProperties[] = [
		{
			displayName: 'Host',
			name: 'host',
			type: 'string',
			default: '',
			placeholder: 'server.example.com',
			required: true,
			description:
				'Hostname or IP address of the WHM server, without a scheme or port. The node builds the URL from Host, Port and Use SSL.',
		},
		{
			displayName: 'Port',
			name: 'port',
			type: 'number',
			default: 2087,
			required: true,
			description: 'WHM listens on 2087 for HTTPS and 2086 for plain HTTP',
		},
		{
			displayName: 'Use SSL',
			name: 'useSsl',
			type: 'boolean',
			default: true,
			description:
				'Whether to connect over HTTPS. Turn this off only for port 2086 on a trusted private network — credentials are sent with every request.',
		},
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: 'root',
			required: true,
			description: 'The WHM user the token or password belongs to — root or a reseller username',
		},
		{
			displayName: 'Authentication',
			name: 'authMethod',
			type: 'options',
			default: 'apiToken',
			options: [
				{ name: 'API Token', value: 'apiToken', description: 'Recommended. Created in WHM under Development » Manage API Tokens.' },
				{ name: 'Password', value: 'password', description: 'HTTP Basic authentication with the WHM account password' },
			],
		},
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			displayOptions: { show: { authMethod: ['apiToken'] } },
			description: 'The token generated in WHM. Restrict its privileges to the ACLs your workflows need.',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			displayOptions: { show: { authMethod: ['password'] } },
		},
		{
			displayName: 'Ignore SSL Issues',
			name: 'allowUnauthorizedCerts',
			type: 'boolean',
			default: false,
			description:
				'Whether to connect even if SSL certificate validation fails. WHM ships with a self-signed certificate by default, so this is often needed for servers that have not installed a trusted certificate on the hostname.',
		},
	];

	/** Adds the WHM Authorization header to every request the node makes. */
	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		const username = String(credentials.username ?? 'root').trim();
		let authorization: string;

		if (credentials.authMethod === 'password') {
			const basic = Buffer.from(`${username}:${credentials.password ?? ''}`, 'utf8').toString('base64');
			authorization = `Basic ${basic}`;
		} else {
			authorization = `whm ${username}:${String(credentials.apiToken ?? '').trim()}`;
		}

		requestOptions.headers = {
			...requestOptions.headers,
			Authorization: authorization,
		};
		return requestOptions;
	}

	/**
	 * Validate the credential by calling the harmless `version` function. A bad
	 * token or password is rejected by WHM with HTTP 401/403, which n8n surfaces.
	 * A wrong host / port / SSL setting fails to connect.
	 */
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{ ($credentials.useSsl ? "https" : "http") + "://" + $credentials.host.replace(/^https?:\\/\\//, "").replace(/\\/.*$/, "") + ":" + $credentials.port }}',
			url: '/json-api/version',
			method: 'GET',
			qs: { 'api.version': 1 },
			skipSslCertificateValidation: '={{ $credentials.allowUnauthorizedCerts }}',
		},
	};
}
