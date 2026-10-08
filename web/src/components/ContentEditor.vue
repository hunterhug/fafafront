<template>
  <div class="write-page" @click="closeCtxMenu" @keydown="onKeydown" @scroll.capture="onEditorScroll">
    <el-alert
      v-if="userStore.isLogin && !userStore.isVip"
      type="warning"
      :closable="false"
      show-icon
      :title="t('editor.notVip')"
      style="margin-bottom: 12px"
    />

    <!-- 文档工具栏（飞书式：左返回、右操作） -->
    <div class="doc-toolbar">
      <a class="tb-back" :title="t('editor.backToManage')" @click="onBack">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
      </a>
      <div class="tb-status">
        <el-tag v-if="isEdit" size="small" type="info">v{{ form.version }}</el-tag>
        <el-tag v-if="isEdit && form.pre_flush === 0" size="small" type="warning">{{ t('editor.draft') }}</el-tag>
        <span class="tb-save" :class="{ saved: lastSavedTime }">
          {{ autoSaving ? t('editor.saving') : lastSavedTime ? t('editor.autoSaved') + lastSavedTime : isEdit ? t('editor.editing') : '' }}
        </span>
      </div>
      <div class="tb-actions">
        <el-button v-if="isEdit" size="small" @click="historyVisible = true">{{ t('editor.history') }}</el-button>
        <el-button v-if="isEdit" size="small" :loading="saving" @click="saveDraft">{{ t('editor.saveDraft') }}</el-button>
        <el-button v-if="!isEdit" type="primary" size="small" :loading="saving" @click="create">{{ t('editor.createDraft') }}</el-button>
        <el-button v-else type="primary" size="small" :loading="publishing" @click="publish">{{ t('editor.publish') }}</el-button>
      </div>
    </div>

    <!-- 文档主体（标题 + 元信息 + 正文，文档式居中） -->
    <div class="doc-card">
      <div class="doc-inner">
        <input
          v-model="form.title"
          class="doc-title"
          maxlength="100"
          :placeholder="t('article.untitled')"
          @keydown.enter.prevent="onTitleEnter"
        />

        <!-- 元信息行（节点/SEO 仅在新建时可选，编辑时在内容列表里单独改） -->
        <div class="doc-props">
          <template v-if="!isEdit">
            <div class="prop">
              <label class="prop-label">{{ t('article.node') }}</label>
              <el-select v-model="form.node_id" :placeholder="t('editor.selectNode')" size="small" style="width: 150px">
                <el-option-group v-for="p in nodes" :key="p.id" :label="p.name">
                  <el-option :label="p.name" :value="p.id" />
                  <el-option v-for="s in p.son || []" :key="s.id" :label="'　└ ' + s.name" :value="s.id" />
                </el-option-group>
              </el-select>
            </div>
            <div class="prop">
              <label class="prop-label">
                SEO
                <el-tooltip placement="top" :content="t('editor.seoTip')" raw-content>
                  <span class="prop-help">?</span>
                </el-tooltip>
              </label>
              <el-input v-model="form.seo" :placeholder="t('editor.seoPlaceholder')" size="small" style="width: 170px" />
            </div>
          </template>
          <el-button text size="small" class="prop-toggle" @click="moreVisible = !moreVisible">
            <span>{{ moreVisible ? t('editor.collapseSettings') : t('editor.moreSettings') }}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :style="{ transform: moreVisible ? 'rotate(180deg)' : '' }"><path d="M6 9l6 6 6-6"/></svg>
          </el-button>
        </div>

        <!-- 更多设置（折叠）：背景图 / 密码 / 置顶 / 关闭评论 -->
        <div v-if="moreVisible" class="doc-props-more">
          <div class="prop">
            <label class="prop-label">{{ t('editor.bgImage') }}</label>
            <div class="img-row">
              <el-image
                v-if="form.image_path"
                :src="form.image_path"
                fit="cover"
                style="width: 120px; height: 60px; border-radius: 4px"
              />
              <el-upload :show-file-list="false" :http-request="uploadImage" accept="image/*">
                <el-button plain size="small">{{ t('editor.uploadBg') }}</el-button>
              </el-upload>
            </div>
          </div>
          <div class="prop">
            <label class="prop-label">{{ t('editor.password') }}</label>
            <el-input v-model="form.password" :placeholder="t('editor.passwordHint')" size="small" style="width: 220px" />
          </div>
          <div class="prop">
            <label class="prop-label">{{ t('editor.top') }}</label>
            <el-switch v-model="form.top" :active-value="1" :inactive-value="0" size="small" />
          </div>
          <div class="prop">
            <label class="prop-label">{{ t('editor.closeComments') }}</label>
            <el-switch v-model="form.close_comment" :active-value="1" :inactive-value="0" size="small" />
          </div>
        </div>

        <!-- 正文（飞书式所见即所得：无工具栏，Markdown 快捷输入） -->
        <div
          class="doc-editor"
          @contextmenu.prevent="onContextMenu"
          @keyup="onEditorKeyup"
          @keydown="onEditorKeydown"
          @mousemove="onEditorMousemove"
          @mouseleave="hideBlockPlus"
          @dragover.capture.prevent="onEditorDragover"
          @drop.capture.prevent="onDrop"
          @scroll.capture="onEditorScroll"
        >
          <Editor
            v-model="valueHtml"
            :default-config="editorConfig"
            mode="default"
            class="wys-editor"
            @on-created="handleCreated"
            @on-change="onEditorChange"
            @custom-paste="onCustomPaste"
          />

          <!-- 段落左侧块操作（飞书式 + 按钮 / ≡ 拖拽排序） -->
          <span
            v-if="blockPlus.show"
            class="drag-handle"
            draggable="true"
            :style="{ top: blockPlus.top + 'px' }"
            :title="t('editor.dragSort')"
            @dragstart="onDragStart"
            @dragend="onDragEnd"
          >⠿</span>
          <button
            v-if="blockPlus.show"
            class="block-plus"
            :style="{ top: blockPlus.top + 'px' }"
            @click="insertAfterBlock"
          >+</button>

          <!-- 字数统计（飞书式右下角） -->
          <div v-if="wordCount > 0" class="word-count">{{ wordCount }} {{ t('editor.wordCount') }}</div>

          <!-- 文档大纲（飞书式：右侧标题导航，长文时显示） -->
          <aside v-if="outlineItems.length >= 2" class="doc-outline">
            <div class="doc-outline-title">{{ t('editor.catalog') }}</div>
            <div
              v-for="(item, i) in outlineItems"
              :key="i"
              class="doc-outline-item"
              :class="{ 'doc-outline-active': i === outlineActive }"
              :style="{ paddingLeft: 8 + (item.level - 1) * 14 + 'px' }"
              @click="scrollToOutline(item)"
            >{{ item.text }}</div>
          </aside>

          <!-- 斜杠 / 命令菜单（飞书式：分组 + 过滤 + 键盘导航） -->
          <div
            v-if="slashMenu.visible"
            class="ctx-menu slash-menu"
            :style="{ left: slashMenu.x + 'px', top: slashMenu.y + 'px' }"
            @click.stop
          >
            <div class="slash-group">{{ t('editor.basic') }}</div>
            <div
              v-for="(item, i) in slashBasicItems"
              :key="item.key"
              class="ctx-item"
              :class="{ 'ctx-item-active': i === slashMenu.activeIdx }"
              @click="item.handler"
              @mouseenter="slashMenu.activeIdx = i"
            >
              <span class="sl-icon" v-html="item.icon"></span> {{ item.label }}
            </div>
            <div class="ctx-sep" />
            <div class="slash-group">{{ t('editor.insert') }}</div>
            <div
              v-for="(item, i) in slashInsertItems"
              :key="item.key"
              class="ctx-item"
              :class="{ 'ctx-item-active': slashBasicItems.length + i === slashMenu.activeIdx }"
              @click="item.handler"
              @mouseenter="slashMenu.activeIdx = slashBasicItems.length + i"
            >
              <span class="sl-icon" v-html="item.icon"></span> {{ item.label }}
            </div>
            <div v-if="slashMenu.filter && !hasSlashMatch" class="slash-empty">{{ t('editor.noMatch') }}</div>
          </div>

          <!-- 表情 emoji 面板（飞书式） -->
          <div
            v-if="emojiPanel.visible"
            class="ctx-menu emoji-panel"
            :style="{ left: emojiPanel.x + 'px', top: emojiPanel.y + 'px' }"
            @click.stop
          >
            <div class="emoji-grid">
              <button
                v-for="e in EMOJIS"
                :key="e"
                class="emoji-cell"
                @click="insertEmoji(e)"
              >{{ e }}</button>
            </div>
          </div>

          <!-- 内容加载中（长文加载反馈，飞书式） -->
          <div v-if="loading" class="editor-loading">
            <div class="editor-loading-spinner"></div>
            <span>{{ t('editor.loadingDoc') }}</span>
          </div>

          <!-- 右键菜单（飞书式：选中文本→格式；空白→插入） -->
          <div
            v-if="ctxMenu.visible"
            class="ctx-menu"
            :style="{ left: ctxMenu.x + 'px', top: ctxMenu.y + 'px' }"
            @click.stop
          >
            <template v-if="ctxMenu.hasSelection">
              <div class="ctx-item" @click="fmtText('bold')"><b>B</b> {{ t('editor.bold') }}</div>
              <div class="ctx-item" @click="fmtText('italic')"><i>I</i> {{ t('editor.italic') }}</div>
              <div class="ctx-item" @click="fmtText('underline')"><u>U</u> {{ t('editor.underline') }}</div>
              <div class="ctx-item" @click="fmtText('through')"><s>S</s> {{ t('editor.strikethrough') }}</div>
              <div class="ctx-item" @click="fmtText('code')"><span class="ctx-code">&lt;/&gt;</span> {{ t('editor.inlineCode') }}</div>
              <div class="ctx-sep" />
              <div class="ctx-item" @click="addLink">🔗 {{ t('editor.link') }}</div>
              <div class="ctx-item" @click="fmtQuote">❝ {{ t('editor.quote') }}</div>
              <div class="ctx-sep" />
              <div class="ctx-item" @click="clearFormat">🧹 {{ t('editor.clearFormat') }}</div>
            </template>
            <template v-else>
              <div class="ctx-item" @click="insertBlock('header1')">H1 {{ t('editor.title') }}</div>
              <div class="ctx-item" @click="insertBlock('header2')">H2 {{ t('editor.subtitle') }}</div>
              <div class="ctx-item" @click="insertBlock('header3')">H3 {{ t('editor.subtitle') }}</div>
              <div class="ctx-sep" />
              <div class="ctx-item" @click="insertBlock('bulleted-list')">• {{ t('editor.ul') }}</div>
              <div class="ctx-item" @click="insertBlock('todo')">☑ {{ t('editor.todo') }}</div>
              <div class="ctx-item" @click="fmtQuote">❝ {{ t('editor.quote') }}</div>
              <div class="ctx-item" @click="insertBlock('code')">&lt;/&gt; {{ t('editor.codeBlock') }}</div>
              <div class="ctx-item" @click="insertBlock('divider')">— {{ t('editor.hr') }}</div>
              <div class="ctx-sep" />
              <div class="ctx-item" @click="insertTable">▦ {{ t('editor.table') }}</div>
              <div class="ctx-item" @click="insertImage">🖼 {{ t('editor.image') }}</div>
              <div class="ctx-item" @click="insertVideo">▶ {{ t('editor.video') }}</div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- 历史版本对话框（抽成组件，文章列表也复用） -->
    <ContentHistoryDialog v-model:visible="historyVisible" :content-id="contentId" @restored="loadContent" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch, onBeforeUnmount, nextTick, shallowRef } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Editor } from '@wangeditor/editor-for-vue'
