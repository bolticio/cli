import chalk from "chalk";
import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { execSync, spawn } from "child_process";
import {
	uniqueNamesGenerator,
	adjectives,
	animals,
} from "unique-names-generator";

// Supported languages and their versions
export const SUPPORTED_LANGUAGES = ["nodejs", "python", "golang", "java"];
export const LANGUAGE_VERSIONS = {
	nodejs: "20",
	python: "3",
	golang: "1.22",
	java: "17",
};

// Handler mapping per language
export const HANDLER_MAPPING = {
	nodejs: "handler.handler",
	python: "index.handler",
	golang: "handler.handler",
	java: "Handler.handler",
};

// Language display names for dropdown
export const LANGUAGE_CHOICES = [
	{ name: "NodeJS", value: "nodejs" },
	{ name: "Python", value: "python" },
	{ name: "Golang", value: "golang" },
	{ name: "Java", value: "java" },
];

/**
 * Parse command line arguments for the create command
 */
export function parseCreateArgs(args) {
	const parsed = {
		name: null,
		language: null,
		directory: process.cwd(),
		type: null, // code, git, or container
	};

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		const nextArg = args[i + 1];

		if ((arg === "--name" || arg === "-n") && nextArg) {
			parsed.name = nextArg;
			i++;
		} else if ((arg === "--language" || arg === "-l") && nextArg) {
			parsed.language = nextArg.toLowerCase();
			i++;
		} else if ((arg === "--directory" || arg === "-d") && nextArg) {
			parsed.directory = path.resolve(nextArg);
			i++;
		} else if ((arg === "--type" || arg === "-t") && nextArg) {
			parsed.type = nextArg.toLowerCase();
			i++;
		}
	}

	return parsed;
}

/**
 * Generate a random serverless name using unique-names-generator
 * Similar to go-randomdata's SillyName() function
 * @see https://github.com/Pallinder/go-randomdata
 */
export function generateRandomName(language) {
	const sillyName = uniqueNamesGenerator({
		dictionaries: [adjectives, animals],
		separator: "-",
		length: 2,
		style: "lowerCase",
	});
	return `${sillyName}-${language}`;
}

/**
 * Get the boltic-properties.yaml template content
 */
export function getBolticYamlContent(templateContext, language) {
	return `app: "${templateContext.AppSlug}"
region: "${templateContext.Region}"
handler: "${HANDLER_MAPPING[language]}"
language: "${templateContext.Language}"

serverlessConfig:
  Name: "${templateContext.AppSlug}"
  Description: ""
  Runtime: "code"
  # Environment variables for your serverless function
  # To add env variables, replace {} with key-value pairs like:
  # Env:
  #   API_KEY: "your-api-key"
  Env: {}
  PortMap: []
  Scaling:
    AutoStop: false
    Min: 1
    Max: 1
    MaxIdleTime: 300
  Resources:
    CPU: 0.1
    MemoryMB: 128
    MemoryMaxMB: 128
  Timeout: 60
  Validations: null

build:
  builtin: dockerfile
  ignorefile: .gitignore
`;
}

/**
 * Get handler file content based on language
 */
export function getHandlerContent(language) {
	const handlers = {
		nodejs: `// Define the handler function
export const handler = async (event, res) => {
    try {
        // Prepare the response JSON
        const responseJson = {
            message: "Hello World"
        };

        // Print the JSON response to stdout
        console.log(JSON.stringify(responseJson));

        // Set the response headers
        res.setHeader('Content-Type', 'application/json');

        // Send the response JSON
        res.end(JSON.stringify(responseJson));
    } catch (error) {
        // Handle errors
        console.error(error);
        // Send an error response if needed
        res.statusCode = 500;
        res.setHeader('Content-Type', 'text/plain');
        res.end('Internal Server Error');
    }
};
`,
		python: `# Import the required modules
from flask import jsonify

# Define the handler function
def handler(request):
    # Create the response JSON
    response_json = {
        'message': 'Hello World'
    }

    # Print the JSON response to stdout
    print(response_json)

    # Return a JSON response
    return jsonify(response_json)
`,
		golang: `package main

// Import necessary packages
import (
	"encoding/json"
	"fmt"
	"net/http"
)

// Define the handler function
func handler(req http.ResponseWriter, res *http.Request) {
	// Initialize a map to hold the response body
	response := map[string]string{
		"message": "Hello, World!", // Set the message to "Hello, World!"
	}

	// Set the Content-Type header to application/json
	req.Header().Set("Content-Type", "application/json")

	// Encode the response map into JSON and write it to the response
	json.NewEncoder(req).Encode(response)

	// Marshal the response map into JSON
	responseJson, err := json.Marshal(response)
	if err != nil {
		http.Error(req, err.Error(), http.StatusInternalServerError)
		return
	}

	// Print the JSON response to stdout
	fmt.Println(string(responseJson))
}
`,
		java: `package com.boltic.io.serverless;

import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

@Service
public class Handler {

    /**
     * Handles the incoming request and returns a JSON response.
     *
     * @return ResponseEntity containing the JSON response or an error message.
     */
    public ResponseEntity<String> handler(String method, String requestBody) {
        try {
            // Prepare the response JSON
            String responseJson = "{\\"message\\": \\"Hello World\\"}";

            // Print the JSON response to stdout
            System.out.println(responseJson);

            // Return the response with HTTP status 200 (OK)
            return ResponseEntity.ok().body(responseJson);
        } catch (Exception e) {
            // Handle errors by printing the stack trace
            e.printStackTrace();

            // Return an error response with HTTP status 500 (Internal Server Error)
            return ResponseEntity.status(500).body("Internal Server Error");
        }
    }
}
`,
	};

	return handlers[language] || "";
}

