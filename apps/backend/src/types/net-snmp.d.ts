declare module 'net-snmp' {
  import { EventEmitter } from 'events';

  export interface Varbind {
    oid: string;
    type: number;
    value: Buffer | number | string;
  }

  export interface SnmpTable {
    [rowIndex: string]: {
      [columnIndex: string]: Buffer | number | string;
    };
  }

  export interface SessionOptions {
    port?: number;
    retries?: number;
    timeout?: number;
    version?: number;
  }

  export class Session extends EventEmitter {
    close(): void;
    get(
      oids: string[],
      callback: (error: Error | null, varbinds: Varbind[]) => void,
    ): void;
    table(
      oid: string,
      maxRepetitions: number,
      callback: (error: Error | null, table: SnmpTable) => void,
    ): void;
    table(
      oid: string,
      callback: (error: Error | null, table: SnmpTable) => void,
    ): void;
  }

  export function createSession(
    target: string,
    community: string,
    options?: SessionOptions,
  ): Session;

  export function isVarbindError(varbind: Varbind): boolean;
  export function varbindError(varbind: Varbind): string;

  export const Version1: number;
  export const Version2c: number;
}
