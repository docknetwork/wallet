import { X25519KeyAgreementKey2020 } from '@digitalbazaar/x25519-key-agreement-key-2020';
import { X25519KeyAgreementKey2019 } from '@digitalbazaar/x25519-key-agreement-key-2019';
import { Ed25519VerificationKey2018 } from '@digitalbazaar/ed25519-verification-key-2018';
import { Ed25519VerificationKey2020 } from '@digitalbazaar/ed25519-verification-key-2020';

const keyConstructors = {
  Ed25519VerificationKey2018: async (keypairOptions) => {
    return new Ed25519VerificationKey2018(keypairOptions);
  },
  Ed25519VerificationKey2020: async (keypairOptions) => {
    return new Ed25519VerificationKey2020(keypairOptions);
  },
  X25519KeyAgreementKey2019: async (keypairOptions) => {
    return new X25519KeyAgreementKey2019(keypairOptions);
  },
  X25519KeyAgreementKey2020: async (keypairOptions) => {
    return new X25519KeyAgreementKey2020(keypairOptions);
  },
};

export function getKeypairFromDoc(keypairOptions) {
  const { type } = keypairOptions;
  const keyConstructor = keyConstructors[type];
  if (!keyConstructor) {
    throw new Error(`Unrecognized keypair type to construct: ${type}`);
  }
  return keyConstructor(keypairOptions);
}

export function getKeypairDocFromWallet(wallet, controller) {
  const results = wallet.contents.filter(content => {
    return content.controller === controller;
  });
  return results[0];
}

export function getKeypairFromController(wallet, controller) {
  // Determine keypair object from controller input
  const keyPairDocument = getKeypairDocFromWallet(wallet, controller);
  if (!keyPairDocument) {
    throw new Error(`Unable to find keypair in wallet contents with controller: ${controller}`);
  }

  // Get keypair instance from document
  const keyPairInstance = getKeypairFromDoc(keyPairDocument);
  if (!keyPairInstance) {
    throw new Error(`Unable to determine keypair instance from document`);
  }
  return keyPairInstance;
}
