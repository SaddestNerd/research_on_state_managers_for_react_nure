#!/usr/bin/env python3
"""Adds the benchmark harness to one version of the test application.
Usage: apply_bench.py <app dir> <kind> <dir with benchCore.js and adapters/>
kind: zustand | zustand-mobx | redux | mobX | useContext | xState"""
import sys, os, shutil
app, kind, src = sys.argv[1:4]
os.makedirs(os.path.join(app, 'src', 'bench'), exist_ok=True)
shutil.copyfile(os.path.join(src, 'shared', 'benchCore.js'), os.path.join(app, 'src', 'bench', 'benchCore.js'))
shutil.copyfile(os.path.join(src, 'adapters', kind + '.js'), os.path.join(app, 'src', 'bench', 'adapter.js'))
def edit(rel, fn):
    p = os.path.join(app, 'src', rel)
    raw = open(p, 'rb').read().decode('utf-8')
    nl = '\r\n' if '\r\n' in raw else '\n'
    lines = raw.split(nl)
    if any('bench/' in l for l in lines):
        print('already patched', rel); return
    lines = fn(lines)
    open(p, 'wb').write(nl.join(lines).encode('utf-8'))
    print('patched', rel)
def index(lines):
    extra = ["import './bench/benchCore'"]
    if kind in ('zustand', 'zustand-mobx', 'redux'):
        extra.append("import './bench/adapter'")
    return extra + lines
edit('index.js', index)
if kind == 'mobX':
    def app_js(lines):
        out = ["import { registerBenchStores } from './bench/adapter'"]
        done = False
        for l in lines:
            out.append(l)
            if l.strip() == 'const rootStore = new RootStore()':
                out.append('registerBenchStores(rootStore)'); done = True
        assert done; return out
    edit('App.js', app_js)
if kind in ('useContext', 'xState'):
    def app_js(lines):
        out = ["import { BenchBridge } from './bench/adapter'"]
        done = False
        for l in lines:
            out.append(l)
            if l.strip() == '<CartProvider>':
                out.append(l.replace('<CartProvider>', '\t<BenchBridge />')); done = True
        assert done; return out
    edit('App.js', app_js)
