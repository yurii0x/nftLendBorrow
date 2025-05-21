#!/bin/bash
echo "Starting test validator with Serum dex & mpl_token_metadata..."
solana-test-validator -r --bpf-program metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s ./deps/mpl_token_metadata.so --bpf-program DESVgJVGajEgKGXhb6XmqDHGz3VjdgP7rEVESBgxmroY ./deps/serum_dex.so
