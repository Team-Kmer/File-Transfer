# File-Transfer
A file transfer application between devices (PC ↔ PC, PC ↔ phone) over local network and Internet.

## Prerequisites

Before setting up the project, install the following tools. Versions listed are the ones validated on the reference machine.

| Tool           | Version          | Download                                                           |
|----------------|------------------|--------------------------------------------------------------------|
| Java (JDK)     | 21.0.12 (Temurin)| https://adoptium.net/temurin/releases/?version=21                  |
| Maven          | 3.9.16           | https://maven.apache.org/download.cgi                              |
| Node.js        | 24.19.0          | https://nodejs.org/en/download                                     |
| npm            | 11.17.0          | Bundled with Node.js                                               |
| Angular CLI    | 22.1.4           | Install via npm (see below)                                        |
| IntelliJ IDEA  | 2026.2           | https://www.jetbrains.com/idea/download                            |
| Git            | 2.40+            | https://git-scm.com/downloads                                      |

### Install Angular CLI

Once Node.js is installed, open a terminal and run:

```
npm install -g @angular/cli
```
## Verify your installation

Open a new terminal and run the following commands. Each should return a version number.

```
java -version
mvn -v
node -v 
npx ng version
npm -v
ng version (please make sure that you're in the right diretory by typing: "cd frontend/file-transfer-app" and then run "ng version")
git --version
```

Expected output (versions may vary slightly):

- `java -version` → `openjdk 21.0.12` or higher
- `mvn -v` → `Apache Maven 3.9.16` or higher
- `node -v` → `v24.19.0` or compatible (20.19+, 22.12+, or 24.x)
- `npm -v` → `11.17.0` or higher
- `ng version` → `Angular CLI: 22.1.4` or higher
- `git --version` → `git version 2.40` or higher

If any command returns "command not found" (or "n'est pas reconnu" / "ist entweder falsch geschrieben"), the tool is either not installed or missing from your system PATH.

## Get the project

### 1. Clone the repository

Open a terminal in the folder where you want to store the project, then run:

```
git clone https://github.com/Team-Kmer/File-Transfer.git
cd File-Transfer
```

### 2. Open the project in IntelliJ IDEA

1. Launch IntelliJ IDEA.
2. Click **File > Open** (or **Open** on the welcome screen).
3. Select the `File-Transfer` folder you just cloned.
4. Wait for IntelliJ to index the project and download dependencies. This may take a few minutes on the first opening.

### 3. Project structure

```
File-Transfer/
├── backend/      # Spring Boot application (Java 21)
├── frontend/     # Angular application
├── CONTRIBUTING.md
├── LICENSE
└── README.md
```

## Running the application on two machines

The application can be tested with two physical machines connected to the same
Wi-Fi network or mobile hotspot.

- Machine A runs the backend and the Angular development server.
- Machine B accesses the application through Machine A's local IPv4 address.
- No IP address must be changed in the source code.

### Windows setup on Machine A

Open PowerShell in the project root and find the IPv4 address of the active
network interface:

```powershell
Run `ipconfig` in powershell and find the `IPv4 Address` under the active Wi-Fi adapter.
Use this address as Machine A's IP in the commands below.
```

#### Start the backend

In the same PowerShell terminal:

```powershell
cd backend

$env:SERVER_ADDRESS = "0.0.0.0"
$env:APP_CORS_LAN_ORIGIN = "http://${IPv4 Address of A}:4200"

.\mvnw.cmd spring-boot:run
```

The backend listens on every network interface on port `8080`.

#### Start the frontend

Open another PowerShell terminal in the project root:

```powershell
cd frontend/file-transfer-app
npm install
npm start -- --host 0.0.0.0
```

The Angular development server listens on every network interface on port
`4200`.

The terminal displays a network URL similar to:

```text
http://192.168.1.10:4200
```

### Connect from Machine B

Machine B must be connected to the same Wi-Fi network or mobile hotspot as
Machine A.

Open the network URL displayed by the Angular development server:

```text
http://<MACHINE_A_IP>:4200
```

Do not use `localhost` on Machine B. On Machine B, `localhost` refers to
Machine B itself.

The frontend automatically contacts the backend through the hostname used in
the browser. No backend IP address needs to be configured in the frontend
source code.

### Windows Firewall

If Machine B cannot reach ports `4200` or `8080`, open PowerShell as
Administrator on Machine A:

```powershell
New-NetFirewallRule `
  -DisplayName "File Transfer Frontend" `
  -Direction Inbound `
  -Action Allow `
  -Protocol TCP `
  -LocalPort 4200 `
  -RemoteAddress LocalSubnet

New-NetFirewallRule `
  -DisplayName "File Transfer Backend" `
  -Direction Inbound `
  -Action Allow `
  -Protocol TCP `
  -LocalPort 8080 `
  -RemoteAddress LocalSubnet
```

These rules only allow machines located on the local subnet.

Third-party security software, such as ESET, may have its own firewall. Its
rules must also allow incoming TCP connections on ports `4200` and `8080`.

### Connectivity checks

On Machine B, use PowerShell to check both ports:

```powershell
Test-NetConnection <MACHINE_A_IP> -Port 4200
Test-NetConnection <MACHINE_A_IP> -Port 8080
```

Both commands should display:

```text
TcpTestSucceeded : True
```

### Manual acceptance test

Perform the following test from Machine B:

1. Open `http://<MACHINE_A_IP>:4200`.
2. Upload an image file.
3. Upload a PDF file.
4. Upload a text file.
5. Upload a file close to, but not larger than, 10 MB.
6. Verify that every file appears in the file list.
7. Download the files and verify that they can still be opened.
8. Repeat the verification from Machine A.

The current MVP uses a shared file list. Therefore, Machine A and Machine B
both see every uploaded file, including files uploaded from the same machine.

Files larger than 10 MB are expected to be rejected.

## Troubleshooting

### The Angular page is not reachable

Make sure Angular was started with:

```powershell
npm start -- --host 0.0.0.0
```

Check that port `4200` is allowed by Windows Firewall and by any third-party
firewall.

### The frontend opens, but backend requests fail

Check port `8080` from Machine B:

```powershell
Test-NetConnection <MACHINE_A_IP> -Port 8080
```

Make sure the backend was started with:

```powershell
$env:SERVER_ADDRESS = "0.0.0.0"
```

### A CORS error appears in the browser

Make sure the configured CORS origin contains the exact protocol, IP address,
and frontend port:

```powershell
$env:APP_CORS_LAN_ORIGIN = "http://<MACHINE_A_IP>:4200"
```

Restart the backend after changing this environment variable.

### Ping works, but the TCP connection fails

This normally indicates a firewall problem. Check Windows Firewall and any
third-party security software installed on Machine A.

### Both machines use the same Wi-Fi, but cannot communicate

Some public, university, hotel, or guest Wi-Fi networks enable client
isolation. Connect both machines to a private Wi-Fi network or to the same
mobile hotspot.

### The application stopped working after reconnecting to Wi-Fi

Machine A may have received a different IP address. Restart both servers using
the IP detection procedure and use the new network URL on Machine B.