import { SlateTransforms, SlateEditor, SlateText, SlatePath, SlateNode, DomEditor } from '@wangeditor/editor'
import MarkdownIt from 'markdown-it'
import markdownItTaskLists from 'markdown-it-task-lists'
import TurndownService from 'turndown'
import request from '@/api'
import { t } from '@/i18n'
import { genSeo } from '@/utils/seo'
import { contentUrl } from '@/utils/url'
import { useUserStore } from '@/store/user'
import { formatTime } from '@/utils/format'
import { EMOJIS } from '@/utils/emoji'
import ContentHistoryDialog from '@/components/ContentHistoryDialog.vue'

// wangEditor 样式（含基础 CSS，按需引入避免全局污染）
import '@wangeditor/editor/dist/css/style.css'

const props = defineProps({
  contentId: { type: Number, default: 0 }
})
const emit = defineEmits(['close', 'created'])

const userStore = useUserStore()
const contentId = computed(() => props.contentId)
const isEdit = computed(() => contentId.value > 0)

// 字数统计（飞书式：正文去空白后的字符数）
const wordCount = computed(() => {
  const t = form.describe || ''
  return t.replace(/\s+/g, '').length
})


// ============ 所见即所得编辑器（wangEditor） ============
const editorRef = shallowRef() // 编辑器实例
const valueHtml = ref('') // 编辑器内 HTML（中间态）

// Markdown <-> HTML 转换（存储仍是 Markdown，编辑/展示用 HTML）
const mdIt = new MarkdownIt({
  html: true,
  linkify: true,
  breaks: true
})
mdIt.enable(['table', 'strikethrough'])
mdIt.use(markdownItTaskLists, { enabled: true }) // 待办事项 - [ ] / - [x]
const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-'
})
// turndown 默认不转表格，补一条规则（wangEditor 表格 → Markdown 表格）
turndown.addRule('table', {
  filter: ['table'],
  replacement(content, node) {
    const rows = [...node.querySelectorAll('tr')].map((tr) =>
      [...tr.querySelectorAll('th,td')].map((c) => (c.textContent || '').trim()).join(' | ')
    )
    if (rows.length === 0) return ''
    // GFM 表格：表头行 + 分隔行 + 数据行（分隔行必须在表头之后）
    const sep = '|' + rows[0].split('|').map(() => ' --- ').join('|') + '|'
    const header = '| ' + rows[0] + ' |'
    const data = rows
      .slice(1)
      .map((r) => '| ' + r + ' |')
      .join('\n')
    return '\n\n' + header + '\n' + sep + (data ? '\n' + data : '') + '\n\n'
  }
})
// 图片尺寸（wangEditor 的 30%/50%/100% 按钮把宽度写在 style.width 上）
// turndown 默认的图片规则只保留 src/alt/title，会丢掉 style —— 表现就是
// 「编辑器里调好大小，保存后又变回原尺寸」。这里对带尺寸的图片输出 HTML，
// 让宽度随 Markdown 一起存下来（详情页的 md-editor-v3 会原样渲染 HTML 图片）。
//
// 注意必须用 <p> 包住：裸的顶层 <img>（前后各一个空行）会被 markdown-it
// 当成块级 HTML 原样输出，wangEditor 解析后得到一个"不在段落里的图片"，
// slate 找不到对应 DOM，重新进入编辑器就会抛
// `Cannot resolve a DOM node from Slate node: {"text":""}` 并弹「页面渲染出错」。
// 包进 <p> 后与 markdown 图片语法（![](…) 渲染出的 <p><img></p>）结构一致。
turndown.addRule('sizedImage', {
  filter(node) {
    return node.nodeName === 'IMG' && /(^|;)\s*width\s*:/i.test(node.getAttribute('style') || '')
  },
  replacement(content, node) {
    const src = node.getAttribute('src') || ''
    const alt = node.getAttribute('alt') || ''
    // wangEditor 会写入空的 height（如 "width: 30%; height: ;"），清理掉它
    const style = (node.getAttribute('style') || '')
      .split(';')
      .map((d) => d.trim())
      .filter((d) => d && !/^height\s*:\s*$/i.test(d))
      .join('; ')
    const img = `<img src="${src}" alt="${alt}"${style ? ` style="${style}"` : ''}>`
    return `\n\n<p>${img}</p>\n\n`
  }
})

// 待办事项（wangEditor todo → GFM 任务列表，保证保存/加载/详情闭环）
turndown.addRule('todo', {
  filter: (node) => node.nodeName === 'DIV' && node.getAttribute && node.getAttribute('data-w-e-type') === 'todo',
  replacement(content, node) {
    const input = node.querySelector && node.querySelector('input[type="checkbox"]')
    const checked = input && input.checked ? '[x]' : '[ ]'
    return `- ${checked} ${(content || '').trim()}`
  }
})

const editorConfig = {
  placeholder: t('editor.toolbarHint'),
  // 选中文本浮条（飞书式：加粗/斜体/下划线/删除线/行内代码/颜色高亮/清除格式/链接/引用）
  hoverbarKeys: {
    text: {
      menuKeys: ['bold', 'italic', 'underline', 'through', 'code', 'color', 'bgColor', 'clearStyle', 'insertLink', 'blockquote']
    },
    link: {
      menuKeys: ['editLink', 'unLink', 'viewLink']
    },
    image: {
      menuKeys: ['imageWidth30', 'imageWidth50', 'imageWidth100', 'deleteImage']
    },
    pre: {
      menuKeys: ['codeSelectLang', 'deleteCode']
    },
    table: {
      menuKeys: ['tableHeader', 'insertTableRow', 'insertTableCol', 'deleteTableRow', 'deleteTableCol', 'deleteTable']
    }
  },
  MENU_CONF: {
    uploadImage: {
      // 图片上传：走现有 /api/file/upload
      customUpload(file, insertFn) {
        const fd = new FormData()
        fd.append('type', 'image')
        fd.append('describe', 'content inline image')
        fd.append('tag', 'content')
        fd.append('file', file)
        request
          .post('/api/file/upload', fd)
          .then((res) => {
            const url = res.data?.url || res.data?.path || res.data?.file_path || ''
            if (url) insertFn(url, '', url)
            else ElMessage.error(t('editor.imageUploadFail'))
          })
          .catch((e) => ElMessage.error(e.msg || t('editor.imageUploadFail')))
      }
    }
  }
}

