export interface BuildOptions {
debuggerPort?: number; // The port to start the debugger on for Chrome, so that we can connect to it. Defaults to 9292
hostname?: string; // The hostname the browser process starts on. If on host machine, this will be "localhost", if in docker, it will bee the container name. Defaults to localhost
binaryPath?: string; //The Full Path to the browser binary. If using an alternative chromium based browser, this field is necessary.
}