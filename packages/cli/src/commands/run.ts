import { start } from "@arkecosystem/multisig-server";
import { CommandFlags } from "../types";
import { BaseCommand } from "./command";

export class RunCommand extends BaseCommand {
    public static description: string = "Run the MultiSignature server (without pm2)";

    public static examples: string[] = [
        `Run the MultiSignature server
$ multisig-server run
`,
    ];

    public static flags: CommandFlags = {
        ...BaseCommand.flagsConfiguration,
    };

    public async run(): Promise<void> {
        const { flags } = this.parse(RunCommand);

        await start({ server: flags });
    }
}