function handleCreated(editor) {
  editorRef.value = editor
  // 若内容已加载（loadContent 先跑），立即渲染进编辑器（空文档也要渲染，避免 loading 卡住）
  if (!htmlLoaded) {
    renderToEditor(form.describe || '')
    htmlLoaded = true
    if (isEdit.value) editorReady = true
  }
}

// Markdown → 编辑器 HTML（含待办事项 GFM 任务列表 → wangEditor todo 块）
function mdToEditorHtml(md) {
  let html = mdIt.render(md || '')
  // 兼容历史数据：早期保存的带尺寸图片是「顶层 <img>」写法（单独占一行），
  // wangEditor 无法把它解析成合法结构，会导致进入编辑器报错。这里补上 <p> 包裹，
  // 与 markdown 图片语法渲染出的结构保持一致。
  html = html.replace(/^[ \t]*(<img\b[^>]*>)[ \t]*$/gm, '<p>$1</p>')
  // 待办事项：GFM task list（ul.contains-task-list）→ wangEditor todo div
  // （直接输出 div[data-w-e-type=todo]，绕开 wangEditor preParseHtml 对 ul.w-e-todo 的不识别）
  html = html.replace(/<ul class="contains-task-list">([\s\S]*?)<\/ul>/g, (m, inner) => {
    const items = inner.match(/<li[^>]*>[\s\S]*?<\/li>/g) || []
    return items
      .map((li) => {
        const checked = /<input[^>]*checked[^>]*>/i.test(li)
        const text = li
          .replace(/<li[^>]*>|<\/li>/g, '')
          .replace(/<input[^>]*>/g, '')
          .trim()
        return `<div data-w-e-type="todo"><input type="checkbox" disabled${checked ? ' checked' : ''}>${text}</div>`
      })
      .join('')
  })
  return html
}

// 把 Markdown 渲染进编辑器（syncing 期间不回写，避免加载即误改内容）
function renderToEditor(md) {
  syncing = true
  valueHtml.value = mdToEditorHtml(md || '')
  // wangEditor setHtml 会异步触发 onChange，需在它消费后再放行（300ms 窗口）
  setTimeout(() => {
    syncing = false
    updateOutline()
    loading.value = false
  }, 300)
}

// 编辑器内容变化（wangEditor onChange 事件）→ 回写 Markdown + 安排防抖保存
function onEditorChange(editor) {
  if (syncing) return // setHtml 初始内容期间忽略
  const html = editor.getHtml() || ''
  form.describe = turndown.turndown(html)
  if (isEdit.value) scheduleAutoSave()
  updateOutline()
}

// ============ 文档大纲（飞书式：右侧标题导航 + 当前章节高亮） ============
const outlineItems = ref([])
const outlineActive = ref(-1)
function updateOutline() {
  const ed = editorRef.value
  if (!ed) return
  const root = ed.getEditableContainer().querySelector('[data-slate-editor]')
  if (!root) return
  const items = []
  root.querySelectorAll('h1, h2, h3').forEach((el) => {
    const text = el.innerText.trim()
    if (!text) return
    items.push({ level: Number(el.tagName[1]), text: text.slice(0, 40), el })
  })
  outlineItems.value = items
  tagCodeBlocks(root)
  onEditorScroll()
}

// 代码块右上角语言标签（飞书式：从 form.describe 的 ```lang 围栏解析，按顺序匹配）
function tagCodeBlocks(root) {
  if (!root) return
  const langs = []
  const md = form.describe || ''
  const re = /```([\w-]+)/g
  let m
  while ((m = re.exec(md))) langs.push(m[1])
  root.querySelectorAll('pre[data-slate-node="element"]').forEach((pre, i) => {
    pre.dataset.lang = langs[i] || 'code'
  })
}

// 点击大纲项：滚动到对应标题（编辑区滚动容器内）
function scrollToOutline(item) {
  if (item && item.el) {
    try {
      item.el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } catch (e) {
      /* 忽略 */
    }
  }
}

// 编辑器滚动：高亮当前章节（飞书式大纲跟随）
function onEditorScroll() {
  const ed = editorRef.value
  if (!ed) return
  const root = ed.getEditableContainer().querySelector('[data-slate-editor]')
  if (!root) return
  const sc = root.closest('.w-e-scroll') || root.closest('.wys-editor')
  const scTop = sc ? sc.getBoundingClientRect().top : 0
  let active = -1
  outlineItems.value.forEach((item, i) => {
    const r = item.el.getBoundingClientRect()
    if (r.top - scTop <= 120) active = i
  })
  outlineActive.value = active
}

// ============ 粘贴优化（飞书式：粘贴 Markdown 自动转成格式化内容） ============
function looksLikeMarkdown(text) {
  if (!text || !text.trim()) return false
  const lines = text.split('\n')
  // 单行：纯文本不转；但图片/链接等单行 Markdown 语法要转
  if (
    lines.length === 1 &&
    !/^#{1,6}\s|^[-*+]\s|^>\s|^\|\s?.*\|$|^\s*```|^---+$|^\*\*[^*]+|^\|.*\||^!\[.*\]\(.*\)|^\[.*\]\(.*\)/.test(lines[0])
  ) {
    return false
  }
  return /(^#{1,6}\s)|(^\s*[-*+]\s)|(^>\s)|(^\|.*\|)|(^\s*```)|(^---+$)|(\*\*[^*]+\*\*)|(^!\[.*\]\(.*\))|(^\[.*\]\(.*\))/m.test(text)
}

function onCustomPaste(editor, e, cb) {
  const text = e.clipboardData?.getData('text/plain') || ''
  if (looksLikeMarkdown(text)) {
    e.preventDefault()
    const html = mdToEditorHtml(text)
    editor.dangerouslyInsertHtml(html)
    if (isEdit.value) scheduleAutoSave()
    cb(false)
  } else {
    cb(true)
  }
}

// ============ 右键菜单（飞书式） ============
const ctxMenu = reactive({ visible: false, x: 0, y: 0, hasSelection: false })

// ============ 斜杠 / 命令菜单（飞书式：分组 + 即时过滤 + 键盘导航） ============
const slashMenu = reactive({ visible: false, x: 0, y: 0, filter: '', activeIdx: 0 })

// 菜单项（数据驱动，支持过滤与键盘导航）
const slashBasicItems = computed(() =>
  [
    { key: 'header1', label: t('editor.title'), icon: 'H1', kw: t('editor.title'), handler: () => slashInsert('header1') },
    { key: 'header2', label: t('editor.subtitle'), icon: 'H2', kw: t('editor.subtitle'), handler: () => slashInsert('header2') },
    { key: 'bulleted-list', label: t('editor.ul'), icon: '•', kw: t('editor.ul'), handler: () => slashInsert('bulleted-list') },
    { key: 'blockquote', label: t('editor.quote'), icon: '❝', kw: t('editor.quote'), handler: fmtQuote },
    { key: 'code', label: t('editor.codeBlock'), icon: '&lt;/&gt;', kw: t('editor.code'), handler: () => slashInsert('code') },
    { key: 'divider', label: t('editor.hr'), icon: '—', kw: t('editor.hr'), handler: () => slashInsert('divider') }
  ].filter((it) => matchSlash(it.kw))
)
const slashInsertItems = computed(() =>
  [
    { key: 'todo', label: t('editor.todo'), icon: '☑', kw: t('editor.todo'), handler: () => slashInsert('todo') },
    { key: 'link', label: t('editor.link'), icon: '🔗', kw: t('editor.link'), handler: addLink },
    { key: 'emotion', label: t('editor.emoji'), icon: '😀', kw: t('editor.emoji'), handler: openEmojiPanel },
    { key: 'table', label: t('editor.table'), icon: '▦', kw: t('editor.table'), handler: insertTable },
    { key: 'image', label: t('editor.image'), icon: '🖼', kw: t('editor.image'), handler: insertImage },
    { key: 'video', label: t('editor.video'), icon: '▶', kw: t('editor.video'), handler: insertVideo }
  ].filter((it) => matchSlash(it.kw))
)
const slashAllItems = computed(() => [...slashBasicItems.value, ...slashInsertItems.value])

