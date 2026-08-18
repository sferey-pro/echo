import { Database } from "bun:sqlite";
const db = new Database(".echo-state.sqlite");
try { db.exec("ALTER TABLE scenarios ADD COLUMN description TEXT;"); } catch(e) {}
try { db.exec("ALTER TABLE scenarios ADD COLUMN icon TEXT;"); } catch(e) {}
console.log("Migration done");
