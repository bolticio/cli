import { jest } from "@jest/globals";

describe("Markdown Helper", () => {
	let markdown;

	beforeAll(async () => {
		markdown = await import("../helper/markdown.js");
	});

	describe("validateMarkdownString", () => {
		it("should fail on empty content", () => {
			const errors = new Set();
			const ok = markdown.validateMarkdownString(
				"   ",
				"test.mdx",
				errors
			);
			expect(ok).toBe(false);
			expect(Array.from(errors)).toContain('"test.mdx" is empty.');
		});

		it("should pass on simple markdown with balanced fences", () => {
			const errors = new Set();
			const content = "# Title\n\n```js\nconsole.log('x')\n```";
			const ok = markdown.validateMarkdownString(
				content,
				"doc.mdx",
				errors
			);
			expect(ok).toBe(true);
			expect(errors.size).toBe(0);
		});

		it("should warn for unbalanced code fences and still pass", () => {
			const errors = new Set();
			const content = "# Title\n\n```js\nconsole.log('x')"; // missing closing fence
			const ok = markdown.validateMarkdownString(
				content,
				"doc.mdx",
				errors
			);
			expect(ok).toBe(true);
			const errs = Array.from(errors);
			expect(
				errs.some((e) => e.includes("has unbalanced code fences"))
			).toBe(true);
		});

		it("should pass on markdown without any code fences", () => {
			const errors = new Set();
			const content =
				"## Subtitle\n\nSome text with a [link](https://example.com).";
			const ok = markdown.validateMarkdownString(
				content,
				"doc.mdx",
				errors
			);
			expect(ok).toBe(true);
			expect(errors.size).toBe(0);
		});
	});

	describe("validateMarkdownFile", () => {
		const originalFs = jest.requireActual("fs");
		let existsSpy;
		let readSpy;

		beforeEach(() => {
			existsSpy = jest.spyOn(originalFs, "existsSync");
			readSpy = jest.spyOn(originalFs, "readFileSync");
		});

		afterEach(() => {
			jest.restoreAllMocks();
		});

		it("should return false when file does not exist", async () => {
			existsSpy.mockReturnValue(false);
			const errors = new Set();
			const ok = markdown.validateMarkdownFile(
				"/tmp/missing.mdx",
				errors,
				"missing.mdx"
			);
			expect(ok).toBe(false);
			expect(errors.size).toBe(0);
		});

		it("should validate existing file content", async () => {
			existsSpy.mockReturnValue(true);
			readSpy.mockReturnValue("# H\n\n```\ncode\n```\n");
			const errors = new Set();
			const ok = markdown.validateMarkdownFile(
				"/tmp/doc.mdx",
				errors,
				"doc.mdx"
			);
			expect(ok).toBe(true);
			expect(errors.size).toBe(0);
		});

		it("should return false and report when file content is empty", async () => {
			existsSpy.mockReturnValue(true);
			readSpy.mockReturnValue("   ");
			const errors = new Set();
			const ok = markdown.validateMarkdownFile(
				"/tmp/empty.mdx",
				errors,
				"empty.mdx"
			);
			expect(ok).toBe(false);
			expect(Array.from(errors)).toContain('"empty.mdx" is empty.');
		});

		it("should catch and report read errors", async () => {
			existsSpy.mockReturnValue(true);
			readSpy.mockImplementation(() => {
				throw new Error("boom");
			});
			const errors = new Set();
			const ok = markdown.validateMarkdownFile(
				"/tmp/doc.mdx",
				errors,
				"doc.mdx"
			);
			expect(ok).toBe(false);
			expect(
				Array.from(errors).some((e) =>
					e.includes('Failed to read markdown file "doc.mdx"')
				)
			).toBe(true);
		});
	});
});
