import {
  contentsFromEncryptedWalletCredential,
  exportContentsAsCredential,
  lockWalletContents,
  unlockWalletContents,
} from './methods/contents';

import { passwordToKeypair } from './methods/password';

import VerifiableCredential from '@docknetwork/sdk/verifiable-credential';
import { issueCredential, verifyCredential } from '@docknetwork/sdk/utils/vc/credentials';

import {
  WALLET_DEFAULT_CONTEXT,
  WALLET_DEFAULT_TYPE,
  WALLET_DEFAULT_ID,
} from './constants';

const WALLET_CONTENT_TYPES = [
  // Supported document types
  'VerifiableCredential',
  'DIDResolutionResponse',
  'Currency',
  'Connection',
  'MetaData',

  // Supported key types
  'Ed25519VerificationKey2018',
  // TODO: add more
];

function ensureValidContent(content) {
  if (!content['@context']) {
    throw new Error('Content object requires valid JSON-LD with @context property');
  }

  if (!content.id) {
    throw new Error('Content object requires an id property');
  }

  if (!content.type) {
    throw new Error('Content object requires an type property');
  }

  // TODO: determine if we want to support any type of document
  // my thinking for POC is no
  const contentTypes = Array.isArray(content.type) ? content.type : [content.type];
  const isValidType = contentTypes.some((type) => {
    return WALLET_CONTENT_TYPES.indexOf(type) > -1;
  });

  if (!isValidType) {
    throw new Error(`Invalid content types: ${contentTypes}`);
  }
}

function ensureWalletUnlocked(wallet) {
  if (wallet.status === 'LOCKED') {
    throw new Error('Wallet is locked!');
  }
}

function getKeypairDocFromWallet(wallet, controller) {
  const results = wallet.contents.filter(content => {
    return content.controller === controller;
  });
  return results[0];
}

import { Ed25519KeyPair } from '@transmute/did-key-ed25519';

function getKeypairFromDoc({ id, type, controller, publicKeyBase58, privateKeyBase58 }) {
  // TOOD: proper type detection, move this method
  return new Ed25519KeyPair({
    id,
    controller,
    publicKeyBase58,
    privateKeyBase58,
  });
}

