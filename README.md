# openai-siwc

Use your ChatGPT subscription with Pi and other coding agents running inside Docker Sandboxes.

openai-siwc is an open-source CLI that bridges OpenAI's Sign in with ChatGPT (SIWC) OAuth authentication and Docker Sandboxes.

It allows you to authenticate with your ChatGPT account on your host machine and securely provide the resulting credentials to coding agents running inside Docker Sandboxes.

Authenticate once. Keep credentials on your host. Run your coding agent inside an isolated sandbox.

Status: Experimental. Currently developed and tested on macOS with Docker SBX 0.51.0 and Pi.
## The problem

Docker Sandboxes provide an isolated environment for running coding agents. They also provide a credential management system that allows credentials to be supplied to sandboxed applications without directly mounting host credential files.

However, using ChatGPT OAuth with Pi inside Docker Sandboxes presents a few challenges.

1. Pi supports OpenAI OAuth, but its login flow is interactive

Pi supports signing in to OpenAI using ChatGPT OAuth.

When running Pi directly on your Mac, the login flow works well:

Pi generates an OAuth authorization URL.
Your browser opens the OpenAI login page.
You authenticate with your ChatGPT account.
Pi receives the OAuth callback and stores the credentials.

But when Pi runs inside a Docker Sandbox, its OAuth flow is no longer convenient.

The browser is opened from an isolated environment, and the callback and credential storage belong to the sandbox rather than the host.

We wanted to authenticate once on the host and reuse that authentication inside the sandbox.

2. Docker SBX supports OpenAI OAuth credentials, but Pi expects its own credential format

Docker SBX 0.51.0 supports service credentials and OAuth credential injection.

Its credential capability can provide OAuth credentials to applications inside a sandbox.

Pi, however, expects its OpenAI OAuth credentials in its own authentication file:

```text
/home/agent/.pi/agent/auth.json
```


The expected structure looks like:

```json
{
  "openai": {
    "type": "oauth",
    "access": "...",
    "refresh": "...",
    "expires": "..."
  }
}
```


The challenge is making the host-authenticated OAuth session available through SBX in a way that Pi understands.

3. We wanted to use the SBX secret capability instead of exposing host credentials

Docker SBX provides a useful feature:

```bash
sbx secret set openai --command '...'
```


This allows a command to run on the host when SBX resolves a dynamic secret.

The command's standard output becomes the secret value. SBX handles caching and credential delivery.

This is exactly the integration we wanted.

Instead of mounting the host's authentication files into the sandbox or performing another OAuth login inside Pi, we can use the host's authenticated session as the source of the SBX secret.

## The solution

openai-siwc provides this integration.

It uses OpenAI's official Sign in with ChatGPT DevKit for OAuth authentication and credential management, with a small extension to expose the current access token to trusted local processes.

The resulting architecture looks like this:

```text
                       macOS HOST
       ┌─────────────────────────────────────┐
       │                                     │
       │             openai-siwc             │
       │                                     │
       │       Sign in with ChatGPT          │
       │                OAuth                │
       │                  │                  │
       │                  ▼                  │
       │           macOS Keychain            │
       │          Encrypted storage          │
       │                  │                  │
       │                  ▼                  │
       │          openai-siwc                │
       │            sbx-secret               │
       │                  │                  │
       └──────────────────┼──────────────────┘
                          │
                   Docker SBX proxy
                          │
                          ▼
             ┌────────────────────────┐
             │     Docker Sandbox     │
             │                        │
             │     Pi Coding Agent    │
             │             │          │
             │             ▼          │
             │     /home/agent/.pi/   │
             │     agent/auth.json    │
             │             │          │
             │             ▼          │
             │       OpenAI OAuth     │
             └────────────────────────┘
```


The host owns the OAuth session and credential refresh lifecycle.

Docker SBX resolves the dynamic secret on the host and provides the credential to the sandbox through its credential capability.

Pi receives credentials in the format it already understands.

No interactive login is required inside the sandbox.

## Features
ChatGPT OAuth authentication — sign in using your existing ChatGPT account.
Browser-based login — automatically open the default browser and display the authorization URL in the terminal.
Alternative browser support — copy the authorization URL and complete login in another browser.
Encrypted credential storage — use macOS Keychain to protect the encryption key.
Session management — inspect authentication status and disconnect.
Model discovery — retrieve available models through the authenticated session.
Automatic token refresh — reuse the SIWC SDK's credential refresh lifecycle.
Docker SBX integration — expose the current access token through dynamic secrets.
No sandbox login required — authenticate on the host and run Pi inside the sandbox.
## Repository structure

