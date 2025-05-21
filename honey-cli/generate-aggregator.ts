// WIP MAYBE USEFUL LATER
// import * as anchor from "@project-serum/anchor";
// import { Keypair, PublicKey } from "@solana/web3.js";
// import {
//   AggregatorAccount,
//   loadSwitchboardProgram,
//   LeaseAccount,
//   OracleQueueAccount,
//   SwitchboardPermission,
//   OracleJob,
//   PermissionAccount,
//   JobAccount,
// } from "@switchboard-xyz/switchboard-v2";

// const execute = async () => {
//   let payer: Keypair = Keypair.fromSecretKey(Uint8Array.from());
//   let authority: Keypair = payer; // queue authority
//   let queuePubkey = new PublicKey(
//     "8yPPs2Df7rYafLy5q2crHgv8oRak6PyzcoBGvh5PLxjn"
//   );
//   const program = await loadSwitchboardProgram("devnet", undefined, payer);
//   const queueAccount = new OracleQueueAccount({
//     program,
//     publicKey: queuePubkey,
//   });

//   // aggregator
//   const aggregatorAccount = await AggregatorAccount.create(program, {
//     name: Buffer.from("MY SOL/USD Feed"),
//     batchSize: 1,
//     minRequiredOracleResults: 1,
//     minRequiredJobResults: 1,
//     minUpdateDelaySeconds: 10,
//     queueAccount,
//     authority: authority.publicKey,
//   });

//   console.log(`aggregator: ${aggregatorAccount.keypair.publicKey.toBase58()}`);

//   // permission
//   const permissionAccount = await PermissionAccount.create(program, {
//     authority: authority.publicKey,
//     granter: queueAccount.publicKey,
//     grantee: aggregatorAccount.publicKey,
//   });

//   console.log(`permission: ${permissionAccount.publicKey.toBase58()}`);

//   //   await permissionAccount.set({
//   //     authority,
//   //     permission: SwitchboardPermission.PERMIT_ORACLE_QUEUE_USAGE,
//   //     enable: true,
//   //   });

//   // lease
//   const leaseContract = await LeaseAccount.create(program, {
//     loadAmount: new anchor.BN(0),
//     funder: new PublicKey("eEFVSzZkg388D8ZJETrPp61NQRfHgeR9uSDF1i3Uuqq"),
//     funderAuthority: authority,
//     oracleQueueAccount: queueAccount,
//     aggregatorAccount,
//   });

//   // job
//   const tasks: OracleJob.Task[] = [
//     OracleJob.Task.create({
//       httpTask: OracleJob.HttpTask.create({
//         url: `https://ftx.us/api/markets/SOL_USD`,
//       }),
//     }),
//     OracleJob.Task.create({
//       jsonParseTask: OracleJob.JsonParseTask.create({ path: "$.result.price" }),
//     }),
//   ];
//   const jobData = Buffer.from(
//     OracleJob.encodeDelimited(
//       OracleJob.create({
//         tasks,
//       })
//     ).finish()
//   );
//   const jobKeypair = anchor.web3.Keypair.generate();
//   const jobAccount = await JobAccount.create(program, {
//     data: jobData,
//     keypair: jobKeypair,
//     authority: authority.publicKey,
//   });

//   // add job to aggregator
//   await aggregatorAccount.addJob(jobAccount, authority);
// };

// execute();
