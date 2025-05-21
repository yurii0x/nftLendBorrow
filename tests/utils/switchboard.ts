// import * as anchor from "@project-serum/anchor";
// import { clusterApiUrl, Connection, Keypair, PublicKey, SystemProgram, TransactionInstruction } from "@solana/web3.js";
// import { anchorBNtoDateString, chalkString, getIdlAddress, getOrCreateSwitchboardTokenAccount, getProgramDataAddress, packAndSend, SwitchboardTestEnvironment } from "@switchboard-xyz/sbv2-utils";
// import * as sbv2 from "@switchboard-xyz/switchboard-v2";
// import {
//   CrankAccount,
//   OracleAccount,
//   PermissionAccount,
//   ProgramStateAccount,
//   OracleQueueAccount,
// } from "@switchboard-xyz/switchboard-v2";
// import {createAggregator} from "@switchboard-xyz/sbv2-utils";

// import chalk from "chalk";
// import fs from "fs";
// import path from "path";

//   /** Build a devnet environment to later clone to localnet */
//   export async function create(
//     payerKeypairPath: string,
//     additionalClonedAccounts?: Record<string, PublicKey>,
//     alternateProgramId?: PublicKey
//   ): Promise<SwitchboardTestEnvironment> {
//     const fullKeypairPath =
//       payerKeypairPath.charAt(0) === "/"
//         ? payerKeypairPath
//         : path.join(process.cwd(), payerKeypairPath);
//     if (!fs.existsSync(fullKeypairPath)) {
//       throw new Error("Failed to find payer keypair path");
//     }
//     const payerKeypair = Keypair.fromSecretKey(
//       new Uint8Array(
//         JSON.parse(
//           fs.readFileSync(fullKeypairPath, {
//             encoding: "utf-8",
//           })
//         )
//       )
//     );
//     const connection = new Connection(clusterApiUrl("devnet"), {
//       commitment: "confirmed",
//     });

//     const programId = alternateProgramId ?? sbv2.getSwitchboardPid("devnet");
//     const wallet = new sbv2.AnchorWallet(payerKeypair);
//     const provider = new anchor.AnchorProvider(connection, wallet, {});

//     const anchorIdl = await anchor.Program.fetchIdl(programId, provider);
//     if (!anchorIdl) {
//       throw new Error(`failed to read idl for ${programId}`);
//     }

//     const switchboardProgram = new anchor.Program(
//       anchorIdl,
//       programId,
//       provider
//     );

//     const programDataAddress = getProgramDataAddress(
//       switchboardProgram.programId
//     );
//     const idlAddress = await getIdlAddress(switchboardProgram.programId);

//     const queueResponse = await createQueue(
//       switchboardProgram,
//       {
//         authority: payerKeypair.publicKey,
//         name: "Test Queue",
//         metadata: `created ${anchorBNtoDateString(
//           new anchor.BN(Math.floor(Date.now() / 1000))
//         )}`,
//         minStake: new anchor.BN(0),
//         reward: new anchor.BN(0),
//         crankSize: 10,
//         oracleTimeout: 180,
//         numOracles: 1,
//         unpermissionedFeeds: true,
//         unpermissionedVrf: true,
//         enableBufferRelayers: true,
//       },
//       10
//     );

//     const queueAccount = queueResponse.queueAccount;
//     const queue = await queueAccount.loadData();

//     const [programStateAccount, stateBump] =
//       ProgramStateAccount.fromSeed(switchboardProgram);
//     const programState = await programStateAccount.loadData();

//     const mint = await queueAccount.loadMint();

//     const payerSwitchboardWallet = await getOrCreateSwitchboardTokenAccount(
//       switchboardProgram,
//       mint
//     );

//     const crankAccount = new CrankAccount({
//       program: switchboardProgram,
//       publicKey: queueResponse.crankPubkey,
//     });
//     const crank = await crankAccount.loadData();

//     const oracleAccount = new OracleAccount({
//       program: switchboardProgram,
//       publicKey: queueResponse.oracles[0],
//     });
//     const oracle = await oracleAccount.loadData();

//     const [permissionAccount] = PermissionAccount.fromSeed(
//       switchboardProgram,
//       queue.authority,
//       queueAccount.publicKey,
//       oracleAccount.publicKey
//     );
//     const permission = await permissionAccount.loadData();

//     const ctx: ISwitchboardTestEnvironment = {
//       programId: switchboardProgram.programId,
//       programDataAddress,
//       idlAddress,
//       programState: programStateAccount.publicKey,
//       switchboardVault: programState.tokenVault,
//       switchboardMint: mint.address,
//       tokenWallet: payerSwitchboardWallet,
//       queue: queueResponse.queueAccount.publicKey,
//       queueAuthority: queue.authority,
//       queueBuffer: queue.dataBuffer,
//       crank: crankAccount.publicKey,
//       crankBuffer: crank.dataBuffer,
//       oracle: oracleAccount.publicKey,
//       oracleAuthority: oracle.oracleAuthority,
//       oracleEscrow: oracle.tokenAccount,
//       oraclePermissions: permissionAccount.publicKey,
//       payerKeypairPath: fullKeypairPath,
//       additionalClonedAccounts,
//     };

