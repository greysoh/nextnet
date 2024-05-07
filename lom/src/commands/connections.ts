import type { Axios } from "axios";

import { SSHCommand } from "../libs/patchCommander.js";
import type { PrintLine } from "../commands.js";

// https://stackoverflow.com/questions/37938504/what-is-the-best-way-to-find-all-items-are-deleted-inserted-from-original-arra
function difference(a: any[], b: any[]) {
	return a.filter(x => b.indexOf(x) < 0);
};

export async function run(
  argv: string[],
  println: PrintLine,
  axios: Axios,
  token: string,
) {
  let resolve: (value: unknown) => void;
  let reject:  (value: unknown) => void;

  const promise = new Promise((ourResolve, ourReject) => {
    resolve = ourResolve;
    reject = ourReject;
  });

  const program = new SSHCommand(println);
  program.description("Manages connections for NextNet");
  program.version("v0.1.0-preprod");

  const addCommand = new SSHCommand(println, "add");
  addCommand.description("Creates a new connection");

  addCommand.argument(
    "<backend_id>",
    "The backend ID to use. Can be fetched by the command 'backend search'",
  );

  addCommand.argument("<name>", "The name for the tunnel");
  addCommand.argument("<protocol>", "The protocol to use. Either TCP or UDP");

  addCommand.argument(
    "<source>",
    "Source IP and port combo (ex. '192.168.0.63:25565'",
  );

  addCommand.argument("<dest_port>", "Destination port to use");

  addCommand.option("--description, -d", "Description for the tunnel");

  const lookupCommand = new SSHCommand(println, "find");

  lookupCommand.description(
    "Looks up all connections based on the arguments you specify",
  );

  lookupCommand.option(
    "--backend_id, -b <id>",
    "The backend ID to use. Can be fetched by 'back find'",
  );

  lookupCommand.option("--name, -n <name>", "The name for the tunnel");

  lookupCommand.option(
    "--protocol, -p <protocol>",
    "The protocol to use. Either TCP or UDP",
  );

  lookupCommand.option(
    "--source, -s <source>",
    "Source IP and port combo (ex. '192.168.0.63:25565'",
  );

  lookupCommand.option("--dest_port, -d <port>", "Destination port to use");

  lookupCommand.option(
    "--description, -o <description>",
    "Description for the tunnel",
  );

  const startTunnel = new SSHCommand(println, "start");
  startTunnel.description("Starts a tunnel");
  startTunnel.argument("<id>", "Tunnel ID to start");

  const stopTunnel = new SSHCommand(println, "stop");
  stopTunnel.description("Stops a tunnel");
  stopTunnel.argument("<id>", "Tunnel ID to stop");

  const getInbound = new SSHCommand(println, "get-inbound");
  getInbound.description("Shows all current connections");
  getInbound.argument("<id>", "Tunnel ID to view inbound connections of");
  getInbound.option("-t, --tail", "Live-view of connection list");

  getInbound.action(async(idStr: string, options: {
    tail?: boolean
  }): Promise<void> => {
    type InboundConnectionSuccess = {
      success: true,
      data: {
        ip: string,
        port: number,

        connectionDetails: {
          sourceIP: string,
          sourcePort: number,
          destPort: number,
          enabled: boolean
        }
      }[]
    };
  
    const id = parseInt(idStr);

    if (Number.isNaN(id)) {
      println("ID (%s) is not a number\n", idStr);
      return;
    }

    if (options.tail) {
      let previousEntries: string[] = [];

      while (true) {
        const response = await axios.post("/api/v1/forward/connections", {
          token,
          id
        });

        if (response.status != 200) {
          if (process.env.NODE_ENV != "production") console.log(response);
  
          if (response.data.error) {
            println(`Error: ${response.data.error}\n`);
          } else {
            println("Error requesting connections!\n");
          }
  
          return resolve(null);
        }
  
        const { data }: InboundConnectionSuccess = response.data;
        const simplifiedArray: string[] = data.map((i) => `${i.ip}:${i.port}`);

        const insertedItems: string[] = difference(simplifiedArray, previousEntries);
        const removedItems: string[] = difference(previousEntries, simplifiedArray);

        insertedItems.forEach((i) => println("CONNECTED:    %s\n", i));
        removedItems.forEach((i) => println("DISCONNECTED: %s\n", i));

        previousEntries = simplifiedArray;

        await new Promise((i) => setTimeout(i, 2000));
      }
    } else {
      const response = await axios.post("/api/v1/forward/connections", {
        token,
        id
      });

      if (response.status != 200) {
        if (process.env.NODE_ENV != "production") console.log(response);

        if (response.data.error) {
          println(`Error: ${response.data.error}\n`);
        } else {
          println("Error requesting connections!\n");
        }

        return resolve(null);
      }

      const { data }: InboundConnectionSuccess = response.data;

      if (data.length == 0) {
        println("There are currently no connected clients.\n");
        return resolve(null);
      }

      println("Connected clients (for source: %s:%s):\n", data[0].connectionDetails.sourceIP, data[0].connectionDetails.sourcePort);

      for (const entry of data) {
        println(" - %s:%s\n", entry.ip, entry.port);
      }

      console.log(response.data);
    }

    return resolve(null);
  });

  const removeTunnel = new SSHCommand(println, "rm");
  removeTunnel.description("Removes a tunnel");
  removeTunnel.argument("<id>", "Tunnel ID to remove");

  program.addCommand(addCommand);
  program.addCommand(lookupCommand);
  program.addCommand(startTunnel);
  program.addCommand(stopTunnel);
  program.addCommand(getInbound);
  program.addCommand(removeTunnel);

  program.parse(argv);

  if (program.hasRecievedExitSignal) return;
  await promise;
}