/**
 * Get the handler file path based on language
 */
export function getHandlerFilePath(language) {
	const paths = {
		nodejs: "handler.js",
		python: "index.py",
		golang: "handler.go",
		java: "src/main/java/com/boltic/io/serverless/Handler.java",
	};

	return paths[language] || "";
}

/**
 * Create the serverless function files
 */
export function createServerlessFiles(targetDir, language, templateContext) {
	// Create boltic-properties.yaml
	const bolticYamlPath = path.join(targetDir, "boltic-properties.yaml");
	const bolticYamlContent = getBolticYamlContent(templateContext, language);
	fs.writeFileSync(bolticYamlPath, bolticYamlContent, "utf8");

	// Create handler file
	const handlerRelativePath = getHandlerFilePath(language);
	const handlerPath = path.join(targetDir, handlerRelativePath);

	// Create directories if needed (for Java)
	const handlerDir = path.dirname(handlerPath);
	if (!fs.existsSync(handlerDir)) {
		fs.mkdirSync(handlerDir, { recursive: true });
	}

	const handlerContent = getHandlerContent(language);
	fs.writeFileSync(handlerPath, handlerContent, "utf8");
}

/**
 * Display success messages after serverless creation
 */
export function displayCreateSuccessMessages(targetDir) {
	console.log("\n" + chalk.bgGreen.black(" ✓ SUCCESS ") + "\n");

	console.log(
		chalk.green("📁 Serverless function initialized at: ") +
			chalk.cyan(targetDir)
	);
	console.log();

	console.log(chalk.dim("━".repeat(60)));
	console.log();

	console.log(chalk.yellow("📖 Next Steps:"));
	console.log();
	console.log(
		chalk.white("  1. Navigate to your project directory:") +
			chalk.cyan(` cd ${path.basename(targetDir)}`)
	);
	console.log(
		chalk.white("  2. Test your function locally: ") +
			chalk.cyan("boltic serverless test")
	);
	console.log(
		chalk.white("  3. Deploy your function by following the documentation")
	);
	console.log();

	console.log(chalk.dim("━".repeat(60)));
	console.log();

	console.log(chalk.blue("📚 Documentation:"));
	console.log(
		chalk.underline.cyan(
			"https://docs.boltic.io/docs/compute/serverless/launch-your-application"
		)
	);
	console.log();
}

// ============================================================================
// TEST COMMAND HELPERS
// ============================================================================

// Default handler files per language
export const DEFAULT_HANDLER_FILES = {
	nodejs: "handler.js",
	python: "index.py",
	golang: "handler.go",
	java: "src/main/java/com/boltic/io/serverless/Handler.java",
};

// Generated wrapper file names
export const GENERATED_FILES = {
	nodejs: ["autogen_index.js"],
	python: ["autogen_index.py"],
	golang: ["autogen_index.go", "go.mod"],
	java: [
		"src/main/java/com/boltic/io/serverless/AutogenIndex.java",
		"pom.xml",
	],
};

// Required dependencies per language
export const REQUIRED_DEPENDENCIES = {
	nodejs: ["axios", "body-parser", "express@4.21.2", "nodemon", "winston"],
	python: ["flask", "gunicorn", "waitress"],
	golang: [],
	java: [],
};

// Language detection files
const LANGUAGE_DETECTION_FILES = {
	nodejs: ["package.json"],
	python: ["requirements.txt", "pyproject.toml"],
	golang: ["go.mod"],
	java: ["pom.xml", "build.gradle"],
};

/**
 * Parse command line arguments for the test command
 */
export function parseTestArgs(args) {
	const parsed = {
		port: 5555,
		handlerFile: null,
		handlerFunction: "handler",
		language: null,
		directory: process.cwd(),
		command: null,
		retain: false,
	};

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		const nextArg = args[i + 1];

		if ((arg === "--port" || arg === "-p") && nextArg) {
			parsed.port = parseInt(nextArg, 10);
			i++;
		} else if ((arg === "--handler-file" || arg === "-f") && nextArg) {
			parsed.handlerFile = nextArg;
			i++;
		} else if ((arg === "--handler-function" || arg === "-u") && nextArg) {
			parsed.handlerFunction = nextArg;
			i++;
		} else if ((arg === "--language" || arg === "-l") && nextArg) {
			parsed.language = nextArg.toLowerCase();
			i++;
		} else if ((arg === "--directory" || arg === "-d") && nextArg) {
			parsed.directory = path.resolve(nextArg);
			i++;
		} else if (arg === "--command" && nextArg) {
			parsed.command = nextArg;
			i++;
		} else if (arg === "--retain" || arg === "-r") {
			parsed.retain = true;
		}
	}

	return parsed;
}

/**
 * Load and parse boltic-properties.yaml configuration
 */
