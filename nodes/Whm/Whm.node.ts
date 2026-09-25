import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { ApiKind } from './GenericFunctions';
import {
	applyLimit,
	applyListOptions,
	cpanelApiRequest,
	extractData,
	parseCustomParameters,
	parseJsonParameter,
	safeMerge,
	toRecordList,
	whmApiRequest,
} from './GenericFunctions';
import { OPERATIONS } from './operations';
import type { BuildContext, OperationSpec } from './operations';
import {
	accountFields,
	accountOperations,
	apiTokenFields,
	apiTokenOperations,
	backupFields,
	backupOperations,
	cpanelDatabaseFields,
	cpanelDatabaseOperations,
	cpanelDomainFields,
	cpanelDomainOperations,
	cpanelEmailFields,
	cpanelEmailOperations,
	cpanelFtpFields,
	cpanelFtpOperations,
	cpanelFunctionFields,
	cpanelFunctionOperations,
	customFields,
	customOperations,
	dnsFields,
	dnsOperations,
	domainFields,
	domainOperations,
	outputOptions,
	packageFields,
	packageOperations,
	resellerFields,
	resellerOperations,
	serverFields,
	serverOperations,
	serviceFields,
	serviceOperations,
	sslFields,
	sslOperations,
} from './descriptions';

