# ⚡ Boltic CLI

> **Professional CLI tool for creating, managing, and publishing Boltic Workflow integrations with enterprise-grade features and seamless developer experience.**

[![NPM Version](https://img.shields.io/npm/v/@boltic/cli)](https://www.npmjs.com/package/@boltic/cli)
[![GitHub Repo](https://img.shields.io/badge/GitHub-Repo-blue?logo=github)](https://github.com/bolticio/cli)
[![License](https://img.shields.io/npm/l/@boltic/cli)](./LICENSE)
[![Node.js Package](https://github.com/bolticio/cli/actions/workflows/npm-publish.yml/badge.svg)](https://github.com/bolticio/cli/actions/workflows/npm-publish.yml)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)
[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)](https://github.com/bolticio/cli/graphs/commit-activity)

<div align="center">

![Boltic CLI](https://img.shields.io/badge/Boltic-CLI-00D4AA?style=for-the-badge&logo=node.js&logoColor=white)

**Streamline your integration development workflow with Boltic CLI**

[Features](#-features) • [Installation](#-installation) • [Quick Start](#-quick-start) • [Documentation](#-documentation) • [Contributing](#-contributing)

</div>

---

## 📋 Table of Contents

- [✨ Features](#-features)
- [🚀 Quick Start](#-quick-start)
- [📦 Installation](#-installation)
- [🔐 Authentication](#-authentication)
- [🧩 Integration Management](#-integration-management)
- [📚 Command Reference](#-command-reference)
- [🛠️ Development Workflow](#️-development-workflow)
- [🔧 Configuration](#-configuration)
- [🛡️ Security](#-security)
- [🐛 Troubleshooting](#-troubleshooting)
- [📖 Documentation](#-documentation)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

---

## ✨ Features

- 🔐 **Secure Authentication** - Enterprise-grade token management with secure storage
- 🚀 **Rapid Integration Development** - Create integrations in minutes, not hours
- 📦 **Smart Project Management** - Automated folder structure and configuration
- 🔄 **Real-time Synchronization** - Instant sync with Boltic Cloud platform
- 🎯 **Type-safe Development** - Support for Workflow Activities and Triggers
- 🎨 **Rich Interactive UI** - Beautiful command-line interface with progress indicators
- 📊 **Comprehensive Validation** - Built-in validation for all integration components
- 🔧 **Developer Experience** - Hot reload, debugging tools, and comprehensive error handling
- 🌐 **Multi-platform Support** - Works seamlessly on Windows, macOS, and Linux
- 📈 **Version Control Integration** - Git-friendly workflow with proper ignore patterns

---

## 🚀 Quick Start

Get up and running with Boltic CLI in under 2 minutes:

```bash
# Install Boltic CLI globally
npm install -g @boltic/cli

# Authenticate with your Boltic account
boltic login

# Create your first integration
boltic integration create

# Sync your changes
boltic integration sync

# Submit for review
boltic integration submit
```

---

## 📦 Installation

### Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** 8.0.0 or higher
- **Git** (for version control)

### Global Installation (Recommended)

```bash
npm install -g @boltic/cli
```

### Verify Installation

```bash
boltic --version
```

### Development Installation

For contributors and developers:

```bash
# Clone the repository
git clone https://github.com/bolticio/cli.git
cd cli

# Install dependencies
npm install

# Link for development
npm link

# Run tests
npm test
```

---

## 🔐 Authentication

Boltic CLI uses a secure OAuth 2.0 flow with browser-based authentication for enhanced security and user experience.

### Initial Login

```bash
boltic login
```

The authentication process follows these steps:

1. **Browser Launch**: CLI automatically opens your default browser to the Boltic login page
2. **OAuth Flow**: Complete the authentication in your browser (email/password or SSO)
3. **Token Exchange**: CLI automatically exchanges the authorization code for access tokens
4. **Secure Storage**: Tokens are encrypted and stored in your system's keychain

### Authentication Flow

```bash
# Start authentication
boltic login

# CLI will:
# 1. Generate a unique request code
# 2. Open browser to: https://console.fynd.com/auth/sign-in
# 3. Wait for you to complete login in browser
# 4. Poll for session data (up to 5 minutes)
# 5. Exchange session for bearer token
# 6. Store tokens securely
```

### Secure Token Storage

Your authentication credentials are securely stored using your system's native keychain:

- **macOS**: Keychain Access (`boltic-cli` service)
- **Windows**: Credential Manager (`boltic-cli` service)
- **Linux**: Secret Service API (`boltic-cli` service)

**Stored Credentials:**

- `token`: Bearer token for API authentication
- `session`: Session cookie for web requests
- `account_id`: Your Boltic account identifier

### Logout and Token Management

```bash
# Clear all stored credentials
boltic logout

# Check authentication status
boltic integration list  # Will prompt login if not authenticated
```

### Troubleshooting Authentication

#### Common Issues

**Browser doesn't open automatically:**

```bash
# Manual login URL will be displayed
# Copy and paste the URL into your browser
```

**Authentication timeout:**

```bash
# Retry login (5-minute timeout)
boltic login
```

**Connection issues:**

```bash
# Check network connectivity
ping console.fynd.com

# Try different environment
boltic env set fcz0
boltic login
```

---

## 🧩 Integration Management

### Creating New Integrations

```bash
boltic integration create
```

#### Interactive Setup Process

The CLI will guide you through:

1. **Integration Details**
    - Name (alphanumeric + underscores only)
    - Description (human-readable)
    - AI-generated description

2. **Visual Assets**
    - Icon selection (SVG format required)
    - Brand colors and styling

3. **Integration Type**
    - **Workflow Activity**: Reusable components for specific tasks
    - **Workflow Trigger**: Event-driven components that initiate workflows
    - **Both**: Create both types simultaneously

4. **Categorization**
    - Integration Group (Analytics, CRM, ERP, Marketing, etc.)
    - Tags and metadata

#### Generated Project Structure

```
my-integration/
├── schemas/
│   ├── resources/
│   │   └── resource1.json
│   ├── authentication.json
│   ├── base.json
│   └── webhook.json
├── Authentication.mdx
├── Documentation.mdx
└── spec.json
```

**File Descriptions:**

- **`schemas/`** - Schema definitions for the integration
    - **`resources/`** - Resource-specific schemas (e.g., `resource1.json`)
    - **`authentication.json`** - Authentication configuration and parameters
    - **`base.json`** - Base integration configuration and parameters
    - **`webhook.json`** - Webhook configuration (for trigger integrations)

- **`Authentication.mdx`** - Authentication documentation in Markdown format
- **`Documentation.mdx`** - General integration documentation
- **`spec.json`** - Integration specification and metadata

### Managing Existing Integrations

#### Edit Integration

```bash
# Edit current integration
boltic integration edit

```

#### Sync Changes

```bash
# Sync all changes
boltic integration sync
```

#### Pull Latest Changes

```bash
# Pull latest from Boltic Cloud
boltic integration pull
```

#### Submit for Review

```bash
# Submit for publishing review
boltic integration submit
```

---

## 📚 Command Reference

### Core Commands

| Command          | Description                       | Options |
| ---------------- | --------------------------------- | ------- |
| `boltic login`   | Authenticate with Boltic platform |         |
| `boltic logout`  | Clear stored credentials          |         |
| `boltic version` | Display CLI version               |         |
| `boltic help`    | Show comprehensive help           |         |

### Integration Commands

| Command                     | Description               | Options               |
| --------------------------- | ------------------------- | --------------------- |
| `boltic integration create` | Create new integration    | Interactive prompts   |
| `boltic integration edit`   | Edit existing integration | Interactive prompt    |
| `boltic integration sync`   | Sync local changes        | Interactive prompt    |
| `boltic integration pull`   | Pull latest changes       | Interactive prompt    |
| `boltic integration submit` | Submit for review         |                       |
| `boltic integration status` | Check integration status  | Interactive selection |
| `boltic integration help`   | Show integration help     |                       |

### Help and Documentation

```bash
# General help
boltic help

# Command-specific help
boltic integration help
boltic login help
```

---

## 🛠️ Development Workflow

### Typical Development Cycle

```bash
# 1. Start Development
boltic integration create
cd my-integration

# 2. Make Changes
# Edit your integration files...

# 3. Sync Changes
boltic integration sync

# 4. Iterate
# Make more changes and sync...

# 5. Submit for Review
boltic integration submit
```

---

## 🐛 Troubleshooting

### Common Issues

#### Authentication Problems

```bash
# Clear stored credentials
boltic logout

# Re-authenticate
boltic login

# Check connection
ping console.fynd.com
```

#### Sync Issues

```bash
# Check status
boltic integration status

#  Sync Changes
boltic integration sync

```

#### Network Issues

```bash
# Test connectivity
ping console.fynd.com

# Check API status
boltic integration status

# Enable verbose logging for debugging
boltic --verbose integration sync
```

### Debug Mode

```bash
# Enable verbose logging
boltic --verbose integration sync

# Run with verbose output for any command
boltic --verbose integration create
boltic --verbose login
```

### Getting Help

```bash
# Comprehensive help
boltic help

# Command-specific help
boltic integration help
```

---

## 📖 Documentation

### Official Resources

- 📚 **[Boltic Documentation](https://docs.boltic.io)** - Complete API reference and guides

### Community Resources

- 🐛 **[Issue Tracker](https://github.com/bolticio/cli/issues)** - Report bugs and request features
- 📝 **[Blog](https://boltic.io/blog)** - Latest updates and best practices

---

## 🤝 Contributing

We welcome contributions from the community! Here's how you can help:

### Development Setup

```bash
# Fork and clone
git clone https://github.com/your-username/cli.git
cd cli

# Install dependencies
npm install

# Link for development
npm link

# Run tests
npm test
```

### Contribution Guidelines

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** with proper tests
4. **Run the test suite**: `npm test`
5. **Commit your changes**: `git commit -m 'Add amazing feature'`
6. **Push to the branch**: `git push origin feature/amazing-feature`
7. **Open a Pull Request**

### Code Standards

- Follow **ESLint** configuration
- Write **comprehensive tests** for new features
- Update **documentation** for API changes
- Follow **conventional commits** for commit messages

---

## 📄 License

This project is licensed under the **ISC License** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Boltic Team** - For building an amazing platform
- **Open Source Contributors** - For their valuable contributions
- **Community** - For feedback, bug reports, and feature requests

---

<div align="center">

**Made with ❤️ by the Boltic Team**

[Website](https://boltic.io) • [Documentation](https://docs.boltic.io) • [Support](https://support.boltic.io) • [Discord](https://discord.gg/boltic)

</div>
