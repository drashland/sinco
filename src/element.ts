import { Client } from "./client.ts"
export class Element extends Client {
    public selector: string
    public method: string
    constructor(method: string, selector: string, socket: WebSocket, process: Deno.Process, browser: "chrome" | "firefox", firefoxPath?: string) {
        super(socket, process, browser, firefoxPath)
        this.selector = selector
        this.method = method
    }

    private formatQuery() {
        let cmd = `${this.method}('${this.selector}')` 
        if (this.method === '$x'){ // todo problem is, $x rerturns an array, eg [h1] as opposed to queryselector: h1
            cmd += '[0]'
        }
        return cmd
    }

    public async value(newValue?: string) {
        let cmd = this.formatQuery()
        cmd += '.value'
        if (newValue) {
            cmd += ` = '${newValue}`
        }
        return await this.evaluatePage(cmd)
    }

    // todo add most methods from client here
}