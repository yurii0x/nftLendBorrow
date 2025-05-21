import { SwitchboardTestEnvironment } from "@switchboard-xyz/sbv2-utils";

const generate = async () => {
  const testEnvironmentA = await SwitchboardTestEnvironment.create(
    "/root/.config/solana/id.json"
  );
  testEnvironmentA.writeAll(".switchboard/priceA");

  const testEnvironmentB = await SwitchboardTestEnvironment.create(
    "/root/.config/solana/id.json"
  );
  testEnvironmentB.writeAll(".switchboard/priceB");
};

generate();