// 编辑器内按键：行首 "/" 弹菜单；菜单打开时输入 → 即时过滤 + 键盘导航
function onEditorKeyup(e) {
  const ed = editorRef.value
  if (!ed) return
  if (!slashMenu.visible) {
    if (e.key !== '/') return
    const sel = ed.selection
    if (!sel) return
    // 当前块起点到光标前的文本
    const block = SlateEditor.above(ed, { match: (n) => SlateEditor.isBlock(ed, n) })
    if (!block) return
    const before = SlateEditor.string(ed, { anchor: sel.anchor, focus: SlateEditor.start(ed, block[1]) })
    if (before.trim() !== '/') return // 非行首 "/" 不弹
    const pos = ed.getSelectionPosition()
    slashMenu.x = Math.min(pos.left || 0, window.innerWidth - 220)
    slashMenu.y = (pos.top || 0) + 24
    // 视口底部溢出时上移（菜单约 340px 高）
    if (slashMenu.y + 340 > window.innerHeight) {
      slashMenu.y = Math.max(8, (pos.top || 0) - 340)
    }
    slashMenu.filter = ''
    slashMenu.activeIdx = 0
    slashMenu.visible = true
    return
  }
  // 菜单已打开：Esc 关闭；普通字符更新过滤词（光标前 "/xxx" 的 xxx 部分）
  if (e.key === 'Escape') {
    closeSlashMenu()
    return
  }
  if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
    const block = SlateEditor.above(ed, { match: (n) => SlateEditor.isBlock(ed, n) })
    if (block && ed.selection) {
      const before = SlateEditor.string(ed, { anchor: ed.selection.anchor, focus: SlateEditor.start(ed, block[1]) })
      slashMenu.filter = before.startsWith('/') ? before.slice(1) : before
    }
    slashMenu.activeIdx = 0
  }
}

// 编辑器按键：斜杠菜单键盘导航 + 格式快捷键（Ctrl/Cmd+B/I/U，飞书式）
function onEditorKeydown(e) {
  // 斜杠菜单键盘导航
  if (slashMenu.visible) {
    const items = slashAllItems.value
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const delta = e.key === 'ArrowDown' ? 1 : -1
      slashMenu.activeIdx = (slashMenu.activeIdx + delta + items.length) % items.length
      return
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = items[slashMenu.activeIdx]
      if (item) item.handler()
      return
    } else if (e.key === 'Escape') {
      closeSlashMenu()
      return
    }
  }
  // 格式快捷键（显式处理，与 wangEditor 幂等不冲突）
  if ((e.ctrlKey || e.metaKey) && !e.altKey) {
    const k = e.key.toLowerCase()
    if (k === 'b') {
      e.preventDefault()
      fmtText('bold')
    } else if (k === 'i') {
      e.preventDefault()
      fmtText('italic')
    } else if (k === 'u') {
      e.preventDefault()
      fmtText('underline')
    }
  }
}

// 菜单项按过滤词匹配（飞书式即时过滤）
function matchSlash(keyword) {
  const f = slashMenu.filter.trim()
  if (!f) return true
  return keyword.indexOf(f) >= 0
}

// 是否有菜单项匹配当前过滤词（用于"无匹配内容"提示）
const hasSlashMatch = computed(() => slashAllItems.value.length > 0)

// 移动端悬浮 + 按钮：打开/关闭插入菜单（复用斜杠菜单，飞书式）
// ============ 表情 emoji 面板（飞书式，复用全站表情集） ============
const emojiPanel = reactive({ visible: false, x: 0, y: 0 })

// 打开表情面板（定位在当前光标附近）
function openEmojiPanel() {
  const ed = editorRef.value
  if (!ed) return
  closeSlashMenu()
  closeCtxMenu()
  const pos = ed.getSelectionPosition ? ed.getSelectionPosition() : null
  emojiPanel.x = Math.max(8, Math.min((pos && pos.left) || 60, window.innerWidth - 336))
  emojiPanel.y = ((pos && pos.top) || 240) - 10
  // 视口底部溢出时上移
  if (emojiPanel.y + 300 > window.innerHeight) {
    emojiPanel.y = Math.max(8, window.innerHeight - 300 - 16)
  }
  emojiPanel.visible = true
}

// 插入表情
function insertEmoji(emoji) {
  const ed = editorRef.value
  if (!ed) return
  ed.restoreSelection()
  ed.dangerouslyInsertHtml(emoji)
  ed.focus()
  emojiPanel.visible = false
  if (isEdit.value) scheduleAutoSave()
}

// ============ 斜杠菜单选择：删除行首 "/" + 过滤词，并插入块 ============
function slashInsert(type) {
  const ed = editorRef.value
  if (!ed) return
  ed.restoreSelection()
  const block = SlateEditor.above(ed, { match: (n) => SlateEditor.isBlock(ed, n) })
  if (block && ed.selection) {
    const before = SlateEditor.string(ed, { anchor: ed.selection.anchor, focus: SlateEditor.start(ed, block[1]) })
    if (before) {
      SlateTransforms.delete(ed, { distance: before.length, unit: 'character', reverse: true })
    }
  }
  insertBlock(type)
  closeSlashMenu()
}

function closeSlashMenu() {
  slashMenu.visible = false
  slashMenu.filter = ''
  slashMenu.activeIdx = 0
}

// ============ 段落左侧块操作（飞书式 + 按钮 / ≡ 拖拽排序） ============
const blockPlus = reactive({ show: false, top: 0, el: null })
let dragSrc = null // 拖拽源 slate 节点

// 鼠标在编辑器内移动：定位当前块，显示左侧 + 按钮（飞书式：hover 段落左侧出现）
// 鼠标悬停段落 → 左侧显示 + 按钮（飞书式块操作）
function onEditorMousemove(e) {
  const ed = editorRef.value
  if (!ed) return
  const target = e.target
  const blockEl = target && target.closest ? target.closest('[data-slate-node="element"]') : null
  if (!blockEl) {
    blockPlus.show = false
    return
  }
  // 仅顶层块（非嵌套）
  const parent = blockEl.parentElement
  const isTop = parent && parent.getAttribute('data-slate-node') !== 'element'
  if (!isTop) {
    blockPlus.show = false
    return
  }
  const rect = blockEl.getBoundingClientRect()
  const edRect = ed.getEditableContainer().getBoundingClientRect()
  blockPlus.top = rect.top - edRect.top + rect.height / 2 - 12
  blockPlus.el = blockEl
  blockPlus.show = true
}

function hideBlockPlus() {
  blockPlus.show = false
}

// ============ 段落拖拽排序（飞书式 ≡ 手柄） ============
function onDragStart(e) {
  const ed = editorRef.value
  if (!ed || !blockPlus.el) return
  try {
    dragSrc = DomEditor.toSlateNode(ed, blockPlus.el)
    e.dataTransfer.effectAllowed = 'move'
    // 兼容 Firefox 需要设置数据
    e.dataTransfer.setData('text/plain', '')
  } catch (e2) {
    dragSrc = null
  }
}

function onDragEnd() {
  dragSrc = null
  blockPlus.show = false
}

// 拖拽经过编辑器：允许放置，并高亮目标块
function onEditorDragover(e) {
  e.preventDefault()
  e.dataTransfer.dropEffect = 'move'
  const target = e.target && e.target.closest ? e.target.closest('[data-slate-node="element"]') : null
  document.querySelectorAll('.drag-target').forEach((el) => el.classList.remove('drag-target'))
  if (target && dragSrc) target.classList.add('drag-target')
}

// 放下：把源块移动到目标块之后
function onDrop(e) {
  e.preventDefault()
  document.querySelectorAll('.drag-target').forEach((el) => el.classList.remove('drag-target'))
  const ed = editorRef.value
  const target = e.target && e.target.closest ? e.target.closest('[data-slate-node="element"]') : null
  if (!ed || !target || !dragSrc) return
  try {
    const dstNode = DomEditor.toSlateNode(ed, target)
    const srcPath = DomEditor.findPath(ed, dragSrc)
    const dstPath = DomEditor.findPath(ed, dstNode)
    // 自身或相邻块：无需移动（避免 slate 断言）
    if (srcPath[0] === dstPath[0] || Math.abs(srcPath[0] - dstPath[0]) <= 1) {
      return
    }
    SlateTransforms.moveNodes(ed, { at: srcPath, to: SlatePath.next(dstPath) })
    blockPlus.show = false
    if (isEdit.value) scheduleAutoSave()
  } catch (e2) {
    /* 复杂嵌套场景忽略 */
  } finally {
    dragSrc = null
  }
}

