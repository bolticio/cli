import { execSync } from "child_process";
import fs from "fs";
import path from "path";

async function pickSvgFile() {
	const platform = process.platform;

	try {
		if (platform === "darwin") {
			// macOS: Use AppleScript to open file dialog
			const script = `
				set theFile to choose file of type {"svg"} with prompt "Select an SVG file"
				set thePath to POSIX path of theFile
				return thePath
			`;
			const filePath = execSync(`osascript -e '${script}'`)
				.toString()
				.trim();

			// Check if file path is empty or file doesn't exist
			if (!filePath || !fs.existsSync(filePath)) {
				return null;
			}

			return filePath;
		} else if (platform === "win32") {
			// Windows: Multiple fallback approaches for better compatibility
			return await pickSvgFileWindows();
		} else if (platform === "linux") {
			// Linux: Use zenity if available, with fallbacks
			return await pickSvgFileLinux();
		} else {
			return null;
		}
	} catch (_error) {
		return null;
	}
}

async function pickSvgFileWindows() {
	// Try multiple approaches for Windows compatibility

	// Method 1: PowerShell with improved script and execution policy bypass
	try {
		const psScript = `
Add-Type -AssemblyName System.Windows.Forms
$openFileDialog = New-Object System.Windows.Forms.OpenFileDialog
$openFileDialog.Title = "Select an SVG file"
$openFileDialog.Filter = "SVG files (*.svg)|*.svg|All files (*.*)|*.*"
$openFileDialog.FilterIndex = 1
$openFileDialog.Multiselect = $false
$result = $openFileDialog.ShowDialog()
if ($result -eq [System.Windows.Forms.DialogResult]::OK) {
    Write-Output $openFileDialog.FileName
} else {
    Write-Output ""
}
		`.trim();

		// Create a temporary PowerShell script file to avoid command line escaping issues
		const tempDir = process.env.TEMP || process.env.TMP || "C:\\temp";
		const tempScriptPath = path.join(
			tempDir,
			`file-picker-${Date.now()}.ps1`
		);

		fs.writeFileSync(tempScriptPath, psScript, "utf8");

		const filePath = execSync(
			`powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File "${tempScriptPath}"`,
			{
				encoding: "utf8",
				timeout: 30000,
				windowsHide: true,
			}
		).trim();

		// Clean up temp file
		try {
			fs.unlinkSync(tempScriptPath);
		} catch (e) {
			// Ignore cleanup errors
		}

		if (filePath && filePath !== "" && fs.existsSync(filePath)) {
			return filePath;
		}
	} catch (_error) {
		// Ignore cleanup errors
	}

	// Method 2: VBScript fallback for older Windows systems
	try {
		const vbScript = `
Dim objDialog
Set objDialog = CreateObject("MSComDlg.CommonDialog")
objDialog.Filter = "SVG files (*.svg)|*.svg|All files (*.*)|*.*"
objDialog.FilterIndex = 1
objDialog.ShowOpen
If objDialog.FileName <> "" Then
    WScript.Echo objDialog.FileName
End If
		`.trim();

		const tempDir = process.env.TEMP || process.env.TMP || "C:\\temp";
		const tempScriptPath = path.join(
			tempDir,
			`file-picker-${Date.now()}.vbs`
		);

		fs.writeFileSync(tempScriptPath, vbScript, "utf8");

		const filePath = execSync(`cscript //nologo "${tempScriptPath}"`, {
			encoding: "utf8",
			timeout: 30000,
			windowsHide: true,
		}).trim();

		// Clean up temp file
		try {
			fs.unlinkSync(tempScriptPath);
		} catch (e) {
			// Ignore cleanup errors
		}

		if (filePath && filePath !== "" && fs.existsSync(filePath)) {
			return filePath;
		}
	} catch (_error) {
		// Ignore cleanup errors
	}

	// Method 3: PowerShell Core (pwsh) for Windows 10/11 with PowerShell 7+
	try {
		const psScript = `
Add-Type -AssemblyName System.Windows.Forms
$dialog = [System.Windows.Forms.OpenFileDialog]::new()
$dialog.Title = "Select an SVG file"
$dialog.Filter = "SVG files (*.svg)|*.svg"
$dialog.ShowHelp = $false
if ($dialog.ShowDialog() -eq 'OK') { $dialog.FileName }
		`.trim();

		const filePath = execSync(
			`pwsh -Command "${psScript.replace(/"/g, '`"')}"`,
			{
				encoding: "utf8",
				timeout: 30000,
				windowsHide: true,
			}
		).trim();

		if (filePath && filePath !== "" && fs.existsSync(filePath)) {
			return filePath;
		}
	} catch (_error) {
		// Ignore cleanup errors
	}

	// Method 4: Use Windows built-in file associations as last resort
	try {
		execSync("explorer.exe", { windowsHide: false });

		// Return null to trigger manual input fallback
		return null;
	} catch (_error) {
		return null;
	}
}

async function pickSvgFileLinux() {
	// Try multiple Linux GUI file picker options

	// Method 1: zenity (GNOME)
	try {
		const filePath = execSync(
			`zenity --file-selection --title="Select an SVG file" --file-filter="SVG files | *.svg" --file-filter="All files | *"`,
			{ encoding: "utf8", timeout: 30000 }
		).trim();

		if (filePath && filePath !== "" && fs.existsSync(filePath)) {
			return filePath;
		}
	} catch (_error) {
		// Ignore cleanup errors
	}

	// Method 2: kdialog (KDE)
	try {
		const filePath = execSync(
			`kdialog --getopenfilename . "*.svg|SVG files"`,
			{ encoding: "utf8", timeout: 30000 }
		).trim();

		if (filePath && filePath !== "" && fs.existsSync(filePath)) {
			return filePath;
		}
	} catch (_error) {
		// Ignore cleanup errors
	}

	// Method 3: Try to open file manager as fallback
	try {
		execSync("xdg-open .", { timeout: 5000 });
		return null; // Trigger manual input
	} catch (_error) {
		return null;
	}
}

// Helper function to get SVG file path with fallback to manual input
async function getSvgFilePath() {
	const { input } = await import("@inquirer/prompts");

	// First try the file picker
	const pickedFile = await pickSvgFile();

	if (pickedFile && fs.existsSync(pickedFile)) {
		return pickedFile;
	}
}

export { getSvgFilePath, pickSvgFile };
