// Builds the Xbox-family Cryptic Realm MSIX: a hosted web app whose start page
// is the live game. Unlike the desktop package (build_tauri_msix.mjs, a
// full-trust win32 exe that cannot run on a console), a hosted web app is a
// plain UWP payload that installs on retail Xbox when submitted to the same
// Store product with a Windows.Xbox target, and sideloads via Dev Mode for
// testing. The client's gamepad stack (src/game/gamepad*.ts) plus the Xbox
// fullscreen shim (src/game/xbox_env.ts) make the page fully pad-playable.
//
// Usage: node scripts/build_xbox_msix.mjs
// Output: release/xbox-store/CrypticRealm_<version>_neutral.msix

import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const workspace = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const releaseRoot = resolve(workspace, 'release', 'xbox-store');
const stageRoot = resolve(releaseRoot, 'stage');
const inspectionRoot = resolve(releaseRoot, 'inspect');
const appConfigPath = resolve(workspace, 'src-tauri', 'tauri.conf.json');
const iconRoot = resolve(workspace, 'src-tauri', 'icons');
const sdkRoot = 'C:\\Program Files (x86)\\Windows Kits\\10\\bin\\10.0.22621.0\\x64';
const makeAppx = process.env.MAKEAPPX_PATH ?? resolve(sdkRoot, 'makeappx.exe');
const makePri = process.env.MAKEPRI_PATH ?? resolve(sdkRoot, 'makepri.exe');

// Must match build_tauri_msix.mjs exactly: both packages upload to the ONE
// Partner Center product; the Store serves desktops the win32 package and
// consoles this one.
const STORE_IDENTITY = {
  name: 'MOVEWEIGHT.CrypticRealm',
  publisher: 'CN=6375D74B-5E4F-45B4-B246-B29507C1332A',
  publisherDisplayName: 'MOVE WEIGHT',
};

const START_PAGE = process.env.CR_XBOX_START_PAGE ?? 'https://crypticrealm.com/';
const CONTENT_HOSTS = ['https://crypticrealm.com/', 'https://worldofclaudecraft.com/'];