// 点击 +：在该块之后插入新段落并聚焦
function insertAfterBlock() {
  const ed = editorRef.value
  const blockEl = blockPlus.el
  if (!ed || !blockEl) return
  try {
    const node = DomEditor.toSlateNode(ed, blockEl)
    const path = SlateEditor.path(ed, node)
    const next = SlatePath.next(path)
    SlateTransforms.insertNodes(ed, { type: 'paragraph', children: [{ text: '' }] }, { at: next })
    const point = SlateEditor.start(ed, next)
    ed.select(point)
    ed.focus()
  } catch (e) {
    // 兜底：光标处插入
    ed.focus()
    SlateTransforms.insertNodes(ed, { type: 'paragraph', children: [{ text: '' }] })
  }
  blockPlus.show = false
}

// 编辑器容器内右键：阻止默认，弹出菜单
function onContextMenu(e) {
  const ed = editorRef.value
  if (!ed) return
  // 判断是否有选中文本
  const hasSel = !!ed.getSelectionText()
  ed.restoreSelection()
  ctxMenu.hasSelection = hasSel
  ctxMenu.x = Math.min(e.clientX, window.innerWidth - 170)
  ctxMenu.y = Math.min(e.clientY, window.innerHeight - 220)
  ctxMenu.visible = true
  ed.blur()
}

// 关闭右键菜单（点击其他处）
function closeCtxMenu() {
  ctxMenu.visible = false
  slashMenu.visible = false
  emojiPanel.visible = false
}

// 文本格式（加粗/斜体/下划线/删除线/行内代码）——选中文本应用 mark
function fmtText(mark) {
  const ed = editorRef.value
  if (!ed) return
  ed.restoreSelection()
  SlateTransforms.setNodes(ed, { [mark]: true }, { match: (n) => SlateText.isText(n), split: true })
  ed.focus()
  closeCtxMenu()
}

// 清除选中文本的所有格式（飞书式）
function clearFormat() {
  const ed = editorRef.value
  if (!ed) return
  ed.restoreSelection()
  SlateTransforms.unsetNodes(ed, ['bold', 'italic', 'underline', 'through', 'code', 'color', 'bgColor', 'fontSize', 'fontFamily', 'sub', 'sup'], {
    match: (n) => SlateText.isText(n),
    split: true
  })
  ed.focus()
  closeCtxMenu()
}

// 当前块设为引用
function fmtQuote() {
  const ed = editorRef.value
  if (!ed) return
  ed.restoreSelection()
  SlateTransforms.setNodes(
    ed,
    { type: 'blockquote', children: [{ text: '' }] },
    { match: (n) => SlateEditor.isBlock(ed, n) }
  )
  ed.focus()
  closeCtxMenu()
  closeSlashMenu()
}

// 插入块级元素（标题/列表/待办/分割线/代码块），并把光标移入新块（飞书式）
function insertBlock(type) {
  const ed = editorRef.value
  if (!ed) return
  ed.restoreSelection()
  let node
  if (type === 'header1' || type === 'header2' || type === 'header3' || type === 'divider' || type === 'blockquote') {
    node = { type, children: [{ text: '' }] }
  } else if (type === 'bulleted-list') {
    node = { type: 'bulleted-list', children: [{ type: 'list-item', children: [{ text: '' }] }] }
  } else if (type === 'todo') {
    node = { type: 'todo', checked: false, children: [{ text: '' }] }
  } else if (type === 'code') {
    node = { type: 'pre', children: [{ type: 'code', language: 'javascript', children: [{ text: '' }] }] }
  }
  if (node) {
    // 在当前块处插入，并把光标移入新块首字符（todo/列表/代码块文本从此处输入）
    const block = SlateEditor.above(ed, { match: (n) => SlateEditor.isBlock(ed, n) })
    const atPath = block ? block[1] : ed.selection.anchor.path
    try {
      SlateTransforms.insertNodes(ed, node, { at: atPath })
      const pt = SlateEditor.start(ed, atPath)
      ed.select(pt)
      // 先同步 DOM caret 再聚焦，避免 focus 用旧 DOM caret 覆盖模型 selection（飞书式：插入后光标在新块内）
      setTimeout(() => {
        if (editorRef.value) editorRef.value.focus()
      }, 30)
    } catch (e) {
      // 兜底：光标处插入
      try {
        SlateTransforms.insertNodes(ed, node)
        ed.focus()
      } catch (e2) {
        /* 忽略 */
      }
    }
  }
  closeCtxMenu()
}

// 插入视频（mp4 直链或 iframe 嵌入，飞书式）
function insertVideo() {
  const ed = editorRef.value
  if (!ed) return
  ElMessageBox.prompt(t('editor.videoPrompt'), t('editor.insertVideo'), {
    confirmButtonText: t('editor.insert'),
    cancelButtonText: t('common.cancel'),
    inputPattern: /.+/,
    inputErrorMessage: t('editor.videoEmpty')
  })
    .then(({ value }) => {
      ed.restoreSelection()
      const src = (value || '').trim()
      if (src.indexOf('<iframe') === 0) {
        ed.dangerouslyInsertHtml(`<p>${src}</p>`)
      } else {
        ed.insertNode({ type: 'video', src, poster: '', width: 'auto', height: 'auto', children: [{ text: '' }] })
      }
      ed.focus()
      closeCtxMenu()
      closeSlashMenu()
      if (isEdit.value) scheduleAutoSave()
    })
    .catch(() => {})
}

// 插入表格（wangEditor 解析表格 HTML）
function insertTable() {
  const ed = editorRef.value
  if (!ed) return
  ed.restoreSelection()
  ed.dangerouslyInsertHtml(
    `<table><tbody><tr><td>${t('editor.cell')}</td><td>${t('editor.cell')}</td></tr><tr><td>${t('editor.cell')}</td><td>${t('editor.cell')}</td></tr></tbody></table>`
  )
  ed.focus()
  closeCtxMenu()
  closeSlashMenu()
}

// 插入图片（走 /api/file/upload）
function insertImage() {
  const ed = editorRef.value
  if (!ed) return
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.style.display = 'none'
  document.body.appendChild(input)
  input.onchange = () => {
    const file = input.files && input.files[0]
    document.body.removeChild(input)
    if (!file) return
    const fd = new FormData()
    fd.append('type', 'image')
    fd.append('describe', 'content inline image')
    fd.append('tag', 'content')
    fd.append('file', file)
    request
      .post('/api/file/upload', fd)
      .then((res) => {
        const url = res.data?.url || res.data?.path || res.data?.file_path || ''
        if (url) {
          ed.restoreSelection()
          ed.dangerouslyInsertHtml(`<img src="${url}" alt="图片" />`)
          ed.focus()
        }
      })
      .catch((e) => ElMessage.error(e.msg || t('editor.imageUploadFail')))
  }
  input.click()
  closeCtxMenu()
  closeSlashMenu()
}

// 插入链接（选中文本 → 链接，Element Plus 对话框）
function addLink() {
  const ed = editorRef.value
  if (!ed) return
  const selected = ed.getSelectionText() || ''
  ElMessageBox.prompt(t('editor.linkPrompt'), t('editor.insertLink'), {
    confirmButtonText: t('editor.insert'),
    cancelButtonText: t('common.cancel'),
    inputValue: /^https?:\/\//.test(selected) ? selected : '',
    inputPattern: /^https?:\/\/.+/,
    inputErrorMessage: t('editor.linkInvalid')
  })
    .then(({ value }) => {
      ed.restoreSelection()
      const url = value.trim()
      const text = selected || url
      ed.dangerouslyInsertHtml(`<a href="${url}" target="_blank">${text}</a>`)
      ed.focus()
      closeCtxMenu()
      if (isEdit.value) scheduleAutoSave()
    })
    .catch(() => {})
}

// 统一的自动保存安排（防抖 1.5s）
function scheduleAutoSave() {
  if (!editorReady || !isEdit.value) return
  dirty = true
  clearTimeout(autosaveDebounce)
  autosaveDebounce = setTimeout(() => {
    autoSaveNow()
  }, 1500)
}

// ============ 实时自动保存（防抖 1.5s，Notion/Google Docs 式） ============
const autoSaving = ref(false)
const lastSavedTime = ref('')
let dirty = false
let autosaveDebounce = null
let editorReady = false // 编辑模式：内容加载完成，之后的变化视为用户编辑
let htmlLoaded = false // 内容已渲染进编辑器（避免重复 setHtml）
let syncing = false // 正在 setHtml 初始内容（抑制回写/防抖）

