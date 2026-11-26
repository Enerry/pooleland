#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把 inbox 里的纯 Markdown 笔记整理成 Hexo 文章。两步：preview 预览，commit 落盘。"""

import argparse
import datetime as dt
import re
import shutil
import subprocess
import sys
from pathlib import Path


def read_text(path: Path) -> str:
    return path.read_text(encoding='utf-8-sig')


def parse_list(raw: str):
    raw = (raw or '').strip()
    if raw.startswith('[') and raw.endswith(']'):
        raw = raw[1:-1]
    return [item.strip() for item in raw.split(',') if item.strip()]


def format_list(items) -> str:
    return '[' + ', '.join(items) + ']'


def make_slug(stem: str) -> str:
    """用笔记文件名作为 Hexo 文章的 slug（网址的一部分）。"""
    slug = re.sub(r'[^\w\u4e00-\u9fff-]', '-', stem, flags=re.UNICODE)
    slug = re.sub(r'-+', '-', slug).strip('-')
    return slug or 'post'


def split_front_matter(text: str):
    if not text.startswith('---'):
        return {}, text
    lines = text.splitlines()
    if len(lines) < 3 or lines[0].strip() != '---':
        return {}, text
    end = None
    for i in range(1, len(lines)):
        if lines[i].strip() == '---':
            end = i
            break
    if end is None:
        return {}, text
    meta = {}
    for line in lines[1:end]:
        if ':' in line:
            key, value = line.split(':', 1)
            meta[key.strip()] = value.strip()
    return meta, '\n'.join(lines[end + 1:]).strip() + '\n'


def parse_tags(meta: dict, body: str):
    tags = parse_list(meta.get('tags', ''))
    if not tags:
        tags = re.findall(r'(?<![\w/])#([^\s#`]+)', body)
        tags = [t for t in tags if not t.isdigit()]
    seen, result = set(), []
    for t in tags:
        if t not in seen:
            seen.add(t)
            result.append(t)
    return result


def guess_title(meta: dict, body: str, fallback: str):
    if meta.get('title'):
        return meta['title'].strip(' "\'')
    for line in body.splitlines():
        line = line.strip()
        if line.startswith('# '):
            return line[2:].strip()
        if line and not line.startswith(('#', '!', '-', '*', '>')):
            return re.sub(r'[*_`]', '', line)[:60]
    return fallback


def find_images(body: str, inbox: Path):
    images = []
    for match in re.finditer(r'!\[[^\]]*\]\(([^)]+)\)', body):
        raw = match.group(1).strip().split('"')[0].strip()
        if re.match(r'^(https?:|data:|/)', raw):
            continue
        src = inbox / raw
        if src.is_file():
            images.append((raw, src))
    return images


def build_plan(note: Path, root: Path):
    text = read_text(note)
    meta, body = split_front_matter(text)
    now = dt.datetime.now()
    date_raw = meta.get('date')
    try:
        date = dt.datetime.fromisoformat(date_raw) if date_raw else now
    except ValueError:
        date = now
    title = guess_title(meta, body, note.stem)
    lines = body.splitlines()
    if lines and lines[0].strip().startswith('# ') and lines[0].strip()[2:].strip() == title:
        body = '\n'.join(lines[1:]).strip() + '\n'
    tags = parse_tags(meta, body)
    categories = parse_list(meta.get('categories', ''))
    description = meta.get('description', meta.get('discription', '')).strip()
    target = root / 'source' / '_posts' / (make_slug(note.stem) + '.md')
    month = date.strftime('%Y%m')
    image_dir = root / 'source' / 'images' / 'article' / month
    images = find_images(body, note.parent)
    image_plan = [(raw, src, image_dir / src.name) for raw, src in images]

    front = [
        '---',
        'title: ' + title,
        'date: ' + date.strftime('%Y-%m-%d %H:%M:%S'),
        'tags: ' + format_list(tags),
    ]
    if categories or 'categories' in meta:
        front.append('categories: ' + format_list(categories))
    if description or 'description' in meta or 'discription' in meta:
        front.append('description: ' + description)
    front.append('updated: ' + now.strftime('%Y-%m-%d %H:%M:%S'))

    handled = {'title', 'date', 'tags', 'updated', 'categories', 'description', 'discription'}
    for key, value in meta.items():
        if key.startswith('#') or key in handled:
            continue
        value = value.strip()
        if value:
            front.append(key + ': ' + value)
    front += ['---', '']

    new_body = body
    for raw, src, dst in image_plan:
        new_body = new_body.replace(raw, '/images/article/' + month + '/' + src.name)
    return {
        'note': note, 'title': title, 'tags': tags, 'categories': categories,
        'description': description, 'date': date,
        'target': target, 'content': '\n'.join(front) + new_body, 'images': image_plan,
    }


def show(plan):
    print('  来源：' + str(plan['note']))
    print('  标题：' + plan['title'])
    print('  标签：' + (', '.join(plan['tags']) if plan['tags'] else '（无）'))
    print('  分类：' + (', '.join(plan['categories']) if plan['categories'] else '（无）'))
    print('  描述：' + (plan['description'] if plan['description'] else '（无）'))
    print('  目标：' + str(plan['target']))
    for raw, src, dst in plan['images']:
        print('  图片：' + raw + '  ->  ' + str(dst))
    print('  生成的前置信息：')
    for line in plan['content'].splitlines()[:6]:
        print('    ' + line)


def main():
    parser = argparse.ArgumentParser(description='把 inbox 笔记整理成 Hexo 文章（两步确认）')
    parser.add_argument('action', choices=['preview', 'commit'], help='preview=只看不写；commit=实际写入')
    parser.add_argument('--root', default=r'D:\pooleland', help='博客根目录')
    parser.add_argument('--file', help='只处理 inbox 下指定的文件名')
    parser.add_argument('--build', action='store_true', help='commit 后执行 npm run build')
    args = parser.parse_args()

    root = Path(args.root)
    inbox = root / 'inbox'
    if not inbox.is_dir():
        print('找不到 inbox 目录：' + str(inbox))
        return 1
    notes = [inbox / args.file] if args.file else sorted(inbox.glob('*.md'))
    notes = [n for n in notes if n.is_file()]
    if not notes:
        print('inbox 里没有待发布的 .md 文件。')
        return 0

    plans = [build_plan(n, root) for n in notes]
    if args.action == 'preview':
        print('=== 预览（不会改动任何文件）===')
        for plan in plans:
            show(plan)
        print('\n确认无误后运行：python tools/publish_post.py commit')
        return 0

    for plan in plans:
        target = plan['target']
        if target.exists():
            if target.read_text(encoding='utf-8') == plan['content']:
                print('目标已存在且内容一致，已跳过：' + str(target))
                print('  若要修改这篇文章，请直接编辑 ' + str(target))
                continue
            target = target.with_name(target.stem + '-' + dt.datetime.now().strftime('%Y%m%d-%H%M%S') + target.suffix)
            print('目标已存在且内容不同，改用新文件名：' + str(target))
        target.parent.mkdir(parents=True, exist_ok=True)
        for _, src, dst in plan['images']:
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dst if not dst.exists() else dst.with_name(dst.stem + '_copy' + dst.suffix))
        target.write_text(plan['content'], encoding='utf-8')
        print('已写入：' + str(target))
    if args.build:
        print('开始构建...')
        subprocess.run('npm run build', cwd=root, shell=True, check=True)
    print('完成。原笔记保留在 inbox，确认无误后可自行删除。')
    return 0


if __name__ == '__main__':
    sys.exit(main())
