import { execSync } from "child_process";

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
			return filePath;
		} else if (platform === "win32") {
			// Windows: Use PowerShell to open file dialog
			const psScript = `
			Add-Type -AssemblyName System.Windows.Forms
			$dialog = New-Object System.Windows.Forms.OpenFileDialog
			$dialog.Filter = "SVG files (*.svg)|*.svg"
			if ($dialog.ShowDialog() -eq "OK") { $dialog.FileName }
			`;
			const filePath = execSync(`powershell -Command "${psScript}"`)
				.toString()
				.trim();
			return filePath;
		} else if (platform === "linux") {
			// Linux: Use zenity if available
			const filePath = execSync(
				`zenity --file-selection --file-filter="*.svg"`
			)
				.toString()
				.trim();
			return filePath;
		} else {
			console.error("Unsupported platform for file picker");
			return null;
		}
	} catch {
		return null;
	}
}

export { pickSvgFile };