export function loadBolticConfig(directory) {
	const configPath = path.join(directory, "boltic-properties.yaml");

	if (!fs.existsSync(configPath)) {
		return null;
	}

	try {
		const configContent = fs.readFileSync(configPath, "utf8");
		const config = yaml.load(configContent);
		return config;
	} catch (error) {
		console.log(
			chalk.yellow(
				`⚠️  Warning: Could not parse boltic-properties.yaml: ${error.message}`
			)
		);
		return null;
	}
}

/**
 * Parse language from boltic-properties.yaml language field (e.g., "nodejs/20" -> "nodejs")
 */
export function parseLanguageFromConfig(languageField) {
	if (!languageField) return null;
	// Handle format like "nodejs/20" or just "nodejs"
	return languageField.split("/")[0].toLowerCase();
}

/**
 * Parse handler config (e.g., "handler.handler" -> { file: "handler", function: "handler" })
 */
export function parseHandlerConfig(handlerField, language) {
	if (!handlerField) {
		return {
			file: DEFAULT_HANDLER_FILES[language],
			function: "handler",
		};
	}

	const parts = handlerField.split(".");
	if (parts.length >= 2) {
		const functionName = parts.pop();
		const fileBase = parts.join(".");

		// For Java, the handler file is in a specific package structure
		if (language === "java") {
			// Convert "Handler" to full path "src/main/java/com/boltic/io/serverless/Handler.java"
			return {
				file: `src/main/java/com/boltic/io/serverless/${fileBase}.java`,
				function: functionName,
			};
		}

		// Add appropriate extension based on language
		const extensions = {
			nodejs: ".js",
			python: ".py",
			golang: ".go",
		};

		return {
			file: fileBase + (extensions[language] || ""),
			function: functionName,
		};
	}

	return {
		file: DEFAULT_HANDLER_FILES[language],
		function: handlerField,
	};
}

/**
 * Auto-detect language from project files
 */
export function detectLanguage(directory) {
	console.log(chalk.cyan("🔍 Scanning source code..."));

	for (const [language, files] of Object.entries(LANGUAGE_DETECTION_FILES)) {
		for (const file of files) {
			if (fs.existsSync(path.join(directory, file))) {
				console.log(chalk.green(`✓ Detected ${language} app`));
				return language;
			}
		}
	}

	return null;
}

/**
 * Get the wrapper file content for NodeJS
 */
function getNodeJSWrapperContent(handlerFile, handlerFunction) {
	// Keep .js extension for ESM imports (Node.js requires it)
	const importPath = "./" + handlerFile;

	return `// autogen_index.js - System Generated File
// This file is automatically generated by the system.
// DO NOT EDIT - This file will be deleted after testing.

import express from 'express';
import bodyParser from 'body-parser';
import { ${handlerFunction} } from '${importPath}';

const PORT = process.env.BOLTIC_APPLICATION_PORT || 8080;
const DEV_MODE = process.env.BOLTIC_DEVELOPMENT_MODE || false;

const app = express();

app.disable('x-powered-by');
app.use(bodyParser.urlencoded({ extended: false, limit: '25mb' }));
app.use(bodyParser.json({ limit: '25mb' }));
app.use(bodyParser.text({ limit: '25mb' }));
app.use(bodyParser.raw({ limit: '25mb' }));

const requestHandler = async (req, res) => {
  try {
    await ${handlerFunction}(req, res);
    if (!res.headersSent) {
      res.status(200).json({ message: "handler completed without sending a response" });
    }
  } catch (error) {
    console.error("Error occurred while handling request:", error);
    res.status(500).send("Internal Server Error");
  }
};

app.all('*', requestHandler);

app.listen(PORT, () => {
  if (DEV_MODE) {
    console.log(\`Listening for events on port \${PORT} in development mode\`);
  } else {
    console.log(\`Listening for events\`);
  }
});
`;
}

/**
 * Get the wrapper file content for Python
 */
function getPythonWrapperContent(handlerFile, handlerFunction) {
	// Remove .py extension for import
	const importModule = handlerFile.replace(/\.py$/, "");

	return `# autogen_index.py - System Generated File
# This file is automatically generated by the system.
# DO NOT EDIT - This file will be deleted after testing.

from flask import Flask, request
from ${importModule} import ${handlerFunction}
import os
from waitress import serve

PORT = int(os.environ.get('BOLTIC_APPLICATION_PORT', 8080))
DEV_MODE = bool(os.environ.get('BOLTIC_DEVELOPMENT_MODE', False))

HTTP_METHODS = ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'CONNECT', 'OPTIONS', 'TRACE', 'PATCH']

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 25 * 1024 * 1024  # 25 MB limit

@app.route('/', methods=HTTP_METHODS, defaults={'path': ''})
@app.route('/<path:path>', methods=HTTP_METHODS)
def index(path):
    return ${handlerFunction}(request)

if __name__ == '__main__':
    if DEV_MODE:
        print('Listening for events on port {} in development mode'.format(PORT), flush=True)
    else:
        print('Listening for events', flush=True)
    serve(app, host='0.0.0.0', port=PORT)
`;
}

/**
 * Get the wrapper file content for Golang
 */
