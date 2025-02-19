import { pathExists, readFile, readJson, writeFile, writeJson } from '@ionic/utils-fs';
import { mergeWith, union } from 'lodash';
import { Logger } from './logger';

import { VFS, VFSRef, VFSFile, VFSStorable } from './vfs';

export class JsonFile extends VFSStorable {
  private json: Record<string, any> | null = null;

  constructor(private path: string, private vfs: VFS) {
    super();
  }

  getDocument() {
    return this.json;
  }

  async exists() {
    return pathExists(this.path);
  }

  async load() {
    if (this.vfs.isOpen(this.path)) {
      return;
    }

    if (await this.exists()) {
      this.json = await readJson(this.path);
    } else {
      this.json = {};
    }

    Logger.v('json', 'read', this.json);
    this.vfs.open(this.path, this, this.commitFn, this.diffFn);
  }

  async set(properties: any): Promise<void> {
    if (!this.json) {
      return;
    }

    const merged = mergeWith(this.json, properties, (objValue, srcValue) => {
      // Override the default merge behavior for arrays of objects that have the
      // same sub-key. Otherwise lodash merge doesn't work how we need it to
      if (Array.isArray(objValue)) {
        //if (replace) {
        return srcValue;
        //}

        /*
        const firstObjValue = objValue[0];
        const firstSrcValue = srcValue[0];

        // https://github.com/ionic-team/capacitor-configure/issues/32
        // When merging an array of dicts, like when modifying
        // CFBundleURLTypes, we don't want to union the two arrays because that
        // would result in duplicated array of dicts. Instead, we want to merge as-is.
        // This check makes sure we're not trying to union an array of dicts
        if (typeof firstObjValue !== 'object' && typeof firstSrcValue !== 'object') {
          return union(objValue, srcValue);
        }
        */
      } else if (typeof objValue === 'object' && objValue !== null) {
        //if (replace) {
        return srcValue;
        //}
      }
    });

    Object.assign(this.json, merged);
  }

  async merge(properties: any): Promise<void> {
    if (!this.json) {
      return;
    }

    const merged = mergeWith(this.json, properties, (objValue, srcValue) => {
      if (Array.isArray(objValue)) {
        return union(objValue, srcValue);
      }
    });

    Object.assign(this.json, merged);
  }

  private commitFn = async (file: VFSFile) => {
    return writeJson(file.getFilename(), (file.getData() as JsonFile | null)?.getDocument(), {
      spaces: 2
    });
  };

  private diffFn = async (file: VFSFile) => {
    const oldJson = await readFile(file.getFilename(), { encoding: 'utf-8' });
    const newJson = JSON.stringify((file.getData() as JsonFile | null)?.getDocument(), null, 2);

    return {
      old: oldJson,
      new: newJson
    }
  }
}
