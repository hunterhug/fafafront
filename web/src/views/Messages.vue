<template>
  <div class="msg-center">
    <div class="msg-head">
      <h2 class="msg-title">{{ t('msg.title') }}</h2>
      <div class="msg-tabs">
        <span class="msg-tab" :class="{ active: tab === 'private' }" @click="switchTab('private')">{{ t('msg.private') }}</span>
        <span class="msg-tab" :class="{ active: tab === 'notice' }" @click="switchTab('notice')">
          {{ t('msg.notice') }}<el-badge v-if="unreadNotice" :value="unreadNotice" :max="99" style="margin-left: 4px" />
        </span>
      </div>
      <button class="zh-btn-plain read-all-btn" :disabled="readingAll" @click="markAllRead">
        {{ readingAll ? t('common.loading') : t('msg.markAllRead') }}
      </button>
    </div>

    <!-- ===== 私信：知乎式左右分栏 ===== -->
    <div v-if="tab === 'private'" class="private-layout" :class="{ 'has-peer': activePeerId }">
      <!-- 左：会话列表 -->
      <div class="session-list">
        <el-skeleton v-if="sessionsLoading" :rows="6" animated />
        <template v-else>
          <el-empty v-if="sessions.length === 0" :description="t('msg.noSessions')" :image-size="50" />
          <div
            v-for="s in sessions"
            :key="s.peerId"
            class="session-item"
            :class="{ active: activePeerId === s.peerId }"
            @click="openSession(s)"
          >
            <router-link
              v-if="s.name"
              :to="`/u/${s.name}`"
              class="session-avatar-link"
              :title="t('article.viewProfile')"
              @click.stop
            >
              <el-avatar :size="44" :src="thumbUrl(s.headPhoto)" @error="(e) => fallbackAvatar(e, s)">
                {{ (s.peerName || '?')[0] }}
              </el-avatar>
            </router-link>
            <el-avatar v-else :size="44" :src="thumbUrl(s.headPhoto)" @error="(e) => fallbackAvatar(e, s)">
              {{ (s.peerName || '?')[0] }}
            </el-avatar>
            <div class="session-info">
              <div class="session-top">
                <span class="session-name">{{ s.peerName || t('common.user') }}</span>
                <span class="session-time">{{ timeLabel(s.lastTime) }}</span>
              </div>
              <div class="session-bottom">
                <span class="session-last">{{ s.lastMessage }}</span>
                <span v-if="s.unread > 0" class="session-badge">{{ s.unread > 99 ? '99+' : s.unread }}</span>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- 右：对话窗 -->
      <div class="chat-window">
        <template v-if="activePeerId">
          <div class="chat-head">
            <button class="chat-back" :title="t('common.back')" @click="activePeerId = 0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
            </button>
            <router-link
              v-if="activePeer?.name"
              :to="`/u/${activePeer.name}`"
              class="chat-head-user"
              :title="t('article.viewProfile')"
            >
              <el-avatar
                :size="36"
                :src="thumbUrl(activePeer?.headPhoto)"
                @error="(e) => fallbackAvatar(e, activePeer)"
                class="chat-head-avatar"
              >{{ (activePeer?.peerName || '?')[0] }}</el-avatar>
              <span class="chat-peer">{{ activePeer?.peerName || t('common.user') }}</span>
            </router-link>
            <template v-else>
              <el-avatar
                :size="36"
                :src="thumbUrl(activePeer?.headPhoto)"
                @error="(e) => fallbackAvatar(e, activePeer)"
                class="chat-head-avatar"
              >{{ (activePeer?.peerName || '?')[0] }}</el-avatar>
              <span class="chat-peer">{{ activePeer?.peerName || t('common.user') }}</span>
            </template>
            <router-link
              v-if="activePeer?.name"
              :to="`/u/${activePeer.name}`"
              class="zh-btn-plain chat-view"
            >{{ t('article.viewProfile') }}</router-link>
          </div>
          <div ref="chatBodyRef" class="chat-body">
            <el-empty v-if="chatMessages.length === 0" :description="t('msg.sayHi')" :image-size="50" />
            <template v-for="(m, i) in chatMessages" :key="m.id">
              <!-- 日期分隔（今天/昨天/具体日期） -->
              <div v-if="showDateSep(i)" class="chat-date">{{ dateLabel(m.create_time) }}</div>
              <div class="msg-row" :class="m.send_user_id === meId ? 'right' : 'left'">
                <el-avatar
                  v-if="m.send_user_id !== meId"
                  :size="30"
                  :src="thumbUrl(activePeer?.headPhoto)"
                  @error="(e) => fallbackAvatar(e, activePeer)"
                  class="msg-avatar"
                >{{ (activePeer?.peerName || '?')[0] }}</el-avatar>
                <div class="msg-col">
                  <div class="bubble">
                    <MdPreview :model-value="m.send_message" :editor-id="'mc-msg-' + m.id" class="msg-preview" />
                  </div>
                  <div class="msg-time">
                    {{ timeLabel(m.create_time) }}
                    <button v-if="m.send_user_id === meId" class="msg-del" :title="t('msg.deleteThis')" @click="delPrivate(m)">{{ t('common.delete') }}</button>
                  </div>
                </div>
                <el-avatar
                  v-if="m.send_user_id === meId"
                  :size="30"
                  :src="meAvatar"
                  class="msg-avatar"
                >{{ (userStore.user?.nick_name || t('msg.me'))[0] }}</el-avatar>
              </div>
            </template>
          </div>
          <div class="chat-input">
            <!-- 待发图片预览 -->
            <div v-if="pendingImages.length > 0" class="pending-images">
              <div v-for="(img, idx) in pendingImages" :key="img" class="pending-img">
                <img :src="img" class="pending-thumb" alt="" />
                <button class="pending-remove" @click="pendingImages.splice(idx, 1)">×</button>
              </div>
            </div>
            <!-- 工具栏：图片/GIF + 表情 -->
            <div class="chat-toolbar">
              <el-upload
                :show-file-list="false"
                :http-request="uploadImage"
                accept="image/*"
                style="display: inline-block"
              >
                <button class="tool-btn" :title="t('msg.sendImage')">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                </button>
              </el-upload>
              <button class="tool-btn" :class="{ active: showEmoji }" :title="t('msg.sendEmoji')" @click.stop="showEmoji = !showEmoji">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                  <line x1="9" y1="9" x2="9.01" y2="9" />
                  <line x1="15" y1="9" x2="15.01" y2="9" />
                </svg>
              </button>
              <!-- 表情面板（微信式：表情/GIF，点击外部自动关闭） -->
              <EmojiPicker v-if="showEmoji" @select="insertEmoji" @close="showEmoji = false" />
            </div>
            <el-input
              v-model="draft"
              type="textarea"
              :rows="3"
              resize="none"
              :disabled="!!activePeer?.is_black"
              :placeholder="activePeer?.is_black ? t('msg.blacklisted') : t('msg.inputPlaceholder')"
              @keydown="onDraftKeydown"
            />
            <div class="input-actions">
              <span v-if="activePeer?.is_black" class="send-blocked">
                <span class="send-blocked-icon">!</span>{{ t('msg.cannotSend') }}
              </span>
              <button v-else class="zh-btn-primary" :disabled="sending" @click="send">
                {{ sending ? t('msg.sending') : t('common.send') }}
              </button>
            </div>
          </div>
        </template>
        <el-empty v-else :description="t('msg.selectSession')" />
      </div>
    </div>

    <!-- ===== 通知 ===== -->
    <div v-else class="notice-list">
      <!-- 分类 tab -->
      <div class="notice-cats">
        <span
          v-for="cat in noticeCats"
          :key="cat.key"
          class="notice-cat"
          :class="{ active: noticeCat === cat.key }"
          @click="switchNoticeCat(cat.key)"
        >{{ t(cat.name) }}</span>
      </div>
      <!-- 批量操作 -->
      <div v-if="notices.length > 0 && !noticesLoading" class="notice-batch">
        <el-checkbox :model-value="allSelected" :indeterminate="someSelected" @change="toggleAll">{{ t('msg.selectAll') }}</el-checkbox>
        <el-button size="small" type="danger" plain :disabled="selectedIds.length === 0" @click="batchDelete">{{ t('msg.batchDelete') }}</el-button>
        <span v-if="selectedIds.length > 0" class="batch-count">{{ t('msg.selected', { n: selectedIds.length }) }}</span>
      </div>
      <el-skeleton v-if="noticesLoading" :rows="6" animated />
      <template v-else>
        <el-empty v-if="notices.length === 0" :description="t('msg.noNotices')" :image-size="60" />
        <div
          v-for="m in notices"
          :key="m.id"
          class="notice-item"
          :class="{ unread: m.receive_status === 0 }"
        >
          <el-checkbox
            :model-value="selectedIds.includes(m.id)"
            class="notice-check"
            @change="toggleSelect(m.id)"
            @click.stop
          />
          <div class="notice-icon" v-html="noticeIcon(m.message_type)"></div>
          <div class="notice-content">
            <div class="notice-text">
              <el-tag size="small" :type="typeTag(m.message_type)" style="margin-right: 6px">
                {{ typeName(m.message_type) }}
              </el-tag>
              <template v-for="(seg, i) in buildSegments(m)" :key="i">
                <a
                  v-if="seg.kind !== 'text' && !seg.disabled"
                  class="notice-link"
                  @click.stop="clickSegment(seg)"
                ><span v-if="seg.html" v-html="seg.html"></span><template v-else>{{ seg.text }}</template></a>
                <span v-else-if="seg.kind !== 'text' && seg.disabled" class="notice-link disabled">
                  <span v-if="seg.html" v-html="seg.html"></span><template v-else>{{ seg.text }}</template><span v-if="seg.note" class="notice-note">（{{ seg.note }}）</span>
                </span>
                <span v-else><span v-if="seg.html" v-html="seg.html"></span><template v-else>{{ seg.text }}</template></span>
              </template>
            </div>
            <div class="notice-meta">
              <span>{{ formatTime(m.create_time) }}</span>
              <el-button
                v-if="m.receive_status === 0"
                size="small"
                text
                type="primary"
                @click="readOne(m)"
              >{{ t('msg.markRead') }}</el-button>
              <el-button size="small" text type="danger" @click="deleteOne(m)">{{ t('common.delete') }}</el-button>
            </div>
          </div>
        </div>
        <el-pagination
          v-if="noticeTotalPages > 1"
          class="pager"
          layout="prev, pager, next"
          :total="noticeTotal"
          :page-size="10"
          :current-page="noticePage"
          @current-change="loadNotices"
        />
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { MdPreview } from 'md-editor-v3'
import request from '@/api'
import { useUserStore } from '@/store/user'
import { useSiteStore } from '@/store/site'
import { formatTime } from '@/utils/format'
import EmojiPicker from '@/components/EmojiPicker.vue'
import { t, locale } from '@/i18n'
import { contentUrl } from '@/utils/url'