//     return new SwitchboardTestEnvironment(ctx);
//   }

//   export interface CreateQueueParams {
//     authority?: PublicKey;
//     name?: string;
//     metadata?: string;
//     minStake: anchor.BN;
//     reward: anchor.BN;
//     crankSize?: number;
//     oracleTimeout?: number;
//     numOracles?: number;
//     unpermissionedFeeds?: boolean;
//     unpermissionedVrf?: boolean;
//     enableBufferRelayers?: boolean;
//   }

//   export interface CreateQueueResponse {
//     queueAccount: OracleQueueAccount;
//     crankPubkey: PublicKey;
//     oracles: PublicKey[];
//   }

//   export async function createQueue(
//     program: anchor.Program,
//     params: CreateQueueParams,
//     queueSize = 500,
//     authorityKeypair = programWallet(program)
//   ): Promise<CreateQueueResponse> {
//     const payerKeypair = programWallet(program);

//     const [programStateAccount, stateBump] =
//       ProgramStateAccount.fromSeed(program);
//     const mint = await spl.getMint(
//       program.provider.connection,
//       spl.NATIVE_MINT,
//       undefined,
//       spl.TOKEN_PROGRAM_ID
//     );

//     const ixns: (TransactionInstruction | TransactionInstruction[])[] = [];
//     const signers: Keypair[] = [payerKeypair, authorityKeypair];

//     try {
//       await programStateAccount.loadData();
//     } catch {
//       const vaultKeypair = anchor.web3.Keypair.generate();
//       ixns.push([
//         SystemProgram.createAccount({
//           fromPubkey: payerKeypair.publicKey,
//           newAccountPubkey: vaultKeypair.publicKey,
//           lamports:
//             await program.provider.connection.getMinimumBalanceForRentExemption(
//               spl.AccountLayout.span
//             ),
//           space: spl.AccountLayout.span,
//           programId: spl.TOKEN_PROGRAM_ID,
//         }),
//         spl.createInitializeAccountInstruction(
//           vaultKeypair.publicKey,
//           mint.address,
//           payerKeypair.publicKey,
//           spl.TOKEN_PROGRAM_ID
//         ),
//         await program.methods
//           .programInit({
//             stateBump,
//           })
//           .accounts({
//             state: programStateAccount.publicKey,
//             authority: payerKeypair.publicKey,
//             tokenMint: mint.address,
//             vault: vaultKeypair.publicKey,
//             payer: payerKeypair.publicKey,
//             systemProgram: SystemProgram.programId,
//             tokenProgram: spl.TOKEN_PROGRAM_ID,
//             daoMint: mint.address,
//           })
//           .instruction(),
//       ]);
//       signers.push(vaultKeypair);
//     }

//     const queueKeypair = anchor.web3.Keypair.generate();
//     const queueBuffer = anchor.web3.Keypair.generate();
//     const queueBufferSize = queueSize * 32 + 8;

//     const queueAccount = new OracleQueueAccount({
//       program: program,
//       publicKey: queueKeypair.publicKey,
//     });

//     console.debug(chalkString("OracleQueue", queueKeypair.publicKey));
//     console.debug(chalkString("OracleBuffer", queueBuffer.publicKey));

//     const crankKeypair = anchor.web3.Keypair.generate();
//     const crankBuffer = anchor.web3.Keypair.generate();
//     const crankSize = params.crankSize ? params.crankSize * 40 + 8 : 0;

//     console.debug(chalkString("CrankAccount", crankKeypair.publicKey));
//     console.debug(chalkString("CrankBuffer", crankBuffer.publicKey));

//     const crankAccount = new CrankAccount({
//       program: program,
//       publicKey: crankKeypair.publicKey,
//     });

