import { parse } from 'yaml';
import * as fs from 'fs';
const content = fs.readFileSync('/home/sferey/projects/echo/app_build/collection/samples-bruno/01-Users/Delete User.yml', 'utf8');
const parsed = parse(content);
console.log('204 body.data:', typeof parsed.examples[1].response.body.data, JSON.stringify(parsed.examples[1].response.body.data));
