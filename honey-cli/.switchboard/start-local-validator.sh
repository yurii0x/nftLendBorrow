#!/bin/bash

mkdir -p .anchor/test-ledger

solana-test-validator -r --ledger .anchor/test-ledger --mint CPXnqubz1p4HLYj69d5egqinnVuC2qvKi9iVmk3FVUck --bind-address 0.0.0.0 --url https://api.devnet.solana.com --rpc-port 8899  --clone 2TfB33aLaneQb5TNVwyDz3jSZXS6jdW2ARw1Dgf84XCG `# programId` \
--clone J4CArpsbrZqu1axqQ4AnrqREs3jwoyA1M5LMiQQmAzB9 `# programDataAddress` \
--clone CKwZcshn4XDvhaWVH9EXnk3iu19t6t5xP2Sy2pD6TRDp `# idlAddress` \
--clone BYM81n8HvTJuqZU1PmTVcwZ9G8uoji7FKM6EaPkwphPt `# programState` \
--clone FVLfR6C2ckZhbSwBzZY4CX7YBcddUSge5BNeGQv5eKhy `# switchboardVault` \
--clone So11111111111111111111111111111111111111112 `# switchboardMint` \
--clone 6p5HHcyL1LpCXjdBhVttZAmBfAjFNcFQp8heBjwkPDA1 `# tokenWallet` \
--clone DfNZfAnw4eiPavRvYZxrwWkDVmPE7oDb1vGiYZgCyg8P `# queue` \
--clone CPXnqubz1p4HLYj69d5egqinnVuC2qvKi9iVmk3FVUck `# queueAuthority` \
--clone f7YqcK186JUPeLPwQKBpyBJVKxuvsb1ByiUFjgjjV14 `# queueBuffer` \
--clone 9zjMv5GncaPpWBHCJPFVD5nJkTkLVp9hrvqNNZ8xajpB `# crank` \
--clone 6ZiSikvaprTjoJ8Zt5rEzsiM63z4YqrRNRK8AwFWnY8c `# crankBuffer` \
--clone 5xKViQxAKcrN4o7RyPLPazb3uLcv2SPv3Bfm5TKmnb8q `# oracle` \
--clone CPXnqubz1p4HLYj69d5egqinnVuC2qvKi9iVmk3FVUck `# oracleAuthority` \
--clone BRDsQZMsrWpstpryVFddvAmjphgbBvbGQyWnVL3n4vyZ `# oracleEscrow` \
--clone t9oBt2YaoBJePQK6N48PfZSXJ6cnxHq7YMvH87vkJzR `# oraclePermissions` 