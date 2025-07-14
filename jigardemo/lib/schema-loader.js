const fs = require("fs");
const path = require("path");

class SchemaLoader {
	constructor(basePath = __dirname + "/..") {
		this.basePath = basePath;
		this.loadedSchemas = {};
	}

	loadAuthenticationSchema() {
		const schemaPath = path.join(
			this.basePath,
			"schemas",
			"authentication.json"
		);

		if (!fs.existsSync(schemaPath)) {
			return null;
		}

		const content = fs.readFileSync(schemaPath, "utf8");
		const schema = JSON.parse(content);
		this.loadedSchemas.authentication = schema;
		return schema;
	}

	loadBaseSchema() {
		const schemaPath = path.join(this.basePath, "schemas", "base.json");

		if (!fs.existsSync(schemaPath)) {
			return null;
		}

		const content = fs.readFileSync(schemaPath, "utf8");
		const schema = JSON.parse(content);
		this.loadedSchemas.base = schema;
		return schema;
	}

	loadWebhookSchema() {
		const schemaPath = path.join(this.basePath, "schemas", "webhook.json");

		if (!fs.existsSync(schemaPath)) {
			return null;
		}

		const content = fs.readFileSync(schemaPath, "utf8");
		const schema = JSON.parse(content);
		this.loadedSchemas.webhook = schema;
		return schema;
	}

	loadResourceSchemas() {
		const resourcesDir = path.join(this.basePath, "schemas", "resources");

		if (!fs.existsSync(resourcesDir)) {
			return {};
		}

		const resources = {};
		const files = fs.readdirSync(resourcesDir);

		for (const file of files) {
			if (file.endsWith(".json")) {
				const resourcePath = path.join(resourcesDir, file);
				const content = fs.readFileSync(resourcePath, "utf8");
				const schema = JSON.parse(content);
				const resourceName = path.basename(file, ".json");
				resources[resourceName] = schema;
			}
		}

		this.loadedSchemas.resources = resources;
		return resources;
	}

	loadAllSchemas() {
		const schemas = {
			authentication: this.loadAuthenticationSchema(),
			base: this.loadBaseSchema(),
			webhook: this.loadWebhookSchema(),
			resources: this.loadResourceSchemas(),
		};

		return schemas;
	}

	validateSchemaExists(schemaType) {
		const schemaPath = path.join(
			this.basePath,
			"schemas",
			`${schemaType}.json`
		);
		return fs.existsSync(schemaPath);
	}

	getAllJsonFiles() {
		const jsonFiles = [];

		const findJsonFiles = (dir) => {
			if (!fs.existsSync(dir)) {
				return;
			}

			const files = fs.readdirSync(dir);

			for (const file of files) {
				const filePath = path.join(dir, file);
				const stat = fs.statSync(filePath);

				if (stat.isDirectory()) {
					findJsonFiles(filePath);
				} else if (file.endsWith(".json")) {
					jsonFiles.push(filePath);
				}
			}
		};

		findJsonFiles(this.basePath);
		return jsonFiles;
	}

	validateAllJsonSyntax() {
		const jsonFiles = this.getAllJsonFiles();
		const results = [];

		for (const file of jsonFiles) {
			try {
				const content = fs.readFileSync(file, "utf8");
				JSON.parse(content);
				results.push({ file, valid: true });
			} catch (error) {
				results.push({ file, valid: false, error: error.message });
			}
		}

		return results;
	}
}

module.exports = SchemaLoader;