const userStore = useUserStore()
const site = useSiteStore()
const router = useRouter()
const route = useRoute()
const tab = ref('private')
const meId = computed(() => userStore.user?.id || 0)
const meAvatar = computed(() => userStore.user?.head_photo || '')

/* ---------- 私信：会话列表 ---------- */
const sessions = ref([])
const sessionsLoading = ref(true)
const activePeerId = ref(0)
const activePeer = ref(null)

/* ---------- 私信：对话窗 ---------- */
const chatMessages = ref([])
const draft = ref('')
const sending = ref(false)
const chatBodyRef = ref(null)
// 待发图片（上传后显示预览，发送时转 Markdown 图片消息）
const pendingImages = ref([])
const showEmoji = ref(false)

function insertEmoji(e) {
  draft.value = draft.value ? draft.value + e : e
}

/* ========== 通知 ========== */
const notices = ref([])
const noticesLoading = ref(true)
const noticePage = ref(1)
const noticeTotal = ref(0)
const noticeTotalPages = ref(0)
const unreadNotice = ref(0)
// 关联数据（后端返回：操作者/评论/文章）
const extraUsers = ref({})
const extraComments = ref({})
const extraContents = ref({})

// 批量删除：已选通知 id 集合
const selectedIds = ref([])
const allSelected = computed(() => notices.value.length > 0 && selectedIds.value.length === notices.value.length)
const someSelected = computed(() => selectedIds.value.length > 0 && selectedIds.value.length < notices.value.length)