This project is maintained as a single repository.

It includes both the openai-siwc CLI and the modified OpenAI SIWC DevKit used by the CLI.

```text
openai-siwc/
│
├── src/
│   ├── cli.ts
│   ├── browser.ts
│   ├── config.ts
│   └── encryption.ts
│
├── test/
│
├── sign-in-with-chatgpt-devkit/
│   ├── packages/
│   │   └── local/
│   │       └── src/
│   │           ├── index.ts
│   │           ├── types.ts
│   │           └── ...
│   ├── scripts/
│   └── ...
│
├── package.json
├── package-lock.json
├── tsconfig.json
├── README.md
└── LICENSE
```

## Modified OpenAI DevKit

The bundled sign-in-with-chatgpt-devkit is based on OpenAI's official repository:

https://github.com/openai/sign-in-with-chatgpt-devkit

We include the modified DevKit directly in this repository so users do not need to clone or manually patch a separate repository.

The local SDK has an additional method:

```typescript
getAccessToken(): Promise<string>;
```


This method is implemented using the SDK's existing authenticated session handling.

It reuses the existing mechanisms for:

Selecting the active ChatGPT profile.
Validating the connected session.
Checking token-sharing permission.
Refreshing credentials when necessary.
Persisting rotated credentials securely.

The method is intended for trusted local processes, such as the openai-siwc CLI. It should never be exposed to an untrusted renderer or sandbox application.

The original upstream license and attribution notices must be retained.

## Requirements
macOS
Node.js 22 or newer
npm
Docker SBX CLI 0.51.0 or compatible
A ChatGPT account eligible for SIWC authentication
Pi Coding Agent for the example integration

Useful references:

Docker Sandboxes
OpenAI SIWC DevKit
Pi Coding Agent
## Installation
1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/openai-siwc.git
```

cd openai-siwc

2. Install dependencies

The modified DevKit is included in the repository as a local package.

```bash
npm install
```

3. Build
```bash
npm run build
```


The build should compile the local DevKit and the CLI.

4. Link the CLI
```bash
npm link
```


Verify the installation:

```bash
openai-siwc --help
```

## Authentication
### Sign in with ChatGPT

Run:

```bash
openai-siwc login
```


The CLI opens your default browser and displays the authorization URL in the terminal.

You can also copy the URL and open it in another browser.

Complete the OpenAI authentication flow.

Once the local callback is received, the CLI validates the session and stores the credentials securely.

Example:

```text
Connected to ChatGPT.
Identity: user@example.com
Token sharing: Enabled
```

### Check authentication status
```bash
openai-siwc status
```


Example:

```text
Status: connected
Identity: user@example.com
Token sharing: Enabled
```

### List available models
```bash
openai-siwc models
```


Example:

```text
gpt-6.1-sol     GPT-6.1-Sol
gpt-6-astra     GPT-6-Astra
gpt-6.1-terra   GPT-6.1 Terra
gpt-6-sol       GPT-6-Sol
```


Model availability depends on your ChatGPT account and the models made available through the SIWC integration.

### Logout
```bash
openai-siwc logout
```


This disconnects the selected profile and removes its locally stored credentials.

## Docker SBX integration

The main purpose of openai-siwc is to make ChatGPT OAuth credentials available to Docker Sandboxes through dynamic secrets.

### Step 1. Authenticate on the host

On your Mac:

```bash
openai-siwc login
```


Verify:

```bash
openai-siwc status
```


Ensure that token sharing is enabled.

### Step 2. Register the dynamic secret

Find the executable:

```bash
which openai-siwc
```


Example:

```text
/opt/homebrew/bin/openai-siwc
```


Register the global OpenAI dynamic secret:

```bash
sbx secret set openai \
  --command '/opt/homebrew/bin/openai-siwc sbx-secret' \
  --refresh 55m
```


Replace the executable path with the path returned by which.

Expected output:

```text
✓ command resolved successfully
Applied global secret to existing sandboxes
Saved command secret openai (global)
```


The --command option tells SBX to execute openai-siwc sbx-secret on the host.

The command returns the current access token through standard output.

SBX manages the dynamic secret and caches its value according to the configured refresh policy.

You can inspect configured secrets with:

```bash
sbx secret ls
```


Example:

```text
SCOPE      TYPE      NAME     SECRET
(global)   service   openai   (oauth configured)
```


Note: If you previously configured an OpenAI API key, SBX may report that the API key is shadowed by the OAuth credential. The OAuth configuration takes precedence.

### Step 3. Create the Pi sandbox workload

Create a directory for your workload:

```bash
mkdir pi-sandbox
cd pi-sandbox
```


Create spec.yaml:

```yaml
# syntax=docker/sandbox-kit:3
schemaVersion: "3"
kind: workload
displayName: Pi Coding Agent
description: Pi coding agent sandbox with ChatGPT OAuth
version: "1.0.0"

