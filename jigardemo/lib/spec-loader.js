const fs = require("fs");
const path = require("path");

class SpecLoader {
	constructor(basePath = __dirname + "/..") {
		this.basePath = basePath;
		this.loadedSpecs = {};
	}

	loadSpec() {
		const specPath = path.join(this.basePath, "spec.json");
		if (!fs.existsSync(specPath)) {
			throw new Error("spec.json not found");
		}

		const content = fs.readFileSync(specPath, "utf8");
		const spec = JSON.parse(content);
		this.loadedSpecs.spec = spec;
		return spec;
	}

	validateSpecStructure(spec) {
		const required = [
			"id",
			"name",
			"description",
			"icon",
			"activity_type",
			"trigger_type",
			"meta",
		];

		for (const field of required) {
			if (!(field in spec)) {
				return { valid: false, missing: field };
			}
		}

		if (typeof spec.description !== "object") {
			return { valid: false, error: "description must be object" };
		}

		if (spec.description.trigger === undefined) {
			return { valid: false, error: "description.trigger required" };
		}

		if (spec.description.integration === undefined) {
			return { valid: false, error: "description.integration required" };
		}

		return { valid: true };
	}

	validateUUID(uuid) {
		const uuidRegex =
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
		return uuidRegex.test(uuid);
	}

	validateActivityType(activityType) {
		const validTypes = ["customActivity", "integration", "webhook"];
		return validTypes.includes(activityType);
	}

	getSpecProperty(propertyPath) {
		if (!this.loadedSpecs.spec) {
			this.loadSpec();
		}

		const paths = propertyPath.split(".");
		let current = this.loadedSpecs.spec;

		for (const path of paths) {
			if (current && typeof current === "object" && path in current) {
				current = current[path];
			} else {
				return undefined;
			}
		}

		return current;
	}
}

module.exports = SpecLoader;