function toggleSelect(id) {
  const i = selectedIds.value.indexOf(id)
  if (i >= 0) selectedIds.value.splice(i, 1)
  else selectedIds.value.push(id)
}

function toggleAll(val) {
  selectedIds.value = val ? notices.value.map((m) => m.id) : []
}

async function batchDelete() {
  if (selectedIds.value.length === 0) return
  const ids = [...selectedIds.value]
  try {
    await request.post('/api/message/delete', { ids })
    ElMessage.success(t('msg.deletedCount', { n: ids.length }))
    selectedIds.value = []
    loadNotices(noticePage.value)
  } catch (e) {
    ElMessage.error(e.msg || t('common.deleteFailed'))
  }
}

// 截断评论文本
function shortText(text) {
  if (!text) return ''
  const d = String(text).replace(/\s+/g, ' ').trim()
  return d.length > 30 ? d.slice(0, 30) + '…' : d
}

// 转义 HTML（通知正文注入用，先转义再对图片语法做白名单替换，防 XSS）
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// 评论正文 → 内联 HTML（GIF 渲染为 <img>，@提及高亮），其余内容已转义
function renderInline(text) {
  if (!text) return ''
  const esc = escapeHtml(text)
  return esc
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img src="$2" alt="$1" class="nt-gif">')
    .replace(/@([\u4e00-\u9fa5A-Za-z0-9_\-]+)/g, '<span class="nt-at">@$1</span>')
}

// 操作者分段（通知人）
function actorSeg(id) {
  const u = extraUsers.value[id]
  const disabled = !u || !!u.is_black
  const name = u?.name
  const text = u ? u.nick_name || u.name : t('msg.user', { id })
  return { kind: 'user', to: name ? `/u/${name}` : '', text, disabled }
}

// 文章作者分段
function authorSeg(contentId) {
  const c = extraContents.value[contentId]
  const name = c?.user_name
  const disabled = !c || !name || c.is_ban || c.is_hide || c.is_in_rubbish
  return { kind: 'user', to: name ? `/u/${name}` : '', text: name || t('common.user'), disabled }
}

// 文章分段：消息接口返回的文章信息自带 user_name / node_seo / seo，
// 直接拼成 SEO 地址（地址里不出现 id）
function contentSeg(contentId, fallbackTitle) {
  const c = extraContents.value[contentId]
  const to = contentUrl(c)
  const disabled = !c || !to || c.is_ban || c.is_hide || c.is_in_rubbish
  let note = ''
  if (c) {
    if (c.is_ban) note = t('msg.banned')
    else if (c.is_hide) note = t('msg.hidden')
    else if (c.is_in_rubbish) note = t('msg.articleDeleted')
  }
  // 已删除的文章显示占位符，不显示原标题
  if (c?.is_in_rubbish || !c) {
    return { kind: 'content', to: '', text: t('msg.articleDeleted'), note: '', disabled: true }
  }
  const title = c?.title || fallbackTitle || ''
  return { kind: 'content', to, text: title ? t('msg.titleQuote', { title }) : '', note, disabled }
}

// 评论分段
function commentSeg(commentId, contentId, fallback) {
  const c = extraComments.value[commentId]
  const disabled = !c || c.is_ban || c.is_delete
  let note = ''
  if (c) {
    if (c.is_ban) note = t('msg.banned')
    else if (c.is_delete) note = t('msg.commentDeleted')
  }
  // 评论要跳到文章页并用 ?comment= 定位楼层，地址同样由文章 SEO 三元组拼出
  const contentLink = contentUrl(extraContents.value[contentId])
  const to = contentLink && commentId ? `${contentLink}?comment=${commentId}` : ''
  // 已删除的评论显示占位符，不显示原内容
  if (c?.is_delete || !c) {
    return { kind: 'comment', to: '', text: t('msg.commentDeleted'), note: '', disabled: true }
  }
  const raw = c?.describe || fallback || ''
  const text = shortText(raw)
  const quoted = text ? t('msg.quoteText', { text }) : ''
  const seg = { kind: 'comment', to, text: quoted, note, disabled: disabled || !to }
  // 评论含 GIF：渲染为图片（其余文本转义后安全注入）
  if (/!\[[^\]]*\]\([^)\s]+\)/.test(raw)) {
    seg.html = t('msg.quoteText', { text: renderInline(raw) })
  }
  return seg
}

function T(text) {
  return { kind: 'text', text }
}

// 通知分类（后端 message_types 数组过滤，排序按时间倒序）
const noticeCats = [
  { key: 'all', name: 'msg.catAll' },
  { key: 'comment', name: 'msg.catComment', types: [0, 1] },
  { key: 'like', name: 'msg.catLike', types: [2, 3] },
  { key: 'follow', name: 'msg.catFollow', types: [8] },
  { key: 'system', name: 'msg.catSystem', types: [4, 5, 6, 7, 9, 11] }
]
const noticeCat = ref('all')

function switchNoticeCat(key) {
  noticeCat.value = key
  loadNotices(1)
}

function switchTab(t) {
  tab.value = t
  if (t === 'private') loadSessions()
  else loadNotices(1)
}

/* ========== 会话列表 ========== */
// 会话列表最后消息展示：图片 Markdown 简化成 [图片]
function displayText(msg) {
  if (!msg) return ''
  let msgText = String(msg).replace(/!\[[^\]]*\]\([^)]*\)/g, t('msg.image')).replace(/\n+/g, ' ')
  if (msgText.length > 40) msgText = msgText.slice(0, 40) + '…'
  return msgText
}

