import { EdvClient } from 'edv-client';
import StorageInterface from './storage-interface';

/** EDV HTTP client storage implementation */
class EDVHTTPStorageInterface extends StorageInterface {
  constructor({ url, keys }) {
    super();
    this.serverUrl = url;
    this.keys = keys;
    if (!keys || !keys.keyAgreementKey || !keys.hmac) {
      throw new Error('EDVHTTPStorageInterface requires keys object with keyAgreementKey and hmac');
    }
  }

  get(documentId) {
    // ?
  }

  connectTo(id) {
    if (this.client) {
      throw new Error(`Already connected`);
    }

    const { keyAgreementKey, hmac } = this.keys;
    this.client = new EdvClient({id, keyAgreementKey, hmac});

    // TODO: do we need to set this.client.keyResolver:?
  }

  async getConfig(id) {
    const remoteConfig = await EdvClient.getConfig({
      url: `${this.serverUrl}/edvs`,
      id,
    });
    return remoteConfig;
  }

  async findConfigFor(controller, referenceId = 'primary') {
    try {
      const remoteConfig = await EdvClient.findConfig({
        url: `${this.serverUrl}/edvs`,
        controller,
        referenceId,
      });
      return remoteConfig;
    } catch (e) {
      return null;
    }
  }

  /*
  * Creates an EDV and returns its ID
  */
  async createEdv({ controller, referenceId = 'primary' }) {
    const { keyAgreementKey, hmac } = this.keys;
    const config = {
      // on init the sequence must be 0 and is required
      sequence: 0,
      controller,
      referenceId,
      keyAgreementKey: {id: keyAgreementKey.id, type: keyAgreementKey.type},
      hmac: {id: hmac.id, type: hmac.type}
    };

    // sends a POST request to the remote service to create an EDV
    try {
      const { id } = await EdvClient.createEdv({
        url: `${this.serverUrl}/edvs`,
        config,
      });

      return id;
    } catch (e) {
      // TODO: better error parsing
      throw e;
    }
  }
}

export default EDVHTTPStorageInterface;
