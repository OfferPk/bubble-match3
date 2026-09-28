#!/usr/bin/env node
/** Copy web assets into www/ for Capacitor */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const www = path.join(root, 'www');

function rmrf(p) {
  if (!fs.existsSync(p)) return;
  for (const e of fs.readdirSync(p)) {
    const cur = path.join(p, e);
    if (fs.lstatSync(cur).isDirectory()) rmrf(cur);
    else fs.unlinkSync(cur);
  }
  fs.rmdirSync(p);
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const e of fs.readdirSync(src)) {
    const s = path.join(src, e);
    const d = path.join(dest, e);
    if (fs.lstatSync(s).isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

rmrf(www);
fs.mkdirSync(www, { recursive: true });

const files = [
  'index.html',
  'manifest.webmanifest',
  'sw.js',
  'css',
  'js',
  'icons'
];

for (const f of files) {
  const s = path.join(root, f);
  const d = path.join(www, f);
  if (!fs.existsSync(s)) continue;
  if (fs.lstatSync(s).isDirectory()) copyDir(s, d);
  else fs.copyFileSync(s, d);
}

console.log('Built www/ for Capacitor');
