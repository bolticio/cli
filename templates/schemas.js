const authentication = {
	parameters: [
		{
			name: "type",
			meta: {
				displayName: "Authentication Type",
				displayType: "select",
				placeholder: "Select an authentication type",
				description:
					"Choose the type of authentication you want to use.",
				options: [
					{
						label: "API Key",
						value: "api_key",
					},
				],
				value: "api_key",
				validation: {
					required: true,
					requiredDetail: {
						errorMsg: "Authentication type is required",
					},
				},
			},
		},
	],
	api_key: {
		parameters: [
			{
				name: "api_key",
				meta: {
					displayName: "API Key",
					displayType: "password",
					placeholder: "Enter API Key",
					description: "Your API key for authentication",
					validation: {
						required: true,
						requiredDetail: {
							errorMsg: "API key is required",
						},
					},
				},
			},
		],
		validate: {
			url: "https://test_url/events",
			method: "get",
			headers: {
				Authorization: "Bearer {{secrets.api_key}}",
			},
			response: {
				error: {
					code: "{{response.status}}",
					message: "{{response.data.error}}",
				},
				output: "{{response.data}}",
			},
		},
	},
};

const base = (name, create_catalogue) => {
	const secretParameter = create_catalogue
		? {
				name: "secret",
				meta: {
					displayName: "Service Account",
					displayType: "autocomplete",
					placeholder: "Select Service Account",
					description:
						"Your service account credentials are encrypted & can be removed at any time.",
					options: [],
					config: {
						urlType: "secret",
						method: "get",
						url: `/${name.toUpperCase()}?current_page=1&page_size=999`,
						labelKey: "name",
						valueKey: "_id",
					},
					htmlProps: {
						showAddNew: true,
					},
					value: "",
					validation: {
						required: true,
					},
				},
			}
		: {
				name: "secret",
				meta: {
					displayName: "Service Account",
					displayType: "hidden",
					placeholder: "Select Service Account",
					description:
						"Your service account credentials are encrypted & can be removed at any time.",
					options: [],
					value: `__BOLTIC_INTEGRATION_${name.toUpperCase()}`,
					validation: {
						required: true,
					},
				},
			};

	return {
		parameters: [
			secretParameter,
			{
				name: "resource",
				meta: {
					displayName: "Resource",
					displayType: "select",
					placeholder: "Select a resource",
					description: "Select the resource you want to work with.",
					options: [
						{
							label: "Resource 1",
							value: "resource1",
							description: "Description for Resource 1",
						},
					],
					value: "",
					validation: {
						required: true,
					},
					dependencies: {
						conditions: [
							{
								field: "secret",
								operator: "NOT_EMPTY",
							},
						],
					},
				},
			},
		],
	};
};