async function loadSessions(autoOpen = false) {
  sessionsLoading.value = true
  try {
    const res = await request.post('/api/message/list', {
      message_type: 10,
      receive_status: -1,
      chanel_user_id: 0,
      limit: 100,
      page: 1
    })
    const list = res.data.messages || []
    const map = new Map()
    // 统计每个会话的未读数
    const unreadMap = new Map()
    for (const m of list) {
      const peerId = m.send_user_id === meId.value ? m.receive_user_id : m.send_user_id
      if (!peerId) continue
      if (m.receive_user_id === meId.value && m.receive_status === 0) {
        unreadMap.set(peerId, (unreadMap.get(peerId) || 0) + 1)
      }
      if (map.has(peerId)) continue
      map.set(peerId, { peerId, lastMessage: displayText(m.send_message), lastTime: m.create_time, unread: 0 })
    }
    sessions.value = Array.from(map.values())
    // 会话按最后消息时间倒序（最新会话在最上）
    sessions.value.sort((a, b) => (b.lastTime || 0) - (a.lastTime || 0))
    // 应用未读数
    sessions.value.forEach((s) => (s.unread = unreadMap.get(s.peerId) || 0))
    // 拉取对端昵称/头像
    for (const s of sessions.value) {
      request
        .post('/app/u/info', { user_id: s.peerId })
        .then((r) => {
          s.peerName = r.data?.nick_name || r.data?.name
          s.headPhoto = r.data?.head_photo || ''
          s.name = r.data?.name
          s.is_black = !!r.data?.is_in_black
          if (s.peerId === activePeerId.value) {
            activePeer.value = { ...activePeer.value, peerName: s.peerName, headPhoto: s.headPhoto, name: r.data?.name, is_black: s.is_black }
          }
        })
        .catch(() => {})
    }
    // 不自动打开首个会话，停留在会话列表页（用户手动点选进入）
    if (autoOpen && sessions.value.length > 0 && !activePeerId.value) {
      openSession(sessions.value[0])
    }
  } catch (e) {
    sessions.value = []
  } finally {
    sessionsLoading.value = false
  }
}

async function openSession(s) {
  activePeerId.value = s.peerId
  activePeer.value = { ...s }
  await loadChat()
}

/* ========== 对话 ========== */
async function loadChat() {
  if (!activePeerId.value) return
  try {
    const res = await request.post('/api/message/list', {
      message_type: 10,
      receive_status: -1,
      chanel_user_id: activePeerId.value,
      limit: 100,
      page: 1
    })
    chatMessages.value = (res.data.messages || []).reverse()
    // 打开对话即自动已读该会话的未读消息
    const unreadIds = chatMessages.value
      .filter((m) => m.receive_status === 0 && m.receive_user_id === meId.value)
      .map((m) => m.id)
    if (unreadIds.length > 0) {
      request.post('/api/message/read', { ids: unreadIds }).then(() => {
        // 会话角标即时清零
        const s = sessions.value.find((x) => x.peerId === activePeerId.value)
        if (s) s.unread = 0
        window.dispatchEvent(new CustomEvent('unread-updated'))
      }).catch(() => {})
    }
    scrollChat()
  } catch (e) {
    chatMessages.value = []
  }
}

async function send() {
  if (!activePeerId.value) return
  if (activePeer.value?.is_black) {
    ElMessage.error(t('msg.sendBlocked'))
    return
  }
  const imgs = pendingImages.value.map((u) => `![${t('msg.image')}](${u})`).join('\n')
  const text = [imgs, draft.value.trim()].filter(Boolean).join('\n')
  if (!text) return
  sending.value = true
  try {
    await request.post('/api/message/private/send', {
      user_id: activePeerId.value,
      message: text
    })
    draft.value = ''
    pendingImages.value = []
    await loadChat()
    loadSessions()
    // 更新会话列表最后一条
    const s = sessions.value.find((x) => x.peerId === activePeerId.value)
    if (s) {
      s.lastMessage = displayText(text)
      s.lastTime = Math.floor(Date.now() / 1000)
    }
  } catch (e) {
    if (e.id === 110013) {
      ElMessage.warning(t('msg.pmLimit'))
    } else {
      ElMessage.error(e.msg || t('common.sendFailed'))
    }
  } finally {
    sending.value = false
  }
}

// 回车发送（Shift+Enter 换行；中文输入法组合期间不触发）
function onDraftKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault()
    send()
  }
}

async function uploadImage({ file }) {
  const fd = new FormData()
  fd.append('type', 'image')
  fd.append('describe', 'chat image')
  fd.append('tag', 'chat')
  fd.append('file', file)
  try {
    const res = await request.post('/api/file/upload', fd)
    const path = res.data?.url || res.data?.path || res.data?.file_path || ''
    if (path) {
      pendingImages.value.push(path)
      ElMessage.success(t('msg.sendImage'))
    } else {
      ElMessage.error(t('common.failed'))
    }
  } catch (e) {
    ElMessage.error(e.msg || t('common.failed'))
  }
}

function scrollChat() {
  nextTick(() => {
    if (chatBodyRef.value) chatBodyRef.value.scrollTop = chatBodyRef.value.scrollHeight
  })
}

/* ========== 时间/头像工具（小红书风格） ========== */
// 会话/气泡时间：今天显示 HH:mm，昨天显示"昨天"，更早显示 月-日
function timeLabel(ts) {
  if (!ts) return ''
  const d = new Date(ts * 1000)
  const now = new Date()
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000
  if (ts >= startToday) {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }
  if (ts >= startToday - 86400) return t('common.yesterday')
  return `${d.getMonth() + 1}-${d.getDate()}`
}

// 对话窗内日期分隔：今天/昨天/具体日期
function dateLabel(ts) {
  const d = new Date(ts * 1000)
  const now = new Date()
  const startOfDay = (t) => {
    const x = new Date(t * 1000)
    x.setHours(0, 0, 0, 0)
    return x.getTime() / 1000
  }
  const diff = startOfDay(now.getTime() / 1000) - startOfDay(ts)
  if (diff === 0) return t('common.today')
  if (diff === 86400) return t('common.yesterday')
  // 具体日期：中文用 年月日，其他语言用本地化格式
  if (locale.value === 'zh') return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
  try {
    return d.toLocaleDateString(locale.value === 'zh' ? 'zh-CN' : locale.value)
  } catch (e) {
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
  }
}

