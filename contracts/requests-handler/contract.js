export async function handle(state, action) {
  const input = action.input;

  if (input.function === "submitRequest") {
    const { eid, jwk_n, sig, target } = input;

    const caller = await _ownerToAddress(jwk_n);
    await _verifyArSignature(jwk_n, sig);
    _validateEthAddress(target);

    const channel = await _getChannelByEid(eid);
    const episodeObject = channel.episodes.find((ep) => ep.eid === eid);
    EXM.print(episodeObject)
    ContractAssert(channel.owner === caller, "ERROR_INVALID_CALLER");
    _notTokenizedBefore(eid);

    state.records.push({
      record_id: SmartWeave.transaction.id,
      eid: eid,
      target: target,
      status: "pending",
      metadata: {
        cover: channel.cover,
        name: episodeObject.episodeName,
        description: episodeObject.description,
        content: episodeObject.contentTx,
        cid: channel.pid,

      }
    });

    return { state };
  }

  // READ FUNCTIONS

  if (input.function === "getUnresolvedReqs") {
    const requests = state.records.filter(
      (record) => record.status === "pending"
    );
    return {
      result: requests,
    };
  }

  // ADMIN FUNCTION

  if (input.function === "resolveRequest") {
    const { record_id, jwk_n, sig, mint_hash } = input;

    await _verifyArSignature(jwk_n, sig);
    const caller = await _ownerToAddress(jwk_n);
    ContractAssert(caller === state.admin, "ERROR_INVALID_CALLER");

    const recordIndex = _getRecordIndex(record_id);
    const record = state.records[recordIndex];
    ContractAssert(record.status === "pending", "ERROR_REQUEST_RESOLVED");
    state.records[recordIndex].mint_hash = mint_hash;
    state.records[recordIndex].status = "resolved";
    delete state.records[recordIndex].metadata

    return { state };
  }

  async function _getPermacastState() {
    try {
      const req = (
        await EXM.deterministicFetch(
          `https://api.exm.dev/read/${state.permacast_contract}`
        )
      )?.asJSON();
      return req?.podcasts;
    } catch (error) {
      throw new ContractError("ERROR_MOLECULE_CONNECTION");
    }
  }

  async function _getChannelByEid(eid) {
    try {
      const permacastState = await _getPermacastState();
      const channelIndex = permacastState.findIndex((channel) =>
        channel.episodes.map((episode) => episode.eid).includes(eid)
      );
      ContractAssert(channelIndex >= 0, "ERROR_INVALID_EID");
      return permacastState[channelIndex];
    } catch (error) {
      throw new ContractError("ERROR_MOLECULE_CONNECTION");
    }
  }

  function _getRecordIndex(rid) {
    const recordId = state.records.findIndex(
      (record) => record.record_id === rid
    );
    ContractAssert(recordId >= 0, "ERROR_INVALID_RECORD_ID");
    return recordId;
  }

  function _validateArweaveAddress(address) {
    ContractAssert(
      /[a-z0-9_-]{43}/i.test(address),
      "ERROR_INVALID_ARWEAVE_ADDRESS"
    );
  }

  function _validateEthAddress(address) {
    ContractAssert(
      /^0x[a-fA-F0-9]{40}$/.test(address),
      "ERROR_INVALID_ETH_ADDR"
    );
  }

  function _notTokenizedBefore(eid) {
    const validRecords = state.records.filter(
      (record) => record.status === "resolved"
    );
    ContractAssert(
      !validRecords.map((record) => record.eid).includes(eid),
      "ERROR_EPISODE_ALREADY_TOKENIZED"
    );
  }

  function _validateOwnerSyntax(owner) {
    ContractAssert(
      typeof owner === "string" && owner?.length === 683,
      "ERROR_INVALID_JWK_N_SYNTAX"
    );
  }

  async function _ownerToAddress(pubkey) {
    try {
      _validateOwnerSyntax(pubkey);
      const req = await EXM.deterministicFetch(
        `${state.ar_molecule_endpoint}/ota/${pubkey}`
      );
      const address = req.asJSON()?.address;
      _validateArweaveAddress(address);
      return address;
    } catch (error) {
      throw new ContractError("ERROR_MOLECULE_SERVER_ERROR");
    }
  }

  async function _verifyArSignature(owner, signature) {
    try {
      ContractAssert(
        !state.signatures.includes(signature),
        "ERROR_SIGNATURE_ALREADY_USED"
      );
      const sigBody = state.sig_messages;
      const encodedMessage = new TextEncoder().encode(state.signature_message);
      const typedArraySig = Uint8Array.from(atob(signature), (c) =>
        c.charCodeAt(0)
      );
      const isValid = await SmartWeave.arweave.crypto.verify(
        owner,
        encodedMessage,
        typedArraySig
      );

      ContractAssert(isValid, "ERROR_INVALID_CALLER_SIGNATURE");

      state.signatures.push(signature);
    } catch (error) {
      throw new ContractError("ERROR_INVALID_CALLER_SIGNATURE");
    }
  }
}
