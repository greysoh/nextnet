import { Command, type ParseOptions } from "commander";
import { PrintLine } from "../commands";

export class SSHCommand extends Command {
  hasRecievedExitSignal: boolean;
  println: PrintLine;

  /**
   * Modified version of the Commander command with slight automated patches, to work with our SSH environment.
   * @param println PrintLine function to use
   * @param name Optional field for the name of the command
   */
  constructor(
    println: PrintLine,
    name?: string,
    disableSSHHelpPatching: boolean = false,
  ) {
    super(name);

    this.configureOutput({
      writeOut: str => println(str),
      writeErr: str => {
        if (str.includes("--help") || str.includes("-h")) return;
        println(str);
      },
    });

    if (!disableSSHHelpPatching) {
      const sshCommand = new SSHCommand(println, "help", true);

      sshCommand.description("display help for command");
      sshCommand.argument("[command]", "command to show help for");
      sshCommand.action(() => {
        this.hasRecievedExitSignal = true;

        if (process.env.NODE_ENV != "production") {
          println(
            "Caught irrecoverable crash (command help call) in patchCommander\n",
          );
        } else {
          println("Aborted\n");
        }
      });

      this.addCommand(sshCommand);
    }
  }

  recvExitDispatch() {
    this.hasRecievedExitSignal = true;
    let parentElement = this.parent;

    while (parentElement instanceof SSHCommand) {
      parentElement.hasRecievedExitSignal = true;
      parentElement = parentElement.parent;
    };
  }

  _exit() {
    this.recvExitDispatch();
  }

  _exitCallback() {
    this.recvExitDispatch();
  }

  action(fn: (...args: any[]) => void | Promise<void>): this {
    super.action(fn);

    // @ts-ignore
    // prettier-ignore
    const oldActionHandler: (...args: any[]) => void | Promise<void> = this._actionHandler;

    // @ts-ignore
    this._actionHandler = async (...args: any[]): Promise<void> => {
      if (this.hasRecievedExitSignal) return;
      await oldActionHandler(...args);
    };

    return this;
  }

  parse(argv?: readonly string[], options?: ParseOptions): this {
    super.parse(["nextruntime", ...(argv ?? [])], options);
    return this;
  }

  createCommand(name: string) {
    const command = new SSHCommand(this.println, name);
    return command;
  }
}