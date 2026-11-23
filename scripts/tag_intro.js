'use strict'

const fs = require('fs')
const path = require('path')

hexo.extend.filter.register('after_render:html', function (html, data) {
  try {
    let pagePath = data.path || ''
    try {
      pagePath = decodeURIComponent(pagePath)
    } catch (e) {}
    pagePath = pagePath.replace(/^\/+/, '')

    const match = pagePath.match(/^tags\/([^/]+)\/index\.html$/)
    if (!match) return html

    const tag = match[1]
    const introFile = path.join(hexo.base_dir, 'source', '_tag-intros', tag + '.md')
    if (!fs.existsSync(introFile)) return html

    const raw = fs.readFileSync(introFile, 'utf8')
    if (!raw.trim()) return html

    const content = hexo.render.renderSync({ text: raw, engine: 'markdown' })
    const block =
      '<div class="tag-intro-card" style="margin:0 0 20px;padding:16px 18px;' +
      'border-left:4px solid #87CEFA;background:rgba(135,206,250,.08);' +
      'border-radius:4px;line-height:1.8;">' +
      '<div style="font-weight:600;margin-bottom:8px;">关于这个标签</div>' +
      content +
      '</div>'

    const marker = '<div class="article-sort-title">'
    const start = html.indexOf(marker)
    if (start === -1) return html
    const end = html.indexOf('</div>', start)
    if (end === -1) return html
    const insertAt = end + '</div>'.length
    return html.slice(0, insertAt) + block + html.slice(insertAt)
  } catch (e) {
    hexo.log.warn('tag_intro 注入失败：' + e.message)
    return html
  }
})