export class Whm implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'WHM',
		name: 'whm',
		icon: 'file:whm.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Manage a cPanel & WHM server: accounts, packages, DNS, SSL, resellers, backups and cPanel-level email, databases, domains and FTP',
		defaults: { name: 'WHM' },
		inputs: ['main'],
		outputs: ['main'],
		credentials: [{ name: 'whmApi', required: true }],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Account', value: 'account' },
					{ name: 'API Token', value: 'apiToken' },
					{ name: 'Backup', value: 'backup' },
					{ name: 'cPanel Database', value: 'cpanelDatabase', description: 'MySQL databases and users of a cPanel account' },
					{ name: 'cPanel Domain', value: 'cpanelDomain', description: 'Addon, parked and sub domains of a cPanel account' },
					{ name: 'cPanel Email', value: 'cpanelEmail', description: 'Email accounts and forwarders of a cPanel account' },
					{ name: 'cPanel FTP', value: 'cpanelFtp', description: 'FTP accounts of a cPanel account' },
					{ name: 'cPanel Function', value: 'cpanelFunction', description: 'Run any UAPI or API 2 function as a cPanel user' },
					{ name: 'Custom WHM Call', value: 'custom', description: 'Run any WHM API 1 function' },
					{ name: 'DNS Zone', value: 'dns' },
					{ name: 'Domain', value: 'domain' },
					{ name: 'Package', value: 'package' },
					{ name: 'Reseller', value: 'reseller' },
					{ name: 'Server', value: 'server' },
					{ name: 'Service', value: 'service' },
					{ name: 'SSL', value: 'ssl' },
				],
				default: 'account',
			},
			...accountOperations,
			...accountFields,
			...apiTokenOperations,
			...apiTokenFields,
			...backupOperations,
			...backupFields,
			...cpanelDatabaseOperations,
			...cpanelDatabaseFields,
			...cpanelDomainOperations,
			...cpanelDomainFields,
			...cpanelEmailOperations,
			...cpanelEmailFields,
			...cpanelFtpOperations,
			...cpanelFtpFields,
			...cpanelFunctionOperations,
			...cpanelFunctionFields,
			...customOperations,
			...customFields,
			...dnsOperations,
			...dnsFields,
			...domainOperations,
			...domainFields,
			...packageOperations,
			...packageFields,
			...resellerOperations,
			...resellerFields,
			...serverOperations,
			...serverFields,
			...serviceOperations,
			...serviceFields,
			...sslOperations,
			...sslFields,
			outputOptions,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				const ctx: BuildContext = {
					getParam: <T = unknown>(name: string, fallback?: T): T =>
						this.getNodeParameter(name, i, fallback as unknown) as T,
					fail: (message: string): never => {
						throw new NodeOperationError(this.getNode(), message, { itemIndex: i });
					},
				};

				let kind: ApiKind = 'whm';
				let fn: string;
				let module = '';
				let cpanelUser = '';
				let isList = false;
				let paginate = true;
				let dataKey: string | undefined;
				let pick: OperationSpec['pick'];
				const params: IDataObject = {};

				if (resource === 'custom') {
					fn = String(this.getNodeParameter('function', i)).trim();
					safeMerge(params, parseJsonParameter.call(this, this.getNodeParameter('parameters', i, {}), 'Parameters', i));
					isList = this.getNodeParameter('splitList', i, false) as boolean;
				} else if (resource === 'cpanelFunction') {
					kind = operation === 'api2' ? 'api2' : 'uapi';
					cpanelUser = String(this.getNodeParameter('cpanelUser', i)).trim();
					module = String(this.getNodeParameter('module', i)).trim();
					fn = String(this.getNodeParameter('function', i)).trim();
					safeMerge(params, parseJsonParameter.call(this, this.getNodeParameter('parameters', i, {}), 'Parameters', i));
					isList = true; // arrays become one item per record, objects stay a single item
				} else {
					const spec = OPERATIONS[resource]?.[operation];
					if (!spec) {
						throw new NodeOperationError(this.getNode(), `Unsupported operation "${operation}" for resource "${resource}".`, {
							itemIndex: i,
						});
					}
					kind = spec.kind ?? 'whm';
					fn = spec.fn;
					module = spec.module ?? '';
					isList = spec.list === true;
					paginate = spec.paginate !== false;
					dataKey = spec.dataKey;
					pick = spec.pick;

					if (kind !== 'whm') {
						cpanelUser = String(this.getNodeParameter('cpanelUser', i)).trim();
					}

					for (const field of spec.fields ?? []) {
						const value = this.getNodeParameter(field, i, undefined) as unknown;
						if (value !== undefined && value !== null && value !== '') {
							params[field] = value as IDataObject[string];
						}
					}
					for (const collection of spec.collections ?? []) {
						const value = this.getNodeParameter(collection, i, {}) as IDataObject;
						if (value && typeof value === 'object') safeMerge(params, value);
					}
					spec.build?.(params, ctx);

					// Server-side pagination + WHM filtering / sorting for list calls.
					if (isList && paginate) {
						const returnAll = this.getNodeParameter('returnAll', i, true) as boolean;
						if (!returnAll) {
							applyLimit(kind, params, this.getNodeParameter('limit', i, 50) as number);
						}
						if (kind === 'whm') {
							applyListOptions(params, this.getNodeParameter('listOptions', i, {}) as IDataObject);
						}
					}
				}

				// Free-form escape hatch, merged last so it can override anything.
				safeMerge(params, parseCustomParameters(this.getNodeParameter('customParameters', i, {}) as IDataObject));

				const response =
					kind === 'whm'
						? await whmApiRequest.call(this, fn, params)
						: await cpanelApiRequest.call(this, kind, cpanelUser, module, fn, params);

				const options = this.getNodeParameter('options', i, {}) as IDataObject;
				if (options.rawResponse === true) {
					returnData.push({ json: response, pairedItem: { item: i } });
					continue;
				}

				const data = extractData(kind, response);
				if (isList) {
					const payload = pick && data && typeof data === 'object' ? pick(data as IDataObject) : data;
					let records = toRecordList(payload, dataKey);
					const returnAll = this.getNodeParameter('returnAll', i, true) as boolean;
					if (paginate && !returnAll && resource !== 'custom' && resource !== 'cpanelFunction') {
						records = records.slice(0, this.getNodeParameter('limit', i, 50) as number);
					}
					for (const record of records) {
						returnData.push({ json: record, pairedItem: { item: i } });
					}
					continue;
				}

				const json: IDataObject =
					data && typeof data === 'object' && !Array.isArray(data)
						? (data as IDataObject)
						: { result: data as IDataObject[string] };
				returnData.push({ json, pairedItem: { item: i } });
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
