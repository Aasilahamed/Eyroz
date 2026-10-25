import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const electron = require('electron');
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

spawn(electron, ['.'], { stdio: 'inherit', env }).on('exit', code => process.exitCode = code ?? 1);
