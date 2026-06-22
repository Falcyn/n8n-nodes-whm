import type { INodeProperties } from 'n8n-workflow';
import { customParameters } from './SharedFields';

const show = (operations: string[]): INodeProperties['displayOptions'] => ({
	show: { resource: ['product'], operation: operations },
});

export const productOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['product'] } },
		options: [
			{ name: 'Get Catalogue', value: 'getCatalogue', action: 'Get the product catalogue', description: 'WHMCS action: GetProducts' },
			{ name: "Get Client Services", value: 'getServices', action: 'Get client services', description: 'WHMCS action: GetClientsProducts' },
			{ name: 'Suspend', value: 'suspend', action: 'Suspend a service', description: 'WHMCS action: ModuleSuspend' },
			{ name: 'Terminate', value: 'terminate', action: 'Terminate a service', description: 'WHMCS action: ModuleTerminate' },
			{ name: 'Unsuspend', value: 'unsuspend', action: 'Unsuspend a service', description: 'WHMCS action: ModuleUnsuspend' },
			{ name: 'Update Service', value: 'update', action: 'Update a service', description: 'WHMCS action: UpdateClientProduct' },
			{ name: 'Upgrade', value: 'upgrade', action: 'Upgrade a service', description: 'WHMCS action: UpgradeProduct' },
		],
		default: 'getServices',
	},
];

export const productFields: INodeProperties[] = [
	// ---- Get Catalogue ----
	{
		displayName: 'Filters',
		name: 'catalogueFilters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: show(['getCatalogue']),
		options: [
			{ displayName: 'Product Group ID', name: 'gid', type: 'number', default: 0 },
			{ displayName: 'Product ID', name: 'pid', type: 'string', default: '', description: 'Single ID or comma-separated list' },
			{ displayName: 'Module', name: 'module', type: 'string', default: '', description: 'Filter by provisioning module, e.g. cpanel' },
		],
	},

	// ---- Get Client Services ----
	{
		displayName: 'Filters',
		name: 'serviceFilters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: show(['getServices']),
		options: [
			{ displayName: 'Client ID', name: 'clientid', type: 'number', default: 0 },
			{ displayName: 'Domain', name: 'domain', type: 'string', default: '' },
			{ displayName: 'Limit', name: 'limitnum', type: 'number', default: 25 },
			{ displayName: 'Product ID', name: 'pid', type: 'number', default: 0 },
			{ displayName: 'Service ID', name: 'serviceid', type: 'number', default: 0 },
		],
	},

	// ---- Service-targeted operations ----
	{ displayName: 'Service ID', name: 'serviceid', type: 'number', default: 0, required: true, description: 'ID of the client service (tblhosting.ID)', displayOptions: show(['suspend', 'unsuspend', 'terminate', 'update', 'upgrade']) },
	{ displayName: 'Suspension Reason', name: 'suspendreason', type: 'string', default: '', displayOptions: show(['suspend']) },

	// ---- Update Service ----
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['update']),
		options: [
			{ displayName: 'Auto Recalc', name: 'autorecalc', type: 'boolean', default: false, description: 'Whether to recalculate the recurring amount from the product config' },
			{ displayName: 'Billing Cycle', name: 'billingcycle', type: 'string', default: '' },
			{ displayName: 'Dedicated IP', name: 'dedicatedip', type: 'string', default: '' },
			{ displayName: 'Next Due Date', name: 'nextduedate', type: 'string', default: '', description: 'YYYY-MM-DD' },
			{ displayName: 'Recurring Amount', name: 'recurringamount', type: 'number', default: 0 },
			{ displayName: 'Status', name: 'status', type: 'options', default: 'Active', options: [
				{ name: 'Active', value: 'Active' }, { name: 'Cancelled', value: 'Cancelled' }, { name: 'Fraud', value: 'Fraud' }, { name: 'Pending', value: 'Pending' }, { name: 'Suspended', value: 'Suspended' }, { name: 'Terminated', value: 'Terminated' },
			] },
		],
	},

	// ---- Upgrade ----
	{
		displayName: 'Upgrade Fields',
		name: 'upgradeFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['upgrade']),
		options: [
			{ displayName: 'New Billing Cycle', name: 'newproductbillingcycle', type: 'string', default: '' },
			{ displayName: 'New Product ID', name: 'newproductid', type: 'number', default: 0 },
			{ displayName: 'Payment Method', name: 'paymentmethod', type: 'string', default: '' },
			{ displayName: 'Promo Code', name: 'promocode', type: 'string', default: '' },
			{ displayName: 'Type', name: 'type', type: 'options', default: 'product', options: [
				{ name: 'Product', value: 'product' }, { name: 'Configurable Options', value: 'configoptions' },
			] },
		],
	},

	{ ...customParameters, displayOptions: { show: { resource: ['product'] } } },
];