provides:
  - pi

capabilities:
  - type: com.docker.sandbox/sbx@1

  - type: com.docker.sandbox/credential@1
    optional: true
    description: OpenAI ChatGPT OAuth for Pi
    config:
      service: openai
      phase: runtime
      oauth:
        tokenEndpoint:
          host: auth.openai.com
          path: /oauth/token
        resourceHosts:
          - chatgpt.com
        sentinels:
          accessToken: oai-oat01-proxy-managed
          refreshToken: oai-ort01-proxy-managed
        credentialFile:
          path: /home/agent/.pi/agent/auth.json
          structure:
            openai:
              type: oauth
              access: "{{.AccessToken}}"
              refresh: "{{.RefreshToken}}"
              expires: "{{.ExpiresAt}}"

  - type: com.docker.sandbox/agent-skills@1
    config:
      path: /home/agent/.agents/skills

  - type: com.docker.sandbox/network-policy@1
    config:
      runtime:
        allow:
          - pi.dev:443
          - auth.openai.com:443
          - chatgpt.com:443
          - api.openai.com:443
```

### Step 4. Create the Dockerfile

Create spec.dockerfile:

```dockerfile
FROM docker/sandbox-templates:shell

USER root

RUN npm install -g --ignore-scripts \
    @earendil-works/pi-coding-agent@1.5.0

USER agent

WORKDIR /home/agent/workspace

ENTRYPOINT ["pi"]
CMD []
```

### Step 5. Build and run the sandbox

From the workload directory:

```bash
sbx build -t pi-siwc .
```


Then run:

```bash
sbx run -it pi-siwc
```


The sandbox starts Pi directly.

If your SBX installation uses a different run syntax, consult:

```bash
sbx run --help
```

### Step 6. Use Pi

Inside the sandbox:

```text
pi
```


Select an available OpenAI model and send a prompt.

For example:

```text
Explain the structure of this project and identify its main components.
```


Pi should authenticate through the injected OAuth credential without requiring an interactive browser login inside the sandbox.

## The sbx-secret command

The CLI provides a dedicated command for Docker SBX:

```bash
openai-siwc sbx-secret
```


This command is designed for machine consumption.

Its contract:

Standard output contains only the access token.
Diagnostic messages are written to standard error.
It exits with a nonzero status if authentication is unavailable.
It uses the existing SIWC session.
It uses the SDK's authenticated credential-refresh lifecycle.

Important: The output is a sensitive bearer credential. Never paste it into logs, issues, screenshots or shell transcripts.

## CLI reference
Command	Description
openai-siwc login	Authenticate with ChatGPT
openai-siwc status	Display session status
openai-siwc models	List available models
openai-siwc logout	Disconnect the selected profile
openai-siwc sbx-secret	Print the current access token for SBX
## Security

Security is an important part of the design.

### Credentials stay on the host

OAuth authentication happens on the host, not inside the sandbox.

### Encrypted storage

The project uses the SIWC DevKit's encrypted credential storage, with the encryption key protected by macOS Keychain.

### Host-side dynamic secrets

Docker SBX resolves the command secret on the host.

The host's Keychain and local authentication files do not need to be mounted into the sandbox.

### No credentials in source control

Never commit:

OAuth access tokens.
OAuth refresh tokens.
Encryption keys.
Local authentication files.
Credential databases.
### Token sharing

The SIWC integration requires token sharing to be enabled. Users should understand the permissions and applicable OpenAI terms before enabling it.

## Limitations
macOS is currently the supported host platform.
Docker SBX dynamic-secret support is required.
A ChatGPT account eligible for SIWC authentication is required.
Model availability depends on the connected account.
The project is experimental.
This is not a replacement for conventional OpenAI API-key authentication.
## Acknowledgements

This project builds on:

OpenAI Sign in with ChatGPT DevKit
Docker Sandboxes
Pi Coding Agent
## License

See LICENSE.

The bundled OpenAI DevKit retains its original license and copyright notices. Its redistribution and modification terms must be respected.

openai-siwc is an independent community project and is not affiliated with, endorsed by, or officially supported by OpenAI or Docker.

## Contributing

Contributions, bug reports and suggestions are welcome.

Please open an issue before submitting significant changes.

Authenticate once. Keep credentials on your host. Code inside your sandbox.
