#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""一键发布：整理 inbox 笔记 -> 暂存白名单文件 -> 提交 -> 推送到 GitHub。"""

import argparse
import datetime as dt
import subprocess
import sys
from pathlib import Path

WHITELIST = [
    '_config.yml',
    '_config.butterfly.yml',
    'netlify.toml',
    'package.json',
    'package-lock.json',
    'yarn.lock',
    '.gitmodules',
    '发布.bat',
    '一键发布.bat',
    'tools',
    'scripts',
    'inbox',
    'source',
]


def run(cmd, cwd, check=True):
    print('执行：' + ' '.join(cmd))
    result = subprocess.run(cmd, cwd=cwd, check=False)
    if check and result.returncode != 0:
        raise SystemExit('命令失败，退出码 ' + str(result.returncode) + '：' + ' '.join(cmd))
    return result


def push_master(root):
    """推送 master；遇到网络重置时自动用 HTTP/1.1 重试。"""
    attempts = [
        ['git', 'push', 'origin', 'master'],
        ['git', '-c', 'http.version=HTTP/1.1', '-c', 'http.postBuffer=104857600',
         'push', 'origin', 'master'],
        ['git', '-c', 'http.version=HTTP/1.1', '-c', 'http.postBuffer=104857600',
         'push', 'origin', 'master'],
    ]
    for index, cmd in enumerate(attempts):
        result = run(cmd, root, check=False)
        if result.returncode == 0:
            return
        if index < len(attempts) - 1:
            print('推送失败，正在重试（' + str(index + 1) + '/3）……')
    raise SystemExit('命令失败，推送 3 次仍未成功：git push origin master')


def staged_paths(root):
    """只把当前存在或仍被 git 跟踪的白名单路径交给 git add。"""
    tracked_result = subprocess.run(
        ['git', 'ls-files'], cwd=root, capture_output=True,
        text=True, encoding='utf-8', errors='replace', check=False
    )
    tracked = set(tracked_result.stdout.splitlines())
    paths = []
    for path in WHITELIST:
        exists = (root / path).exists()
        tracked_path = path in tracked or any(name.startswith(path + '/') for name in tracked)
        if exists or tracked_path:
            paths.append(path)
        else:
            print('  跳过已不存在的路径：' + path)
    return paths


def main():
    parser = argparse.ArgumentParser(description='一键整理笔记并提交、推送博客')
    parser.add_argument('--root', default=r'D:\pooleland', help='博客根目录')
    parser.add_argument('--message', help='自定义提交说明')
    parser.add_argument('--no-push', action='store_true', help='只提交，不推送')
    parser.add_argument('--dry-run', action='store_true', help='只打印将执行的步骤，不改动任何东西')
    args = parser.parse_args()

    root = Path(args.root)
    inbox = root / 'inbox'
    notes = sorted(inbox.glob('*.md')) if inbox.is_dir() else []
    print('=== 一键发布 ===')
    print('博客目录：' + str(root))
    print('inbox 待发布笔记：' + (', '.join(n.name for n in notes) if notes else '无'))

    if args.dry_run:
        print('（预览模式，不会写入或提交）')
        if notes:
            print('将运行：python tools/publish_post.py commit')
        print('将暂存：' + ', '.join(staged_paths(root)))
        print('将提交并推送到 origin master')
        return 0

    if notes:
        run([sys.executable, 'tools/publish_post.py', 'commit'], root)

    run(['git', 'add', '-A', '--'] + staged_paths(root), root)
    staged = subprocess.run(['git', 'diff', '--cached', '--quiet'], cwd=root, check=False)
    if staged.returncode == 0:
        status = subprocess.run(['git', 'status', '--porcelain', '-b'], cwd=root,
                                capture_output=True, text=True, encoding='utf-8', errors='replace')
        if status.stdout and '[ahead' in status.stdout:
            print('没有新的暂存改动，但本地有未推送提交，直接推送。')
            if not args.no_push:
                push_master(root)
        else:
            print('没有需要提交的改动，结束。')
        return 0

    message = args.message or ('自动发布：' + dt.datetime.now().strftime('%Y-%m-%d %H:%M'))
    run(['git', 'commit', '-m', message], root)
    if not args.no_push:
        push_master(root)
    print('完成。Netlify 会自动构建并发布，稍后打开 https://pooleland.com 验收。')
    return 0


if __name__ == '__main__':
    sys.exit(main())
