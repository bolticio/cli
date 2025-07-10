const text = {
	name: "name",
	meta: {
		displayName: "Name",
		displayType: "text",
		placeholder: "Enter your name",
		description: "Name will be used for account purposes",
		value: "John Doe",
		readOnly: true,
		validation: {
			required: true,
			min: 3,
			max: 10,
			pattern: "^[a-zA-Z]+$",
			requiredDetail: {
				errorMsg: "Value is required",
			},
			patternDetail: {
				errorMsg: "Value must be a valid name",
			},
			minDetail: {
				errorMsg: "Value must be greater than 3",
			},
			maxDetail: {
				errorMsg: "Value must be less than 10",
			},
		},
		dependencies: {
			conditions: [
				{
					field: "name",
					operator: "eq",
					value: "John Doe",
				},
			],
		},
	},
};

const number = {
	name: "name",
	meta: {
		displayName: "Name",
		displayType: "number",
		placeholder: "Enter a number",
		description: "Number input field",
		value: 0,
		readOnly: false,
		validation: {
			required: false,
			min: 0,
			max: 1000,
			requiredDetail: {
				errorMsg: "Value is required",
			},
			minDetail: {
				errorMsg: "Value must be greater than minimum",
			},
			maxDetail: {
				errorMsg: "Value must be less than maximum",
			},
		},
		dependencies: {
			logic: "AND",
			conditions: [
				{
					field: "fieldName",
					operator: "EQUALS",
					value: "expectedValue",
				},
			],
		},
	},
};

const select = {
	name: "name",
	meta: {
		displayName: "Display Name",
		displayType: "select",
		placeholder: "Select an option",
		description: "Select from available options",
		value: "",
		readOnly: false,
		options: [
			{
				value: "value1",
				label: "Label 1",
				description: "Description 1",
			},
		],
		config: {
			urlType: "options",
			method: "get",
			url: "/api/options",
			labelKey: "label",
			valueKey: "value",
			body: {},
		},
		htmlProps: {
			showAddNew: false,
		},
		validation: {
			required: false,
			requiredDetail: {
				errorMsg: "Selection is required",
			},
		},
		dependencies: {
			logic: "AND",
			conditions: [
				{
					field: "fieldName",
					operator: "EQUALS",
					value: "expectedValue",
				},
			],
		},
	},
};

const checkbox = {
	name: "name",
	meta: {
		displayName: "Name",
		displayType: "checkbox",
		description: "Checkbox input",
		value: false,
		readOnly: false,
		validation: {
			required: false,
			requiredDetail: {
				errorMsg: "Checkbox is required",
			},
		},
		dependencies: {
			logic: "AND",
			conditions: [
				{
					field: "fieldName",
					operator: "EQUALS",
					value: "expectedValue",
				},
			],
		},
	},
};

const autocomplete = {
	name: "name",
	meta: {
		displayName: "Name",
		displayType: "autocomplete",
		placeholder: "Start typing...",
		description: "Autocomplete input field",
		value: "",
		readOnly: false,
		options: [
			{
				label: "Option 1",
				value: "option1",
				description: "Description 1",
			},
		],
		config: {
			urlType: "secret",
			method: "get",
			url: "/api/autocomplete",
			labelKey: "label",
			valueKey: "value",
			body: {},
			multiple: false,
			limitTags: 3,
		},
		htmlProps: {
			allowDynamic: false,
			showAddNew: false,
		},
		validation: {
			required: false,
			requiredDetail: {
				errorMsg: "Selection is required",
			},
		},
		dependencies: {
			logic: "AND",
			conditions: [
				{
					field: "fieldName",
					operator: "EQUALS",
					value: "expectedValue",
				},
			],
		},
	},
};

const email = {
	name: "name",
	meta: {
		displayName: "Name",
		displayType: "email",
		placeholder: "Enter email address",
		description: "Email input field",
		value: "",
		readOnly: false,
		validation: {
			required: false,
			pattern: "^[^@]+@[^@]+\\.[^@]+$",
			requiredDetail: {
				errorMsg: "Value is required",
			},
			patternDetail: {
				errorMsg: "Must be a valid email address",
			},
		},
		dependencies: {
			logic: "AND",
			conditions: [
				{
					field: "fieldName",
					operator: "EQUALS",
					value: "expectedValue",
				},
			],
		},
	},
};