// 与上一条消息是否跨天（显示日期分隔）
function showDateSep(i) {
  if (i === 0) return true
  const prev = chatMessages.value[i - 1]
  const cur = chatMessages.value[i]
  const startOfDay = (ts) => {
    const x = new Date(ts * 1000)
    x.setHours(0, 0, 0, 0)
    return x.getTime()
  }
  return startOfDay(prev.create_time) !== startOfDay(cur.create_time)
}

// 头像缩略图（/storage/ → /storage_x/），失败回退原图
function thumbUrl(url) {
  if (!url) return undefined
  return url.includes('/storage/') ? url.replace('/storage/', '/storage_x/') : url
}

function fallbackAvatar(e, u) {
  if (u && u.headPhoto) {
    e.target.src = u.headPhoto
    e.target.onerror = null
    return false
  }
  return true
}

/* ========== 新消息轮询（10 秒） ========== */
let pollTimer = null
let lastMaxMsgId = 0

async function pollPrivate() {
  if (document.hidden || !userStore.isLogin) return
  try {
    const res = await request.post('/api/message/list', {
      message_type: 10,
      receive_status: -1,
      chanel_user_id: 0,
      limit: 20,
      page: 1
    })
    const ms = res.data.messages || []
    if (ms.length === 0) return
    const maxId = Math.max(...ms.map((m) => m.id))
    if (maxId <= lastMaxMsgId) return
    const activeHasNew = ms.some(
      (m) =>
        m.id > lastMaxMsgId &&
        (m.send_user_id === activePeerId.value || m.receive_user_id === activePeerId.value)
    )
    lastMaxMsgId = maxId
    // 当前会话有新消息：刷新对话（loadChat 会自动已读）
    if (activeHasNew && activePeerId.value) {
      await loadChat()
    }
    await loadSessions(false)
    // 通知顶部铃铛刷新未读数
    window.dispatchEvent(new CustomEvent('unread-updated'))
  } catch (e) {
    // 轮询失败静默
  }
}

