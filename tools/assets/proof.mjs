import {execFileSync} from 'node:child_process';
// Procedural 3D is the active character pipeline; legacy PNG loading is no longer the proof.
execFileSync(process.execPath,['node_modules/vitest/vitest.mjs','run','tests/unit/characters-camera.test.ts','tests/unit/geometry.test.ts'],{stdio:'inherit'});
console.log('Geometry proof: seven rigs, clips, sockets, map objects and inventory models verified without external assets.');