const password = {
	name: "name",
	meta: {
		displayName: "Name",
		displayType: "password",
		placeholder: "Enter password",
		description: "Password input field",
		value: "",
		readOnly: false,
		validation: {
			required: false,
			min: 8,
			requiredDetail: {
				errorMsg: "Value is required",
			},
			minDetail: {
				errorMsg: "Password must be at least 8 characters",
			},
		},
		dependencies: {
			logic: "AND",
			conditions: [
				{
					field: "fieldName",
					operator: "EQUALS",
					value: "expectedValue",
				},
			],
		},
	},
};

const accordion = {
	name: "name",
	meta: {
		displayName: "Name",
		displayType: "accordion",
		description: "Collapsible content section",
		expanded: false,
		children: [],
		htmlProps: {
			divider: true,
			headerVariant: "h3",
			subHeaderVariant: "h5",
		},
		dependencies: {
			logic: "OR",
			conditions: [],
		},
	},
};

const section = {
	name: "name",
	meta: {
		displayName: "Name",
		displayType: "section",
		description: "Section container",
		children: [],
		htmlProps: {
			divider: true,
			headerVariant: "h3",
			subHeaderVariant: "h5",
			description: "",
		},
		dependencies: {
			logic: "OR",
			conditions: [
				{
					field: "fieldName",
					operator: "EQUALS",
					value: "expectedValue",
				},
			],
		},
	},
};

const textarea = {
	name: "name",
	meta: {
		displayName: "Name",
		displayType: "textarea",
		placeholder: "Enter text...",
		description: "Multi-line text input",
		value: "",
		readOnly: false,
		htmlProps: {
			minRows: 3,
			maxRows: 10,
		},
		validation: {
			required: false,
			minLength: 0,
			maxLength: 500,
			pattern: "",
			requiredDetail: {
				errorMsg: "Text is required",
			},
			minDetail: {
				errorMsg: "Text too short",
			},
			maxDetail: {
				errorMsg: "Text too long",
			},
		},
	},
};

const toggle = {
	name: "name",
	meta: {
		displayName: "Name",
		displayType: "toggle",
		description: "Toggle switch",
		value: false,
		readOnly: false,
		validation: {
			required: false,
			disabled: false,
			requiredDetail: {
				errorMsg: "Toggle selection is required",
			},
		},
		dependencies: {
			logic: "AND",
			conditions: [
				{
					field: "fieldName",
					operator: "EQUALS",
					value: "expectedValue",
				},
			],
		},
	},
};

const file = {
	name: "name",
	meta: {
		displayName: "Name",
		displayType: "file",
		placeholder: "Choose file...",
		description: "File upload field",
		value: "",
		readOnly: false,
		htmlProps: {
			multiple: false,
			accept: "*/*",
			maxSize: 52428800,
			maxFiles: 1,
			preview: true,
		},
		validation: {
			required: false,
			requiredDetail: {
				errorMsg: "File is required",
			},
		},
		dependencies: {
			logic: "AND",
			conditions: [
				{
					field: "fieldName",
					operator: "EQUALS",
					value: "expectedValue",
				},
			],
		},
	},
};

const array = {
	name: "name",
	meta: {
		displayName: "Name",
		displayType: "array",
		description: "Array of items",
		value: [],
		readOnly: false,
		children: [
			{
				name: "item",
				meta: {
					displayType: "text",
					displayName: "Item",
					validation: {
						required: true,
					},
				},
			},
		],
		htmlProps: {
			allowAdd: true,
			allowDynamic: false,
		},
		validation: {
			required: false,
			max: 10,
			requiredDetail: {
				errorMsg: "Array is required",
			},
			maxDetail: {
				errorMsg: "Too many items",
			},
		},
	},
};