function getKeypairFromController(wallet, controller) {
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

/** The Dock Wallet */
class DockWallet {
  /**
   * Creates a new unlocked wallet instance with empty contents
   * @constructor
   */
  constructor(id = WALLET_DEFAULT_ID) {
    this.id = id;
    this.status = DockWallet.Unlocked;
    this.contents = [];
  }

  /**
   * Adds a content item to the wallet
   * The wallet must be unlocked to make this call
   * @param {any} content - Content item
   * @return {DockWallet} Returns itself
   */
  add(content) {
    ensureWalletUnlocked(this);
    ensureValidContent(content);
    this.contents.push(content);
    return this;
  }

  /**
   * Removes a content item from the wallet
   * The wallet must be unlocked to make this call
   * @param {string} contentId - Content item ID
   * @return {DockWallet} Returns itself
   */
  remove(contentId) {
    ensureWalletUnlocked(this);
    this.contents = this.contents.filter((i) => i.id !== contentId);
    return this;
  }

  /**
   * Checks if a wallet has content with specific ID
   * The wallet must be unlocked to make this call
   * @param {string} contentId - Content item ID
   * @return {Boolean} Whether the wallet has this content
   */
  has(contentId) {
    ensureWalletUnlocked(this);
    return this.contents.some((i) => i.id === contentId);
  }

  /**
   * Locks the wallet with a given password
   * @param {string} password - Wallet password
   * @return {Promise<DockWallet>} Returns itself
   */
  async lock(password) {
    if (this.status === DockWallet.Locked) {
      throw new Error('Wallet is already locked');
    }

    const keyPair = await passwordToKeypair(password);
    this.contents = await lockWalletContents(
      this.contents,
      keyPair,
    );

    this.status = DockWallet.Locked;
    return this;
  }

  /**
   * Unlocks the wallet with a given password
   * @param {string} password - Wallet password
   * @return {Promise<DockWallet>} Returns itself
   */
  async unlock(password) {
    if (this.status === DockWallet.Unlocked) {
      throw new Error('Wallet is already unlocked');
    }

    const keyPair = await passwordToKeypair(password);
    this.contents = await unlockWalletContents(
      this.contents,
      keyPair,
    );

    this.status = DockWallet.Unlocked;
    return this;
  }

  /**
   * Imports an encrypted wallet with a given password
   * @param {object} encryptedWalletCredential - A encrypted wallet credential JSON-LD object
   * @param {string} password - Wallet password
   * @return {Promise<DockWallet>} Returns itself
   */
  async import(encryptedWalletCredential, password) {
    if (this.contents.length) {
      throw new Error('Cannot import over existing wallet content.');
    }

    const keyPair = await passwordToKeypair(password);
    this.contents = await contentsFromEncryptedWalletCredential(
      encryptedWalletCredential,
      keyPair,
    );

    this.status = DockWallet.Unlocked;
    return this;
  }

  /**
   * Exports the wallet to an encrypted wallet credential JSON-LD object
   * @param {string} password - Wallet password
   * @param {Date} [issuanceDate] - Optional credential issuance date
   * @return {Promise<DockWallet>} Returns itself
   */
  async export(password, issuanceDate) {
    ensureWalletUnlocked(this);
    const keyPair = await passwordToKeypair(password);
    return exportContentsAsCredential(this.contents, keyPair, issuanceDate);
  }

  /**
   * Takes a Query and Type as input, and returns a collection of results based on current wallet contents.
   * A custom wallet implementation could override this method to support more querying types
   * @param {object} search - Search query object
   * @return {array<any>} List of contents results
   */
  query(search) {
    const { type, query } = search;

    // TODO: Implement and define params
  }

  async verify(credentialOrPresentation, options = {}) { // TODO: support presentations and pass domain, challenge etc in options

    // TODO: we need to construct a did resolver that can resolve did:keys internally? and/or external dids


    const result = await verifyCredential(credentialOrPresentation, {
      resolver: null,
      compactProof: true,
      forceRevocationCheck: false,
      // documentLoader: null,
      ...options,
    });

    console.log('result', result);
    return result;
  }

  /**
   * Takes a Verifiable Credential without a proof, and an options object to produce a Verifiable Credential.
   * @param {object} credential - Verifiable Credential without a proof
   * @param {object} options - Credential issuing options
   * @return {object} An unlocked wallet JSON-LD representation
   */
  async issue(credential, options) {
    // TODO: support more options? SDK doesnt seem to need whats in the spec
    const {
      controller,
    } = options;

    // Get keypair instance from controller if it exists in wallet
    const keyPairInstance = getKeypairFromController(this, controller);

    // Create keypair document and signer
    const keyDoc = keyPairInstance.toKeyPair(true);
    const signer = keyPairInstance.signer();

    // Set verification method
    if (options.verificationMethod) {
      keyDoc.id = options.verificationMethod;
    } else {
      const pkEncoded = keyDoc.controller.split(':')[2];
      keyDoc.id = `${keyDoc.controller}#${pkEncoded}`;
    }

    // SDK requires keypair property with sign method
    keyDoc.keypair = {
      sign: async function(data) { // SDK mutates sign so that it passes data not object, this hack fixes that
        return await this.signer.sign({data});
      }.bind({ signer })
    };

    // Assign credential date
    if (!credential.issuanceDate) {
      credential.issuanceDate = options.issuanceDate || new Date().toISOString();
    }

    // Sign the VC
    const signedVC = await issueCredential(keyDoc, credential);
    return signedVC;
  }

  prove() {
    // TODO: Implement and define params
  }

  transfer() {
    // TODO: Implement and define params
  }

  signRaw() {
    // TODO: Implement and define params, this method may not be needed
  }

  verifyRaw() {
    // TODO: Implement and define params, this method may not be needed
  }

  /**
   * Returns this wallet instance formatted as an unlocked universal wallet
   * The wallet must be unlocked to make this call
   * @return {object} An unlocked wallet JSON-LD representation
   */
  toJSON() {
    ensureWalletUnlocked(this);
    return {
      '@context': WALLET_DEFAULT_CONTEXT,
      id: this.id,
      type: WALLET_DEFAULT_TYPE,
      status: this.status,
      contents: this.contents,
    };
  }

  /**
   * Locked wallet status constant
   * @return {string} LOCKED
   */
  static get Locked() {
    return 'LOCKED';
  }

  /**
   * Unlocked wallet status constant
   * @return {string} UNLOCKED
   */
  static get Unlocked() {
    return 'UNLOCKED';
  }
}

export default DockWallet;