//     ixns.push(
//       anchor.web3.SystemProgram.createAccount({
//         fromPubkey: payerKeypair.publicKey,
//         newAccountPubkey: queueBuffer.publicKey,
//         space: queueBufferSize,
//         lamports:
//           await program.provider.connection.getMinimumBalanceForRentExemption(
//             queueBufferSize
//           ),
//         programId: program.programId,
//       }),
//       await program.methods
//         .oracleQueueInit({
//           name: Buffer.from(params.name ?? "").slice(0, 32),
//           metadata: Buffer.from("").slice(0, 64),
//           reward: params.reward ? new anchor.BN(params.reward) : new anchor.BN(0),
//           minStake: params.minStake
//             ? new anchor.BN(params.minStake)
//             : new anchor.BN(0),
//           // feedProbationPeriod: 0,
//           oracleTimeout: params.oracleTimeout,
//           slashingEnabled: false,
//           varianceToleranceMultiplier: SwitchboardDecimal.fromBig(new Big(2)),
//           authority: authorityKeypair.publicKey,
//           // consecutiveFeedFailureLimit: new anchor.BN(1000),
//           // consecutiveOracleFailureLimit: new anchor.BN(1000),
//           minimumDelaySeconds: 5,
//           queueSize: queueSize,
//           unpermissionedFeeds: params.unpermissionedFeeds ?? false,
//           unpermissionedVrf: params.unpermissionedVrf ?? false,
//           enableBufferRelayers: params.enableBufferRelayers ?? false,
//         })
//         .accounts({
//           oracleQueue: queueKeypair.publicKey,
//           authority: authorityKeypair.publicKey,
//           buffer: queueBuffer.publicKey,
//           systemProgram: SystemProgram.programId,
//           payer: payerKeypair.publicKey,
//           mint: mint.address,
//         })
//         .instruction(),
//       anchor.web3.SystemProgram.createAccount({
//         fromPubkey: payerKeypair.publicKey,
//         newAccountPubkey: crankBuffer.publicKey,
//         space: crankSize,
//         lamports:
//           await program.provider.connection.getMinimumBalanceForRentExemption(
//             crankSize
//           ),
//         programId: program.programId,
//       }),
//       await program.methods
//         .crankInit({
//           name: Buffer.from("Crank").slice(0, 32),
//           metadata: Buffer.from("").slice(0, 64),
//           crankSize: params.crankSize,
//         })
//         .accounts({
//           crank: crankKeypair.publicKey,
//           queue: queueKeypair.publicKey,
//           buffer: crankBuffer.publicKey,
//           systemProgram: SystemProgram.programId,
//           payer: payerKeypair.publicKey,
//         })
//         .instruction()
//     );
//     signers.push(queueKeypair, queueBuffer, crankKeypair, crankBuffer);

//     const finalTransactions: (
//       | TransactionInstruction
//       | TransactionInstruction[]
//     )[] = [];

//     const oracleAccounts = await Promise.all(
//       Array.from(Array(params.numOracles).keys()).map(async (n) => {
//         const name = `Oracle-${n + 1}`;
//         const tokenWalletKeypair = anchor.web3.Keypair.generate();
//         const [oracleAccount, oracleBump] = OracleAccount.fromSeed(
//           program,
//           queueAccount,
//           tokenWalletKeypair.publicKey
//         );

//         console.debug(chalkString(name, oracleAccount.publicKey));

//         const [permissionAccount, permissionBump] = PermissionAccount.fromSeed(
//           program,
//           authorityKeypair.publicKey,
//           queueAccount.publicKey,
//           oracleAccount.publicKey
//         );
//         console.debug(
//           chalkString(`Permission-${n + 1}`, permissionAccount.publicKey)
//         );

//         finalTransactions.push([
//           SystemProgram.createAccount({
//             fromPubkey: payerKeypair.publicKey,
//             newAccountPubkey: tokenWalletKeypair.publicKey,
//             lamports:
//               await program.provider.connection.getMinimumBalanceForRentExemption(
//                 spl.AccountLayout.span
//               ),
//             space: spl.AccountLayout.span,
//             programId: spl.TOKEN_PROGRAM_ID,
//           }),
//           spl.createInitializeAccountInstruction(
//             tokenWalletKeypair.publicKey,
//             mint.address,
//             programStateAccount.publicKey,
//             spl.TOKEN_PROGRAM_ID
//           ),
//           await program.methods
//             .oracleInit({
//               name: Buffer.from(name).slice(0, 32),
//               metadata: Buffer.from("").slice(0, 128),
//               stateBump,
//               oracleBump,
//             })
//             .accounts({
//               oracle: oracleAccount.publicKey,
//               oracleAuthority: authorityKeypair.publicKey,
//               queue: queueKeypair.publicKey,
//               wallet: tokenWalletKeypair.publicKey,
//               programState: programStateAccount.publicKey,
//               systemProgram: SystemProgram.programId,
//               payer: payerKeypair.publicKey,
//             })
//             .instruction(),
//           await program.methods
//             .permissionInit({})
//             .accounts({
//               permission: permissionAccount.publicKey,
//               authority: authorityKeypair.publicKey,
//               granter: queueAccount.publicKey,
//               grantee: oracleAccount.publicKey,
//               payer: payerKeypair.publicKey,
//               systemProgram: SystemProgram.programId,
//             })
//             .instruction(),
//           await program.methods
//             .permissionSet({
//               permission: { permitOracleHeartbeat: null },
//               enable: true,
//             })
//             .accounts({
//               permission: permissionAccount.publicKey,
//               authority: authorityKeypair.publicKey,
//             })
//             .instruction(),
//         ]);
//         signers.push(tokenWalletKeypair);
//         return {
//           oracleAccount,
//           name,
//           permissionAccount,
//           tokenWalletKeypair,
//         };
//       })
//     );

//     const createAccountSignatures = await packAndSend(
//       program,
//       [ixns, finalTransactions],
//       signers,
//       payerKeypair.publicKey
//     );

//     // const result = await program.provider.connection.confirmTransaction(
//     //   createAccountSignatures[-1]
//     // );

//     return {
//       queueAccount,
//       crankPubkey: crankAccount.publicKey,
//       oracles: oracleAccounts.map((o) => o.oracleAccount.publicKey) ?? [],
//     };
//   }