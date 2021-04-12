import DockWallet from '../src/index';
import dock from '@docknetwork/sdk';
import { base64Decode } from '@polkadot/util-crypto';

import {
  decodePair,
} from '@polkadot/keyring/pair/decode';

import {
  getKeyPairType,
} from '@docknetwork/sdk/utils/misc';

import getKeyDoc from '@docknetwork/sdk/utils/vc/helpers';
import * as bs58 from 'base58-universal';

import {
  getKeypairFromDoc
} from '../src/methods/keypairs';

import {
  KEY_HARDWARE,
  KEY_REMOTE,
  KEY_LOCAL,
  KEY_JWK,
} from './constants/keys';

function verifyCryptoKeypair(keyPair) {
  // TOOD: perform some basic crypto operations on this keypair to verify it works
}

// TODO: have a helper method to convert polkadotjs keyring objcet into a json crypto document, then that into a keypair instance
// add test for it

function polkadotToKeydoc(aliceKeys, controller = undefined) {
    const keyPassphrase = 'test';
    const keyjson = aliceKeys.toJson(keyPassphrase);
    const { publicKey, secretKey } = decodePair(keyPassphrase, base64Decode(keyjson.encoded), keyjson.encoding.type);

    const polkadotTypesToKeys = {
      'sr25519': 'Sr25519VerificationKey2020',
      'ed25519': 'Ed25519VerificationKey2018',
      'ecdsa': 'EcdsaSecp256k1VerificationKey2019',
    };

    const kpType = polkadotTypesToKeys[getKeyPairType(aliceKeys)];
    const keyDoc = getKeyDoc(controller, aliceKeys, kpType);
    const formattedkeyDoc = {
      id: keyDoc.id,
      type: keyDoc.type,
      controller: keyDoc.controller,
      publicKeyBase58: bs58.encode(publicKey),
      privateKeyBase58: bs58.encode(secretKey),
    };

  // auto create controller
  if (!controller) {
    const keypairInstance = getKeypairFromDoc(formattedkeyDoc);
    const fingerprint = keypairInstance.fingerprint();
    if (!formattedkeyDoc.controller) {
      formattedkeyDoc.controller = `did:key:${fingerprint}`;
      formattedkeyDoc.id = `did:key:${fingerprint}#${fingerprint}`;
    }
  }
  return formattedkeyDoc;
}

describe('Wallet - Key storage and usage', () => {
  const wallet = new DockWallet();

  beforeAll(async () => {
    await dock.initKeyring();
  });

  test('Can convert Polkadot ed25519 keyring to crypto class', () => {
    const aliceKeys = dock.keyring.addFromUri('//Alice', {}, 'ed25519');
    const keyDoc = polkadotToKeydoc(aliceKeys);
    const keypairInstance = getKeypairFromDoc(keyDoc);
    expect(keypairInstance.type).toEqual('Ed25519VerificationKey2018');
  });

  test('Can convert Polkadot sr25519 keyring to crypto class', () => {
    const aliceKeys = dock.keyring.addFromUri('//Alice', {}, 'sr25519');
    const keyDoc = polkadotToKeydoc(aliceKeys);
    console.log('keyDoc', keyDoc)
    const keypairInstance = getKeypairFromDoc(keyDoc);
    console.log('keypairInstance', keypairInstance)
    expect(keypairInstance.type).toEqual('Ed25519VerificationKey2018');
  });

  test('Can add a local base58 key', () => {
    wallet.add(KEY_LOCAL);
    expect(wallet.has(KEY_LOCAL.id)).toBe(true);
    // TODO: retrieve key from wallet by id as crpyto keypair class with helper method and ensure its valid
  });

  // TODOS:
  // test('Can add a JSON web key', () => {
  //   // TODO: this
  // });
  //
  // test('Can add a remote KMS key', () => {
  //   // TODO: this
  // });
  //
  // test('Can add a hardware key', () => {
  //   // TODO: this
  // });
});