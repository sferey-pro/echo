import { db } from '../src/server/lib/db';
const res = db.query(`SELECT id, name, is_mocked, status_code, payload FROM mock_variants WHERE request_id = (SELECT id FROM requests WHERE name = 'Delete User')`).all();
console.log(JSON.stringify(res, null, 2));
