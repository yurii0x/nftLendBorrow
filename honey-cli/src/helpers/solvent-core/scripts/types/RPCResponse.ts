export type RPCResponse = {
    status: boolean;
    msg: String;
    signature: String | undefined;
    error: any;
    data? : {
        name: String,
        val: any,
    };
}