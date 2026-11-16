"""Copies the shared catalog components into every version of the application.

    python install_catalog.py

For every version: bench/shared/catalog/CatalogViews.jsx -> <app>/src/pages/catalog/
and bench/shared/catalog/bindings/<binding>.js -> <app>/src/pages/catalog/bindings.js;
<app>/src/pages/DashboardPage.jsx becomes a re-export of the shared page.
"""
import os
import shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHARED = os.path.join(ROOT, 'bench', 'shared', 'catalog')
VERSIONS = {
    'redux': 'redux',
    'zustand': 'zustand',
    'useContext': 'context',
    'mobX': 'mobx',
    'xState': 'xstate',
    'zustand-mobx': 'zustand-mobx',
}
PAGE = (
    "// The dashboard is built from the shared catalog components\n"
    "// (pages/catalog/CatalogViews.jsx, identical in every version); the\n"
    "// connection to the state manager is in pages/catalog/bindings.js.\n"
    "export { DashboardPage as default } from './catalog/CatalogViews'\n"
)

for app, binding in VERSIONS.items():
    dst = os.path.join(ROOT, app, 'src', 'pages', 'catalog')
    os.makedirs(dst, exist_ok=True)
    shutil.copyfile(os.path.join(SHARED, 'CatalogViews.jsx'), os.path.join(dst, 'CatalogViews.jsx'))
    shutil.copyfile(os.path.join(SHARED, 'bindings', binding + '.js'), os.path.join(dst, 'bindings.js'))
    with open(os.path.join(ROOT, app, 'src', 'pages', 'DashboardPage.jsx'), 'w', encoding='utf-8') as f:
        f.write(PAGE)
    print('installed', app, '<-', binding)