function getGolangWrapperContent(handlerFunction) {
	return `// autogen_index.go - System Generated File
// This file is automatically generated by the system.
// DO NOT EDIT - This file will be deleted after testing.

package main

import (
    "fmt"
    "log"
    "net/http"
    "os"
)

func main() {
    port := os.Getenv("BOLTIC_APPLICATION_PORT")
    if port == "" {
        port = "8080"
    }
    
    http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        ${handlerFunction}(w, r)
    })
    
    devMode := os.Getenv("BOLTIC_DEVELOPMENT_MODE")
    if devMode == "true" {
        fmt.Printf("Listening for events on port %s in development mode\\n", port)
    } else {
        fmt.Println("Listening for events")
    }
    log.Fatal(http.ListenAndServe(":"+port, nil))
}
`;
}

/**
 * Get the wrapper file content for Java (Spring Boot)
 */
function getJavaWrapperContent(handlerFunction) {
	return `// AutogenIndex.java - System Generated File
// This file is automatically generated by the system.
// DO NOT EDIT - This file will be deleted after testing.

package com.boltic.io.serverless;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;

@SpringBootApplication
@RestController
public class AutogenIndex {

    @Autowired
    private Handler handler;

    public static void main(String[] args) {
        String devMode = System.getenv("BOLTIC_DEVELOPMENT_MODE");
        String port = System.getenv("BOLTIC_APPLICATION_PORT");
        if (port == null) port = "8080";
        
        if ("true".equals(devMode)) {
            System.out.println("Listening for events on port " + port + " in development mode");
        } else {
            System.out.println("Listening for events");
        }
        
        SpringApplication.run(AutogenIndex.class, args);
    }

    @RequestMapping(value = "/**", method = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE, RequestMethod.PATCH})
    public ResponseEntity<String> handleRequest(@RequestBody(required = false) String body, @RequestHeader java.util.Map<String, String> headers) {
        return handler.${handlerFunction}(headers.getOrDefault("X-Http-Method", "GET"), body);
    }
}
`;
}

/**
 * Get go.mod content for Golang projects (generated during test)
 */
function getGoModContent(appName) {
	return `module ${appName}

go 1.22
`;
}

/**
 * Get pom.xml content for Java projects (generated during test)
 */
function getJavaPomXmlContent(appName) {
	return `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.2.0</version>
        <relativePath/>
    </parent>
    
    <groupId>com.boltic.io</groupId>
    <artifactId>${appName}</artifactId>
    <version>1.0.0</version>
    <name>${appName}</name>
    <description>Boltic Serverless Function</description>
    
    <properties>
        <java.version>17</java.version>
    </properties>
    
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
    </dependencies>
    
    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>
</project>
`;
}

/**
 * Detect the exported handler function name from the code
 * This handles cases where the user might have renamed the function (e.g., handler -> handler1)
 */
