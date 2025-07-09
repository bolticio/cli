# ⚡ Boltic CLI

> A powerful CLI tool for creating, managing, and publishing Boltic integrations.

[![NPM Version](https://img.shields.io/npm/v/@boltic/cli)](https://www.npmjs.com/package/@boltic/cli)
[![License](https://img.shields.io/npm/l/@boltic/cli)](./LICENSE)

---

## 📦 Installation

Install Boltic CLI globally via NPM:

```bash
npm install -g @boltic/cli
```

---

## 🔐 Authentication

To log in:

```bash
boltic login
```

Follow the interactive prompt to enter your credentials. Your token will be stored securely for future use.

---

## 🧩 Integration Management

### ➕ Create a New Integration

```bash
boltic integration create
```

You’ll be prompted to enter:

- **Name**: Letters and underscores only (e.g., My_Integration)
- **Icon**: Select an SVG file from your computer
- **Integration Type**:
    - Workflow Activity: Reusable components that perform specific tasks
    - Workflow Trigger: Components that start your workflow based on external events
    - You can choose to create both types for the same integration

- **Descriptions**
    - Human-readable and AI-generated

- **Integration Group**
    - e.g., Analytics, CRM, ERP, Marketing, Payment, Social Media, Other

### ✏️ Edit an Integration

```bash
boltic integration edit
```

### 🔄 Sync an Integration

```bash
boltic integration sync
```

### 🚀 Publish an Integration

```bash
boltic integration publish
```

---

## 📌 Command Reference

| Command                      | Description                                              |
| ---------------------------- | -------------------------------------------------------- |
| `boltic login`               | Authenticate with Boltic                                 |
| `boltic integration create`  | Create a new integration                                 |
| `boltic integration sync`    | Sync changes to your draft                               |
| `boltic integration publish` | Submit integration for review                            |
| `boltic integration pull`    | Pull the latest changes of an integration from the Cloud |
| `boltic integration edit`    | Edit an existing integration                             |
| `boltic help`                | Show CLI help                                            |
| `boltic version`             | Display CLI version                                      |

---

## 🔁 Typical Workflow

```bash
# Step 1: Authenticate
boltic login

# Step 2: Start a new integration
boltic integration create

# Step 3: Save changes
boltic integration sync

# Step 5: Submit for publishing and review
boltic integration publish

# Step 6: Pull the latest changes of a integration. Please call this command inside a integration folder.
boltic integration pull

# Step 7: Use this command if you don't have folder of a particular integration. Please call this command outside of any existing integration folder.
boltic integration edit
```

---

## 🛠️ Troubleshooting

### Login Errors

- Make sure you're online and using valid credentials.
- Retry `boltic login` if your token has expired.

### Integration Issues

- Ensure all required fields (e.g., name, type, icon URL) are filled.
- Verify the icon URL is publicly accessible.
- Double-check the selected integration type and group.

---

## 📚 Help

Get help directly in the CLI:

```bash
# View all commands
boltic help

# View integration command options
boltic integration help
```

Or visit the [Boltic Docs](https://docs.boltic.io) for full documentation.

---

## 🧾 License

MIT © [Boltic](https://boltic.io)
