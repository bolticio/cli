import { confirm, input, search } from "@inquirer/prompts";
import { jest } from "@jest/globals";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import * as integrationApi from "../api/integration.js";
import IntegrationCommands from "../commands/integration.js";
import * as envHelper from "../helper/env.js";
import * as folderHelper from "../helper/folder.js";
import * as validationHelper from "../helper/validation.js";
import * as integrationUtils from "../utils/integration.js";

// Mock all dependencies
jest.mock("fs");
jest.mock("path");
jest.mock("child_process");
jest.mock("os");
jest.mock("../api/integration.js");
jest.mock("../helper/env.js");
jest.mock("../helper/folder.js");
jest.mock("../helper/validation.js");
jest.mock("../utils/integration.js");
jest.mock("@inquirer/prompts");

// -------------------- MCP COMMAND TESTS --------------------

describe("MCP Commands", () => {
	let mockConsoleLog;
	let mockConsoleError;

	const setPlatform = (value) => {
		Object.defineProperty(process, "platform", { value });
	};

	beforeEach(() => {
		mockConsoleLog = jest
			.spyOn(console, "log")
			.mockImplementation(() => {});
		mockConsoleError = jest
			.spyOn(console, "error")
			.mockImplementation(() => {});
		jest.clearAllMocks();

		setPlatform("darwin");
		jest.mocked(os.homedir).mockReturnValue("/Users/test");
		// Stable path helpers
		jest.mocked(path.join).mockImplementation((...args) => args.join("/"));
		jest.mocked(path.dirname).mockImplementation(
			(p) => p.split("/").slice(0, -1).join("/") || "/"
		);
	});

	afterEach(() => {
		mockConsoleLog.mockRestore();
		mockConsoleError.mockRestore();
	});

	it("shows help when no subcommand and for unknown", async () => {
		const { default: Mcp } = await import("../commands/mcp.js");
		await Mcp.execute([]);
		expect(mockConsoleLog).toHaveBeenCalledWith(
			expect.stringContaining("MCP Commands:")
		);
		await Mcp.execute(["unknown"]);
		expect(mockConsoleLog).toHaveBeenCalledWith(
			expect.stringContaining("Unknown or missing mcp sub-command")
		);
	});

	it("requires URL for setup", async () => {
		const { default: Mcp } = await import("../commands/mcp.js");
		await Mcp.execute(["setup"]);
		expect(mockConsoleLog).toHaveBeenCalledWith(
			expect.stringContaining("URL is required")
		);
	});

	it("writes claude config JSON with mcp-remote command", async () => {
		const { default: Mcp } = await import("../commands/mcp.js");
		const writes = [];
		jest.mocked(fs.existsSync).mockReturnValue(false);
		jest.mocked(fs.mkdirSync).mockImplementation(() => {});
		jest.mocked(fs.readFileSync).mockImplementation(() => "{}\n");
		jest.mocked(fs.writeFileSync).mockImplementation((p, c) =>
			writes.push({ p, c })
		);

		await Mcp.execute([
			"setup",
			"http://localhost:3210/sse",
			"srv",
			"--client",
			"claude",
		]);

		const last = writes[writes.length - 1];
		expect(last.p).toMatch(/claude_desktop_config\.json$/);
		const json = JSON.parse(last.c);
		expect(json.mcpServers.srv.command).toBe("npx");
		expect(json.mcpServers.srv.args).toEqual(
			expect.arrayContaining(["mcp-remote", "http://localhost:3210/sse"])
		);
	});

	it("writes Cursor config with SSE url only", async () => {
		const { default: Mcp } = await import("../commands/mcp.js");
		const writes = [];
		jest.mocked(fs.existsSync).mockReturnValue(false);
		jest.mocked(fs.mkdirSync).mockImplementation(() => {});
		jest.mocked(fs.readFileSync).mockImplementation(() => "{}\n");
		jest.mocked(fs.writeFileSync).mockImplementation((p, c) =>
			writes.push({ p, c })
		);

		await Mcp.execute([
			"setup",
			"https://sse",
			"cursorSrv",
			"--client",
			"cursor",
		]);

		const last = writes[writes.length - 1];
		expect(last.p).toMatch(/\.cursor\/mcp\.json$/);
		const json = JSON.parse(last.c);
		expect(json.mcpServers.cursorSrv).toEqual({ url: "https://sse" });
	});

	it("supports --client=cursor equals syntax", async () => {
		const { default: Mcp } = await import("../commands/mcp.js");
		const writes = [];
		jest.mocked(fs.existsSync).mockReturnValue(false);
		jest.mocked(fs.mkdirSync).mockImplementation(() => {});
		jest.mocked(fs.readFileSync).mockImplementation(() => "{}\n");
		jest.mocked(fs.writeFileSync).mockImplementation((p, c) =>
			writes.push({ p, c })
		);

		await Mcp.execute([
			"setup",
			"https://sse",
			"curSrv",
			"--client=cursor",
		]);

		const last = writes[writes.length - 1];
		expect(last.p).toMatch(/\.cursor\/mcp\.json$/);
		const json = JSON.parse(last.c);
		expect(json.mcpServers.curSrv).toEqual({ url: "https://sse" });
	});

	it("writes LibreChat YAML file (content generation delegated)", async () => {
		const { default: Mcp } = await import("../commands/mcp.js");
		const writes = [];
		jest.mocked(fs.existsSync).mockReturnValue(false);
		jest.mocked(fs.mkdirSync).mockImplementation(() => {});
		jest.mocked(fs.writeFileSync).mockImplementation((p, c) =>
			writes.push({ p, c })
		);

		await Mcp.execute([
			"setup",
			"http://sse",
			"libreSrv",
			"--client",
			"librechat",
		]);

		const last = writes[writes.length - 1];
		expect(last.p).toMatch(/LibreChat\/librechat\.yaml$/);
		expect(typeof last.c).toBe("string");
		expect(last.c.length).toBeGreaterThan(0);
	});

	it("uses name from --name flag with next arg", async () => {
		const { default: Mcp } = await import("../commands/mcp.js");
		const writes = [];
		jest.mocked(fs.existsSync).mockReturnValue(false);
		jest.mocked(fs.mkdirSync).mockImplementation(() => {});
		jest.mocked(fs.readFileSync).mockImplementation(() => "{}\n");
		jest.mocked(fs.writeFileSync).mockImplementation((p, c) =>
			writes.push({ p, c })
		);

		await Mcp.execute([
			"setup",
			"http://sse",
			"--name",
			"nick",
			"--client",
			"claude",
		]);

		const last = writes[writes.length - 1];
		const json = JSON.parse(last.c);
		expect(json.mcpServers.nick).toBeDefined();
	});

	it("uses name from --name= syntax", async () => {
		const { default: Mcp } = await import("../commands/mcp.js");
		const writes = [];
		jest.mocked(fs.existsSync).mockReturnValue(false);
		jest.mocked(fs.mkdirSync).mockImplementation(() => {});
		jest.mocked(fs.writeFileSync).mockImplementation((p, c) =>
			writes.push({ p, c })
		);

		await Mcp.execute([
			"setup",
			"http://sse",
			"--name=myserver",
			"--client",
			"librechat",
		]);

		const last = writes[writes.length - 1];
		expect(last.p).toMatch(/LibreChat\/librechat\.yaml$/);
		expect(String(last.c)).toContain("myserver:");
	});

	it("updates existing YAML preserving previous servers", async () => {
		const { default: Mcp } = await import("../commands/mcp.js");
		const writes = [];
		jest.mocked(fs.existsSync).mockImplementation((p) => {
			if (typeof p === "string" && p.endsWith("LibreChat/librechat.yaml"))
				return true;
			return true;
		});
		jest.mocked(fs.mkdirSync).mockImplementation(() => {});
		jest.mocked(fs.readFileSync).mockImplementation(
			() =>
				"mcpServers:\n  existing:\n    command: npx\n    args:\n      - -y\n      - mcp-remote\n      - http://old\n"
		);
		jest.mocked(fs.writeFileSync).mockImplementation((p, c) =>
			writes.push({ p, c })
		);

		await Mcp.execute([
			"setup",
			"http://sse",
			"newSrv",
			"--client",
			"librechat",
		]);

		const last = writes[writes.length - 1];
		expect(last.p).toMatch(/LibreChat\/librechat\.yaml$/);
		// Ensure existing preserved and new added
		expect(String(last.c)).toContain("existing:");
		expect(String(last.c)).toContain("newSrv:");
	});

	it("invokes command client (vscode) with --add-mcp payload", async () => {
		const cp = await import("child_process");
		jest.mocked(cp.execFileSync).mockReturnValue(Buffer.from("ok"));
		const { default: Mcp } = await import("../commands/mcp.js");

		await Mcp.execute(["setup", "http://sse", "dev", "--client", "vscode"]);

		expect(cp.execFileSync).toHaveBeenCalled();
		const args = jest.mocked(cp.execFileSync).mock.calls[0][1];
		expect(args[0]).toBe("--add-mcp");
		const payload = JSON.parse(args[1]);
		expect(payload.name).toBe("dev");
		expect(payload.args).toEqual(
			expect.arrayContaining(["mcp-remote", "http://sse"])
		);
	});

	it("prints friendly error when command client not found (ENOENT)", async () => {
		const cp = await import("child_process");
		jest.mocked(cp.execFileSync).mockImplementation(() => {
			const err = new Error("not found");
			// @ts-ignore
			err.code = "ENOENT";
			throw err;
		});
		const { default: Mcp } = await import("../commands/mcp.js");

		await Mcp.execute(["setup", "http://sse", "dev", "--client", "vscode"]);

		expect(mockConsoleLog).toHaveBeenCalledWith(
			expect.stringContaining("Error occurred while setting up MCP")
		);
		expect(mockConsoleLog).toHaveBeenCalledWith(
			expect.stringContaining("not found")
		);
	});

	it("handles generic command client error", async () => {
		const cp = await import("child_process");
		jest.mocked(cp.execFileSync).mockImplementation(() => {
			throw new Error("boom");
		});
		const { default: Mcp } = await import("../commands/mcp.js");

		await Mcp.execute(["setup", "http://sse", "dev", "--client", "vscode"]);

		expect(mockConsoleLog).toHaveBeenCalledWith(
			expect.stringContaining("boom")
		);
	});

	it("warns and creates new YAML when existing YAML unreadable", async () => {
		const { default: Mcp } = await import("../commands/mcp.js");
		const writes = [];
		jest.mocked(fs.existsSync).mockImplementation((p) => {
			// Pretend directory and file both exist
			if (typeof p === "string" && p.endsWith("LibreChat/librechat.yaml"))
				return true;
			return true;
		});
		jest.mocked(fs.mkdirSync).mockImplementation(() => {});
		jest.mocked(fs.readFileSync).mockImplementation(() => {
			throw new Error("bad yaml");
		});
		jest.mocked(fs.writeFileSync).mockImplementation((p, c) =>
			writes.push({ p, c })
		);

		await Mcp.execute([
			"setup",
			"http://sse",
			"libreSrv",
			"--client",
			"librechat",
		]);

		expect(mockConsoleLog).toHaveBeenCalledWith(
			expect.stringContaining("Creating new YAML config file")
		);
		const last = writes[writes.length - 1];
		expect(last.p).toMatch(/LibreChat\/librechat\.yaml$/);
		expect(typeof last.c).toBe("string");
		expect(last.c.length).toBeGreaterThan(0);
	});

	it("warns and creates new JSON when existing JSON unreadable", async () => {
		const { default: Mcp } = await import("../commands/mcp.js");
		const writes = [];
		jest.mocked(fs.existsSync).mockImplementation(() => true);
		jest.mocked(fs.mkdirSync).mockImplementation(() => {});
		jest.mocked(fs.readFileSync).mockImplementation(() => "{invalid json");
		jest.mocked(fs.writeFileSync).mockImplementation((p, c) =>
			writes.push({ p, c })
		);

		await Mcp.execute(["setup", "http://sse", "srv", "--client", "claude"]);

		expect(mockConsoleLog).toHaveBeenCalledWith(
			expect.stringContaining("Creating new config file")
		);
		const last = writes[writes.length - 1];
		expect(last.p).toMatch(/claude_desktop_config\.json$/);
		const json = JSON.parse(last.c);
		expect(json.mcpServers.srv).toBeDefined();
	});

	it("exits for unsupported client type", async () => {
		const { default: Mcp } = await import("../commands/mcp.js");
		const originalExit = process.exit;
		// @ts-ignore
		process.exit = jest.fn();
		try {
			await Mcp.execute([
				"setup",
				"http://sse",
				"srv",
				"--client",
				"unknown-client",
			]);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining(
					"Client unknown-client is not supported"
				)
			);
			expect(process.exit).toHaveBeenCalledWith(1);
		} finally {
			process.exit = originalExit;
		}
	});

	it("exits for unsupported platform", async () => {
		const { default: Mcp } = await import("../commands/mcp.js");
		const originalExit = process.exit;
		// @ts-ignore
		process.exit = jest.fn();
		const originalPlatform = Object.getOwnPropertyDescriptor(
			process,
			"platform"
		);
		Object.defineProperty(process, "platform", { value: "sunos" });
		try {
			await Mcp.execute([
				"setup",
				"http://sse",
				"srv",
				"--client",
				"claude",
			]);
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("Platform sunos is not supported")
			);
			expect(process.exit).toHaveBeenCalledWith(1);
		} finally {
			if (originalPlatform)
				Object.defineProperty(process, "platform", originalPlatform);
			process.exit = originalExit;
		}
	});

	it("throws when YAML client path is missing", async () => {
		// Force path.join to return undefined for librechat path only
		const origJoin = path.join;
		jest.mocked(path.join).mockImplementation((...args) => {
			const out = args.join("/");
			if (
				typeof out === "string" &&
				out.endsWith("LibreChat/librechat.yaml")
			) {
				// @ts-ignore
				return undefined;
			}
			return out;
		});

		const { default: Mcp } = await import("../commands/mcp.js");
		await Mcp.execute([
			"setup",
			"http://sse",
			"srv",
			"--client",
			"librechat",
		]);
		expect(mockConsoleLog).toHaveBeenCalledWith(
			expect.stringContaining("Path not specified for YAML client")
		);

		// restore
		jest.mocked(path.join).mockImplementation((...args) => args.join("/"));
	});

	it("throws when file client path is missing", async () => {
		// Force path.join to return undefined for claude config path only
		jest.mocked(path.join).mockImplementation((...args) => {
			const out = args.join("/");
			if (
				typeof out === "string" &&
				out.endsWith("Claude/claude_desktop_config.json")
			) {
				// @ts-ignore
				return undefined;
			}
			return out;
		});

		const { default: Mcp } = await import("../commands/mcp.js");
		await Mcp.execute(["setup", "http://sse", "srv", "--client", "claude"]);
		expect(mockConsoleLog).toHaveBeenCalledWith(
			expect.stringContaining("Path not specified for file client")
		);

		// restore
		jest.mocked(path.join).mockImplementation((...args) => args.join("/"));
	});
});
