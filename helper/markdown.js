import fs from "fs";

const hasBalancedCodeFences = (content) => {
	const fenceCount = (content.match(/```/g) || []).length;
	return fenceCount % 2 === 0;
};

export const validateMarkdownString = (content, fileLabel, errors) => {
	const label = fileLabel || "markdown";
	if (!content || !content.trim()) {
		errors.add(`"${label}" is empty.`);
		return false;
	}
	// Keep checks minimal to avoid false positives in CLI usage
	if (!hasBalancedCodeFences(content)) {
		errors.add('"' + label + '" has unbalanced code fences (```).');
	}
	return true;
};

export const validateMarkdownFile = (filePath, errors, label) => {
	try {
		if (!fs.existsSync(filePath)) return false;
		const content = fs.readFileSync(filePath, "utf8");
		return validateMarkdownString(content, label || filePath, errors);
	} catch (e) {
		errors.add(
			`Failed to read markdown file "${label || filePath}": ${e.message}`
		);
		return false;
	}
};
