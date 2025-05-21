# Honey Program CLI

A simple cli for interacting with the honey finance on-chain program ecosystem.
The current program the cli is pointing to can be found in src/helpers/constants.ts with the
public key described by HONEY_PROGRAM_ID.

NOTE: Currently the CLI makes a lot of assumptions as to the initialization params for the markets and reserves, feel
free to add more params going forward

### Usage

The file cli-params.json specifies some default values to be added to avoid the need to pass in
things like honey-pid or market-id, ect.

1. Optional Params:
   a. --market-id sets the market-id for all the program commands, can be set in cli-params.json to avoid repeating when working with the same market
   b. --honey-pid sets the honey program id for all the program commands, can be set in cli-params.json to avoid repeating when working with the same program
   c. --env sets the environment for the cli, can be set in cli-params.json to avoid repeating when working with the same env

##### 1. Switchboard Oracle

Note- if you need to regenerate the .switchboard folder
You can generate the localhost switchboard oracle with the following command
`ts-node generate-switchboard.ts`

This will create a .switchboard folder which contains all the relevant info for
generating the localhost accounts

You can use the .switchboard already generated, but
Run in terminal #1:
`./.switchboard/start-local-validator.sh`
Run in terminal #2 (note- you need docker to run this command):
`./.switchboard/start-oracle.sh`

Now add the following two programs to the start-local-validator.sh as these are needed for the honey program to run

--bpf-program metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s ./deps/mpl_token_metadata.so \
--bpf-program DESVgJVGajEgKGXhb6XmqDHGz3VjdgP7rEVESBgxmroY ./deps/serum_dex.so

And add the following url forwarder to docker-compose.switchboard.yml
    `extra_hosts:`
      `- "host.docker.internal:host-gateway"`


Now run
The wallet specified here needs to be the same as the one taken in generate-switchboard.ts
`ANCHOR_WALLET=path/to/wallet.json ts-node generate-switchboard-feeds.ts`

Now pass in the public key output by running this script to oracle params in the cli

1. Devnet Switchboard oracles (these can be created yourself as well)
   Gkii6XzNrTmAfy4tXspbi6MkkVJwfjoPNpm6Z6ooGj7k - SMB feeds

##### 2. Create Market

`ts-node src/honey-cli create-market --env devnet --keypair ~/.config/solana/id.json -u 42danWebKzfEusPA59qfCNq1bQmHbGfATmUiXbiacLkR --oracle Gkii6XzNrTmAfy4tXspbi6MkkVJwfjoPNpm6Z6ooGj7k`

COFRE Collection Verified Creator
CiQ9EKdmFo7t8xiMPHuk1YhtfEdyaNANL1X6PsZojVH5

When Loans Collection Verified Creator:
42danWebKzfEusPA59qfCNq1bQmHbGfATmUiXbiacLkR

##### 3. Create Reserve

`ts-node src/honey-cli create-reserve --env devnet --keypair ~/.config/solana/id.json --oracle 62V7xekiTDuMRvaCs8nX9DzkjsywmHNjgza5hgr1trCN`

Devnet switchboard price oracle for solana
D4wqfQ3WMH1YA6L7kgR53h1s7LRYRimSn2RHKjoygoAu - scnSOL/USD feed

##### 4. deposit NFT

`ts-node src/honey-cli deposit-nft --env localnet --keypair ~/.config/solana/id.json --token-account <NFT_TOKEN_ACCOUNT> --token-mint <TOKEN_MINT_KEY> --verified-creator <VERIFIED_CREATOR_KEY>`

##### 5. withdraw NFT

`ts-node src/honey-cli withdraw-nft --env localnet --keypair ~/.config/solana/id.json --token-account <NFT_TOKEN_ACCOUNT> --token-mint <TOKEN_MINT_KEY> --verified-creator <VERIFIED_CREATOR_KEY>`

##### 6. Fetch Market state

Gets the market state
`ts-node src/honey-cli get-market-state --env localnet --keypair ~/.config/solana/id.json`

##### 6. Fetch Obligation state

Gets the obligation state for the keypair inside the market passed
`ts-node src/honey-cli get-obligation-state --env localnet --keypair ~/.config/solana/id.json`

##### 7. deposit tokens

NOTE: for these functions the amount is in the form x \* 10^-y where y is the decimal places
`ts-node src/honey-cli deposit-tokens --env localnet --keypair ~/.config/solana/id.json --amount 100 --token-mint So11111111111111111111111111111111111111112`

##### 8. withdraw tokens

`ts-node src/honey-cli withdraw-tokens --env localnet --keypair ~/.config/solana/id.json --amount 100 --token-mint So11111111111111111111111111111111111111112`

##### 9. borrow tokens

`ts-node src/honey-cli borrow-tokens --env localnet --keypair ~/.config/solana/id.json --amount 50 --token-mint So11111111111111111111111111111111111111112`

##### 10. repay tokens

`ts-node src/honey-cli repay-tokens --env localnet --keypair ~/.config/solana/id.json --amount 50 --token-mint So11111111111111111111111111111111111111112`

#### 3. Liquidator

##### 1. place liquidate bid

person placing bid
mint of the bid
max amount to liquidate nft's in that market for
`ts-node src/honey-cli place-liquidation-bid --env localnet --keypair ~/.config/solana/id.json --bidder <string> --bid-mint <string> --bid-limit <number>`

##### 2. revoke liquidate bid

`ts-node src/honey-cli revoke-liquidation-bid --env localnet --keypair ~/.config/solana/id.json --bidder <string> --bid-mint <string> --amount <number>`

##### 3. execute liquidate bid

`ts-node src/honey-cli execute-liquidation-bid --env localnet --keypair ~/.config/solana/id.json --amount <number> --obligation <string> --reserve <string> --bid <string> --nft-mint <string>`

##### 11. liquidate using solvent

`ts-node src/honey-cli solvent-liquidate --env devnet --keypair ~/.config/solana/id.json --nft-mint D2usVaUxhBNT29qiwKgfMUxekz7ikTRsfNjsmnDSHk9Q --depositor AqeHHA9wyUg1zt5N3mwbHeHvvtHsWuf12V4162uAVdZ --verified-creator 42danWebKzfEusPA59qfCNq1bQmHbGfATmUiXbiacLkR`


##### 12. refresh old reserves
`ts-node src/honey-cli refresh-old-reserves --env devnet --keypair  ~/.config/solana/id.json`
### Upgrading the program on localnet

We rely on the idl on chain. To do this run yarn upgrade-idl.