/* ========== 通知 ========== */
// 通知类型名 → i18n key（msg.typeXxx）
const TYPE_NAME_KEYS = {
  0: 'msg.typeCommentContent', 1: 'msg.typeCommentComment', 2: 'msg.typeLikeContent', 3: 'msg.typeLikeComment',
  4: 'msg.typeBanContent', 5: 'msg.typeBanComment', 6: 'msg.typeRecoverContent', 7: 'msg.typeRecoverComment',
  8: 'msg.typeFollow', 9: 'msg.typePublish', 10: 'msg.typePrivate', 11: 'msg.typeGlobal'
}
function typeName(tp) {
  return t(TYPE_NAME_KEYS[tp] || 'msg.systemMsg')
}
const S = (d) => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`
const TYPE_ICONS = {
  0: S('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'),
  1: S('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'),
  2: S('<path d="M2 20h2c.6 0 1-.4 1-1v-9c0-.6-.4-1-1-1H2v11z"/><path d="M21.8 9.8c-.3-.5-.8-.8-1.3-.8H15l.6-2.6c.1-.5 0-1-.3-1.4-.3-.4-.7-.6-1.2-.6h-.8c-.5 0-.9.2-1.2.6l-3.5 4.2c-.3.3-.4.8-.4 1.2v7c0 1.1.9 2 2 2h6.6c.8 0 1.5-.5 1.8-1.3l2.3-5.4v-3.5c0-.6-.2-1.2-.6-1.6z"/>'),
  3: S('<path d="M2 20h2c.6 0 1-.4 1-1v-9c0-.6-.4-1-1-1H2v11z"/><path d="M21.8 9.8c-.3-.5-.8-.8-1.3-.8H15l.6-2.6c.1-.5 0-1-.3-1.4-.3-.4-.7-.6-1.2-.6h-.8c-.5 0-.9.2-1.2.6l-3.5 4.2c-.3.3-.4.8-.4 1.2v7c0 1.1.9 2 2 2h6.6c.8 0 1.5-.5 1.8-1.3l2.3-5.4v-3.5c0-.6-.2-1.2-.6-1.6z"/>'),
  4: S('<circle cx="12" cy="12" r="10"/><line x1="4.9" y1="4.9" x2="19.1" y2="19.1"/>'),
  5: S('<circle cx="12" cy="12" r="10"/><line x1="4.9" y1="4.9" x2="19.1" y2="19.1"/>'),
  6: S('<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>'),
  7: S('<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>'),
  8: S('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'),
  9: S('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>'),
  10: S('<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>'),
  11: S('<path d="M3 11l18-8-8 18-2-8-8-2z"/>')
}

function typeTag(t) {
  if (t === 10) return 'primary'
  if (t === 11) return 'success'
  if (t === 8) return 'warning'
  return 'info'
}

function noticeIcon(t) {
  return TYPE_ICONS[t] || S('<path d="M18 8a3 3 0 0 1 0 6"/><path d="M6 9v6"/><path d="M3 9v6h4l7 4V5L7 9H3z"/>')
}

function buildSegments(m) {
  const segs = []
  switch (m.message_type) {
    case 0:
      segs.push(actorSeg(m.user_id), T(t('msg.notifyCommented')), contentSeg(m.content_id, m.content_title))
      if (m.comment_id) segs.push(T(t('msg.notifyColon')), commentSeg(m.comment_id, m.content_id, m.comment_describe))
      break
    case 1: {
      segs.push(
        actorSeg(m.user_id),
        T(t('msg.notifyIn')),
        authorSeg(m.content_id),
        T(t('msg.notifyOf')),
        contentSeg(m.content_id, m.content_title),
        T(t('msg.notifyRepliedIn'))
      )
      // 被评论的评论（你的评论）
      const repliedId = m.reply_comment_id || m.comment_id
      if (repliedId) segs.push(T(' '), commentSeg(repliedId, m.content_id, ''))
      // 新回复内容（评论和被评论都要出现）
      if (m.reply_comment_id && m.comment_id) {
        segs.push(T(t('msg.notifyReplyColon')), commentSeg(m.comment_id, m.content_id, m.comment_describe))
      }
      break
    }
    case 2:
      segs.push(actorSeg(m.user_id), T(t('msg.notifyLikedContent')), contentSeg(m.content_id, m.content_title))
      break
    case 3:
      segs.push(actorSeg(m.user_id), T(t('msg.notifyLikedComment')))
      if (m.comment_id) segs.push(T(' '), commentSeg(m.comment_id, m.content_id, m.comment_describe))
      break
    case 4:
      segs.push(T(t('msg.notifyYourContent')), contentSeg(m.content_id, m.content_title), T(t('msg.notifyBannedTail')))
      break
    case 5:
      segs.push(T(t('msg.notifyYourCommentBanned')))
      if (m.comment_id) segs.push(T(' '), commentSeg(m.comment_id, m.content_id, m.comment_describe))
      break
    case 6:
      segs.push(T(t('msg.notifyYourContent')), contentSeg(m.content_id, m.content_title), T(t('msg.notifyRecoveredTail')))
      break
    case 7:
      segs.push(T(t('msg.notifyYourCommentRecovered')))
      if (m.comment_id) segs.push(T(' '), commentSeg(m.comment_id, m.content_id, m.comment_describe))
      break
    case 8:
      segs.push(actorSeg(m.user_id), T(t('msg.notifyFollowed')))
      break
    case 9:
      segs.push(T(t('msg.notifyYouFollowed')), actorSeg(m.user_id), T(t('msg.notifyPublished')), contentSeg(m.content_id, m.content_title))
      break
    case 11: {
      const msg = m.send_message || t('msg.typeGlobal')
      const s = T(msg)
      if (/!\[[^\]]*\]\([^)\s]+\)/.test(msg)) s.html = renderInline(msg)
      segs.push(s)
      break
    }
    default:
      segs.push(T(m.comment_describe || m.send_message || ''))
      break
  }
  return segs
}

async function loadNotices(p = 1) {
  noticesLoading.value = true
  noticePage.value = p
  selectedIds.value = []
  const cat = noticeCats.find((c) => c.key === noticeCat.value)
  try {
    const res = await request.post('/api/message/list', {
      message_type: cat?.types ? -1 : -1,
      message_types: cat?.types || [],
      receive_status: -1,
      chanel_user_id: 0,
      limit: 10,
      page: p
    })
    notices.value = (res.data.messages || []).filter((m) => m.message_type !== 10)
    // 关联数据：操作者昵称/评论内容/文章标题
    extraUsers.value = res.data.extra_users || {}
    extraComments.value = res.data.extra_comments || {}
    extraContents.value = res.data.contents || {}
    noticeTotal.value = res.data.total || 0
    noticeTotalPages.value = res.data.total_pages || 0
    const un = res.data?.un_read || {}
    unreadNotice.value = Object.entries(un).reduce((a, [k, v]) => {
      return a + (Number(k) !== 10 ? Number(v) : 0)
    }, 0)
    // 浏览器标题带未读数提示
    document.title = unreadNotice.value > 0 ? `(${unreadNotice.value}) ${t('msg.title')} - ${site.siteTitle}` : `${t('msg.title')} - ${site.siteTitle}`
    // 进入通知页即自动已读当前页未读通知
    const unreadIds = notices.value.filter((m) => m.receive_status === 0).map((m) => m.id)
    if (unreadIds.length > 0) {
      request.post('/api/message/read', { ids: unreadIds }).then(() => {
        window.dispatchEvent(new CustomEvent('unread-updated'))
      }).catch(() => {})
      notices.value.forEach((m) => (m.receive_status = 1))
      unreadNotice.value = 0
    }
  } catch (e) {
    notices.value = []
  } finally {
    noticesLoading.value = false
  }
}

async function readOne(m) {
  try {
    await request.post('/api/message/read', { ids: [m.id] })
    m.receive_status = 1
    ElMessage.success(t('msg.markRead'))
  } catch (e) {
    ElMessage.error(e.msg || t('common.failed'))
  }
}

const readingAll = ref(false)

// 点击通知里的链接（人/文章/评论）
function clickSegment(seg) {
  if (!seg.to) return
  router.push(seg.to)
}

// 一键全部已读（循环拉未读 ids）
async function markAllRead() {
  readingAll.value = true
  try {
    const ids = []
    let p = 1
    while (true) {
      const res = await request.post('/api/message/list', {
        message_type: -1,
        receive_status: 0,
        chanel_user_id: 0,
        limit: 100,
        page: p
      })
      const ms = res.data.messages || []
      ids.push(...ms.map((m) => m.id))
      if (ms.length < 100) break
      p++
    }
    if (ids.length > 0) {
      await request.post('/api/message/read', { ids })
      ElMessage.success(t('msg.readAll', { n: ids.length }))
      window.dispatchEvent(new CustomEvent('unread-updated'))
    } else {
      ElMessage.info(t('msg.noUnread'))
    }
    if (tab.value === 'notice') loadNotices(1)
    else loadSessions()
  } catch (e) {
    ElMessage.error(e.msg || t('common.failed'))
  } finally {
    readingAll.value = false
  }
}

async function deleteOne(m) {
  try {
    await request.post('/api/message/delete', { ids: [m.id] })
    ElMessage.success(t('common.deleted'))
    loadNotices(noticePage.value)
  } catch (e) {
    ElMessage.error(e.msg || t('common.deleteFailed'))
  }
}

onMounted(async () => {
  await loadSessions()
  await handlePeerQuery()
  // 记录当前已知最大消息 id，启动轮询
  const first = await request
    .post('/api/message/list', { message_type: 10, receive_status: -1, chanel_user_id: 0, limit: 1, page: 1 })
    .then((r) => (r.data?.messages || [])[0])
    .catch(() => null)
  lastMaxMsgId = first?.id || 0
  pollTimer = setInterval(pollPrivate, 5000)
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})

// 删除自己发出的私信（对方仍可见，仅本端移除）
async function delPrivate(m) {
  try {
    await request.post('/api/message/private/delete', { ids: [m.id] })
    ElMessage.success(t('msg.deleteThis'))
    await loadChat()
    loadSessions()
  } catch (e) {
    ElMessage.error(e.msg || t('common.deleteFailed'))
  }
}

// 从 ?peer=userId 打开与该用户的会话（没有历史则新建空对话，发第一条即建立）
async function handlePeerQuery() {
  const pid = Number(route.query.peer)
  if (!pid || pid === meId.value) return
  tab.value = 'private'
  const exist = sessions.value.find((s) => s.peerId === pid)
  if (exist) {
    openSession(exist)
    return
  }
  activePeerId.value = pid
  activePeer.value = { peerId: pid, lastMessage: '', lastTime: 0, peerName: t('common.user') }
  try {
    const r = await request.post('/app/u/info', { user_id: pid })
    activePeer.value.peerName = r.data?.nick_name || r.data?.name || t('common.user')
    activePeer.value.name = r.data?.name || ''
  } catch (e) {}
  await loadChat()
}
</script>

<style scoped>
.msg-center {
  width: 100%;
}

.msg-head {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-bottom: 12px;
}

.msg-title {
  font-size: 22px;
  font-weight: 700;
}

.msg-tabs {
  display: flex;
  gap: 20px;
}

.msg-tab {
  font-size: 15px;
  color: var(--zh-text-2);
  cursor: pointer;
  padding: 8px 4px;
}

.msg-tab:hover {
  color: var(--zh-blue);
}

.msg-tab.active {
  color: var(--zh-blue);
  font-weight: 600;
  border-bottom: 3px solid var(--zh-blue);
}

.read-all-btn {
  margin-left: auto;
  padding: 5px 14px;
  font-size: 13px;
}

.notice-item.clickable {
  cursor: pointer;
}

.notice-item.clickable:hover {
  background: #faf7f5;
}

.notice-action {
  color: var(--zh-blue);
  font-weight: 600;
  cursor: pointer;
}

.notice-action:hover {
  text-decoration: underline;
}

.notice-link {
  color: var(--zh-blue);
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
}

.notice-link:hover {
  text-decoration: underline;
}

.notice-link.disabled {
  color: var(--zh-text-3);
  font-weight: 400;
  cursor: default;
  text-decoration: none;
}

.notice-link.disabled:hover {
  text-decoration: none;
}

.notice-note {
  color: var(--zh-text-3);
  font-weight: 400;
}

/* 私信左右布局 */
.private-layout {
  display: flex;
  background: #fff;
  border-radius: var(--zh-radius);
  overflow: hidden;
  box-shadow: var(--zh-shadow);
  min-height: 560px;
}

.session-list {
  width: 300px;
  flex-shrink: 0;
  border-right: 1px solid var(--zh-border);
  overflow-y: auto;
  max-height: 640px;
}

.session-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  cursor: pointer;
  border-bottom: 1px solid #f7f5f2;
  transition: background 0.2s;
}

.session-item:hover {
  background: #faf8f6;
}

.session-item.active {
  background: #fff3f1;
}

.session-avatar-link {
  display: flex;
  flex-shrink: 0;
  border-radius: 50%;
}

.session-info {
  flex: 1;
  min-width: 0;
}

.session-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.session-name {
  font-weight: 600;
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-time {
  color: var(--zh-text-3);
  font-size: 11px;
  flex-shrink: 0;
}

.session-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 3px;
}

.session-last {
  color: var(--zh-text-3);
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 未读数字角标 */
.session-badge {
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: var(--zh-blue);
  color: #fff;
  font-size: 11px;
  line-height: 18px;
  text-align: center;
  flex-shrink: 0;
}

/* 对话窗 */
.chat-window {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.chat-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 20px;
  border-bottom: 1px solid var(--zh-border);
}

.chat-back {
  display: none;
  border: none;
  background: none;
  color: var(--zh-text-2);
  cursor: pointer;
  padding: 6px;
  border-radius: 8px;
  flex-shrink: 0;
}

.chat-back:hover {
  background: #faf7f5;
  color: var(--zh-blue);
}

.chat-head-avatar {
  flex-shrink: 0;
}

.chat-head-user {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: inherit;
  min-width: 0;
}

.chat-head-user:hover .chat-peer {
  color: var(--zh-blue);
}

.chat-peer {
  font-size: 16px;
  font-weight: 600;
}

.chat-view {
  margin-left: auto;
  padding: 4px 12px;
  font-size: 12px;
}

.chat-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
  background: #faf8f6;
  max-height: 440px;
}

/* 日期分隔 */
.chat-date {
  text-align: center;
  color: var(--zh-text-3);
  font-size: 12px;
  margin: 14px 0 10px;
}

.chat-date::before,
.chat-date::after {
  content: '';
  display: inline-block;
  width: 24px;
  height: 1px;
  background: #e8e2dd;
  vertical-align: middle;
  margin: 0 10px;
}

.msg-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 16px;
}

.msg-row.right {
  justify-content: flex-end;
}

.msg-row.left {
  justify-content: flex-start;
}

.msg-col {
  display: flex;
  flex-direction: column;
  max-width: 72%;
}

.msg-row.right .msg-col {
  align-items: flex-end;
}

.msg-row.left .msg-col {
  align-items: flex-start;
}

.msg-avatar {
  flex-shrink: 0;
  margin-top: 2px;
}

.bubble {
  padding: 9px 14px;
  border-radius: 16px;
  font-size: 14px;
  line-height: 1.6;
  word-break: break-word;
  box-shadow: 0 1px 2px rgba(24, 18, 16, 0.04);
}

/* 我发出的：微信式浅绿气泡 + 深色文字 */
.msg-row.right .bubble {
  background: #95ec69;
  color: #1a1a1a;
  border-bottom-right-radius: 4px;
}

/* 对方发的：白色气泡 + 描边 */
.msg-row.left .bubble {
  background: #fff;
  color: var(--zh-text);
  border: 1px solid #f0e9e3;
  border-bottom-left-radius: 4px;
}

.msg-preview {
  /* MdPreview(md-editor-v3) 默认带白色背景，去掉让气泡底色透出 */
  background: transparent !important;
}

.msg-preview :deep(p) {
  margin: 0;
}

.msg-preview :deep(img) {
  max-width: 240px;
  border-radius: 8px;
  display: block;
}

.msg-time {
  color: var(--zh-text-3);
  font-size: 11px;
  margin-top: 4px;
}

.msg-del {
  border: none;
  background: none;
  color: var(--zh-text-3);
  font-size: 11px;
  cursor: pointer;
  padding: 0 0 0 6px;
  opacity: 0;
  transition: opacity 0.2s;
}

.msg-row:hover .msg-del {
  opacity: 1;
}

.msg-del:hover {
  color: #ff665e;
}

.chat-input {
  padding: 12px 20px 16px;
  border-top: 1px solid var(--zh-border);
}

.chat-toolbar {
  position: relative;
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 6px;
}

.tool-btn {
  border: none;
  background: none;
  color: var(--zh-text-3);
  cursor: pointer;
  padding: 4px 6px;
  border-radius: var(--zh-radius);
  transition: all 0.2s;
}

.tool-btn:hover {
  color: var(--zh-blue);
  background: #fff3f1;
}

.tool-btn.active {
  color: var(--zh-blue);
  background: #fff3f1;
}

/* 待发图片预览 */
.pending-images {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.pending-img {
  position: relative;
  width: 72px;
  height: 72px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #f0e9e3;
}

.pending-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.pending-remove {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 18px;
  height: 18px;
  line-height: 16px;
  text-align: center;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  padding: 0;
}

.pending-remove:hover {
  background: rgba(0, 0, 0, 0.8);
}

/* 表情面板 */
.input-actions {
  margin-top: 8px;
  display: flex;
  justify-content: flex-end;
}

.send-blocked {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #f56c6c;
  font-size: 13px;
}

.send-blocked-icon {
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #fef0f0;
  color: #f56c6c;
  font-size: 12px;
  font-weight: 700;
}

/* 通知列表 */
.notice-list {
  background: #fff;
  border-radius: var(--zh-radius);
  box-shadow: var(--zh-shadow);
}

.notice-cats {
  display: flex;
  gap: 20px;
  padding: 12px 20px 0;
  border-bottom: 1px solid #faf7f5;
}

.notice-cat {
  font-size: 14px;
  color: var(--zh-text-2);
  cursor: pointer;
  padding: 6px 2px;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}

.notice-cat:hover {
  color: var(--zh-blue);
}

.notice-cat.active {
  color: var(--zh-blue);
  font-weight: 600;
  border-bottom-color: var(--zh-blue);
}

.notice-batch {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 20px;
  border-bottom: 1px solid #faf7f5;
  background: #faf7f5;
}

.batch-count {
  color: var(--zh-text-3);
  font-size: 12px;
}

.notice-check {
  flex-shrink: 0;
  margin-top: 2px;
}

.notice-item {
  display: flex;
  gap: 12px;
  padding: 14px 20px;
  border-bottom: 1px solid #faf7f5;
}

.notice-item.unread {
  background: #fff7f5;
}

.notice-icon {
  width: 32px;
  color: var(--zh-blue);
  display: flex;
  align-items: center;
  justify-content: center;
}

.notice-content {
  flex: 1;
  min-width: 0;
}

.notice-text {
  font-size: 14px;
  color: var(--zh-text);
  line-height: 1.6;
}

/* v-html 注入的通知正文（GIF/@提及）不带 scope 属性，需 :deep */
.notice-text :deep(.nt-gif) {
  max-width: 160px;
  max-height: 160px;
  border-radius: 8px;
  display: inline-block;
  vertical-align: middle;
  margin: 0 2px;
}

.notice-text :deep(.nt-at) {
  color: var(--zh-blue);
  font-weight: 600;
}

.notice-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 4px;
  color: var(--zh-text-3);
  font-size: 12px;
}

.pager {
  margin-top: 16px;
  justify-content: center;
  padding-bottom: 12px;
}
/* ===== 移动端适配：私信改上下布局；进入会话后只显示聊天（列表 or 聊天） ===== */
@media (max-width: 768px) {
  .private-layout {
    flex-direction: column;
    min-height: 0;
  }
  .session-list {
    width: 100%;
    max-height: 180px;
    border-right: none;
    border-bottom: 1px solid var(--zh-border);
  }

  /* 进入会话后隐藏会话列表，聊天全屏 */
  .private-layout.has-peer .session-list {
    display: none;
  }

  /* 未选择会话：会话列表占满，隐藏空聊天区（去掉下方大块空白） */
  .private-layout:not(.has-peer) .chat-window {
    display: none;
  }
  .private-layout:not(.has-peer) .session-list {
    max-height: none;
    flex: 1;
    border-bottom: none;
  }

  /* 移动端会话全屏（微信式）：覆盖顶部菜单与底部 tabbar，消息区内部滚动、输入框贴底 */
  .private-layout.has-peer {
    position: fixed;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
    z-index: 300;
    border-radius: 0;
    box-shadow: none;
    height: 100vh;
    height: 100dvh;
    min-height: 0;
  }
  .private-layout.has-peer .chat-window {
    min-height: 0;
  }

  .chat-back {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .chat-head {
    flex-shrink: 0;
  }

  /* 消息区占满剩余高度并内部滚动，不再用固定 max-height */
  .chat-body {
    flex: 1;
    max-height: none;
    min-height: 0;
  }

  .chat-input {
    flex-shrink: 0;
  }

  .msg-head {
    flex-wrap: wrap;
    gap: 8px;
  }
}

</style>