// 防抖触发的自动保存
async function autoSaveNow() {
  if (!dirty || autoSaving.value) return
  autoSaving.value = true
  try {
    await request.post('/api/content/update/info', {
      id: contentId.value,
      title: form.title,
      describe: form.describe,
      save: true
    })
    await applyMeta()
    dirty = false
    const d = new Date()
    lastSavedTime.value =
      String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
    form.pre_flush = 0
  } catch (e) {
    // 自动保存失败静默，等下次输入
  } finally {
    autoSaving.value = false
  }
}

const saving = ref(false)
const loading = ref(false) // 内容加载中（长文加载反馈）
const publishing = ref(false)
const nodes = ref([])
const moreVisible = ref(false)

const form = reactive({
  title: '',
  describe: '',
  seo: '',
  node_id: undefined,
  image_path: '',
  password: '',
  top: 0,
  close_comment: 0,
  version: 0,
  pre_flush: 0
})

// 标题变化 → 防抖保存（正文经 @on-change 驱动）
watch(form.title, () => {
  if (isEdit.value) scheduleAutoSave()
})

// 标题按 Enter：直接进入正文开头（飞书式）
function onTitleEnter(e) {
  e.preventDefault()
  const ed = editorRef.value
  if (!ed) return
  ed.focus()
  try {
    const pt = SlateEditor.start(ed, [0])
    ed.select(pt)
  } catch (e2) {
    /* 编辑器未就绪时保持标题焦点 */
  }
}

// 返回：有未保存修改时确认（飞书式防误丢）
function onBack() {
  if (dirty && isEdit.value) {
    ElMessageBox.confirm(t('editor.unsavedConfirm'), t('common.tip'), {
      confirmButtonText: t('editor.exit'),
      cancelButtonText: t('editor.continueEdit'),
      type: 'warning'
    })
      .then(() => emit('close'))
      .catch(() => {})
  } else {
    emit('close')
  }
}

// 手动校验（飞书式无表单标签，改为即时提示）
// 键盘快捷键（飞书式：Ctrl/Cmd+S 保存草稿，新建时创建草稿）
function onKeydown(e) {
  if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
    e.preventDefault()
    if (isEdit.value) saveDraft()
    else create()
  }
}

function validateForm() {
  if (!form.title.trim()) {
    ElMessage.warning(t('editor.enterTitle'))
    return false
  }
  if (!form.describe.trim()) {
    ElMessage.warning(t('editor.enterContent'))
    return false
  }
  if (!form.node_id) {
    ElMessage.warning(t('editor.enterNode'))
    return false
  }
  // SEO 选填：留空由后端自动生成；有输入才校验格式
  if (form.seo.trim() && !/^[A-Za-z0-9\u4e00-\u9fa5]+$/.test(form.seo.trim())) {
    ElMessage.warning(t('editor.seoInvalid'))
    return false
  }
  return true
}

// 当前所选节点的 SEO（用于拼文章地址 / 预览）
function selectedNodeSeo() {
  const id = form.node_id
  if (!id) return ''
  for (const n of nodes.value) {
    if (n.id === id) return n.seo || ''
    const son = (n.son || []).find((x) => x.id === id)
    if (son) return son.seo || ''
  }
  return ''
}

async function loadNodes() {
  try {
    const res = await request.post('/api/node/list', {
      sort: ['=id', '+sort_num', '-create_time', '-update_time', '+status', '=seo']
    })
    nodes.value = res.data.nodes || []
  } catch (e) {
    nodes.value = []
  }
}

async function loadContent() {
  loading.value = true
  try {
    const res = await request.post('/api/content/take', { id: contentId.value })
    const d = res.data
    form.title = d.pre_title || d.title || ''
    // 编辑显示草稿正文（pre_describe=预发布区，describe=已发布区）；describe 仅兜底
    form.describe = d.pre_describe || d.describe || ''
    form.seo = d.seo || ''
    form.node_id = d.node_id || undefined
    form.image_path = d.image_path || ''
    form.password = d.password || ''
    form.top = d.top || 0
    form.close_comment = d.close_comment || 0
    form.version = d.version || 0
    form.pre_flush = d.pre_flush || 0
    // 渲染进 wangEditor（编辑器可能已就绪或稍后就绪，handleCreated 兜底）
    htmlLoaded = false
    if (editorRef.value) {
      renderToEditor(form.describe || '')
      htmlLoaded = true
      if (isEdit.value) editorReady = true
    }
  } catch (e) {
    ElMessage.error(e.msg || t('editor.loadFail'))
    loading.value = false
  }
}

async function uploadImage({ file }) {
  const fd = new FormData()
  fd.append('type', 'image')
  fd.append('describe', 'content image')
  fd.append('tag', 'content')
  fd.append('file', file)
  try {
    const res = await request.post('/api/file/upload', fd)
    const path = res.data?.url || res.data?.path || res.data?.file_path || ''
    if (path) {
      form.image_path = path
      ElMessage.success(t('editor.bgUploadSuccess'))
    }
  } catch (e) {
    ElMessage.error(e.msg || t('common.failed'))
  }
}

function create() {
  if (!validateForm()) return
  saving.value = true
  try {
    request.post('/api/content/create', {
      seo: form.seo,
      title: form.title,
      describe: form.describe,
      top: form.top,
      node_id: form.node_id,
      image_path: form.image_path,
      password: form.password,
      close_comment: form.close_comment
    }).then((res) => {
      ElMessage.success(t('editor.draftCreated'))
      emit('created', res.data.id)
    }).catch((e) => {
      const map = {
        110003: t('editor.seoUsed'),
        101000: t('editor.nodeNotFound'),
        99996: t('editor.vipOnly'),
        100010: t('editor.seoInvalid')
      }
      ElMessage.error(map[e.id] || e.msg || t('editor.createFail'))
    }).finally(() => {
      saving.value = false
    })
  } catch (e) {
    saving.value = false
  }
}

function saveDraft() {
  if (!validateForm()) return
  saving.value = true
  try {
    request.post('/api/content/update/info', {
      id: contentId.value,
      title: form.title,
      describe: form.describe,
      save: true
    }).then(async () => {
      await applyMeta()
      ElMessage.success(t('editor.draftSaved'))
      form.pre_flush = 0
      dirty = false
    }).catch((e) => {
      ElMessage.error(e.msg || t('editor.createFail'))
    }).finally(() => {
      saving.value = false
    })
  } catch (e) {
    saving.value = false
  }
}

async function applyMeta() {
  // 同步元信息（置顶/密码/评论/图片），逐个调用，失败不阻塞
  // 注意：seo/节点 已移到内容列表单独编辑，不在此处同步
  const id = contentId.value
  const calls = []
  calls.push(request.post('/api/content/update/top', { id, top: form.top }))
  calls.push(request.post('/api/content/update/password', { id, password: form.password || '' }))
  calls.push(request.post('/api/content/update/comment', { id, close_comment: form.close_comment }))
  if (form.image_path) {
    calls.push(request.post('/api/content/update/image', { id, image_path: form.image_path }))
  }
  await Promise.allSettled(calls)
}

function publish() {
  if (!validateForm()) return
  publishing.value = true
  // 一步发布：先保存当前正文到预发布区，再发布（无需单独点「保存草稿」）
  request.post('/api/content/update/info', {
    id: contentId.value,
    title: form.title,
    describe: form.describe,
    save: true
  }).then(() => {
    return request.post('/api/content/publish', { id: contentId.value })
  }).then(async () => {
    await applyMeta()
    // 重新加载拿到真实的 version/pre_flush（内容未变化时后端不会 bump 版本）
    await loadContent()
    // 发布成功：带「查看」跳转的提示（飞书式）
    ElMessageBox.alert(t('editor.published'), t('editor.publishSuccess'), {
      confirmButtonText: t('editor.view'),
      cancelButtonText: t('editor.continueEdit'),
      showCancelButton: true,
      type: 'success'
    })
      .then(() => {
        const nodeSeo = selectedNodeSeo()
        const url = contentUrl({ user_name: userStore.user?.name, node_seo: nodeSeo, seo: form.seo })
        if (url) window.open(url, '_blank')
        else window.open(`/u/${userStore.user?.name}`, '_blank')
      })
      .catch(() => {})
    dirty = false
  }).catch((e) => {
    ElMessage.error(e.msg || t('editor.publishFail'))
  }).finally(() => {
    publishing.value = false
  })
}

// 历史版本对话框（ContentHistoryDialog 组件）
const historyVisible = ref(false)

// onMounted：加载节点 + 内容
onMounted(async () => {
  await loadNodes()
  if (isEdit.value) {
    await loadContent()
    dirty = false
  } else {
    // 新建文章：SEO 预填一个随机短码（可见、可改；留空保存时后端也会兜底生成）
    if (!form.seo) form.seo = genSeo()
  }
})

