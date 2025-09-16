const text = {
	name: "name",
	meta: {
		displayName: "Name",
		displayType: "text",
		placeholder: "Enter your name",
		description: "Name will be used for account purposes",
		value: "John Doe",
		readOnly: true,
		isDisable: true,
		htmlProps: {
			showInfoIcon: false,
			rightLabel: "",
			rightLabelAlignment: "center",
		},
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
			infoDetail: { infoMsg: "this is for information purpose" },
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
		isDisabled: false,
		htmlProps: {
			showInfoIcon: false,
			rightLabel: "",
			rightLabelAlignment: "center",
			allowDynamic: false,
		},
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
			infoDetail: { infoMsg: "this is for information purpose" },
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
		isDisabled: false,
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
			condition: "{{sample-condition}}",
			body: {
				secret: "secret",
				loadOptionsMethod: "get",
				resource: "resource",
				operation: "operation",
			},
		},
		loadDynamicParameters: false,
		displayProps: { loading: false },
		validation: {
			required: false,
			requiredDetail: {
				errorMsg: "Selection is required",
			},
			max: 10,
			maxDetail: {
				errorMsg: "Too many options",
			},
			min: 1,
			minDetail: {
				errorMsg: "At least one option is required",
			},
		},
		htmlProps: {
			allowDynamic: false,
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
		placeholder: "Checkbox",
		value: false,
		readOnly: false,
		isDisabled: false,
		multiple: false,
		options: [
			{
				label: "Option 1",
				value: "option1",
				description: "Description 1",
			},
		],
		htmlProps: {
			allowDynamic: false,
		},
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
		isDisabled: false,
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
			condition: "{{sample-condition}}",
			body: {},
			multiple: false,
			limitTags: 3,
		},
		htmlProps: {
			allowDynamic: false,
			showAddNew: false,
		},
		loadDynamicParameters: false,
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
		isDisabled: false,
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
		isDisabled: false,
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
		placeholder: "Checkbox",
		expanded: false,
		children: [],
		htmlProps: {
			divider: true,
			headerVariant: "h3",
			subHeaderVariant: "h5",
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
		isDisabled: false,
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

const toggle = {
	name: "name",
	meta: {
		displayName: "Name",
		displayType: "toggle",
		description: "Toggle switch",
		placeholder: "Toggle switch",
		value: false,
		readOnly: false,
		isDisabled: false,
		validation: {
			required: false,
			disabled: false,
			requiredDetail: {
				errorMsg: "Toggle selection is required",
			},
		},
		htmlProps: {
			allowDynamic: false,
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
		isDisabled: false,
		htmlProps: {
			multiple: false,
			accept: "*/*",
			maxSize: 52428800,
			maxFiles: 1,
			allowDynamic: false,
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
		isDisabled: false,
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

const object = {
	name: "name",
	meta: {
		displayName: "Name",
		displayType: "object",
		description: "Object with properties",
		value: {},
		readOnly: false,
		isDisabled: false,
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
			height: "auto",
		},
		validation: {
			required: false,
			requiredDetail: {
				errorMsg: "Code is required",
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

const slider = {
	name: "name",
	meta: {
		displayName: "Name",
		displayType: "slider",
		description: "Slider input",
		value: 0,
		isDisabled: false,
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
			infoDetail: {
				infoMsg: "Choose a value between 10 and 90",
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

const url = {
	name: "name",
	meta: {
		displayName: "Name",
		displayType: "url",
		placeholder: "Enter URL",
		description: "URL input field",
		value: "",
		readOnly: false,
		isDisabled: false,
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

const date = {
	name: "name",
	meta: {
		displayName: "Name",
		displayType: "date",
		placeholder: "Select date",
		description: "Date picker field",
		value: "",
		readOnly: false,
		isDisabled: false,
		htmlProps: {
			format: "YYYY-MM-DD",
			disabled: false,
			readOnly: false,
			views: undefined,
			timeSteps: { hours: 1, minutes: 5, seconds: 5 },
			allowDynamic: false,
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
			condition: "{{sample-condition}}",
			body: {},
		},
		loadDynamicParameters: false,
		validation: {
			required: false,
			requiredDetail: {
				errorMsg: "Selection is required",
			},
			min: 1,
			minDetail: {
				errorMsg: "At least one option is required",
			},
			max: 10,
			maxDetail: {
				errorMsg: "Too many options",
			},
			pattern: "^[a-zA-Z]+$",
			patternDetail: {
				errorMsg: "Value must be a valid name",
			},
		},
		htmlProps: {
			allowDynamic: false,
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
		placeholder: "Switch toggle",
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

const multitext = {
	name: "name",
	meta: {
		displayName: "Name",
		displayType: "multitext",
		description: "Multiple field container",
		placeholder: "Enter text",
		value: [],
		readOnly: false,
		isDisabled: false,
		htmlProps: {
			allowAdd: true,
			allowRemove: true,
			minItems: 1,
			maxItems: 10,
			allowDynamic: true,
			className: "custom class",
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
		isDisabled: false,
		htmlProps: {
			defaultCountry: "US",
			excludedCountries: [],
			onlyCountries: [],
			preferredCountries: ["US", "GB", "CA"],
			continents: ["NA", "EU"],
			allowDynamic: true,
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

const keyvalue = {
	name: "name",
	meta: {
		displayName: "Name",
		displayType: "keyvalue",
		description: "Key-value pairs",
		placeholder: "Key-value pairs",
		value: {},
		readOnly: false,
		isDisabled: false,
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

const button = {
	name: "name",
	meta: {
		displayName: "Name",
		displayType: "button",
		description: "Action button",
		text: "Click me",
		value: "",
		isDisabled: false,
		readOnly: false,
		validation: {
			required: true,
			requiredDetail: {
				errorMsg: "Please connect with Asana first",
			},
		},
		htmlProps: {
			variant: "contained",
			size: "medium",
			style: {
				color: "inherit",
				backgroundColor: "primary",
				fontSize: "inherit",
				fontWeight: "normal",
				height: "auto",
				padding: "inherit",
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

const datetime = {
	name: "datetime-picker",
	meta: {
		displayName: "Enter Date with Start Time",
		description: "Please enter date and start time",
		placeholder: "Key-value pairs",
		displayType: "datetime",
		value: "2024-02-14",
		validation: {
			required: false,
		},
		readOnly: false,
		htmlProps: {
			format: "YYYY-MM-DD HH:mm:ss",
			disabled: false,
			timeSteps: {
				hours: 1,
				minutes: 5,
				seconds: 5,
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

export {
	accordion,
	array,
	autocomplete,
	button,
	checkbox,
	code,
	date,
	datetime,
	divider,
	email,
	file,
	hidden,
	keyvalue,
	multiselect,
	multitext,
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
