<template>
  <div class="comment-node">
    <div class="cn-head">
      <router-link
        v-if="author?.name && !info?.is_anonymous"
        :to="`/u/${author.name}`"
        class="cn-author-link"
        :title="t('article.viewProfile')"
      >
        <el-avatar :size="28" class="cn-avatar" :src="thumbUrl(author?.head_photo)">
          {{ authorName[0] }}
        </el-avatar>
        <span class="cn-nick">{{ authorName }}</span>
      </router-link>
      <template v-else>
        <el-avatar :size="28" class="cn-avatar" :src="thumbUrl(author?.head_photo)">
          {{ authorName[0] }}
        </el-avatar>
        <span class="cn-nick">{{ authorName }}</span>
      </template>
      <el-tag v-if="author && author.is_vip" size="small" type="success" class="vip-tag">VIP</el-tag>
      <span class="cn-time">{{ formatTime(info?.create_time) }}</span>
    </div>

    <!-- 原消息引用（回复 @xxx：被回复的内容）
         点 @某人 → 他的主页；点其余部分 → 跳到被回复的那条评论 -->
    <div
      v-if="quoteText"
      class="cn-quote"
      :title="t('article.jumpToComment')"
      @click.stop="$emit('jump', cm.comment_id)"
    >
      <span class="quote-label">{{ t('article.reply') }}</span>
      <router-link
        v-if="quoteAuthorName"
        :to="`/u/${quoteAuthorName}`"
        class="quote-target"
        :title="t('article.viewProfile')"
        @click.stop
      >@{{ quoteAuthor }}</router-link>
      <span v-else class="quote-target">@{{ quoteAuthor }}</span>
      <span class="quote-body">：{{ quoteText }}</span>
    </div>

    <div class="cn-body">
      <el-alert v-if="info && info.is_ban" type="warning" :closable="false" :title="t('article.bannedComment')" />
      <el-alert v-else-if="info && info.is_delete" type="info" :closable="false" :title="t('article.deletedComment')" />
      <span v-else v-html="bodyHtml"></span>
    </div>
    <div v-if="info && !info.is_ban && !info.is_delete" class="cn-foot">
      <button class="cn-action like" :class="{ liked: info.is_cool }" @click.stop="cool"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M2 20h2c.6 0 1-.4 1-1v-9c0-.6-.4-1-1-1H2v11zm19.8-10.2c-.3-.5-.8-.8-1.3-.8H15l.6-2.6c.1-.5 0-1-.3-1.4-.3-.4-.7-.6-1.2-.6h-.8c-.5 0-.9.2-1.2.6l-3.5 4.2c-.3.3-.4.8-.4 1.2v7c0 1.1.9 2 2 2h6.6c.8 0 1.5-.5 1.8-1.3l2.3-5.4v-3.5c0-.6-.2-1.2-.6-1.6z" /></svg>{{ info.cool || 0 }}</button>
      <button v-if="userStore.isLogin" class="cn-action" @click.stop="bad">{{ t('article.report') }}</button>
      <button
        v-if="userStore.isLogin"
        class="cn-action"
        :class="{ 'reply-disabled': replyDisabled }"
        :disabled="replyDisabled"
        :title="replyDisabled ? t('article.commentsClosed') : t('article.reply')"
        @click.stop="$emit('reply')"
      >{{ t('article.reply') }}</button>
      <button v-if="info?.is_yourself && info?.is_anonymous" class="cn-action" @click.stop="realName">{{ t('article.cancelAnonymity') }}</button>
      <button v-if="info?.is_yourself" class="cn-action danger" @click.stop="remove">{{ t('common.delete') }}</button>
    </div>

    <!-- 举报对话框 -->
    <ReportDialog v-model:visible="reportVisible" @confirm="handleReport" />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/api'
import { useUserStore } from '@/store/user'
import { formatTime } from '@/utils/format'
import ReportDialog from '@/components/ReportDialog.vue'
import { t } from '@/i18n'

const props = defineProps({
  cm: { type: Object, required: true },
  extra: { type: Object, required: true },
  replyDisabled: { type: Boolean, default: false }
})

const emit = defineEmits(['reply', 'deleted', 'jump'])

const userStore = useUserStore()
const reportVisible = ref(false)

const info = computed(() => props.extra.comments?.[props.cm.id])
const author = computed(() => props.extra.users?.[info.value?.user_id])

const authorName = computed(() => {
  if (!info.value) return props.cm.user_name || t('common.user')
  if (info.value.is_anonymous) return '匿名用户'
  const u = props.extra.users?.[info.value.user_id]
  return u ? u.nick_name || u.name : '用户'
})

// 被回复的评论（用于"回复 @xxx：原内容"引用，腾讯音乐式叠楼）
const repliedComment = computed(() => {
  const cid = props.cm.comment_id
  if (!cid) return null
  return props.extra.comments?.[cid] || null
})

const quoteText = computed(() => {
  const rc = repliedComment.value
  if (!rc || rc.is_delete || rc.is_ban) return ''
  const d = (rc.describe || '').replace(/\s+/g, ' ').trim()
  return d.length > 60 ? d.slice(0, 60) + '…' : d
})