// contentId 变化时（新建→编辑切换）重新加载
watch(
  () => props.contentId,
  async (nid) => {
    if (nid > 0) {
      htmlLoaded = false
      editorReady = false
      await loadContent()
      dirty = false
    }
  }
)

onBeforeUnmount(() => {
  if (autosaveDebounce) clearTimeout(autosaveDebounce)
  // wangEditor 实例销毁
  if (editorRef.value) {
    editorRef.value.destroy()
    editorRef.value = null
  }
})
</script>

<style scoped>
.write-page {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: #f3efec;
  /* 整页滚动，不再让正文区自己滚：只保留浏览器这一条滚动条，
     编辑区与最终文章一致（所见即所得）。顶栏用 sticky 常驻。 */
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px 20px 20px;
}

/* 文档工具栏 */
.doc-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fff;
  border-radius: var(--zh-radius);
  padding: 10px 16px;
  box-shadow: var(--zh-shadow);
  position: sticky;
  top: 0;
  z-index: 20;
}

.tb-back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  color: var(--zh-text-2);
  transition: all 0.15s;
}

.tb-back:hover {
  background: #faf7f5;
  color: var(--zh-blue);
}

.tb-status {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.tb-save {
  font-size: 12px;
  color: var(--zh-text-3);
  white-space: nowrap;
}

.tb-save.saved {
  color: #67c23a;
}

.tb-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

/* 文档主体 */
.doc-card {
  background: #fff;
  border-radius: var(--zh-radius);
  box-shadow: var(--zh-shadow);
  padding: 32px 40px 24px;
  /* flex: 1 0 auto —— 内容少时铺满一屏（不产生滚动条），
     内容多时按内容增高，交给外层整页滚动 */
  flex: 1 0 auto;
  display: flex;
  flex-direction: column;
}

.doc-inner {
  max-width: 1240px;
  margin: 0 auto;
  width: 100%;
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
}

/* 大标题（文档式无边框） */
.doc-title {
  width: 100%;
  border: none;
  outline: none;
  font-size: 30px;
  font-weight: 700;
  line-height: 1.4;
  color: var(--zh-text);
  padding: 0;
  margin: 0 0 12px;
  font-family: inherit;
  border-radius: 4px;
  transition: box-shadow 0.15s ease, background 0.15s ease;
}

/* 标题 hover/focus 显示珊瑚色描边提示（与全站主题一致） */
.doc-title:hover {
  box-shadow: inset 0 0 0 2px rgba(255, 95, 87, 0.10);
  background: rgba(255, 95, 87, 0.03);
}

.doc-title:focus {
  box-shadow: inset 0 0 0 2px rgba(255, 95, 87, 0.22);
}

.doc-title::placeholder {
  color: #c9c2bc;
}

/* 元信息行 */
.doc-props {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  padding: 8px 0 4px;
  border-top: 1px solid var(--zh-border);
}

.prop {
  display: flex;
  align-items: center;
  gap: 8px;
}

.prop-label {
  font-size: 13px;
  color: var(--zh-text-3);
  white-space: nowrap;
}

.prop-toggle {
  margin-left: auto;
  color: var(--zh-text-3);
}

.prop-toggle:hover {
  color: var(--zh-blue);
}

/* 更多设置折叠区 */
.doc-props-more {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  padding: 8px 0 12px;
  margin-top: 8px;
  background: #faf7f5;
  border-radius: var(--zh-radius);
  padding: 12px 16px;
}

.img-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* 正文（飞书式所见即所得） */
.doc-editor {
  margin-top: 4px;
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
}

/* 飞书式：无边框无阴影，编辑器铺满剩余高度 */
.doc-editor :deep(.wys-editor) {
  border: none;
  flex: 1;
  min-height: 0;
  height: auto;
  overflow: visible;
  padding: 0;
}
.doc-editor :deep(.wys-editor .w-e-text-container) {
  background: #fff;
  height: auto;
  overflow: visible;
}

/* wangEditor 默认给 .w-e-scroll 固定高度并内部滚动，这里放开，
   让正文随文档自然增长（配合外层整页滚动） */
.doc-editor :deep(.w-e-scroll) {
  height: auto;
  max-height: none;
  overflow: visible;
}

/* 正文排版贴近最终渲染（飞书式：大行距、居中文档、自动换行、蓝色光标） */
.doc-editor :deep(.w-e-text-container [data-slate-editor]) {
  font-size: 15.5px;
  line-height: 1.9;
  color: var(--zh-text);
  min-height: calc(100vh - 320px);
  /* 正文下方留出可点击的空白：写到/滚到最后一行时仍有充足余量继续输入或插入，
     不必再依赖悬浮按钮 */
  padding: 0 4px 35vh;
  caret-color: var(--zh-blue);
}

/* 飞书式：段落间距紧凑（覆盖 wangEditor 默认 p margin 15px） */
.doc-editor :deep([data-slate-editor] p) {
  margin: 8px 0;
}

/* 选中文本珊瑚浅色高亮（与全站主题一致） */
.doc-editor :deep([data-slate-editor] ::selection) {
  background: #ffe0dc;
}

/* 空文档提示（飞书式：非斜体浅灰） */
.doc-editor :deep(.w-e-text-placeholder) {
  font-style: normal;
  color: #c9c2bc;
}

/* 文档大纲（飞书式：右侧悬浮标题导航） */
.doc-outline {
  position: fixed;
  right: max(20px, calc((100vw - 1240px) / 2 - 190px));
  top: 150px;
  width: 168px;
  max-height: 56vh;
  overflow-y: auto;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(8px);
  border: 1px solid #f0eae6;
  border-radius: 10px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
  padding: 10px 6px;
  z-index: 10;
}

.doc-outline-title {
  font-size: 12px;
  color: var(--zh-text-3);
  padding: 2px 10px 8px;
  font-weight: 600;
}

.doc-outline-item {
  font-size: 12.5px;
  color: var(--zh-text-2);
  padding: 4px 10px;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: background 0.12s;
}

.doc-outline-item:hover {
  background: #fff1f0;
  color: var(--zh-blue);
}

/* 当前章节高亮（飞书式） */
.doc-outline-active {
  background: #fff1f0 !important;
  color: var(--zh-blue) !important;
  font-weight: 600;
}

/* 视口不足时不显示大纲（避免遮挡正文） */
@media (max-width: 1480px) {
  .doc-outline {
    display: none;
  }
}

/* ============ 选中浮条 hoverbar 飞书化（白底圆角紧凑） ============ */
.doc-editor :deep(.w-e-hover-bar) {
  border-radius: 8px;
  border: 1px solid #f0eae6;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  padding: 3px;
  /* 窄屏防护：超宽时横向滚动，避免溢出视口 */
  max-width: calc(100vw - 16px);
  overflow-x: auto;
}
.doc-editor :deep(.w-e-hover-bar .w-e-bar-item) {
  height: 28px;
  padding: 2px;
}
.doc-editor :deep(.w-e-hover-bar .w-e-bar-item button) {
  height: 24px;
  border-radius: 6px;
  padding: 0 7px;
}
.doc-editor :deep(.w-e-hover-bar .w-e-bar-item button:hover) {
  background: #fff1f0;
  color: var(--zh-blue);
}
.doc-editor :deep(.w-e-hover-bar .w-e-bar-divider) {
  height: 20px;
  margin: 0 2px;
  background: #f0eae6;
}

/* 编辑器细滚动条（飞书式） */
.doc-editor :deep(.wys-editor)::-webkit-scrollbar,
.doc-editor :deep(.w-e-scroll)::-webkit-scrollbar {
  width: 6px;
}
.doc-editor :deep(.wys-editor)::-webkit-scrollbar-thumb,
.doc-editor :deep(.w-e-scroll)::-webkit-scrollbar-thumb {
  background: #e0d9d3;
  border-radius: 3px;
}
.doc-editor :deep(.wys-editor)::-webkit-scrollbar-thumb:hover,
.doc-editor :deep(.w-e-scroll)::-webkit-scrollbar-thumb:hover {
  background: #c9c2bc;
}
.doc-editor :deep(.wys-editor)::-webkit-scrollbar-track,
.doc-editor :deep(.w-e-scroll)::-webkit-scrollbar-track {
  background: transparent;
}

/* 飞书式文档排版：标题层级 / 段间距 / 引用 / 列表 / 代码块 */
.doc-editor :deep([data-slate-node="element"]) {
  padding: 2px 0;
}

/* 列表符号（• 圆点）飞书式浅灰 */
.doc-editor :deep([data-slate-node="element"] > span[data-w-e-reserve="true"]) {
  color: #c2bab2;
  font-size: 0.9em;
}

.doc-editor :deep(h1[data-slate-node="element"]) {
  font-size: 30px;
  font-weight: 700;
  line-height: 1.4;
  margin: 18px 0 10px;
}

.doc-editor :deep(h2[data-slate-node="element"]) {
  font-size: 24px;
  font-weight: 700;
  line-height: 1.4;
  margin: 16px 0 8px;
}

.doc-editor :deep(h3[data-slate-node="element"]) {
  font-size: 19px;
  font-weight: 600;
  margin: 12px 0 6px;
}

.doc-editor :deep(blockquote[data-slate-node="element"]) {
  border-left: 3px solid var(--zh-blue);
  padding: 6px 14px;
  margin: 8px 0;
  background: #fff7f6;
  color: var(--zh-text-2);
  border-radius: 0 6px 6px 0;
  transition: background 0.15s;
}

.doc-editor :deep(blockquote[data-slate-node="element"]:hover) {
  background: #fff1ef;
}

.doc-editor :deep([data-slate-node="element"]) > div:first-child {
  /* 列表项行距 */
  margin: 3px 0;
}

/* 块 hover 浅背景（飞书式，带淡入过渡） */
.doc-editor :deep(.w-e-text-container [contenteditable] [data-slate-node="element"]) {
  transition: background 0.15s ease;
}
.doc-editor :deep(.w-e-text-container [contenteditable] [data-slate-node="element"]:hover) {
  background: #faf8f6;
  border-radius: 4px;
}

/* 代码块 */
.doc-editor :deep(pre[data-slate-node="element"]) {
  background: #f6f4f2;
  border-radius: 6px;
  padding: 12px 16px;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 13.5px;
  line-height: 1.6;
  margin: 10px 0;
  position: relative;
}

/* 代码块右上角语言标签（飞书式） */
.doc-editor :deep(pre[data-slate-node="element"])::before {
  content: attr(data-lang);
  position: absolute;
  top: 6px;
  right: 10px;
  font-size: 10px;
  letter-spacing: 0.5px;
  color: #b8aea6;
  font-weight: 600;
  font-family: 'SFMono-Regular', Consolas, monospace;
}

/* 表格 */
.doc-editor :deep(table) {
  border-collapse: collapse;
  margin: 10px 0;
  font-size: 14px;
}

.doc-editor :deep(table td),
.doc-editor :deep(table th) {
  border: 1px solid #e5dfda;
  padding: 8px 12px;
  min-width: 60px;
}

.doc-editor :deep(table th) {
  background: #faf8f7;
  font-weight: 600;
}

/* 图片圆角 + 轻阴影 */
.doc-editor :deep(img) {
  border-radius: 6px;
  max-width: 100%;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}

/* 待办事项复选框（飞书式蓝色勾选） */
.doc-editor :deep([data-slate-node="element"] input[type="checkbox"]) {
  margin-right: 8px;
  width: 15px;
  height: 15px;
  cursor: pointer;
  accent-color: var(--zh-blue);
  vertical-align: -2px;
}

/* 分隔线（飞书式：细灰线，hover 淡蓝） */
.doc-editor :deep(.w-e-textarea-divider) {
  margin: 10px 0;
  padding: 0;
}
.doc-editor :deep(.w-e-textarea-divider hr) {
  border: none;
  border-top: 1px solid #e5dfda;
  height: 1px;
  margin: 0;
  border-radius: 0;
  transition: border-color 0.15s;
}
.doc-editor :deep(.w-e-textarea-divider:hover hr) {
  border-top-color: rgba(255, 95, 87, 0.45);
}

/* 链接颜色 */
.doc-editor :deep(a) {
  color: var(--zh-blue);
  text-decoration: none;
}

.doc-editor :deep(a:hover) {
  text-decoration: underline;
}

.ctx-menu {
  position: fixed;
  z-index: 3000;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  padding: 6px;
  min-width: 150px;
}

.ctx-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13.5px;
  color: var(--zh-text);
  cursor: pointer;
  user-select: none;
}

