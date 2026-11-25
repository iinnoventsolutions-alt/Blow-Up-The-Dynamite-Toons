import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const metadataPath = path.join(root, 'src/build-info.json');
const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
const args = process.argv.slice(2);
const semverPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
let build;
let version;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--version') {
    if (version !== undefined || i + 1 >= args.length) throw new Error('Usage: npm run set-build -- [MMDDYYYY.HH24MI] [--version X.Y.Z]');
    version = args[++i];
  } else if (!build && /^\d{8}\.\d{4}$/.test(args[i])) {
    build = args[i];
  } else {
    throw new Error('Usage: npm run set-build -- [MMDDYYYY.HH24MI] [--version X.Y.Z]');
  }
}
function normalizeVersion(value) {
  if (Number.isInteger(value) && value >= 0) return String(value) + '.0.0';
  if (typeof value === 'string' && semverPattern.test(value)) return value;
  throw new Error('Version must be a semantic version X.Y.Z.');
}
function compareVersions(current, proposed) {
  const a = current.split('.').map(Number), b = proposed.split('.').map(Number);
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i] ? 1 : -1;
  return 0;
}
if (!build) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: metadata.buildTimezone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(new Date()).map(p => [p.type, p.value]));
  build = parts.month + parts.day + parts.year + '.' + parts.hour + parts.minute;
}
const month = Number(build.slice(0, 2)), day = Number(build.slice(2, 4)), year = Number(build.slice(4, 8));
const hour = Number(build.slice(9, 11)), minute = Number(build.slice(11, 13));
const date = new Date(Date.UTC(year, month - 1, day));
if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day || hour > 23 || minute > 59) {
  throw new Error('Build must contain a valid calendar date and 24-hour time.');
}
const currentVersion = normalizeVersion(metadata.version);
const nextVersion = version === undefined ? currentVersion : normalizeVersion(version);
if (compareVersions(currentVersion, nextVersion) > 0) throw new Error('Version cannot go backwards.');
metadata.version = nextVersion;
metadata.build = build;
const packagePath = path.join(root, 'package.json');
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
pkg.version = nextVersion;
pkg.issb = {version: nextVersion, build, buildFormat: metadata.buildFormat, buildTimezone: metadata.buildTimezone};
const lockPath = path.join(root, 'package-lock.json');
const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
lock.version = nextVersion;
lock.packages[''].version = nextVersion;
fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2) + '\n');
fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n');
fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n');
console.log(metadata.name + ': Version ' + nextVersion + ', Build ' + build);
