/*
  EDV HTTP Storage Interface Example -> DockWallet interop example
*/


  // TODO: create secure storage vault instance
  // somehow able to load wallet contents
  // do we query for all contents at the start and load into the wallet?
  // eg: wallet.import(await getWalletCred(), password);

/*
  EDV HTTP Storage Interface Example
*/
import EDVHTTPStorageInterface from '../src/storage/edv-http-storage';
import EDVWallet from '../src/edv-wallet';
import { getKeypairFromDoc } from '../src/methods/keypairs';
// import keyAgreementKeyJSON from '../tests/constants/keys/key-agreement-key.json';
import keyBase58 from '../tests/constants/keys/key-base58.json';
import MockHmac from '../tests/mock/hmac';
import MockKak from '../tests/mock/kak';

import {
  WALLET_SIGNED_CREDENTIAL,
} from '../tests/constants';

/**
  Currently this example requires that you run a secure data vault server locally
  and have a pre-created EDV for now (need to expand this later)
**/
async function main() {
  // Get mock keys
  // Ideally you would use a key management system
  // See readme for more: https://github.com/digitalbazaar/edv-client
  const hmac = await MockHmac.create(); // TODO: replace mock example with actual crypto classes
  const keyAgreementKey = new MockKak(); // TODO: replace mock example with actual crypto classes
  const keys = {
    keyAgreementKey,
    hmac,
  };
  console.log('Using keys:', keys)

  const { controller } = keyBase58;
  const capability = undefined; // use defaults
  const invocationSigner = getKeypairFromDoc(keyBase58); // hacky mock signer
  invocationSigner.sign = invocationSigner.signer().sign;

  // TODO: some way to create a new wallet on the vault. this assumes an EDV exists with id below
  // i feel like edv creation should be out of band of wallet class
  const walletId = 'http://localhost:8080/edvs/z1A8cpoziZJcdnsVeoTPTfrXP';
  console.log('Loading remote EDV wallet:', walletId);

  // Create a wallet instance for this EDV/wallet ID
  const edvWallet = new EDVWallet(walletId, {
    keys,
    invocationSigner,
    capability,
  });

  // Load the wallet contents
  await edvWallet.load();

  // Add basic wallet contents if none exist
  if (edvWallet.contents.length === 0) {
    console.log('Wallet has no documents, adding some...');

    // Add a credential
    console.log('Adding credential to the wallet...', WALLET_SIGNED_CREDENTIAL.id);
    edvWallet.add(WALLET_SIGNED_CREDENTIAL);

    // Call optional sync method to ensure our storage promises
    // have succeeded and completed
    await edvWallet.sync();

    // Try add the same item again, it should fail
    try {
      edvWallet.add(WALLET_SIGNED_CREDENTIAL);
      await edvWallet.sync();
    } catch (e) {
      console.log('Duplication check succeeded, cant insert two of the same documents.');
    }

    console.log('Wallet contents have been saved to the remote EDV, total:', edvWallet.contents.length);
    console.log('Run the example again to see contents loaded from the EDV');
    console.log('Wallet result:', edvWallet.toJSON());
  } else {
    // Contents were retrieved from EDV, lets display then remove them
    console.log('Wallet contents have been loaded from the remote EDV, total:', edvWallet.contents.length);
    console.log('Wallet result:', edvWallet.toJSON());

    // Query wallet for specific item
    const itemResult = await edvWallet.query({
      equals: {
        'content.id': WALLET_SIGNED_CREDENTIAL.id,
      },
    });

    if (itemResult.length > 0) {
      console.log('Wallet content query successful, found', itemResult[0].id);
    }

    // Remove wallet contents
    console.log('Removing wallet contents from EDV...');
    edvWallet.contents.forEach(content => {
      console.log('\tRemoving:', content.id)
      edvWallet.remove(content.id);
    });

    // Call optional sync method to ensure our storage promises
    // have succeeded and completed
    await edvWallet.sync();

    console.log('Wallet contents have been removed from the EDV, run the example again to re-create it');
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