.ctx-item:hover {
  background: #fff1f0;
  color: var(--zh-blue);
}

/* 斜杠菜单键盘导航高亮（飞书式） */
.ctx-item-active {
  background: #fff1f0 !important;
  color: var(--zh-blue);
}

.ctx-sep {
  height: 1px;
  background: #f0eae6;
  margin: 4px 8px;
}

.slash-menu {
  min-width: 200px;
  max-height: 340px;
  overflow-y: auto;
}

/* 斜杠菜单分组标题（飞书式） */
.slash-group {
  padding: 6px 12px 2px;
  font-size: 12px;
  color: var(--zh-text-3);
  user-select: none;
}

/* 斜杠菜单空过滤提示（飞书式） */
.slash-empty {
  padding: 10px 12px;
  font-size: 13px;
  color: var(--zh-text-3);
  text-align: center;
}

/* 内容加载中（长文加载反馈，飞书式） */
.editor-loading {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(2px);
  z-index: 20;
  font-size: 13px;
  color: var(--zh-text-3);
}

.editor-loading-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid #f0eae6;
  border-top-color: var(--zh-blue);
  border-radius: 50%;
  animation: zh-spin 0.8s linear infinite;
}

@keyframes zh-spin {
  to {
    transform: rotate(360deg);
  }
}

/* 表情面板（飞书式，复用全站表情集，可滚动） */
.emoji-panel {
  min-width: 0;
  padding: 8px;
  width: 320px;
  max-height: 300px;
  overflow-y: auto;
}

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 4px;
}

.emoji-cell {
  border: none;
  background: transparent;
  font-size: 20px;
  line-height: 1;
  padding: 6px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.12s;
}

.emoji-cell:hover {
  background: #fff1f0;
}

/* 字数统计（飞书式右下角浅灰小字） */
.word-count {
  position: absolute;
  right: 16px;
  bottom: 10px;
  font-size: 12px;
  color: #c9c2bc;
  pointer-events: none;
  user-select: none;
  z-index: 5;
}

/* 段落左侧块操作 + 按钮（飞书式） */
.block-plus {
  position: absolute;
  left: -34px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: #fff;
  color: var(--zh-text-3);
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.block-plus:hover {
  background: var(--zh-blue);
  color: #fff;
}

/* 段落拖拽手柄（飞书式 ≡，位于 + 按钮左侧） */
.drag-handle {
  position: absolute;
  left: -62px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: var(--zh-text-3);
  cursor: grab;
  user-select: none;
  border-radius: 6px;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.15s;
  z-index: 4;
}

.drag-handle:hover {
  color: var(--zh-blue);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  cursor: grabbing;
}

/* 拖拽目标块高亮（珊瑚色，与全站主题一致） */
.doc-editor :deep(.drag-target) {
  box-shadow: inset 0 0 0 2px rgba(255, 95, 87, 0.35);
  border-radius: 4px;
  background: rgba(255, 95, 87, 0.06) !important;
}

.doc-editor {
  position: relative;
}

.sl-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  font-size: 12px;
  font-weight: 600;
  color: var(--zh-blue);
}

/* 右键菜单行内代码图标 */
.ctx-code {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  font-size: 11px;
  font-family: monospace;
  color: var(--zh-blue);
}

@media (max-width: 768px) {
  .write-page {
    padding: 8px 10px 40px;
    gap: 8px;
  }

  .doc-card {
    padding: 20px 16px;
  }

  .doc-title {
    font-size: 24px;
  }

  .tb-save {
    display: none;
  }

  /* 工具栏窄屏换行，按钮放大可点 */
  .doc-toolbar {
    flex-wrap: wrap;
    gap: 8px;
    padding: 8px 12px;
  }

  .tb-actions {
    flex-wrap: wrap;
    gap: 6px;
  }

  .doc-toolbar .el-button {
    min-height: 36px;
  }

  /* 新建时节点/SEO 元信息在窄屏竖排、全宽 */
  .doc-props,
  .doc-props-more {
    gap: 10px;
  }

  .doc-props .prop,
  .doc-props-more .prop {
    flex: 1 1 100%;
  }

  .doc-props .prop .el-select,
  .doc-props .prop .el-input {
    flex: 1;
    width: auto !important;
  }


  /* 移动端空文档提示居中偏上（飞书式） */
  .doc-editor :deep(.w-e-text-placeholder) {
    left: 0 !important;
    right: 0;
    text-align: center;
    top: 90px !important;
    font-size: 16px;
  }
}

.node-hidden-tag {
  font-size: 12px;
  color: var(--zh-orange, #e6a23c);
  border: 1px solid currentColor;
  border-radius: 3px;
  padding: 0 4px;
  line-height: 16px;
  margin-left: 6px;
}

.prop-help {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 15px;
  height: 15px;
  border-radius: 50%;
  border: 1px solid currentColor;
  font-size: 11px;
  line-height: 1;
  cursor: help;
  opacity: 0.6;
  margin-left: 4px;
  vertical-align: 1px;
}
</style>
