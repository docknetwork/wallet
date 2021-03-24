import {
  contentsFromEncryptedWalletCredential,
  exportContentsAsCredential,
  lockWalletContents,
  unlockWalletContents,
} from './methods/contents';

import { passwordToKeypair } from './methods/password';

import {
  WALLET_DEFAULT_CONTEXT,
  WALLET_DEFAULT_TYPE,
  WALLET_DEFAULT_ID,
} from './constants';

function ensureValidContent(content) {
  if (!content.id) {
    throw new Error('Content object requires an ID property');
  }
}

function ensureWalletUnlocked(wallet) {
  if (wallet.status === 'LOCKED') {
    throw new Error('Wallet is locked!');
  }
}

/** Library class is defined here */
class DockWallet {
  /**
   * Creates a new unlocked wallet instance with empty contents
   * @constructor
   */
  constructor(id) {
    this.id = id || WALLET_DEFAULT_ID;
    this.contents = [];
    this.status = DockWallet.Unlocked;
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
    this.contents = this.contents.filter(i => i.id !== contentId);
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

  signRaw() {
    // TODO: Implement and define params
  }

  verifyRaw() {
    // TODO: Implement and define params
  }

  verify() {
    // TODO: Implement and define params
  }

  issue() {
    // TODO: Implement and define params
  }

  prove() {
    // TODO: Implement and define params
  }

  transfer() {
    // TODO: Implement and define params
  }

  query() {
    // TODO: Implement and define params
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