function run(command, args) {
  const result = spawnSync(command, args, { cwd: workspace, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} failed with exit code ${String(result.status)}`);
  }
}

function assertReleasePath(path) {
  const prefix = `${releaseRoot}${sep}`;
  if (!path.startsWith(prefix)) throw new Error(`Refusing to write outside ${releaseRoot}`);
}

function resetDirectory(path) {
  assertReleasePath(path);
  rmSync(path, { recursive: true, force: true });
  mkdirSync(path, { recursive: true });
}

function toAppxVersion(value) {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(value);
  if (!match) throw new Error(`Cannot convert ${value} to an MSIX version`);
  const parts = match.slice(1).map(Number);
  if (parts.some((part) => !Number.isInteger(part) || part < 0 || part > 65535)) {
    throw new Error(`MSIX version parts must be integers from 0 to 65535: ${value}`);
  }
  // Revision .1 keeps the version distinct from the desktop package's .0 so
  // both can live in one Store submission.
  return `${parts[0]}.${parts[1]}.${parts[2]}.1`;
}

function copyIcon(source, output) {
  const input = resolve(iconRoot, source);
  if (!existsSync(input)) throw new Error(`Missing icon: ${input}`);
  copyFileSync(input, resolve(stageRoot, 'Assets', output));
}

const config = JSON.parse(readFileSync(appConfigPath, 'utf8'));
const packageVersion = toAppxVersion(config.version);
const outputPath = resolve(releaseRoot, `CrypticRealm_${packageVersion}_neutral.msix`);
assertReleasePath(outputPath);

for (const tool of [makeAppx, makePri]) {
  if (!existsSync(tool)) throw new Error(`Windows SDK packaging tool not found: ${tool}`);
}

mkdirSync(releaseRoot, { recursive: true });
resetDirectory(stageRoot);
resetDirectory(inspectionRoot);
mkdirSync(resolve(stageRoot, 'Assets'), { recursive: true });

copyIcon('StoreLogo.png', 'StoreLogo.png');
copyIcon('Square44x44Logo.png', 'Square44x44Logo.png');
copyIcon('Square150x150Logo.png', 'Square150x150Logo.png');
copyIcon('Square310x310Logo.png', 'Square310x310Logo.png');
copyFileSync(
  resolve(stageRoot, 'Assets', 'Square44x44Logo.png'),
  resolve(stageRoot, 'Assets', 'Square44x44Logo.targetsize-44_altform-unplated.png'),
);

const contentRules = CONTENT_HOSTS.map(
  (host) => `      <uap:Rule Type="include" Match="${host}*" WindowsRuntimeAccess="none" />`,
).join('\n');

const manifest = `<?xml version="1.0" encoding="utf-8"?>
<Package
  xmlns="http://schemas.microsoft.com/appx/manifest/foundation/windows10"
  xmlns:uap="http://schemas.microsoft.com/appx/manifest/uap/windows10"
  IgnorableNamespaces="uap">
  <Identity
    Name="${STORE_IDENTITY.name}"
    Publisher="${STORE_IDENTITY.publisher}"
    Version="${packageVersion}"
    ProcessorArchitecture="neutral" />
  <Properties>
    <DisplayName>Cryptic Realm</DisplayName>
    <PublisherDisplayName>${STORE_IDENTITY.publisherDisplayName}</PublisherDisplayName>
    <Description>A dark-fantasy online action RPG.</Description>
    <Logo>Assets\\StoreLogo.png</Logo>
  </Properties>
  <Resources>
    <Resource Language="en-us" />
  </Resources>
  <Dependencies>
    <TargetDeviceFamily Name="Windows.Xbox" MinVersion="10.0.19041.0" MaxVersionTested="10.0.26200.0" />
    <TargetDeviceFamily Name="Windows.Universal" MinVersion="10.0.19041.0" MaxVersionTested="10.0.26200.0" />
  </Dependencies>
  <Capabilities>
    <Capability Name="internetClient" />
  </Capabilities>
  <Applications>
    <Application Id="App" StartPage="${START_PAGE}">
      <uap:VisualElements
        DisplayName="Cryptic Realm"
        Description="A dark-fantasy online action RPG."
        Square150x150Logo="Assets\\Square150x150Logo.png"
        Square44x44Logo="Assets\\Square44x44Logo.png"
        BackgroundColor="transparent">
        <uap:DefaultTile Wide310x150Logo="Assets\\Square310x310Logo.png" Square310x310Logo="Assets\\Square310x310Logo.png" />
      </uap:VisualElements>
      <uap:ApplicationContentUriRules>
${contentRules}
      </uap:ApplicationContentUriRules>
    </Application>
  </Applications>
</Package>
`;
writeFileSync(resolve(stageRoot, 'AppxManifest.xml'), manifest, 'utf8');

const priConfigPath = resolve(stageRoot, 'priconfig.xml');
run(makePri, ['createconfig', '/cf', priConfigPath, '/dq', 'en-US', '/o']);
run(makePri, ['new', '/pr', stageRoot, '/cf', priConfigPath, '/of', resolve(stageRoot, 'resources.pri'), '/o']);
rmSync(priConfigPath, { force: true });

rmSync(outputPath, { force: true });
run(makeAppx, ['pack', '/o', '/h', 'SHA256', '/d', stageRoot, '/p', outputPath]);
run(makeAppx, ['unpack', '/o', '/p', outputPath, '/d', inspectionRoot]);

const packagedManifest = readFileSync(resolve(inspectionRoot, 'AppxManifest.xml'), 'utf8');
for (const expected of [
  STORE_IDENTITY.name,
  STORE_IDENTITY.publisher,
  packageVersion,
  'Windows.Xbox',
  `StartPage="${START_PAGE}"`,
]) {
  if (!packagedManifest.includes(expected)) {
    throw new Error(`Packaged manifest is missing: ${expected}`);
  }
}

console.log(`\nXbox MSIX ready: ${outputPath}`);
console.log('Sideload test: Xbox Dev Mode -> Dev Home -> Add (or Device Portal upload).');
console.log('Store: upload to the SAME Cryptic Realm product as the desktop MSIX;');
console.log('Partner Center serves this package to the Xbox device family.');
