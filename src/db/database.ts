

import Database from 'better-sqlite3';
import path from "node:path"
import fs from "node:fs"

const DB_PATH = process.env.TESTEXPENSE_DB_PAHT || path.join(process.cwd(), "data", "textexpense.db")

const dbDir = path.dirname(DB_PATH);
if(!fs.existsSync(dbDir)){
    fs.mkdirSync(dbDir,{recursive:true})
}