// 正文 @ 高亮（评论内容已被后端转义 HTML，v-html 安全）+ GIF 图片渲染
const bodyHtml = computed(() => {
  const text = info.value?.describe || ''
  return text
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img src="$2" alt="$1" class="cn-gif">')
    .replace(/@([\u4e00-\u9fa5A-Za-z0-9_\-]+)/g, '<span class="cn-at">@$1</span>')
})

const quoteAuthor = computed(() => {
  const rc = repliedComment.value
  if (!rc) return ''
  if (rc.is_anonymous) return '匿名用户'
  const u = props.extra.users?.[rc.user_id]
  return u ? u.nick_name || u.name : '用户'
})

// 被回复者的登录名（跳主页用）；匿名或取不到用户时不跳
const quoteAuthorName = computed(() => {
  const rc = repliedComment.value
  if (!rc || rc.is_anonymous) return ''
  return props.extra.users?.[rc.user_id]?.name || ''
})

function thumbUrl(url) {
  if (!url) return undefined
  return url.includes('/storage/') ? url.replace('/storage/', '/storage_x/') : url
}

async function cool() {
  if (!userStore.isLogin) {
    ElMessage.warning(t('common.loginFirst'))
    return
  }
  try {
    const res = await request.post('/api/comment/cool', { id: props.cm.id })
    // 后端是 toggle：'+' 点赞 / '-' 取消
    const liked = res.data === '+'
    if (info.value) {
      info.value.is_cool = liked
      info.value.cool = Math.max((info.value.cool || 0) + (liked ? 1 : -1), 0)
    }
    ElMessage.success(liked ? t('article.likeSuccess') : t('article.unlikeSuccess'))
  } catch (e) {
    ElMessage.error(e.msg || t('common.failed'))
  }
}

async function remove() {
  try {
    await request.post('/api/comment/delete', { id: props.cm.id })
    ElMessage.success(t('article.commentDeleted'))
    emit('deleted')
  } catch (e) {
    ElMessage.error(e.msg || t('common.deleteFailed'))
  }
}

// 匿名评论转实名
async function realName() {
  try {
    await request.post('/api/comment/real/name', { id: props.cm.id })
    if (info.value) info.value.is_anonymous = false
    ElMessage.success(t('article.cancelledAnonymity'))
  } catch (e) {
    ElMessage.error(e.msg || t('common.failed'))
  }
}

function bad() {
  if (!userStore.isLogin) {
    ElMessage.warning(t('common.loginFirst'))
    return
  }
  reportVisible.value = true
}

async function handleReport(reason) {
  try {
    await request.post('/api/comment/bad', { id: props.cm.id, reason })
    ElMessage.success(t('article.reportSuccess'))
  } catch (e) {
    if (e.id === 110012) {
      ElMessage.warning(t('report.reported'))
    } else {
      ElMessage.error(e.msg || t('common.failed'))
    }
  }
}
</script>

<style scoped>
.comment-node {
  padding: 12px 0;
  border-bottom: 1px solid #f5f0ed;
}

.cn-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cn-avatar {
  background: var(--zh-blue);
  color: #fff;
}

.cn-author-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  color: inherit;
}

.cn-author-link:hover .cn-nick {
  color: var(--zh-blue);
}

.cn-nick {
  font-size: 14px;
  font-weight: 600;
  color: var(--zh-text);
}

.vip-tag {
  transform: scale(0.85);
}

.cn-time {
  color: var(--zh-text-3);
  font-size: 12px;
}

/* 原消息引用 */
.cn-quote {
  margin: 6px 0 4px 36px;
  padding: 6px 10px;
  background: #faf7f5;
  border-radius: var(--zh-radius);
  font-size: 13px;
  color: var(--zh-text-2);
  cursor: pointer;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cn-quote:hover {
  background: #fff1f0;
}

.quote-label {
  color: var(--zh-text-3);
}

.quote-target {
  color: var(--zh-blue);
  font-weight: 600;
  text-decoration: none;
}

/* 引用里的 @某人：可点进主页（hover 加下划线，表示与整块的“跳评论”不同） */
a.quote-target:hover {
  text-decoration: underline;
}

.quote-body {
  color: var(--zh-text-3);
}

.cn-body {
  margin: 6px 0 4px 36px;
  color: var(--zh-text-2);
  font-size: 15px;
  line-height: 1.6;
}

/* v-html 注入的内容不带 scope 属性，需用 :deep 才能命中 */
.cn-body :deep(.cn-at) {
  color: var(--zh-blue);
  font-weight: 600;
}

.cn-body :deep(.cn-gif) {
  max-width: 160px;
  max-height: 160px;
  border-radius: 8px;
  display: block;
  margin: 4px 0;
}

.cn-foot {
  display: flex;
  gap: 16px;
  margin-left: 36px;
}

.cn-action {
  border: none;
  background: none;
  color: var(--zh-text-3);
  font-size: 13px;
  cursor: pointer;
  padding: 2px 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.cn-action:hover {
  color: var(--zh-blue);
}

.cn-action.liked {
  color: var(--zh-blue);
  font-weight: 600;
}

.cn-action.danger:hover {
  color: #ff665e;
}

/* 评论关闭时回复按钮置灰 */
.cn-action.reply-disabled,
.cn-action.reply-disabled:hover {
  color: #c9c2bc;
  cursor: not-allowed;
}
</style>
