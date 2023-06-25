export async function handle(state, action) {
  const input = action.input;

  if (input.function === "claimFactory") {
    const { jwk_n, sig, cid } = input;

    await _verifyArSignature(jwk_n, sig);
    const caller = await _ownerToAddress(jwk_n);
    ContractAssert(
      state.claimable_factories.length,
      "ERROR_NO_CLAIMABLE_FACTORIES_NOW"
    );
    ContractAssert(!(cid in state.factories), "ERROR_FACTORY_CLAIMED_FOR_ID");
    const channelsIds = (await _getPermacastState()).map((channel) => ({
      cid: channel.pid,
      owner: channel.owner,
    }));
    ContractAssert(
      channelsIds.find(
        (channel) => channel.owner === caller && channel.cid === cid
      ),
      "ERROR_INVALID_CALLER"
    );
    state.factories[cid] = state.claimable_factories[0];
    state.claimable_factories.splice(0, 1);
    return { state };
  }

  if (input.function === "submitRequest") {
    const { eid, jwk_n, sig, target } = input;

    const caller = await _ownerToAddress(jwk_n);
    await _verifyArSignature(jwk_n, sig);
    _validateEthAddress(target);

    const channel = await _getChannelByEid(eid);
    const episodeObject = channel.episodes.find((ep) => ep.eid === eid);
    ContractAssert(channel.owner === caller, "ERROR_INVALID_CALLER");
    ContractAssert(
      channel.pid in state.factories,
      "ERROR_CHANNEL_DONT_HAVE_FACTORY"
    );
    _notTokenizedBefore(eid);

    state.records.push({
      record_id: SmartWeave.transaction.id,
      eid: eid,
      target: target,
      factory: state.factories[channel.pid],
      cid: channel.pid,
      status: "pending",
      metadata: {
        cover: channel.cover,
        name: episodeObject.episodeName,
        description: episodeObject.description,
        content: episodeObject.contentTx,
        cid: channel.pid,
      },
    });

    return { state };
  }

  if (input.function === "submitRequests") {
    const { payload, jwk_n, sig } = input;
    let UID = 0;

    const caller = await _ownerToAddress(jwk_n);
    await _verifyArSignature(jwk_n, sig);

    for (const req of payload) {
      const { target, eid } = req;

      _validateEthAddress(target);

      const channel = await _getChannelByEid(eid);
      const episodeObject = channel.episodes.find((ep) => ep.eid === eid);
      ContractAssert(channel.owner === caller, "ERROR_INVALID_CALLER");
      ContractAssert(
        channel.pid in state.factories,
        "ERROR_CHANNEL_DONT_HAVE_FACTORY"
      );
      _notTokenizedBefore(eid);

      state.records.push({
        record_id: SmartWeave.transaction.id + String(UID),
        eid: eid,
        target: target,
        factory: state.factories[channel.pid],
        cid: channel.pid,
        status: "pending",
        metadata: {
          cover: channel.cover,
          name: episodeObject.episodeName,
          description: episodeObject.description,
          content: episodeObject.contentTx,
          cid: channel.pid,
        },
      });

      UID += 1;
    }

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
    delete state.records[recordIndex].metadata;

    return { state };
  }

  if (input.function === "addFactory") {
    const { jwk_n, sig, contract_address } = input;

    await _verifyArSignature(jwk_n, sig);
    const caller = await _ownerToAddress(jwk_n);
    ContractAssert(caller === state.admin, "ERROR_INVALID_CALLER");
    ContractAssert(
      !state.claimable_factories.includes(contract_address),
      "ERROR_CONTRACT_ADDED_ALREADY"
    );
    state.claimable_factories.push(contract_address);

    return { state };
  }

  if (input.function === "delFactory") {
    const { jwk_n, sig, contract_address } = input;

    await _verifyArSignature(jwk_n, sig);
    const caller = await _ownerToAddress(jwk_n);
    ContractAssert(caller === state.admin, "ERROR_INVALID_CALLER");
    const factoryIndex = state.claimable_factories.findIndex(
      (factory) => factory === contract_address
    );
    ContractAssert(factoryIndex >= 0, "ERROR_FACTORY_NOT_FOUND");
    state.claimable_factories.splice(factoryIndex, 1);

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
      const encodedMessage = new TextEncoder().encode(
        state.signature_message + owner
      );
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
