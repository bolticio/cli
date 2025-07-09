describe("Schema Templates", () => {
	let schemas;

	beforeAll(async () => {
		schemas = await import("../templates/schemas.js");
	});

	describe("authentication schema", () => {
		it("should have authentication schema structure", () => {
			expect(schemas.authentication).toBeDefined();
			expect(schemas.authentication.parameters).toBeDefined();
			expect(Array.isArray(schemas.authentication.parameters)).toBe(true);
			expect(schemas.authentication.api_key).toBeDefined();
			expect(schemas.authentication.api_key.parameters).toBeDefined();
		});

		it("should have api_key authentication parameters", () => {
			const apiKeyAuth = schemas.authentication.api_key;
			expect(apiKeyAuth.parameters).toBeDefined();
			expect(Array.isArray(apiKeyAuth.parameters)).toBe(true);
			expect(apiKeyAuth.parameters[0].name).toBe("api_key");
			expect(apiKeyAuth.parameters[0].meta.displayName).toBe("API Key");
		});

		it("should have authentication type parameter", () => {
			const authParam = schemas.authentication.parameters[0];
			expect(authParam.name).toBe("type");
			expect(authParam.meta.displayName).toBe("Authentication Type");
			expect(authParam.meta.options).toBeDefined();
			expect(authParam.meta.options[0].value).toBe("api_key");
		});
	});

	describe("base schema function", () => {
		it("should return base configuration schema", () => {
			const baseSchema = schemas.base("testService");

			expect(baseSchema).toBeDefined();
			expect(baseSchema.parameters).toBeDefined();
			expect(Array.isArray(baseSchema.parameters)).toBe(true);
			expect(baseSchema.parameters.length).toBe(2);
			expect(baseSchema.parameters[0].name).toBe("secret");
			expect(baseSchema.parameters[1].name).toBe("resource");
		});

		it("should use service name in URL", () => {
			const baseSchema = schemas.base("testService");
			const secretParam = baseSchema.parameters[0];

			expect(secretParam.meta.config.url).toContain("TESTSERVICE");
		});

		it("should handle create_catalogue=true", () => {
			const baseSchema = schemas.base("testService", true);
			const secretParam = baseSchema.parameters[0];

			expect(secretParam.meta.displayType).toBe("hidden");
			expect(secretParam.meta.value).toBe(
				"__BOLTIC_INTEGRATION_TESTSERVICE"
			);
		});

		it("should handle create_catalogue=false", () => {
			const baseSchema = schemas.base("testService", false);
			const secretParam = baseSchema.parameters[0];

			expect(secretParam.meta.displayType).toBe("autocomplete");
			expect(secretParam.meta.config).toBeDefined();
			expect(secretParam.meta.config.url).toContain("TESTSERVICE");
		});
	});

	describe("webhook schema function", () => {
		it("should return webhook schema", () => {
			const webhookSchema = schemas.webhook("testService");

			expect(webhookSchema).toBeDefined();
			expect(webhookSchema.parameters).toBeDefined();
			expect(Array.isArray(webhookSchema.parameters)).toBe(true);
			expect(webhookSchema.data_submission).toBeDefined();
		});

		it("should have webhook parameters", () => {
			const webhookSchema = schemas.webhook("testService");

			expect(webhookSchema.parameters[0].name).toBe("secret");
			expect(webhookSchema.parameters[1].name).toBe("resource");
			expect(webhookSchema.parameters[2].name).toBe("operation");
		});

		it("should have data_submission configuration", () => {
			const webhookSchema = schemas.webhook("testService");

			expect(webhookSchema.data_submission.parameters).toBeDefined();
			expect(webhookSchema.data_submission.attach).toBeDefined();
			expect(webhookSchema.data_submission.detach).toBeDefined();
		});
	});

	describe("resource1 schema", () => {
		it("should have resource1 schema structure", () => {
			expect(schemas.resource1).toBeDefined();
			expect(schemas.resource1.parameters).toBeDefined();
			expect(schemas.resource1.create).toBeDefined();
			expect(schemas.resource1.delete).toBeDefined();
		});

		it("should have create operation", () => {
			const createOp = schemas.resource1.create;
			expect(createOp.definition).toBeDefined();
			expect(createOp.definition.method).toBe("post");
			expect(createOp.definition.url).toBe(
				"https://dummyjson.com/products"
			);
			expect(createOp.parameters).toBeDefined();
			expect(createOp.parameters.length).toBe(4);
		});

		it("should have delete operation", () => {
			const deleteOp = schemas.resource1.delete;
			expect(deleteOp.definition).toBeDefined();
			expect(deleteOp.definition.method).toBe("delete");
			expect(deleteOp.parameters).toBeDefined();
			expect(deleteOp.parameters[0].name).toBe("id");
		});
	});

	describe("schema validation", () => {
		it("should validate authentication schema structure", () => {
			const auth = schemas.authentication;
			expect(auth.parameters).toBeDefined();
			expect(Array.isArray(auth.parameters)).toBe(true);
			expect(auth.parameters[0].meta.validation.required).toBe(true);
		});

		it("should validate parameter structure", () => {
			const baseSchema = schemas.base("test");

			baseSchema.parameters.forEach((param) => {
				expect(param.name).toBeDefined();
				expect(param.meta).toBeDefined();
				expect(param.meta.displayName).toBeDefined();
				expect(param.meta.displayType).toBeDefined();
			});
		});
	});
});