export function detectHandlerFunctionFromCode(code, language) {
	if (!code) return null;

	switch (language) {
		case "nodejs": {
			// Match: export const <name> = or export function <name>( or export async function <name>(
			const exportConstMatch = code.match(/export\s+const\s+(\w+)\s*=/);
			const exportFunctionMatch = code.match(
				/export\s+(async\s+)?function\s+(\w+)\s*\(/
			);
			const exportDefaultMatch = code.match(
				/export\s+default\s+(async\s+)?function\s+(\w+)\s*\(/
			);

			if (exportConstMatch) return exportConstMatch[1];
			if (exportFunctionMatch) return exportFunctionMatch[2];
			if (exportDefaultMatch) return exportDefaultMatch[2];

			// Also check for module.exports pattern
			const moduleExportsMatch = code.match(
				/module\.exports\s*=\s*{\s*(\w+)/
			);
			if (moduleExportsMatch) return moduleExportsMatch[1];

			return null;
		}
		case "python": {
			// Match: def <name>( at the start of a line (top-level function)
			// We want to find the main handler function, typically the first or only def at top level
			const defMatches = code.match(/^def\s+(\w+)\s*\(/gm);
			if (defMatches && defMatches.length > 0) {
				// Get the first function name
				const firstMatch = defMatches[0].match(/^def\s+(\w+)\s*\(/);
				if (firstMatch) return firstMatch[1];
			}
			return null;
		}
		case "golang": {
			// Match: func <Name>( where Name starts with uppercase (exported)
			// Look for handler-like functions that take http.ResponseWriter and *http.Request
			const funcMatches = code.match(
				/func\s+([A-Z]\w*)\s*\([^)]*http\.ResponseWriter/g
			);
			if (funcMatches && funcMatches.length > 0) {
				const firstMatch = funcMatches[0].match(
					/func\s+([A-Z]\w*)\s*\(/
				);
				if (firstMatch) return firstMatch[1];
			}
			// Fallback: any exported function (starts with uppercase)
			const anyExportedMatch = code.match(/func\s+([A-Z]\w*)\s*\(/);
			if (anyExportedMatch) return anyExportedMatch[1];
			return null;
		}
		case "java": {
			// Match: public <return_type> <name>( - typically looking for handler method
			// Skip common methods like main, constructor
			const methodMatches = code.match(
				/public\s+\w+(?:<[^>]+>)?\s+(\w+)\s*\([^)]*\)/g
			);
			if (methodMatches) {
				for (const match of methodMatches) {
					const methodNameMatch = match.match(
						/public\s+\w+(?:<[^>]+>)?\s+(\w+)\s*\(/
					);
					if (methodNameMatch) {
						const methodName = methodNameMatch[1];
						// Skip constructor, main, and common Spring methods
						if (
							!["main", "run", "configure", "init"].includes(
								methodName.toLowerCase()
							) &&
							!methodName.match(/^[A-Z]/)
						) {
							// Skip if looks like constructor
							return methodName;
						}
					}
				}
			}
			return null;
		}
		default:
			return null;
	}
}

/**
 * Generate wrapper file content based on language
 */
export function generateWrapperContent(language, handlerFile, handlerFunction) {
	switch (language) {
		case "nodejs":
			return getNodeJSWrapperContent(handlerFile, handlerFunction);
		case "python":
			return getPythonWrapperContent(handlerFile, handlerFunction);
		case "golang":
			return getGolangWrapperContent(handlerFunction);
		case "java":
			return getJavaWrapperContent(handlerFunction);
		default:
			return null;
	}
}

/**
 * Generate all test files for a language
 * Returns an array of { path, content } objects
 */
export function generateTestFiles(
	language,
	handlerFile,
	handlerFunction,
	appName
) {
	const files = [];

	// Generate wrapper file
	const wrapperContent = generateWrapperContent(
		language,
		handlerFile,
		handlerFunction
	);
	if (wrapperContent) {
		files.push({
			path: GENERATED_FILES[language][0],
			content: wrapperContent,
		});
	}

	// Generate additional files for Golang
	if (language === "golang") {
		files.push({
			path: "go.mod",
			content: getGoModContent(appName),
		});
	}

	// Generate additional files for Java
	if (language === "java") {
		files.push({
			path: "pom.xml",
			content: getJavaPomXmlContent(appName),
		});
	}

	return files;
}

/**
 * Get the start command for the server based on language
 */
export function getStartCommand(language, directory, customCommand) {
	if (customCommand) {
		return {
			command: customCommand.split(" ")[0],
			args: customCommand.split(" ").slice(1),
		};
	}

	// Check if Python venv exists
	const venvPython = path.join(directory, ".venv", "bin", "python3");
	const usePythonVenv = fs.existsSync(venvPython);

	const commands = {
		nodejs: {
			command: "npx",
			args: ["nodemon", GENERATED_FILES.nodejs[0]],
		},
		python: {
			command: usePythonVenv ? venvPython : "python3",
			args: [GENERATED_FILES.python[0]],
		},
		golang: {
			command: "go",
			args: ["run", "."],
		},
		java: {
			// Check if it's Maven or Gradle
			// Use 'clean' to force fresh compilation (avoid stale class files)
			command: fs.existsSync(path.join(directory, "pom.xml"))
				? "mvn"
				: "gradle",
			args: fs.existsSync(path.join(directory, "pom.xml"))
				? ["clean", "spring-boot:run", "-f", "pom.xml"]
				: ["clean", "bootRun", "-b", "build.gradle"],
		},
	};

	return commands[language] || { command: "", args: [] };
}

/**
 * Check if NodeJS dependencies are installed
 */
export function checkNodeDependencies(directory, dependencies) {
	const missingDeps = [];

	for (const dep of dependencies) {
		// Remove version specifier for checking
		const depName = dep.split("@")[0];
		const depPath = path.join(directory, "node_modules", depName);

		if (!fs.existsSync(depPath)) {
			missingDeps.push(dep);
		}
	}

	return missingDeps;
}

/**
 * Check if Python dependencies are installed
 * Returns array of missing dependencies
 */
export function checkPythonDependencies(dependencies, execSync) {
	const missingDeps = [];

	for (const dep of dependencies) {
		try {
			execSync(`python3 -c "import ${dep}"`, { stdio: "ignore" });
		} catch {
			missingDeps.push(dep);
		}
	}

	return missingDeps;
}

/**
 * Get environment variables for the test server
 */
export function getTestEnvironmentVariables(port, language) {
	const env = {
		...process.env,
		BOLTIC_DEVELOPMENT_MODE: "true",
		BOLTIC_APPLICATION_PORT: String(port),
	};

	// Python-specific: disable output buffering
	if (language === "python") {
		env.PYTHONUNBUFFERED = "1";
	}

	// Java-specific: Spring Boot uses SERVER_PORT
	if (language === "java") {
		env.SERVER_PORT = String(port);
	}

	return env;
}

/**
 * Clean up generated files
 */
export function cleanupGeneratedFiles(directory, language, retain) {
	if (retain) {
		console.log(
			chalk.yellow(
				"\n⚠️  Retaining auto-generated test files. Please delete them manually before deployment."
			)
		);
		return;
	}

	const filesToDelete = GENERATED_FILES[language] || [];

	console.log(chalk.cyan("\n🧹 Cleaning up generated files..."));

	for (const file of filesToDelete) {
		const filePath = path.join(directory, file);
		if (fs.existsSync(filePath)) {
			try {
				fs.unlinkSync(filePath);
				console.log(chalk.dim(`   Deleted: ${file}`));
			} catch (error) {
				console.log(
					chalk.yellow(
						`   ⚠️  Could not delete ${file}: ${error.message}`
					)
				);
			}
		}
	}
}

/**
 * Display test server startup message
 */
export function displayTestStartupMessage(port) {
	console.log("\n" + chalk.bgCyan.black(" 🧪 LOCAL TEST SERVER ") + "\n");
	console.log(
		chalk.green("🚀 Starting local test server on ") +
			chalk.bold.cyan(`http://localhost:${port}`)
	);
	console.log();
	console.log(chalk.dim("━".repeat(60)));
	console.log(chalk.dim("  Press Ctrl+C to stop the server"));
	console.log(chalk.dim("━".repeat(60)));
	console.log();
}

// ============================================================================
// PUBLISH COMMAND HELPERS
// ============================================================================

/**
 * Parse command line arguments for the publish command
 */
export function parsePublishArgs(args) {
	const parsed = {
		directory: process.cwd(),
	};

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		const nextArg = args[i + 1];

		if ((arg === "--directory" || arg === "-d") && nextArg) {
			parsed.directory = path.resolve(nextArg);
			i++;
		} else if (!arg.startsWith("-") && !parsed._dirSet) {
			// Accept positional argument as directory (e.g., `boltic serverless publish ./my-project`)
			parsed.directory = path.resolve(arg);
			parsed._dirSet = true;
		}
	}

	delete parsed._dirSet;
	return parsed;
}

/**
 * Read handler file content based on language
 */
export function readHandlerFile(directory, language, config) {
	const handlerConfig = parseHandlerConfig(config?.handler, language);
	const handlerPath = path.join(directory, handlerConfig.file);

	if (!fs.existsSync(handlerPath)) {
		return null;
	}

	return fs.readFileSync(handlerPath, "utf8");
}

/**
 * Build payload for updating an existing serverless function
 * Uses serverlessConfig from boltic-properties.yaml
 * Only includes CodeOpts when runtime is "code"
 */
export function buildUpdatePayload(serverlessConfig, language, code) {
	const runtime = serverlessConfig?.Runtime || "code";

	// Flatten PortMap if it's nested (e.g., [[{...}]] -> [{...}])
	let portMap = serverlessConfig?.PortMap || [];
	if (
		Array.isArray(portMap) &&
		portMap.length > 0 &&
		Array.isArray(portMap[0])
	) {
		portMap = portMap.flat();
	}

	const payload = {
		Name: serverlessConfig?.Name || "",
		Description: serverlessConfig?.Description || "",
		Runtime: runtime,
		Env: serverlessConfig?.Env || {},
		PortMap: runtime === "code" ? [] : portMap,
		Scaling: serverlessConfig?.Scaling || {
			AutoStop: false,
			Min: 1,
			Max: 1,
			MaxIdleTime: 300,
		},
		Resources: serverlessConfig?.Resources || {
			CPU: 0.1,
			MemoryMB: 128,
			MemoryMaxMB: 128,
		},
		Timeout: serverlessConfig?.Timeout || 60,
		Validations: serverlessConfig?.Validations || null,
	};

	// For code type: CodeOpts with Language, Packages, and Code
	if (runtime === "code") {
		payload.CodeOpts = {
			Language: language,
			Packages: [],
			Code: code,
		};
	}

	// For git type: CodeOpts with Language and Packages only (no Code)
	if (runtime === "git") {
		payload.CodeOpts = {
			Language: language,
			Packages: [],
		};
	}

	// For container type: ContainerOpts only (no CodeOpts)
	if (runtime === "container") {
		payload.ContainerOpts = {
			Image: serverlessConfig?.ContainerOpts?.Image?.trim() || "",
			Args: serverlessConfig?.ContainerOpts?.Args || [],
			Command: serverlessConfig?.ContainerOpts?.Command || "",
		};
	}

	return payload;
}

/**
 * Display publish success message
 */
export function displayPublishSuccessMessage(name, response) {
	const emoji = "🚀";

	console.log(
		chalk.green(`${emoji} Serverless function PUBLISHED successfully!`)
	);
	console.log();
	console.log(chalk.cyan("   Name: ") + chalk.white(name));
	if (response?.ID) {
		console.log(chalk.cyan("   ID: ") + chalk.white(response.ID));
	}
	console.log();
	console.log(chalk.dim("━".repeat(60)));
	console.log();
	console.log(chalk.blue("📚 Documentation:"));
	console.log(
		chalk.underline.cyan(
			"https://docs.boltic.io/docs/compute/serverless/launch-your-application"
		)
	);
	console.log();
}

// PULL COMMAND HELPERS

/**
 * Get boltic-properties.yaml content for pulled serverless (includes serverlessId and serverlessConfig)
 */
export function getPulledBolticYamlContent(serverlessData) {
	const config = serverlessData.Config;
	const runtime = config.Runtime || "code";
	const language = config.CodeOpts?.Language || "nodejs/20";
	const handler =
		HANDLER_MAPPING[language.split("/")[0]] || "handler.handler";

	// Flatten PortMap if nested
	let portMap = config.PortMap || [];
	if (
		Array.isArray(portMap) &&
		portMap.length > 0 &&
		Array.isArray(portMap[0])
	) {
		portMap = portMap.flat();
	}

	// Build serverlessConfig object
	const serverlessConfig = {
		Name: config.Name || "",
		Description: config.Description || "",
		Runtime: runtime,
		Env: config.Env || {},
		PortMap: portMap,
		Scaling: config.Scaling || {
			AutoStop: false,
			Min: 1,
			Max: 1,
			MaxIdleTime: 300,
		},
		Resources: config.Resources || {
			CPU: 0.1,
			MemoryMB: 128,
			MemoryMaxMB: 128,
		},
		Timeout: config.Timeout || 60,
		Validations: config.Validations || null,
	};

	// Format Env as YAML
	const envYaml =
		Object.keys(serverlessConfig.Env).length > 0
			? Object.entries(serverlessConfig.Env)
					.map(([key, value]) => `    ${key}: "${value}"`)
					.join("\n")
			: null;

	// Format PortMap as YAML
	const portMapYaml =
		serverlessConfig.PortMap.length > 0
			? serverlessConfig.PortMap.map(
					(port) =>
						`    - Name: "${port.Name || "port"}"\n      Port: "${port.Port || "8080"}"\n      Protocol: "${port.Protocol || "http"}"`
				).join("\n")
			: null;

	// Check if ContainerOpts exists and has Image
	const containerOpts = config.ContainerOpts;
	const hasContainerOpts = containerOpts && containerOpts.Image;

	// Format ContainerOpts as YAML if exists
	const containerOptsYaml = hasContainerOpts
		? `  ContainerOpts:
    Image: "${containerOpts.Image || ""}"
    Args: ${JSON.stringify(containerOpts.Args || [])}
    Command: "${containerOpts.Command || ""}"`
		: "";

	// For container type, don't include handler and language
	const headerSection =
		runtime === "container"
			? `app: "${config.Name}"
region: "${serverlessData.RegionID || "asia-south1"}"
serverlessId: "${serverlessData.ID}"`
			: `app: "${config.Name}"
region: "${serverlessData.RegionID || "asia-south1"}"
handler: "${handler}"
language: "${language}"
serverlessId: "${serverlessData.ID}"`;

	return `${headerSection}

serverlessConfig:
  Name: "${serverlessConfig.Name}"
  Description: "${serverlessConfig.Description}"
  Runtime: "${serverlessConfig.Runtime}"
  Env: ${envYaml ? `\n${envYaml}` : "{}"}
  PortMap: ${portMapYaml ? `\n${portMapYaml}` : "[]"}
  Scaling:
    AutoStop: ${serverlessConfig.Scaling.AutoStop}
    Min: ${serverlessConfig.Scaling.Min}
    Max: ${serverlessConfig.Scaling.Max}
    MaxIdleTime: ${serverlessConfig.Scaling.MaxIdleTime}
  Resources:
    CPU: ${serverlessConfig.Resources.CPU}
    MemoryMB: ${serverlessConfig.Resources.MemoryMB}
    MemoryMaxMB: ${serverlessConfig.Resources.MemoryMaxMB}
  Timeout: ${serverlessConfig.Timeout}
  Validations: ${serverlessConfig.Validations === null ? "null" : JSON.stringify(serverlessConfig.Validations)}
${containerOptsYaml}

build:
  builtin: dockerfile
  ignorefile: .gitignore
`;
}

/**
 * Handle git-type serverless pull - clone the repository
 */
function handleGitTypePull(targetDir, serverlessData) {
	const config = serverlessData.Config;

	// Get git repository info from Links
	const gitRepo = serverlessData.Links?.Git?.Repository;
	const gitSshUrl = gitRepo?.SshURL;
	const gitHttpUrl = gitRepo?.CloneURL;
	const gitWebUrl = gitRepo?.HtmlURL;

	if (!gitSshUrl && !gitHttpUrl) {
		console.log(
			chalk.yellow(
				"\n⚠️  No git repository URL found for this serverless."
			)
		);
		console.log(chalk.dim("Creating boltic-properties.yaml only..."));

		// Create boltic-properties.yaml
		const bolticYamlPath = path.join(targetDir, "boltic-properties.yaml");
		const bolticYamlContent = getPulledBolticYamlContent(serverlessData);
		fs.writeFileSync(bolticYamlPath, bolticYamlContent, "utf8");

		return { bolticYamlPath };
	}

	// Check SSH access
	let hasGitAccess = false;
	console.log(chalk.cyan("\n🔍 Checking git repository access..."));

	try {
		execSync(`git ls-remote ${gitSshUrl}`, {
			stdio: "pipe",
			timeout: 15000,
		});
		hasGitAccess = true;
		console.log(chalk.green("✓ SSH access verified!"));
	} catch (err) {
		hasGitAccess = false;
		console.log(chalk.yellow("⚠️  SSH access not available"));
	}

	if (hasGitAccess) {
		// Clone the repository
		console.log(chalk.cyan("\n📥 Cloning repository..."));
		try {
			// Remove the target directory first (it was created empty)
			fs.rmSync(targetDir, { recursive: true, force: true });

			// Clone into the target directory
			execSync(`git clone ${gitSshUrl} "${targetDir}"`, {
				stdio: "inherit",
			});

			// Create/update boltic-properties.yaml with serverlessId
			const bolticYamlPath = path.join(
				targetDir,
				"boltic-properties.yaml"
			);
			const bolticYamlContent =
				getPulledBolticYamlContent(serverlessData);
			fs.writeFileSync(bolticYamlPath, bolticYamlContent, "utf8");

			console.log(chalk.green("\n✓ Repository cloned successfully!"));

			return { bolticYamlPath, cloned: true };
		} catch (cloneErr) {
			console.error(
				chalk.red("\n❌ Failed to clone repository:"),
				cloneErr.message
			);

			// Recreate the directory and add boltic-properties.yaml
			fs.mkdirSync(targetDir, { recursive: true });
			const bolticYamlPath = path.join(
				targetDir,
				"boltic-properties.yaml"
			);
			const bolticYamlContent =
				getPulledBolticYamlContent(serverlessData);
			fs.writeFileSync(bolticYamlPath, bolticYamlContent, "utf8");

			return { bolticYamlPath, cloned: false };
		}
	} else {
		// No SSH access - show error and instructions
		console.log(
			chalk.red("\n❌ Cannot clone repository - SSH key not configured.")
		);
		console.log();
		console.log(
			chalk.yellow(
				"🔑 Please add your SSH key from Boltic Console → Settings → SSH Keys"
			)
		);
		console.log(chalk.yellow("   Then try pulling again."));

		// Clean up the empty directory
		try {
			fs.rmSync(targetDir, { recursive: true, force: true });
		} catch (err) {
			// Ignore cleanup errors
		}

		return { error: true };
	}
}

/**
 * Create folder structure for pulled serverless
 */
export function createPulledServerlessFiles(
	targetDir,
	serverlessData,
	serverlessType = "code"
) {
	const config = serverlessData.Config;
	const language = config.CodeOpts?.Language?.split("/")[0] || "nodejs";

	// Handle git-type serverless
	if (serverlessType === "git") {
		return handleGitTypePull(targetDir, serverlessData);
	}

	// Handle container-type serverless - only create boltic-properties.yaml
	if (serverlessType === "container") {
		const bolticYamlPath = path.join(targetDir, "boltic-properties.yaml");
		const bolticYamlContent = getPulledBolticYamlContent(serverlessData);
		fs.writeFileSync(bolticYamlPath, bolticYamlContent, "utf8");

		console.log(chalk.green("✓ Created boltic-properties.yaml"));
		return { bolticYamlPath };
	}

	// For code-type: Create boltic-properties.yaml and handler file
	const bolticYamlPath = path.join(targetDir, "boltic-properties.yaml");
	const bolticYamlContent = getPulledBolticYamlContent(serverlessData);
	fs.writeFileSync(bolticYamlPath, bolticYamlContent, "utf8");

	// Create handler file with the code from the serverless
	const handlerRelativePath = getHandlerFilePath(language);
	const handlerPath = path.join(targetDir, handlerRelativePath);

	// Create directories if needed (for Java)
	const handlerDir = path.dirname(handlerPath);
	if (!fs.existsSync(handlerDir)) {
		fs.mkdirSync(handlerDir, { recursive: true });
	}

	// Use the code from the serverless or default handler content
	const handlerContent = config.CodeOpts?.Code || getHandlerContent(language);
	fs.writeFileSync(handlerPath, handlerContent, "utf8");

	return {
		bolticYamlPath,
		handlerPath,
	};
}

/**
 * Display pull success message
 */
export function displayPullSuccessMessage(name, targetDir) {
	console.log("\n" + chalk.bgGreen.black(" ✓ PULLED ") + "\n");
	console.log(chalk.green("📥 Serverless function pulled successfully!"));
	console.log();
	console.log(chalk.cyan("   Name: ") + chalk.white(name));
	console.log(chalk.cyan("   Location: ") + chalk.white(targetDir));
	console.log();
	console.log(chalk.dim("━".repeat(60)));
	console.log();
	console.log(chalk.yellow("📖 Next Steps:"));
	console.log();
	console.log(
		chalk.white("  1. Navigate to your project directory:") +
			chalk.cyan(` cd ${path.basename(targetDir)}`)
	);
	console.log(
		chalk.white("  2. Test your function locally: ") +
			chalk.cyan("boltic serverless test")
	);
	console.log(
		chalk.white("  3. Make changes and publish: ") +
			chalk.cyan("boltic serverless publish")
	);
	console.log();
}

/**
 * Run a Docker image locally.
 * @param {string} imageUri - Docker image URI (e.g., nginx:latest)
 * @param {object} options - Run options
 * @returns {Promise<void>}
 */
export function runDockerImage(imageUri, options = {}) {
	const {
		name = "test-container1",
		ports = [], // e.g. ["3000:3000"]
		envVars = {}, // { KEY: "value" }
		volumes = [], // e.g. ["./local:/app"]
		detach = false, // run in background
	} = options;

	const args = ["run"];

	if (detach) args.push("-d");
	if (name) args.push("--name", name);

	ports.forEach((p) => args.push("-p", p));
	volumes.forEach((v) => args.push("-v", v));

	Object.entries(envVars).forEach(([key, val]) => {
		args.push("-e", `${key}=${val}`);
	});

	args.push(imageUri);

	console.log("Running:", ["docker", ...args].join(" "));

	return new Promise((resolve, reject) => {
		const proc = spawn("docker", args, { stdio: "inherit" });

		proc.on("error", reject);
		proc.on("exit", (code) => {
			if (code === 0) resolve();
			else reject(new Error(`Docker exited with code ${code}`));
		});
	});
}
