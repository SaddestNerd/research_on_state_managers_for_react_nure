"""Summary of a measurement series next to the values reported in the paper.

    python compare.py <tag> [output.md]        e.g. python compare.py q1

Reads bench/results-<tag>-*/summary.json (written by analyze.js) and writes a
Markdown report (default: bench/comparison-<tag>.md).
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TAG = sys.argv[1] if len(sys.argv) > 1 else 'q1'
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, f'comparison-{TAG}.md')

APPS = [('redux', 'Redux'), ('zustand', 'Zustand'), ('context', 'Context'),
        ('mobx', 'MobX'), ('xstate', 'XState'), ('zustand-mobx', 'Zustand+MobX')]

# Values of the submitted paper (Tables 1-5 and 8-12).
PAPER = {
    'Время обновления, mean (мс), Табл. 1/8': {'redux': 0.47, 'zustand': 0.28, 'context': 0.95, 'mobx': 0.33, 'xstate': 0.55, 'zustand-mobx': 0.27},
    'Ре-рендеры на add-to-cart, Табл. 2/9': {'redux': 3.2, 'zustand': 2.1, 'context': 8.7, 'mobx': 1.8, 'xstate': 3.2, 'zustand-mobx': 1.8},
    'Ре-рендеры, mass refresh 1000, Табл. 2/9': {'redux': 450, 'zustand': 220, 'context': 980, 'mobx': 8, 'xstate': 45, 'zustand-mobx': 9},
    'Heap, стандартная сессия, среднее (МБ), Табл. 3/10': {'redux': 45, 'zustand': 42, 'context': 48, 'mobx': 40, 'xstate': 43, 'zustand-mobx': 42},
    'Рост heap, 5 мин (МБ/мин), Табл. 3/10': {'redux': 0.30, 'zustand': 0.20, 'context': 0.55, 'mobx': 0.25, 'xstate': 0.28, 'zustand-mobx': 0.28},
    'Throughput (действий/с), Табл. 4/11': {'redux': 20000, 'zustand': 30050, 'context': 8500, 'mobx': 26320, 'xstate': 16000, 'zustand-mobx': 29400},
    'Rollback (мс), Табл. 5/12': {'redux': 2.4, 'zustand': 1.6, 'context': 8.0, 'mobx': 2.7, 'xstate': 6.0, 'zustand-mobx': 1.5},
}

FAST = [
    ('add.sync', 'Добавление: длительность действия в хранилище, мс'),
    ('add.dom', 'Добавление: действие → обновление DOM, мс'),
    ('add.domP95', 'Добавление: действие → DOM, p95, мс'),
    ('add.renders', 'Добавление товара не из каталога: ре-рендеров на действие'),
    ('add.cards', '… из них карточек товаров'),
    ('vis.dom', 'Добавление товара из каталога: действие → DOM, мс'),
    ('vis.renders', 'Добавление товара из каталога: ре-рендеров на действие'),
    ('vis.cards', '… из них карточек товаров'),
    ('mass.sync', 'Массовое обновление 1000 (подряд): выполнение действий, мс'),
    ('mass.dom', 'Массовое обновление 1000 (подряд): до DOM, мс'),
    ('mass.renders', 'Массовое обновление 1000 (подряд): ре-рендеров'),
    ('massY.ms', 'Массовое обновление 1000 (с уступкой циклу событий): время, мс'),
    ('massY.renders', 'Массовое обновление 1000 (с уступкой): ре-рендеров'),
    ('massV.ms', 'Массовое обновление товаров каталога 1000: время, мс'),
    ('massV.renders', 'Массовое обновление товаров каталога: ре-рендеров'),
    ('massV.cards', '… из них карточек товаров'),
    ('thr.sync', 'Throughput 10 000: хранилище, действий/с'),
    ('thr.dom', 'Throughput 10 000: до DOM, действий/с'),
    ('rb.sync', 'Rollback: выполнение, мс'),
    ('rb.applied', 'Rollback: до наблюдаемого состояния, мс'),
]
MEM = [
    ('heap.mean', 'Heap, среднее за сессию, МБ'),
    ('heap.peak', 'Heap, пик, МБ'),
    ('heap.slope', 'Тренд heap, МБ/мин'),
    ('heap.precise', 'Память после GC (measureUserAgentSpecificMemory), МБ'),
]


def fmt(v):
    if v is None:
        return '—'
    a = abs(v)
    if a >= 1000:
        return f'{v:,.0f}'.replace(',', ' ')
    if a >= 100:
        return f'{v:.1f}'
    if a >= 1:
        return f'{v:.2f}'
    return f'{v:.3f}'


def load(cond):
    p = os.path.join(HERE, f'results-{TAG}-{cond}', 'summary.json')
    if not os.path.exists(p):
        return None
    return json.load(open(p, encoding='utf-8'))


def table(md, title, summary, mode, defs):
    md.append(f'\n### {title}\n')
    md.append('| Показатель | ' + ' | '.join(l for _, l in APPS) + ' |')
    md.append('|---|' + '---:|' * len(APPS))
    mo = (summary or {}).get('modes', {}).get(mode, {})
    for key, label in defs:
        m = mo.get(key)
        if not m:
            continue
        cells = []
        best = m['ranking'][0] if m.get('ranking') else None
        for app, _ in APPS:
            s = m['stats'].get(app) or {}
            v = fmt(s.get('median')) if s.get('n') else '—'
            cells.append(f'**{v}**' if app == best else v)
        md.append(f'| {label} | ' + ' | '.join(cells) + ' |')


CONDS = [
    ('base', 'Базовые условия (CPU 1×, каталог 10)', 'fast'),
    ('cpu4', 'CPU замедлен в 4 раза, каталог 10', 'fast'),
    ('cat100', 'Каталог 100 товаров', 'fast'),
    ('cat1000', 'Каталог 1000 товаров', 'fast'),
    ('cpu4-cat100', 'CPU 4× и каталог 100', 'fast'),
]

md = [f'# Результаты замеров `{TAG}` и сравнение со статьёй\n']
first = None
for cond, _, _ in CONDS + [('base-mem', '', '')]:
    first = first or load(cond)
if first:
    e = first['environment']
    n = first['runs']
    md.append(f'Среда: {e["userAgent"]}; ядер: {e["hardwareConcurrency"]}; cross-origin isolation: {"да" if e["crossOriginIsolated"] else "нет"}.')
md.append('\nЖирным выделено лучшее значение в строке. Значения — медиана по прогонам (при одном прогоне — значение этого прогона).')

md.append('\n## Значения из поданной статьи\n')
md.append('| Показатель | ' + ' | '.join(l for _, l in APPS) + ' |')
md.append('|---|' + '---:|' * len(APPS))
for label, vals in PAPER.items():
    md.append(f'| {label} | ' + ' | '.join(fmt(vals[a]) for a, _ in APPS) + ' |')

md.append('\n## Новые замеры\n')
for cond, title, mode in CONDS:
    s = load(cond)
    if not s:
        md.append(f'\n### {title}\n\nНет данных (results-{TAG}-{cond}).')
        continue
    e = s['environment']
    runs = s['runs'].get(mode, {})
    title2 = f'{title} — прогонов на версию: {max(runs.values()) if runs else 0}; калибровочный цикл: {fmt(e.get("calibrationMsMedian"))} мс; карточек на странице: {e.get("catalogCards")}'
    table(md, title2, s, mode, FAST)
s = load('base-mem')
if s:
    table(md, 'Память: стандартная сессия 60 с (действие каждые 500 мс)', s, 'mem60', MEM)
    table(md, 'Память: длительная нагрузка 300 с (действие каждые 50 мс)', s, 'mem300', MEM)
s = load('cat100')
if s and s['modes'].get('mem60'):
    table(md, 'Память при каталоге 100 товаров, 60 с', s, 'mem60', MEM)

open(OUT, 'w', encoding='utf-8').write('\n'.join(md) + '\n')
print('written', OUT)