const webhook = (name) => {
	return {
		parameters: [
			{
				name: "secret",
				meta: {
					displayName: "Service Account",
					displayType: "autocomplete",
					placeholder: "Select Service Account",
					description:
						"Your service account credentials are encrypted & can be removed at any time.",
					options: [],
					config: {
						urlType: "secret",
						method: "get",
						url: `/${name.toUpperCase()}?current_page=1&page_size=999`,
						labelKey: "name",
						valueKey: "_id",
					},
					htmlProps: {
						showAddNew: true,
					},
					value: "",
					validation: {
						required: true,
					},
				},
			},
			{
				name: "resource",
				meta: {
					displayName: "Resource",
					displayType: "select",
					options: [
						{
							label: "Webhook",
							value: "webhook",
							description:
								"Receive notifications from the service.",
						},
					],
					value: "",
					validation: {
						required: true,
					},
					dependencies: {
						conditions: [
							{
								field: "secret",
								operator: "NOT_EMPTY",
							},
						],
					},
				},
			},
			{
				name: "operation",
				meta: {
					displayName: "Events",
					displayType: "select",
					description: "",
					placeholder: "",
					options: [
						{
							label: "Data Submission",
							value: "webhook.data_submission",
							description:
								"Receive notifications when data is submitted.",
						},
					],
					value: "",
					validation: {
						required: true,
					},
					dependencies: {
						conditions: [
							{
								field: "secret",
								operator: "NOT_EMPTY",
							},
							{
								field: "resource",
								operator: "EQUALS",
								value: "webhook",
							},
						],
					},
				},
			},
		],
		data_submission: {
			parameters: [
				{
					name: "site_id",
					meta: {
						displayName: "Service Site",
						displayType: "select",
						options: [],
						placeholder: "",
						description:
							"Select the site that you would like to receive notifications from.",
						value: "",
						validation: {
							required: true,
						},
						dependencies: {
							conditions: [
								{
									field: "secret",
									operator: "NOT_EMPTY",
								},
								{
									field: "resource",
									operator: "EQUALS",
									value: "webhook",
								},
								{
									field: "operation",
									operator: "EQUALS",
									value: "webhook.data_submission",
								},
							],
						},
					},
				},
				{
					name: "form_id",
					meta: {
						displayName: "Data Form",
						displayType: "select",
						description:
							"Forms will only show here if they have been published and have received at least 1 submission.",
						options: [],
						placeholder: "",
						value: "",
						validation: {
							required: true,
						},
						config: {
							urlType: "options",
							method: "post",
							url: "integrations/options",
							body: {
								name: "service",
								resource: "webhook",
								operation: "webhook.data_submission",
								secret: "{{parameters.secret}}",
								loadOptionsMethod: "getForms",
								webhook: true,
								site_id: "{{parameters.site_id}}",
							},
							labelKey: "displayName",
							valueKey: "id",
						},
						dependencies: {
							conditions: [
								{
									field: "site_id",
									operator: "NOT_EMPTY",
								},
							],
						},
					},
				},
			],
			attach: {
				definition: {
					method: "post",
					url: "https://service.com/api/v2/sites/{{parameters.site_id}}/webhooks",
					headers: {
						Accept: "application/json",
						"Content-Type": "application/json",
						Authorization: "Bearer {{secrets.access_token}}",
					},
					body: {
						triggerType: "{{parameters.operation}}",
						url: "{{webhook.url}}",
					},
					response: {
						output: "{{response.data}}",
						error: {
							code: "{{response.data.code}}",
							message: "{{response.data.message}}",
						},
					},
				},
			},
			detach: {
				definition: {
					method: "delete",
					url: "https://service.com/api/v2/webhooks/{{webhook.id}}",
					headers: {
						Accept: "application/json",
						Authorization: "Bearer {{secrets.access_token}}",
					},
					response: {
						output: "{{response.data}}",
						error: {
							code: "{{response.data.code}}",
							message: "{{response.data.message}}",
						},
					},
				},
			},
			update: {},
			getSites: {
				definition: {
					method: "get",
					url: "https://service.com/api/v2/sites",
					headers: {
						Accept: "application/json",
						Authorization: "Bearer {{secrets.access_token}}",
					},
					qs: {
						limit: 100,
					},
					response: {
						output: "{{response.data.sites}}",
						error: {
							code: "{{response.status}}",
							message: "{{response.data.message}}",
						},
					},
				},
			},
			getForms: {
				definition: {
					method: "get",
					url: "https://service.com/api/v2/sites/{{parameters.site_id}}/forms",
					headers: {
						Accept: "application/json",
						Authorization: "Bearer {{secrets.access_token}}",
					},
					response: {
						output: "{{response.data.forms}}",
						error: {
							code: "{{response.status}}",
							message: "{{response.data.message}}",
						},
					},
				},
			},
			test: {
				form_submission: {
					definition: {
						url: "https://service.com/api/v2/forms/{{parameters.form_id}}",
						qs: {},
						method: "get",
						headers: {
							Accept: "application/json",
							Authorization: "Bearer {{secrets.access_token}}",
						},
						transform: {
							output: "const sampleOutput = { triggerType: 'form_submission', payload: { name: output.displayName, siteId: output.siteId, data: {}, submittedAt: new Date().toISOString(), id: 'sample-id-12345', formId: output.id || null, formElementId: output.formElementId, pageId: output.pageId, publishedPath: '/sample-path', output: [] } }; for (const fieldId in output.fields) { const field = output.fields[fieldId]; sampleOutput.payload.data[field.displayName] = field.placeholder || `Sample value for ${field.displayName}`; } return sampleOutput;",
						},
						response: {
							output: "{{response.data}}",
							error: {
								code: "{{response.status}}",
								message: "{{response.data.message}}",
							},
						},
					},
				},
			},
		},
	};
};

const resource1 = {
	parameters: [
		{
			name: "operation",
			meta: {
				displayName: "Operation",
				displayType: "select",
				placeholder: "Select an operation",
				description: "Select the operation you want to perform.",
				options: [
					{
						label: "Create Account",
						value: "resource1.create",
						description: "Create a new account.",
					},
					{
						label: "Delete Account",
						value: "resource1.delete",
						description: "Delete an existing account.",
					},
				],
				validation: {
					required: true,
				},
				dependencies: {
					conditions: [
						{
							field: "resource",
							operator: "EQUALS",
							value: "resource1",
						},
					],
				},
			},
		},
	],
	create: {
		definition: {
			method: "post",
			url: "https://dummyjson.com/products",
			headers: {
				ContentType: "application/json",
			},
			body: "{{parameters}}",
			response: {
				output: "{{response.data}}",
				error: {
					message: "{{response.data.errors.message}}",
					code: "{{response.data.errors.code}}",
				},
			},
		},
		parameters: [
			{
				name: "name",
				meta: {
					displayName: "Product Name",
					displayType: "text",
					placeholder: "Enter the name of the product",
					description:
						"Enter the name of the product you want to create.",
					validation: {
						required: true,
					},
				},
			},
			{
				name: "description",
				meta: {
					displayName: "Product Description",
					displayType: "text",
					placeholder: "Enter the description of the product",
					description:
						"Enter the description of the product you want to create.",
					validation: {
						required: true,
					},
				},
			},
			{
				name: "price",
				meta: {
					displayName: "Product Price",
					displayType: "number",
					placeholder: "Enter the price of the product",
					description:
						"Enter the price of the product you want to create.",
					validation: {
						required: true,
					},
				},
			},
			{
				name: "discountPercentage",
				meta: {
					displayName: "Discount Percentage",
					displayType: "number",
					placeholder: "Enter the discount percentage",
					description:
						"Enter the discount percentage for the product you want to create.",
					validation: {
						required: true,
					},
				},
			},
		],
	},
	delete: {
		parameters: [
			{
				name: "id",
				meta: {
					displayName: "Account ID",
					displayType: "text",
					placeholder: "Enter the Account ID",
					description:
						"Enter the ID of the account you want to delete.",
					validation: {
						required: true,
					},
				},
			},
		],
		definition: {
			method: "delete",
			url: "https://dummyjson.com/products/{{parameters.id}}",
			headers: {
				ContentType: "application/json",
			},

			response: {
				output: "{{response.data}}",
				error: {
					message: "{{response.data.errors.message}}",
					code: "{{response.data.errors.code}}",
				},
			},
		},
	},
};

export { authentication, base, resource1, webhook };
