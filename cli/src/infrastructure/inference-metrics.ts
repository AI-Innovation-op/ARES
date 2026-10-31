import fs from 'node:fs';
import path from 'node:path';
import { openDatabase } from './native-sqlite.js';
import type {
  InferenceMeasurement,
  MeasurementStore,
} from '../inference/application/measure-model.js';

/** Separate private store: no changes to conversation schema, no prompts or source content. */
export class InferenceMetrics implements MeasurementStore {
  constructor(private readonly home: string) {}
  private open() {
    fs.mkdirSync(this.home, { recursive: true, mode: 0o700 });
    const file = path.join(this.home, 'inference-metrics.db');
    const db = openDatabase(file);
    fs.chmodSync(file, 0o600);
    db.exec(
      'PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS measurements (id INTEGER PRIMARY KEY, at TEXT NOT NULL, data TEXT NOT NULL);',
    );
    return db;
  }
  save(measurement: InferenceMeasurement) {
    const db = this.open();
    try {
      db.prepare('INSERT INTO measurements(at,data) VALUES (?,?)').run(
        measurement.at,
        JSON.stringify(measurement),
      );
    } finally {
      db.close();
    }
  }
  list(limit = 50): readonly InferenceMeasurement[] {
    const db = this.open();
    try {
      return db
        .prepare('SELECT data FROM measurements ORDER BY id DESC LIMIT ?')
        .all(limit)
        .map((row) => JSON.parse(String(row.data)));
    } finally {
      db.close();
    }
  }
}