const object = {
	name: "name",
	meta: {
		displayName: "Name",
		displayType: "object",
		description: "Object with properties",
		value: {},
		readOnly: false,
		children: [
			{
				name: "property",
				meta: {
					displayType: "text",
					displayName: "Property",
					validation: {
						required: true,
					},
				},
			},
		],
		htmlProps: {
			allowDynamic: false,
		},
		validation: {
			required: false,
			requiredDetail: {
				errorMsg: "Object is required",
			},
		},
	},
};

const code = {
	name: "name",
	meta: {
		displayName: "Name",
		displayType: "code",
		placeholder: "Enter code...",
		description: "Code editor field",
		value: "",
		readOnly: false,
		htmlProps: {
			language: "javascript",
			size: "md",
			fullscreen: false,
			showSuggestions: true,
			showCopyToClipboard: true,
			showHtmlPreview: false,
			height: "200px",
		},
		validation: {
			required: false,
			requiredDetail: {
				errorMsg: "Code is required",
			},
		},
	},
};

const slider = {
	name: "name",
	meta: {
		displayName: "Name",
		displayType: "slider",
		description: "Slider input",
		value: 0,
		readOnly: false,
		min: 0,
		max: 100,
		step: 1,
		htmlProps: {
			showInfoIcon: false,
			showRange: false,
			allowDynamic: false,
		},
		validation: {
			required: false,
			requiredDetail: {
				errorMsg: "Value is required",
			},
		},
	},
};

const url = {
	name: "name",
	meta: {
		displayName: "Name",
		displayType: "url",
		placeholder: "Enter URL",
		description: "URL input field",
		value: "",
		readOnly: false,
		validation: {
			required: false,
			pattern: "^https?://.*",
			requiredDetail: {
				errorMsg: "URL is required",
			},
			patternDetail: {
				errorMsg: "Must be a valid URL",
			},
		},
		dependencies: {
			logic: "AND",
			conditions: [
				{
					field: "fieldName",
					operator: "EQUALS",
					value: "expectedValue",
				},
			],
		},
	},
};

const hidden = {
	name: "name",
	meta: {
		displayName: "Name",
		displayType: "hidden",
		value: "",
		options: [],
	},
};

const date = {
	name: "name",
	meta: {
		displayName: "Name",
		displayType: "date",
		placeholder: "Select date",
		description: "Date picker field",
		value: "",
		readOnly: false,
		htmlProps: {
			minDate: "",
			maxDate: "",
			dateFormat: "YYYY-MM-DD",
			showTime: false,
		},
		validation: {
			required: false,
			requiredDetail: {
				errorMsg: "Date is required",
			},
		},
		dependencies: {
			logic: "AND",
			conditions: [
				{
					field: "fieldName",
					operator: "EQUALS",
					value: "expectedValue",
				},
			],
		},
	},
};

const divider = {
	name: "name",
	meta: {
		displayName: "Name",
		displayType: "divider",
		description: "Visual separator",
		htmlProps: {
			variant: "middle",
			orientation: "horizontal",
		},
	},
};

const multiselect = {
	name: "name",
	meta: {
		displayName: "Name",
		displayType: "multiselect",
		placeholder: "Select multiple options",
		description: "Multi-select dropdown",
		value: [],
		readOnly: false,
		options: [
			{
				label: "Option 1",
				value: "option1",
				description: "Description 1",
			},
		],
		config: {
			urlType: "options",
			method: "get",
			url: "/api/options",
			labelKey: "label",
			valueKey: "value",
			body: {},
		},
		htmlProps: {
			limitTags: 3,
			showSelectAll: true,
		},
		validation: {
			required: false,
			max: 10,
			requiredDetail: {
				errorMsg: "Selection is required",
			},
			maxDetail: {
				errorMsg: "Too many selections",
			},
		},
		dependencies: {
			logic: "AND",
			conditions: [
				{
					field: "fieldName",
					operator: "EQUALS",
					value: "expectedValue",
				},
			],
		},
	},
};

