import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const metadataPath = path.join(root, 'src/build-info.json');
const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
const args = process.argv.slice(2); let build, major;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--version') major = Number(args[++i]);
  else if (!build && /^\d{8}\.\d{4}$/.test(args[i])) build = args[i];
  else throw new Error('Usage: npm run set-build -- [MMDDYYYY.HH24MI] [--version MAJOR]');
}
if (!build) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: metadata.buildTimezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()).map(p => [p.type, p.value]));
  build = `${parts.month}${parts.day}${parts.year}.${parts.hour}${parts.minute}`;
}
const month = Number(build.slice(0, 2)), day = Number(build.slice(2, 4)), year = Number(build.slice(4, 8)), hour = Number(build.slice(9, 11)), minute = Number(build.slice(11, 13));
const date = new Date(Date.UTC(year, month - 1, day));
if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day || hour > 23 || minute > 59) throw new Error('Build must contain a valid calendar date and 24-hour time.');
if (major !== undefined && (!Number.isInteger(major) || major < 1 || major < metadata.version)) throw new Error('Major version must be a positive integer and cannot go backwards.');
metadata.build = build; if (major !== undefined) metadata.version = major;
const packagePath = path.join(root, 'package.json'), pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
pkg.version = `${metadata.version}.0.0`; pkg.issb = { version: metadata.version, build, buildFormat: metadata.buildFormat, buildTimezone: metadata.buildTimezone };
const lockPath = path.join(root, 'package-lock.json'), lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
lock.version = pkg.version; lock.packages[''].version = pkg.version;
fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2) + '\n'); fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n'); fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n');
console.log(`${metadata.name}: Version ${metadata.version}, Build ${build}`);
