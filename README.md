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
npm -v
ng version
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