const radio = {
	name: "name",
	meta: {
		displayName: "Name",
		displayType: "radio",
		description: "Radio button group",
		value: "",
		readOnly: false,
		options: [
			{
				label: "Option 1",
				value: "option1",
				description: "Description 1",
			},
		],
		htmlProps: {
			orientation: "vertical",
		},
		validation: {
			required: false,
			requiredDetail: {
				errorMsg: "Selection is required",
			},
		},
		dependencies: {
			logic: "AND",
			conditions: [
				{
					field: "fieldName",
					operator: "EQUALS",
					value: "expectedValue",
				},
			],
		},
	},
};

const switchControl = {
	name: "name",
	meta: {
		displayName: "Name",
		displayType: "switch",
		description: "Switch toggle",
		value: false,
		readOnly: false,
		htmlProps: {
			size: "medium",
			color: "primary",
		},
		validation: {
			required: false,
			requiredDetail: {
				errorMsg: "Switch selection is required",
			},
		},
		dependencies: {
			logic: "AND",
			conditions: [
				{
					field: "fieldName",
					operator: "EQUALS",
					value: "expectedValue",
				},
			],
		},
	},
};

const multiplefield = {
	name: "name",
	meta: {
		displayName: "Name",
		displayType: "multiplefield",
		description: "Multiple field container",
		value: [],
		readOnly: false,
		children: [
			{
				name: "field1",
				meta: {
					displayType: "text",
					displayName: "Field 1",
					validation: {
						required: true,
					},
				},
			},
		],
		htmlProps: {
			allowAdd: true,
			allowRemove: true,
			minItems: 1,
			maxItems: 10,
		},
		validation: {
			required: false,
			min: 1,
			max: 10,
			requiredDetail: {
				errorMsg: "At least one item is required",
			},
			minDetail: {
				errorMsg: "Minimum items required",
			},
			maxDetail: {
				errorMsg: "Too many items",
			},
		},
		dependencies: {
			logic: "AND",
			conditions: [
				{
					field: "fieldName",
					operator: "EQUALS",
					value: "expectedValue",
				},
			],
		},
	},
};

const phone = {
	name: "name",
	meta: {
		displayName: "Name",
		displayType: "phone",
		placeholder: "Enter phone number",
		description: "Phone number input",
		value: "",
		readOnly: false,
		htmlProps: {
			defaultCountry: "US",
			excludedCountries: [],
			onlyCountries: [],
			preferredCountries: ["US", "GB", "CA"],
			continents: ["NA", "EU"],
		},
		validation: {
			required: false,
			matchIsValidTel: true,
			pattern: "^\\+?[1-9]\\d{1,14}$",
			requiredDetail: {
				errorMsg: "Phone number is required",
			},
			patternDetail: {
				errorMsg: "Must be a valid phone number",
			},
		},
	},
};

const keyvalue = {
	name: "name",
	meta: {
		displayName: "Name",
		displayType: "keyvalue",
		description: "Key-value pairs",
		value: {},
		readOnly: false,
		children: [
			{
				name: "key",
				meta: {
					displayType: "text",
					displayName: "Key",
					validation: {
						required: true,
					},
				},
			},
			{
				name: "value",
				meta: {
					displayType: "text",
					displayName: "Value",
					validation: {
						required: true,
					},
				},
			},
		],
		htmlProps: {
			allowDynamic: false,
			allowAdd: true,
		},
		validation: {
			required: false,
			max: 10,
			requiredDetail: {
				errorMsg: "Key-value pairs are required",
			},
			maxDetail: {
				errorMsg: "Too many key-value pairs",
			},
		},
	},
};

const button = {
	name: "name",
	meta: {
		displayName: "Name",
		displayType: "button",
		description: "Action button",
		text: "Click me",
		value: "",
		disabled: false,
		htmlProps: {
			variant: "contained",
			size: "medium",
		},
		action: {
			type: "submit",
			handler: "",
		},
	},
};

export {
	accordion,
	array,
	autocomplete,
	button,
	checkbox,
	code,
	date,
	divider,
	email,
	file,
	hidden,
	keyvalue,
	multiplefield,
	multiselect,
	number,
	object,
	password,
	phone,
	radio,
	section,
	select,
	slider,
	switchControl as switch,
	text,
	textarea,
	toggle,
	url,
};
