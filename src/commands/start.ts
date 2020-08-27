import { flags } from "@oclif/command";
import cli from "cli-ux";
import { processManager } from "../process-manager";
import { CommandFlags, ProcessOptions } from "../types";
import { BaseCommand } from "./command";

export class StartCommand extends BaseCommand {
    public static description: string = "Start the MultiSignature server";

    public static examples: string[] = [
        `Run a MultiSignature server with a pm2 daemon
$ multisig-server start
`,
    ];

    public static flags: CommandFlags = {
        ...BaseCommand.flagsConfiguration,
        daemon: flags.boolean({
            description: "start the process as a daemon",
            default: true,
            allowNo: true,
        }),
    };

    public async run(): Promise<void> {
        const { flags } = this.parse(StartCommand);

        const processName: string = this.getProcessName(flags.network as string);

        this.abortRunningProcess(processName);

        await this.runWithPm2(
            {
                name: processName,
                // @ts-ignore
                script: this.config.options.root,
                args: `run ${this.flagsToStrings(flags, ["daemon"])}`,
            },
            flags,
        );
    }

    protected async runWithPm2(options: ProcessOptions, flags: CommandFlags) {
        const processName = options.name;

        try {
            if (processManager.has(processName)) {
                this.abortUnknownProcess(processName);
                this.abortRunningProcess(processName);
            }

            cli.action.start(`Starting ${processName}`);

            const flagsProcess: Record<string, boolean | number | string> = {
                "max-restarts": 5,
                "kill-timeout": 30000,
            };

            if (flags.daemon === false) {
                flagsProcess["no-daemon"] = true;
            }

            flagsProcess.name = processName;

            processManager.start(options, flagsProcess);
        } catch (error) {
            error.stderr ? this.error(`${error.message}: ${error.stderr}`) : this.error(error.message);
        } finally {
            cli.action.stop();
        }
    }
}
